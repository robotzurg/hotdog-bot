// Tracks the currently running client
let currentClient = null;

function getClient() {
    return currentClient;
}

function getRoomId(roomUrl) {
    const segments = roomUrl.split('/').filter(Boolean);
    return segments[segments.length - 1] || null;
}

// Hits the room's page (not just the status API) to wake it if archipelago.gg
// has let it go idle.
async function wakeRoom(roomUrl) {
    try {
        await fetch(roomUrl);
    } catch (err) {
        console.warn('[Archipelago] Failed to wake room:', err);
    }
}

/**
 * Start the Archipelago client and forward messages into a Discord channel.
 * Dynamically imports the ESM-only `archipelago.js` package so this file can remain CommonJS.
 * @param {import('discord.js').Client} discordClient
 * @param {object} db
 */
async function start(discordClient, db) {
    let ArchipelagoClient;
    try {
        const mod = await import('archipelago.js');
        // prefer named export, fall back to default or the module itself
        ArchipelagoClient = mod.Client || mod.default || mod;
    } catch (err) {
        console.error('Failed to import archipelago.js (ESM-only):', err);
        throw err;
    }

    const { SLOT_EMOTES } = require('./slots.js');
    const mapEmoji = (text) => {
        const emote = SLOT_EMOTES[text];
        return emote ? `${text} ${emote}` : text;
    };

    const FLAG_EMOTES = {
        Progression: '<:Progression:1495879488716668988>',
        Useful:      '<:Useful:1495879485407494354>',
        Trap:        '<:Trap:1495879486346887238>',
        Junk:        '<:Junk:1495879487538204804>',
    };
    const flagEmote = (flags) => {
        // Bit flags for the flag types
        if (flags & 0b0001) return FLAG_EMOTES.Progression;
        if (flags & 0b0100) return FLAG_EMOTES.Trap;
        if (flags & 0b0010) return FLAG_EMOTES.Useful;
        return FLAG_EMOTES.Junk;
    };

    const channelId = db.archipelago.get('server_channel');
    let discordChannel = null;

    if (channelId) {
        try {
            discordChannel = await discordClient.channels.fetch(channelId);
        } catch (err) {
            console.error('Failed to fetch Discord channel for Archipelago messages:', err);
        }
    }

    // Helper: Send message to Discord channel
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

    function getConnectionConfig() {
        const port = db.archipelago.get('server_port');
        const slot = db.archipelago.get('slot');
        const game = db.archipelago.get('game');
        return { port, slot, game, address: port ? `wss://archipelago.gg:${port}` : null };
    }

    // Checks the room's current port against archipelago.gg and updates the
    // stored server_port in the db if it has drifted (e.g. after the room restarted).
    async function checkRoomPort(roomId) {
        try {
            const res = await fetch(`https://archipelago.gg/api/room_status/${roomId}`);
            const roomStatus = await res.json();
            const lastPort = roomStatus.last_port != null ? String(roomStatus.last_port) : null;
            const currentPort = db.archipelago.get('server_port');

            if (lastPort && lastPort !== String(currentPort)) {
                await sendDiscordMessage(`Room port changed from ${currentPort} to ${lastPort}. Updating.`);
                db.archipelago.set('server_port', lastPort);
            }
        } catch (err) {
            console.warn('[Archipelago] Failed to check room port:', err);
        }
    }

    // Wakes the room and syncs its current port into the db. No-op if no room_url is configured.
    async function syncRoomState() {
        const roomUrl = db.archipelago.get('room_url');
        if (!roomUrl) return;

        const roomId = getRoomId(roomUrl);
        if (!roomId) return;

        await Promise.all([wakeRoom(roomUrl), checkRoomPort(roomId)]);
    }

    await syncRoomState();

    const { port, slot, game, address } = getConnectionConfig();

    // Reconnection state
    const reconnectDelay = 5 * 60 * 1000; // 5 minutes
    let reconnectTimer = null;
    let isDestroyed = false;

    if (!port) {
        console.error('Archipelago server_port is not configured in the database. Skipping Archipelago login.');
        currentClient = null;
        return null;
    }

    // archipelago.gg rooms go idle after ~2 hours without an item send. Rather than
    // polling on a fixed interval, this timer is reset on every itemSent event (see
    // below) and only fires - waking the room and rescheduling itself - once real
    // activity has actually stopped for that long (plus a minute, so the room has
    // definitely gone idle rather than racing its own timeout).
    const roomWakeDelay = 2 * 60 * 60 * 1000 + 60 * 1000; // 2 hours 1 minute
    let roomWakeTimer = null;

    function scheduleRoomWake() {
        if (roomWakeTimer) clearTimeout(roomWakeTimer);
        if (!db.archipelago.get('room_url')) return;

        roomWakeTimer = setTimeout(async () => {
            await syncRoomState();
            scheduleRoomWake();
        }, roomWakeDelay);
    }

    scheduleRoomWake();

    // Ensure a WebSocket implementation exists in Node. Archipelago expects a
    // global WebSocket/IsomorphousWebSocket constructor.
    if (typeof globalThis.WebSocket !== 'function') {
        try {
            const wsMod = await import('ws');
            const Ws = wsMod.default || wsMod;
            if (typeof Ws === 'function') {
                globalThis.WebSocket = Ws;
                console.log('Set global WebSocket from ws package for Archipelago');
            } else {
                console.warn('ws module did not expose a constructor; Archipelago may fail to connect');
            }
        } catch (err) {
            console.error("Failed to import 'ws' to provide WebSocket in Node. Please install it (npm install ws)", err);
        }
    }

    // Provide a navigator.userAgent for libraries that expect a browser-like env.
    if (typeof globalThis.navigator !== 'object' || typeof globalThis.navigator?.userAgent !== 'string') {
        try {
            globalThis.navigator = globalThis.navigator || {};
            globalThis.navigator.userAgent = `Node/${process.version} (${process.platform})`;
        } catch (err) {
            // non-fatal; just log if we can't set navigator
            console.warn('Unable to set global navigator.userAgent:', err);
        }
    }

    const archClient = new ArchipelagoClient();

    // Reconnection logic
    function attemptReconnect(reason) {
        if (isDestroyed || reconnectTimer) return;

        reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            reconnect();
        }, reconnectDelay);
    }

    // Reconnect function
    async function reconnect() {
        if (isDestroyed) return;

        await syncRoomState();

        const { port, slot, game, address } = getConnectionConfig();

        if (!port) {
            console.error('Archipelago server_port is not configured in the database. Cannot reconnect.');
            return;
        }

        try {
            const cachedPackage = db.archipelago.get('package_cache');
            if (cachedPackage) archClient.package.importPackage(cachedPackage);

            if (slot) {
                console.log(`Attempting to reconnect to Archipelago at ${address} with slot ${slot} (game ${game})...`);
                await archClient.login(address, slot, game);
            } else {
                await archClient.login(address);
            }

            // Set up socket listeners after successful reconnection
            setupSocketListeners();
            archClient.deathLink.enableDeathLink();

            sendDiscordMessage('Successfully reconnected to Archipelago server!');
            console.log('Reconnected to the Archipelago server!');
            await ensureSlotDataCached();
            await syncCheckCounts();
        } catch (err) {
            console.error('Archipelago reconnection failed:', err);
            // Will trigger another reconnect attempt via error listener
        }
    }

    // Helper to format nodes into a message string safely
    function formatNodes(nodes, hint = false, item = false) {
        if (!Array.isArray(nodes)) return String(nodes || '');
        const finishedGames = db.archipelago.get('finished_games') || [];
        const anyFinished = nodes.some(n => n && typeof n.text === 'string' && finishedGames.includes(n.text.replace('\'s', '')));

        const formatted = nodes.map((node, i) => {
            if (!node) return '';
            const text = typeof node.text === 'string' ? node.text : '';

            if (node.type === 'player') return mapEmoji(text);
            if (node.type === 'item') {
                const itemEmote = text === 'Picture Frame'
                    ? '<:pictureframe:1528503736245289081>'
                    : (item !== false ? flagEmote(item.flags ?? 0) : '');
                return `**${text}**${itemEmote ? ` ${itemEmote}` : ''}`;
            }
            if (node.type === 'location') return hint ? text : anyFinished ? ` at ${text}` : `\n-# at ${text}`;

            // Skip the parentheses wrapping the location node in send messages
            if (!hint) {
                if (nodes[i + 1]?.type === 'location' && text.trimStart().startsWith('(')) return '';
                if (nodes[i - 1]?.type === 'location' && text.trimEnd().endsWith(')')) return '';
            }
            return text;
        }).join('');

        return anyFinished ? `-# ${formatted}` : formatted;
    }

    archClient.messages.on('itemSent', async (_text, _item, nodes) => {
        scheduleRoomWake();

        // Send to Discord channel
        try {
            const messageStr = formatNodes(nodes, false, _item);
            await sendDiscordMessage(messageStr);
        } catch (err) {
            console.error('Error forwarding Archipelago message to Discord:', err);
        }

        const receiverName = _item?.receiver?.name;
        const itemName = _item?.name;
        const senderName = _item?.sender?.name;
        const flags = _item?.flags ?? 0;

        if (!receiverName || !itemName) return;

        let group;
        if (flags & 0b0001) group = 'Progression';
        else if (flags & 0b0100) group = 'Trap';
        else if (flags & 0b0010) group = 'Useful';
        else group = 'Junk';

        // Record to persistent history
        try {
            const history = db.archipelago.get('ap_history') ?? [];
            const locationName = _item?.locationName ?? null;
            history.push({ type: 'item', receiver: receiverName, sender: senderName, itemName, locationName, flags, group, timestamp: Date.now() });
            db.archipelago.set('ap_history', history);
        } catch (err) {
            console.error('Error recording item to ap_history:', err);
        }

        // Increment cached check count and invalidate tracker cache for the sender slot
        if (senderName) {
            try {
                const counts = db.archipelago.get('check_counts') ?? {};
                if (counts[senderName]) {
                    counts[senderName].checked = Math.min(counts[senderName].checked + 1, counts[senderName].total);
                    db.archipelago.set('check_counts', counts);
                }
            } catch (err) {
                console.error('Error updating check count:', err);
            }
            try {
                const { invalidateSlotCache } = require('./tracker.js');
                invalidateSlotCache(senderName);
                if (receiverName && receiverName !== senderName) invalidateSlotCache(receiverName);
            } catch (err) {
                console.error('Error invalidating tracker cache:', err);
            }
        }

        // Notify subscribers
        try {
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
        } catch (err) {
            console.error('Error processing subscriptions for itemSent:', err);
        }
    });


    archClient.deathLink.on('deathReceived', async (source, _time, cause) => {
        try {
            let message;
            if (cause) {
                const causeParts = cause.split(' ').map(str => mapEmoji(str));
                const firstWordIsSource = cause.split(' ')[0] === source;
                const sourceInCause = cause.includes(source);
                if (firstWordIsSource) {
                    causeParts[0] = `**${causeParts[0]}**`;
                    message = `🪦 ${causeParts.join(' ')}`;
                } else if (sourceInCause) {
                    const boldedSource = `**${mapEmoji(source)}**`;
                    const processedCause = cause.replace(source, boldedSource);
                    message = `🪦 ${processedCause.split(' ').map(str => str.includes('**') ? str : mapEmoji(str)).join(' ')}`;
                } else {
                    message = `🪦 **${mapEmoji(source)}** ${causeParts.join(' ')}`;
                }
            } else {
                message = `🪦 **${mapEmoji(source)}** has died.`;
            }
            await sendDiscordMessage(message);
        } catch (err) {
            console.error('Error forwarding DeathLink message to Discord:', err);
        }

        // Record to persistent history
        try {
            const history = db.archipelago.get('ap_history') ?? [];
            history.push({ type: 'death', source, cause: cause ?? null, timestamp: Date.now() });
            db.archipelago.set('ap_history', history);
        } catch (err) {
            console.error('Error recording death to ap_history:', err);
        }
    });

    // Cache all slot data in db for autocomplete and commands, and persist the package for fast reconnects
    async function cacheSlotData() {
        try {
            await archClient.package.fetchPackage(); // downloads all game packages not yet cached
            const slots = archClient.players.slots;
            const slotData = {};
            const packageGames = {};

            for (const slot of Object.values(slots)) {
                if (!slot.name) continue;
                const pkg = slot.game ? archClient.package.findPackage(slot.game) : null;
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
            if (Object.keys(packageGames).length > 0) {
                db.archipelago.set('package_cache', { games: packageGames });
            }

            const uniqueGames = [...new Set(Object.values(slots).filter(s => s.name && s.game).map(s => s.game))];
            const itemNameGroups = {};
            for (const game of uniqueGames) {
                try {
                    const result = await archClient.storage.fetchItemNameGroups(game);
                    itemNameGroups[game] = result[`_read_item_name_groups_${game}`] ?? {};
                } catch (err) {
                    console.warn(`[Archipelago] Failed to fetch item name groups for ${game}:`, err);
                }
            }
            if (Object.keys(itemNameGroups).length > 0) {
                db.archipelago.set('item_name_groups', itemNameGroups);
            }

            console.log(`[Archipelago] Cached data for ${Object.keys(slotData).length} slots.`);
        } catch (err) {
            console.error('[Archipelago] Failed to cache slot data:', err);
        }
    }

    // Returns true if the db already has datapackage/slot data covering every
    // currently connected slot, so cacheSlotData() can be skipped on reboot.
    function slotDataIsCached() {
        const slotData = db.archipelago.get('slot_data');
        const packageCache = db.archipelago.get('package_cache');
        const itemNameGroups = db.archipelago.get('item_name_groups');
        const slots = Object.values(archClient.players.slots).filter(s => s.name);

        return slots.every(s => {
            if (!slotData?.[s.name]) return false;
            if (s.game && !packageCache?.games?.[s.game]) return false;
            if (s.game && !itemNameGroups?.[s.game]) return false;
            return true;
        });
    }

    // Populates the datapackage/slot cache if it isn't already covering the current slots.
    async function ensureSlotDataCached() {
        if (slotDataIsCached()) {
            console.log('[Archipelago] Using cached datapackage/slot data from db.');
            return;
        }
        await cacheSlotData();
    }

    // Sync check counts for all player slots from the server and store in DB
    async function syncCheckCounts() {
        try {
            const { fetchCheckCounts } = require('./tracker.js');
            const port = db.archipelago.get('server_port');
            const slots = Object.values(archClient.players.slots).filter(s => s.name && s.game);
            const results = await Promise.all(slots.map(s => fetchCheckCounts(s.name, port)));
            const counts = {};
            for (let i = 0; i < slots.length; i++) {
                counts[slots[i].name] = results[i];
            }
            db.archipelago.set('check_counts', counts);
            console.log(`[Archipelago] Synced check counts for ${slots.length} slots.`);
        } catch (err) {
            console.error('[Archipelago] Failed to sync check counts:', err);
        }
    }

    // Helper to set up socket event listeners (called after each connection)
    function setupSocketListeners() {
        if (archClient.socket) {
            // Remove existing listeners to prevent duplicates
            archClient.socket.removeAllListeners?.('error');
            archClient.socket.removeAllListeners?.('close');

            archClient.socket.on('error', (error) => {
                console.error('Archipelago WebSocket error:', error);
                attemptReconnect('error');
            });

            archClient.socket.on('close', () => {
                console.log('Archipelago WebSocket closed');
                sendDiscordMessage('Disconnected from Archipelago server. Attempting to reconnect...');
                attemptReconnect('close');
            });
        }

        if (archClient.on) {
            archClient.on('error', (error) => {
                console.error('Archipelago client error:', error);
                attemptReconnect('client error');
            });

            archClient.on('disconnect', () => {
                console.log('Archipelago client disconnected');
                attemptReconnect('disconnect');
            });
        }
    }

    try {
        const cachedPackage = db.archipelago.get('package_cache');
        if (cachedPackage) archClient.package.importPackage(cachedPackage);

        console.log(`Connecting to Archipelago at ${address}...`);
        if (slot) {
            await archClient.login(address, slot, game);
        } else {
            await archClient.login(address);
        }

        // Set up socket listeners after successful initial connection
        setupSocketListeners();
        archClient.deathLink.enableDeathLink();
        console.log('Connected to the Archipelago server!');
        sendDiscordMessage('Connected to Archipelago server!');
        await ensureSlotDataCached();
        await syncCheckCounts();
    } catch (err) {
        console.error('Archipelago login failed:', err);
        // Don't throw - let reconnection logic handle it
        attemptReconnect('initial connection failed');
    }

    // Add destroy method to client for cleanup
    archClient.destroy = function () {
        isDestroyed = true;
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
        if (roomWakeTimer) clearTimeout(roomWakeTimer);
        archClient.socket?.disconnect?.();
        console.log('Archipelago client destroyed');
    };

    currentClient = archClient;
    return archClient;
}

// Tears down the current connection (if any) and starts a fresh one, e.g. for a manual reconnect command.
async function restart(discordClient, db) {
    if (currentClient?.destroy) {
        currentClient.destroy();
    }
    return start(discordClient, db);
}

module.exports = { start, restart, getClient };
