/**
 * The bot's Archipelago connection: forwards room messages into the Discord channel and keeps the
 * cached room data (slots, datapackage, check counts, history) the commands read.
 *
 * There is no automatic reconnect. A dropped connection stays down until `/archipelago-reconnect`
 * or a bot restart, and both of those wake the multiworld.gg room before logging in.
 *
 * While no Archipelago is running, `/archipelago-enabled` turns all of this off: the bot stays
 * disconnected (including across restarts) and the commands that need the room are refused.
 */
const { mapEmoji, flagEmote, itemEmote, itemGroup } = require('./slots.js');
const tracker = require('./tracker.js');

// A room that was asleep takes a few seconds to start listening again after being woken, so the
// first login after a wake often fails; these retry it.
const WAKE_RETRIES = 3;
const WAKE_RETRY_DELAY = 5000;
// Releases can send hundreds of items at once, so history is written in batches.
const HISTORY_FLUSH_DELAY = 2000;
// How many throwaway slot logins to run at once (check counts, hint points).
const SLOT_LOGIN_CONCURRENCY = 5;

const SLOT_TYPE_PLAYER = 1;

let discordClient = null;
let db = null;
let ArchipelagoClient = null;
let apClient = null;
let discordChannel = null;

let connected = false;
let isDestroyed = false;
// Set while we tear the socket down on purpose, so the disconnect handler stays quiet
let isRestarting = false;
// Concurrent callers share one login rather than racing on the same client
let connectPromise = null;

let pendingHistory = [];
let historyFlushTimer = null;

function isConnected() {
    return connected;
}

// Enabled unless explicitly turned off, so rooms set up before the toggle existed keep working
function isEnabled() {
    return db?.archipelago.get('enabled') !== false;
}

function getRoomId(roomUrl) {
    const segments = new URL(roomUrl).pathname.split('/').filter(Boolean);
    return segments[segments.length - 1] || null;
}

function serverAddress() {
    const port = db.archipelago.get('server_port');
    return port ? `multiworld.gg:${port}` : null;
}

async function mapWithConcurrency(values, limit, fn) {
    const results = new Array(values.length);
    let next = 0;
    const workers = Array.from({ length: Math.min(limit, values.length) }, async () => {
        while (next < values.length) {
            const i = next++;
            results[i] = await fn(values[i]);
        }
    });
    await Promise.all(workers);
    return results;
}

// The bot only ever listens to DeathLink and must never send one. A DeathLink is a Bounce packet,
// and the bot has no use for Bounce at all, so every client it makes drops outgoing Bounces at the
// socket, beneath anything archipelago.js could call.
function createClient() {
    const client = new ArchipelagoClient();
    const send = client.socket.send.bind(client.socket);
    client.socket.send = (...packets) => {
        const allowed = packets.filter(packet => packet?.cmd !== 'Bounce');
        if (allowed.length < packets.length) console.warn('[Archipelago] Blocked an outgoing Bounce (DeathLink) packet.');
        return allowed.length > 0 ? send(...allowed) : client.socket;
    };
    return client;
}

// Runs one throwaway slot login per value, a few at a time so big rooms don't get hammered
function mapSlotLogins(values, fn) {
    return mapWithConcurrency(values, SLOT_LOGIN_CONCURRENCY, fn);
}

async function prepareEnvironment() {
    if (ArchipelagoClient) return;

    // archipelago.js is ESM-only, so it's imported dynamically to keep this file CommonJS
    const mod = await import('archipelago.js');
    ArchipelagoClient = mod.Client || mod.default || mod;

    // Archipelago expects a global WebSocket constructor
    if (typeof globalThis.WebSocket !== 'function') {
        try {
            const wsMod = await import('ws');
            globalThis.WebSocket = wsMod.default || wsMod;
        } catch (err) {
            console.error("Failed to import 'ws' to provide WebSocket in Node:", err);
        }
    }

    // Some libraries expect a browser-like navigator.userAgent
    if (typeof globalThis.navigator !== 'object' || typeof globalThis.navigator?.userAgent !== 'string') {
        globalThis.navigator = globalThis.navigator || {};
        globalThis.navigator.userAgent = `Node/${process.version} (${process.platform})`;
    }
}

// --- Discord output ---

async function fetchChannel() {
    const channelId = db.archipelago.get('server_channel');
    if (!channelId || discordChannel?.id === channelId) return;
    try {
        discordChannel = await discordClient.channels.fetch(channelId);
    } catch (err) {
        console.error('Failed to fetch Discord channel for Archipelago messages:', err);
    }
}

async function sendDiscordMessage(message) {
    if (discordChannel && discordClient.isReady()) {
        try {
            await discordChannel.send({ content: `${message}` });
        } catch (err) {
            console.error('Failed to send Discord message:', err);
        }
    }
    console.log(`[Archipelago] ${message}`);
}

// --- multiworld.gg room handling ---

// Hits the room page (not just the status API) to wake it if multiworld.gg has let it go idle,
// then picks up the port it came back on. The wake has to finish before the port check, or a
// sleeping room reports its stale pre-wake port and we connect to a dead socket.
async function syncRoomState() {
    const roomUrl = db.archipelago.get('room_url');
    if (!roomUrl) return;

    let roomId, origin;
    try {
        roomId = getRoomId(roomUrl);
        origin = new URL(roomUrl).origin;
    } catch (err) {
        console.warn(`[Archipelago] Invalid room URL ${roomUrl}:`, err.message);
        return;
    }
    if (!roomId) return;

    try {
        await fetch(roomUrl);
    } catch (err) {
        console.warn('[Archipelago] Failed to wake room:', err.message);
    }

    try {
        const res = await fetch(`${origin}/api/room_status/${roomId}`);
        const roomStatus = await res.json();
        const lastPort = roomStatus.last_port != null ? String(roomStatus.last_port) : null;
        const currentPort = db.archipelago.get('server_port');

        if (lastPort && lastPort !== String(currentPort)) {
            await sendDiscordMessage(`Room port changed from ${currentPort} to ${lastPort}. Updating.`);
            db.archipelago.set('server_port', lastPort);
        }
    } catch (err) {
        console.warn('[Archipelago] Failed to check room port:', err.message);
    }
}

// --- connection ---

function connect() {
    if (!connectPromise) {
        connectPromise = doConnect().finally(() => { connectPromise = null; });
    }
    return connectPromise;
}

async function doConnect() {
    if (isDestroyed || !isEnabled()) return false;

    await fetchChannel();
    await syncRoomState();

    const address = serverAddress();
    if (!address) {
        console.error('Archipelago server_port is not configured in the database. Skipping Archipelago login.');
        return false;
    }

    const slot = db.archipelago.get('slot');
    const game = db.archipelago.get('game');

    try {
        const cachedPackage = db.archipelago.get('package_cache');
        if (cachedPackage) apClient.package.importPackage(cachedPackage);

        console.log(`Connecting to Archipelago at ${address}...`);
        if (slot) {
            await apClient.login(`wss://${address}`, slot, game);
        } else {
            await apClient.login(`wss://${address}`);
        }

        apClient.deathLink.enableDeathLink();
        connected = true;
        console.log('Connected to the Archipelago server!');
        sendDiscordMessage('Successfully connected to Archipelago server.');

        // Runs in the background: the first sync of a room can take a while
        refreshCaches().catch(err => console.error('[Archipelago] Failed to refresh caches:', err));
        return true;
    } catch (err) {
        console.error('Archipelago login failed:', err);
        return false;
    }
}

// Wakes the room and logs in, retrying a few times while a woken room comes back up.
// Used on bot start and by /archipelago-reconnect. Resolves true once connected.
async function connectWithWake() {
    let ok = await connect();
    for (let attempt = 0; !ok && db.archipelago.get('room_url') && attempt < WAKE_RETRIES; attempt++) {
        await new Promise(resolve => setTimeout(resolve, WAKE_RETRY_DELAY));
        if (isDestroyed || !isEnabled()) return false;
        ok = await connect();
    }
    if (!ok && !isDestroyed && isEnabled()) {
        await sendDiscordMessage('Couldn\'t connect to the Archipelago server. Use `/archipelago-reconnect` to try again.');
    }
    return ok;
}

function setupEventListeners() {
    apClient.messages.on('itemSent', (_text, item, nodes) => {
        onItemSent(item, nodes).catch(err => console.error('Error handling Archipelago itemSent:', err));
    });

    apClient.messages.on('goaled', (_text, player) => {
        onGoal(player).catch(err => console.error('Error handling Archipelago goal:', err));
    });

    apClient.deathLink.on('deathReceived', (source, _time, cause) => {
        onDeath(source, cause).catch(err => console.error('Error handling DeathLink:', err));
    });

    // The socket manager outlives individual logins, so this only needs registering once
    apClient.socket.on('disconnected', () => {
        const wasConnected = connected;
        connected = false;
        if (isDestroyed || isRestarting || !wasConnected || !isEnabled()) return;
        console.log('Archipelago WebSocket closed');
        sendDiscordMessage('Disconnected from Archipelago server. Use `/archipelago-reconnect` to reconnect.');
    });
}

/**
 * Starts the Archipelago client and forwards messages into the configured Discord channel.
 * @param {import('discord.js').Client} client
 * @param {object} database
 */
async function start(client, database) {
    discordClient = client;
    db = database;

    await prepareEnvironment();
    if (!apClient) {
        apClient = createClient();
        setupEventListeners();
    }

    if (!isEnabled()) {
        console.log('[Archipelago] Disabled; skipping login. Use `/archipelago-enabled` to turn it back on.');
        return false;
    }
    return connectWithWake();
}

// Closes the socket without announcing it as a dropped connection
async function disconnectQuietly() {
    // Let an in-flight login settle first
    if (connectPromise) await connectPromise;

    isRestarting = true;
    try {
        apClient.socket.disconnect();
    } finally {
        isRestarting = false;
    }
    connected = false;
}

// Tears the socket down and logs in again (waking the room first), e.g. for a manual reconnect.
// Resolves true once connected.
async function restart() {
    if (isDestroyed || !apClient || !isEnabled()) return false;
    await disconnectQuietly();
    return connectWithWake();
}

// Turns the connection on or off and remembers it across restarts. Enabling connects (waking the
// room first) and resolves true once connected; disabling disconnects and resolves false.
async function setEnabled(enabled) {
    db.archipelago.set('enabled', enabled);
    if (isDestroyed || !apClient) return false;

    if (!enabled) {
        flushHistory();
        await disconnectQuietly();
        tracker.stop();
        await sendDiscordMessage('Archipelago disabled; disconnected from the server.');
        return false;
    }

    tracker.warmUp();
    return connectWithWake();
}

function destroy() {
    isDestroyed = true;
    connected = false;
    flushHistory();
    try { apClient?.socket.disconnect(); } catch (_) {}
    console.log('Archipelago client destroyed');
}

// --- event handlers ---

// Formats item-send nodes. Nodes are typed by archipelago.js, so format by type rather than by position.
function formatNodes(nodes, item) {
    if (!Array.isArray(nodes)) return String(nodes || '');
    const finishedGames = db.archipelago.get('finished_games') || [];
    const anyFinished = nodes.some(n => n && typeof n.text === 'string' && finishedGames.includes(n.text.replace('\'s', '')));

    const formatted = nodes.map((node, i) => {
        if (!node) return '';
        const text = typeof node.text === 'string' ? node.text : '';

        if (node.type === 'player') return mapEmoji(text);
        if (node.type === 'item') return `**${text}** ${itemEmote(text, item?.flags ?? 0)}`;
        if (node.type === 'location') return anyFinished ? ` at ${text}` : `\n-# at ${text}`;

        // Drop the parentheses the server wraps around the location
        if (nodes[i + 1]?.type === 'location' && text.trimStart().startsWith('(')) return '';
        if (nodes[i - 1]?.type === 'location' && text.trimEnd().endsWith(')')) return '';
        return text;
    }).join('');

    // Traffic involving slots that already goaled is dimmed so the live games stand out
    return anyFinished ? `-# ${formatted}` : formatted;
}

async function onItemSent(item, nodes) {
    await sendDiscordMessage(formatNodes(nodes, item));

    const receiverName = item?.receiver?.name;
    const senderName = item?.sender?.name;
    const itemName = item?.name;
    const flags = item?.flags ?? 0;
    if (!receiverName || !itemName) return;

    const group = itemGroup(flags);
    recordHistory({ type: 'item', receiver: receiverName, sender: senderName, itemName, locationName: item.locationName ?? null, flags, group, timestamp: Date.now() });

    if (senderName) {
        const counts = db.archipelago.get('check_counts') ?? {};
        if (counts[senderName]) {
            counts[senderName].checked = Math.min(counts[senderName].checked + 1, counts[senderName].total);
            db.archipelago.set('check_counts', counts);
        }
    }

    // A checked location or a new item changes what's in logic for both ends
    tracker.invalidateSlotCache(receiverName);
    if (senderName && senderName !== receiverName) tracker.invalidateSlotCache(senderName);

    // Notify subscribers
    const subscriptions = db.archipelago.get('subscriptions') ?? [];
    const matching = subscriptions.filter(s =>
        s.slot === receiverName && (
            (s.type === 'item' && s.value.toLowerCase() === itemName.toLowerCase()) ||
            (s.type === 'group' && s.value === group)
        )
    );
    for (const sub of matching) {
        try {
            const user = await discordClient.users.fetch(sub.userId);
            await user.send(`**${mapEmoji(receiverName)}** received **${itemName}** ${flagEmote(flags)}`);
        } catch (dmErr) {
            console.error(`Failed to DM subscriber ${sub.userId}:`, dmErr);
        }
    }
}

async function onGoal(player) {
    const name = player?.name;
    if (!name) return;

    const finished = db.archipelago.get('finished_games') ?? [];
    if (!finished.includes(name)) {
        finished.push(name);
        db.archipelago.set('finished_games', finished);
    }
    await sendDiscordMessage(`🏆 **${mapEmoji(name)}** has completed their goal!`);
}

function formatDeath(source, cause) {
    if (!cause) return `🪦 **${mapEmoji(source)}** has died.`;

    const words = cause.split(' ');
    const causeParts = words.map(str => mapEmoji(str));
    if (words[0] === source) {
        causeParts[0] = `**${causeParts[0]}**`;
        return `🪦 ${causeParts.join(' ')}`;
    }
    if (cause.includes(source)) {
        const processedCause = cause.replace(source, `**${mapEmoji(source)}**`);
        return `🪦 ${processedCause.split(' ').map(str => str.includes('**') ? str : mapEmoji(str)).join(' ')}`;
    }
    return `🪦 **${mapEmoji(source)}** ${causeParts.join(' ')}`;
}

async function onDeath(source, cause) {
    await sendDiscordMessage(formatDeath(source, cause));
    recordHistory({ type: 'death', source, cause: cause ?? null, timestamp: Date.now() });
}

// --- history ---

function recordHistory(entry) {
    pendingHistory.push(entry);
    if (historyFlushTimer) return;
    historyFlushTimer = setTimeout(flushHistory, HISTORY_FLUSH_DELAY);
}

// Writes any batched history to the db. Call before reading or replacing `ap_history`.
function flushHistory() {
    if (historyFlushTimer) {
        clearTimeout(historyFlushTimer);
        historyFlushTimer = null;
    }
    if (pendingHistory.length === 0 || !db) return;
    try {
        const history = db.archipelago.get('ap_history') ?? [];
        history.push(...pendingHistory);
        db.archipelago.set('ap_history', history);
        pendingHistory = [];
    } catch (err) {
        console.error('Error recording Archipelago history:', err);
    }
}

// --- cached room data ---

async function refreshCaches() {
    await ensureSlotDataCached();
    await syncCheckCounts();
}

function playerSlots() {
    return Object.values(apClient.players.slots).filter(s => s.name && s.game && s.type === SLOT_TYPE_PLAYER);
}

// Returns true if the db already has datapackage/slot data covering every slot in the room,
// so cacheSlotData() can be skipped
function slotDataIsCached() {
    const slotData = db.archipelago.get('slot_data');
    const packageCache = db.archipelago.get('package_cache');
    const itemNameGroups = db.archipelago.get('item_name_groups');

    return Object.values(apClient.players.slots).filter(s => s.name).every(s => {
        if (!slotData?.[s.name]) return false;
        if (s.game && !packageCache?.games?.[s.game]) return false;
        if (s.game && !itemNameGroups?.[s.game]) return false;
        return true;
    });
}

async function ensureSlotDataCached() {
    if (slotDataIsCached()) {
        console.log('[Archipelago] Using cached datapackage/slot data from db.');
        return;
    }
    await cacheSlotData();
}

// Caches slot data for autocomplete and commands, and persists the datapackage for fast reconnects
async function cacheSlotData() {
    await apClient.package.fetchPackage();
    const slots = Object.values(apClient.players.slots).filter(s => s.name);

    const slotData = {};
    const packageGames = {};
    for (const slot of slots) {
        const pkg = slot.game ? apClient.package.findPackage(slot.game) : null;
        slotData[slot.name] = {
            game: slot.game,
            type: slot.type,
            items: pkg ? Object.keys(pkg.itemTable).sort() : [],
            locations: pkg ? Object.keys(pkg.locationTable).sort() : [],
        };
        if (pkg && !packageGames[slot.game]) {
            packageGames[slot.game] = {
                checksum: pkg.checksum,
                item_name_to_id: { ...pkg.itemTable },
                location_name_to_id: { ...pkg.locationTable },
            };
        }
    }
    db.archipelago.set('slot_data', slotData);
    if (Object.keys(packageGames).length > 0) db.archipelago.set('package_cache', { games: packageGames });

    const itemNameGroups = {};
    for (const game of new Set(slots.filter(s => s.game).map(s => s.game))) {
        try {
            const result = await apClient.storage.fetchItemNameGroups(game);
            itemNameGroups[game] = result[`_read_item_name_groups_${game}`] ?? {};
        } catch (err) {
            console.warn(`[Archipelago] Failed to fetch item name groups for ${game}:`, err);
        }
    }
    if (Object.keys(itemNameGroups).length > 0) db.archipelago.set('item_name_groups', itemNameGroups);

    console.log(`[Archipelago] Cached data for ${slots.length} slots.`);
}

// Brings the check counts up to date after time offline, without logging in as every slot each time:
// a room with a URL is read from multiworld.gg's tracker API, and otherwise only slots that have
// never been counted get a throwaway login. onItemSent keeps the counts current from there.
async function syncCheckCounts() {
    const slots = playerSlots();
    const counts = db.archipelago.get('check_counts') ?? {};

    let fromTracker = 0;
    try {
        fromTracker = await readTrackerCounts(slots, counts);
    } catch (err) {
        console.warn('[Archipelago] Failed to read check counts from the room tracker:', err.message);
    }

    // A total of 0 is what a failed lookup used to store, so it counts as never counted
    const uncounted = slots.filter(slot => !counts[slot.name]?.total);
    const results = await mapSlotLogins(uncounted, async (slot) => {
        try {
            return await withSlotClient(slot.name, (client) => ({
                checked: client.room.checkedLocations.length,
                total: client.room.allLocations.length,
            }));
        } catch {
            return null;
        }
    });

    uncounted.forEach((slot, i) => {
        if (results[i]) counts[slot.name] = results[i];
    });
    db.archipelago.set('check_counts', counts);
    console.log(`[Archipelago] Synced check counts: ${fromTracker} from the room tracker, ${results.filter(Boolean).length}/${uncounted.length} by slot login.`);
}

// Fills `counts` from the webhost tracker API of the configured room URL.
// Returns how many slots it covered; nothing is touched unless every request succeeds.
async function readTrackerCounts(slots, counts) {
    const roomUrl = db.archipelago.get('room_url');
    if (!roomUrl || slots.length === 0) return 0;

    const origin = new URL(roomUrl).origin;
    const getJson = async (path) => {
        const res = await fetch(`${origin}/api/${path}`);
        if (!res.ok) throw new Error(`${path} returned HTTP ${res.status}`);
        return res.json();
    };

    const { tracker: trackerId } = await getJson(`room_status/${getRoomId(roomUrl)}`);
    if (!trackerId) return 0;

    const team = apClient.players.self.team;
    const names = new Map(Object.entries(apClient.players.slots).map(([id, slot]) => [Number(id), slot.name]));
    const byName = (entries) => new Map(entries.filter(e => e.team === team).map(e => [names.get(e.player), e]));

    const checked = byName((await getJson(`tracker/${trackerId}`)).player_checks_done);
    // Totals never change, and this response carries the whole datapackage, so only ask when one is missing
    const totals = slots.every(slot => counts[slot.name]?.total)
        ? new Map()
        : byName((await getJson(`static_tracker/${trackerId}`)).player_locations_total);

    let covered = 0;
    for (const { name } of slots) {
        const total = counts[name]?.total || totals.get(name)?.total_locations;
        if (!checked.has(name) || total == null) continue;
        counts[name] = { checked: checked.get(name).locations.length, total };
        covered++;
    }
    return covered;
}

// Logs a throwaway TextOnly client in as `slotName`, runs `fn` with it, and disconnects.
// `settleMs` waits after login for packets that arrive after Connected (e.g. ReceivedItems).
async function withSlotClient(slotName, fn, { settleMs = 0, slotData = false } = {}) {
    if (!isEnabled()) throw new Error('Archipelago is disabled.');
    await prepareEnvironment();
    const address = serverAddress();
    if (!address) throw new Error('No Archipelago server port configured.');

    const client = createClient();
    const cachedPackage = db.archipelago.get('package_cache');
    if (cachedPackage) client.package.importPackage(cachedPackage);

    try {
        await client.login(address, slotName, undefined, { slotData });
        if (settleMs) await new Promise(resolve => setTimeout(resolve, settleMs));
        return await fn(client);
    } finally {
        try { client.socket.disconnect(); } catch (_) {}
    }
}

module.exports = {
    start,
    restart,
    destroy,
    setEnabled,
    isEnabled,
    isConnected,
    serverAddress,
    flushHistory,
    withSlotClient,
    mapSlotLogins,
};
