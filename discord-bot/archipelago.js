
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
        if (discordChannel) {
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

        if (!port) {
            console.error('Archipelago server_port is not configured in the database. Cannot reconnect.');
            return;
        }

        const address = `archipelago.gg:${port}`;

        try {
            if (slot) {
                console.log(`Attempting to reconnect to Archipelago at ${address} with slot ${slot}...`);
                await archClient.login(address, slot, 'Clique');
            } else {
                await archClient.login(address);
            }

            // Set up socket listeners after successful reconnection
            setupSocketListeners();
            archClient.deathLink.enableDeathLink();

            // Reset attempts on successful connection
            reconnectAttempts = 0;
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

    // Helper to format nodes into a message string safely
    function formatNodes(nodes, hint = false, item = false) {
        if (!Array.isArray(nodes)) return String(nodes || '');
        let finishedGames = db.archipelago.get('finished_games') || [
            "AriaSouls",
            "AllRepo",
            "Yacob-KH",
            "NateTruck",
            "AriaChess",
            "NateOriK"
        ];

        const anyFinished = nodes.some(n => n && typeof n.text === 'string' && finishedGames.includes(n.text.replace('\'s', '')));

        // build the formatted string from individual nodes
        const formatted = nodes.map((node, index) => {
            const text = node && typeof node.text === 'string' ? node.text : '';
            let idx1 = hint ? 1 : 0
            let idx2 = hint ? 3 : 2
            let idx3 = hint ? 7 : 4

            if (index === idx1) {
                return mapEmoji(text);
            }

            if (index === idx2) {
                return `**${text}**${item != false ? ` ${flagEmote(item.flags ?? 0)}` : ``}`;
            }

            if (index === idx3 && !text.includes('(')) {
                return mapEmoji(text);
            } else if (index === idx3 && hint == true) {
                return mapEmoji(text);
            }

            return text;
        }).join('');

        // if any of the nodes correspond to a finished game, prefix the
        // final string with '-#'
        return anyFinished ? `-# ${formatted}` : formatted;
    }

    archClient.messages.on('itemSent', async (_text, _item, nodes) => {
        try {
            const messageStr = formatNodes(nodes, false, _item);
            if (discordChannel) {
                await discordChannel.send({ content: messageStr });
            } else {
                console.log('[Archipelago]', messageStr);
            }
        } catch (err) {
            console.error('Error forwarding Archipelago message to Discord:', err);
        }
    });


    archClient.deathLink.on('deathReceived', async (source, _time, cause) => {
        try {
            const causeStr = cause ? `: ${cause}` : '';
            const message = `💀 **${mapEmoji(source)}** has died${causeStr}`;
            if (discordChannel) {
                await discordChannel.send({ content: message });
            } else {
                console.log('[Archipelago]', message);
            }
        } catch (err) {
            console.error('Error forwarding DeathLink message to Discord:', err);
        }
    });

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

        // If the client has a different way to listen for disconnections, add them here
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

    if (!port) {
        console.error('Archipelago server_port is not configured in the database. Skipping Archipelago login.');
        return archClient;
    }

    const address = `archipelago.gg:${port}`;

    try {
        if (slot) {
            await archClient.login(address, slot, 'Clique');
        } else {
            await archClient.login(address);
        }

        // Set up socket listeners after successful initial connection
        setupSocketListeners();
        archClient.deathLink.enableDeathLink();

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

