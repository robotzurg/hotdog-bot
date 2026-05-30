
/**
 * Start the Archipelago client and forward messages into a Discord channel.
 * Dynamically imports the ESM-only `archipelago.js` package so this file can remain CommonJS.
 * @param {import('discord.js').Client} discordClient
 * @param {object} db
 */
async function start(discordClient, db) {
    // Dynamically import the ESM-only package inside the async function
    let ArchipelagoClient;
    try {
        const mod = await import('archipelago.js');
        // prefer named export, fall back to default or the module itself
        ArchipelagoClient = mod.Client || mod.default || mod;
    } catch (err) {
        console.error('Failed to import archipelago.js (ESM-only):', err);
        throw err;
    }

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

    // Reconnection state
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 50;
    let reconnectTimer = null;
    let isDestroyed = false;

    // Helper: Calculate exponential backoff delay
    function getReconnectDelay() {
        // Exponential backoff: 5s, 10s, 20s, 40s, 80s, 160s (cap at 5 min)
        return Math.min(5000 * Math.pow(2, reconnectAttempts), 300000);
    }

    // Helper: Send message to Discord channel
    async function sendDiscordMessage(message) {
        if (discordChannel && discordClient.isReady()) {
            try {
                await discordChannel.send({ content: `[Archipelago] ${message}` });
            } catch (err) {
                console.error('Failed to send Discord message:', err);
            }
        }
        console.log(`[Archipelago] ${message}`);
    }

    // Reconnection logic
    function attemptReconnect(reason) {
        // Don't reconnect if already destroyed or if timer is active
        if (isDestroyed || reconnectTimer) return;

        reconnectAttempts++;

        if (reconnectAttempts > maxReconnectAttempts) {
            // sendDiscordMessage(`Failed to reconnect after ${maxReconnectAttempts} attempts. Archipelago monitor stopped.`);
            return;
        }

        const delay = getReconnectDelay();
        const minutes = Math.floor(delay / 60000);
        const seconds = Math.floor((delay % 60000) / 1000);
        const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

        // sendDiscordMessage(`Disconnected (${reason}). Reconnecting in ${timeStr}... (Attempt ${reconnectAttempts}/${maxReconnectAttempts})`);

        reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            reconnect();
        }, delay);
    }

    // Reconnect function
    async function reconnect() {
        if (isDestroyed) return;

        const port = db.archipelago.get('server_port');
        const slot = db.archipelago.get('slot');
        const game = db.archipelago.get('game');

        if (!port) {
            console.error('Archipelago server_port is not configured in the database. Cannot reconnect.');
            return;
        }

        const address = `archipelago.gg:${port}`;

        try {
            if (slot) {
                console.log(`Attempting to reconnect to Archipelago at ${address} with slot ${slot} (game ${game})...`);
                await archClient.login(address, slot, game);
            } else {
                await archClient.login(address);
            }

            // Set up socket listeners after successful reconnection
            setupSocketListeners();
            archClient.deathLink.enableDeathLink();

            // Reset attempts on successful connection
            reconnectAttempts = 0;
            await cacheSlotData();
            await syncCheckCounts();
            sendDiscordMessage('Successfully reconnected to Archipelago server!');
            console.log('Reconnected to the Archipelago server!');
        } catch (err) {
            console.error('Archipelago reconnection failed:', err);
            // Will trigger another reconnect attempt via error listener
        }
    }

    const channelId = db.archipelago.get('server_channel');
    let discordChannel = null;

    if (channelId) {
        try {
            discordChannel = await discordClient.channels.fetch(channelId);
        } catch (err) {
            console.error('Failed to fetch Discord channel for Archipelago messages:', err);
        }
    }

    const { SLOT_EMOTES } = require('./slots.js');
    const mapEmoji = (text) => {
        const emote = SLOT_EMOTES[text];
        return emote ? `${text}${emote}` : text;
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

    // Helper to format nodes into a message string safely
    function formatNodes(nodes, hint = false, item = false) {
        if (!Array.isArray(nodes)) return String(nodes || '');
        const finishedGames = db.archipelago.get('finished_games') || [];
        const anyFinished = nodes.some(n => n && typeof n.text === 'string' && finishedGames.includes(n.text.replace('\'s', '')));

        const formatted = nodes.map((node, i) => {
            if (!node) return '';
            const text = typeof node.text === 'string' ? node.text : '';

            if (node.type === 'player') return mapEmoji(text);
            if (node.type === 'item') return `**${text}**${item !== false ? ` ${flagEmote(item.flags ?? 0)}` : ''}`;
            if (node.type === 'location') return hint ? text : `\n-# at ${text}`;

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
        // Send to Discord channel
        try {
            const messageStr = formatNodes(nodes, false, _item);
            if (discordChannel && discordClient.isReady()) {
                await discordChannel.send({ content: messageStr });
            } else {
                console.log('[Archipelago]', messageStr);
            }
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

        // Increment cached check count for the sender slot
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
            const causeParts = cause ? cause.split(' ').map(str => mapEmoji(str)) : null;
            if (causeParts) causeParts[0] = `**${causeParts[0]}**`;
            const message = causeParts ? `🪦 ${causeParts.join(' ')}` : `🪦 **${mapEmoji(source)}** has died.`;
            if (discordChannel && discordClient.isReady()) {
                await discordChannel.send({ content: message });
            } else {
                console.log('[Archipelago]', message);
            }
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

    // Cache all slot data in db for autocomplete and commands
    async function cacheSlotData() {
        try {
            await archClient.package.fetchPackage(); // downloads all game packages not yet cached
            const slots = archClient.players.slots;
            const slotData = {};

            for (const slot of Object.values(slots)) {
                if (!slot.name) continue;
                const pkg = slot.game ? archClient.package.findPackage(slot.game) : null;
                slotData[slot.name] = {
                    game: slot.game,
                    type: slot.type,
                    items: pkg ? Object.keys(pkg.itemTable).sort() : [],
                    locations: pkg ? Object.keys(pkg.locationTable).sort() : [],
                };
            }

            db.archipelago.set('slot_data', slotData);
            console.log(`[Archipelago] Cached data for ${Object.keys(slotData).length} slots.`);
        } catch (err) {
            console.error('[Archipelago] Failed to cache slot data:', err);
        }
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

    const port = db.archipelago.get('server_port');
    const slot = db.archipelago.get('slot');
    const game = db.archipelago.get('game');

    if (!port) {
        console.error('Archipelago server_port is not configured in the database. Skipping Archipelago login.');
        return archClient;
    }

    const address = `archipelago.gg:${port}`;

    try {
        if (slot) {
            await archClient.login(address, slot, game);
        } else {
            await archClient.login(address);
        }

        // Set up socket listeners after successful initial connection
        setupSocketListeners();
        archClient.deathLink.enableDeathLink();
        await cacheSlotData();
        await syncCheckCounts();

        console.log('Connected to the Archipelago server!');
        sendDiscordMessage('Connected to Archipelago server!');
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
        console.log('Archipelago client destroyed');
    };

    return archClient;
}

module.exports = { start };

