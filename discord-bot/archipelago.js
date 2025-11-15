
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
                await archClient.login(address, slot, 'Minecraft');
            } else {
                await archClient.login(address);
            }

            // Set up socket listeners after successful reconnection
            setupSocketListeners();

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
            // fetch the channel using Discord client (returns a Promise)
            discordChannel = await discordClient.channels.fetch(channelId);
        } catch (err) {
            console.error('Failed to fetch Discord channel for Archipelago messages:', err);
        }
    }

    // Helper to format nodes into a message string safely
    function formatNodes(nodes, hint = false) {
        if (!Array.isArray(nodes)) return String(nodes || '');


        const mapEmoji = (text) => {
            formatText = text.replace('\'s', '')
            switch (text) {
                case 'Ethan-KD3':
                    return `${text} <:kirbydreamland:1426636560723607585>`;
                case 'Ethan-H2':
                    return `${text} <:hylics2:1426636541756964976>`;
                case 'Ethan-SR':
                    return `${text} <:sonicrush:1426636527131430973>`;
                case 'Ethan-SMO':
                    return `${text} <:smo:1426636511574622380>`;
                case 'Jeff-TBOI':
                    return `${text} <:isaac:1426637153483624518>`;
                case 'Jeff-CLUB':
                    return `${text} <:clubhouse:1426637140875411588>`;
                case 'Jeff-PKMN':
                    return `${text} <:pkmnwhite:1426636855809413160>`;
                case 'YacobJeff-KTANE':
                    return `${text} <:ktane:1426637126233100378>`;
                case 'Jeff-WOTW':
                    return `${text} <:oriwotw:1426636447817138397>`;
                case 'Yacob-PKMN':
                    return `${text} <:pkmnblack:1426636870363643995>`;
                case 'Yacob-SLY':
                    return `${text} <:slytwo:1426636387532406947>`;
                case 'AllLethal':
                    return `${text} <:lethal:1426636493543309502>`;
                case 'AvHat':
                    return `${text} <:hatintime:1423880268460326995>`;
                case 'AvLego':
                    return `${text} <:legostarwars:1426636286294233199>`;
                case 'AvNiko':
                    return `${text} <:herecomesniko:1426636312479399947>`;
                case 'AvTyTiger':
                    return `${text} <:tytiger:1426636336672018553>`;
                case 'HDW-DRG':
                    return `${text} <:drg:1426636430657982534>`;
                case 'NateCuphead':
                    return `${text} <:cuphead:1423881140275777578>`;
                case 'NateHat':
                    return `${text} <:hatintime:1423880268460326995>`;
                case 'NateMario':
                    return `${text} <:marioworld:1426636242816077967>`;
                case 'NateEmerald':
                    return `${text} <:pkmnemerald:1426636252232290315>`;
                case 'NateOri':
                    return `${text} <:oriforest:1423880585331478608>`;
                case 'Vlad-Hades':
                    return `${text} <:hades:1426636348135182462>`;
                case 'Vlad-HK':
                    return `${text} <:hollowknight:1423880850658955374>`;
                case 'Vlad-Ultra':
                    return `${text} <:ultrakill:1426636375863722075>`;
                case 'Yacob-MIKU':
                    return `${text} <:divamegamix:1426636473150734437>`;
                case 'Yacob-TP':
                    return `${text} <:twilightprincess:1426636411980877985>`
                case 'Player1':
                    return `${text} <:dome:1439370852876419104>`
                case 'Yacob-KH2':
                    return `${text} <:kingdomhearts2:1423886593399455784>`
                case 'Jeff-MC':
                    return `${text} <:minecraft:1439370850728935434>`
                case 'Ethan-SM64':
                    return `${text} <:mario64:1439370849483489310>`
                default:
                    return text;
            }
        };

        return nodes.map((node, index) => {
            const text = node && typeof node.text === 'string' ? node.text : '';
            let idx1 = hint ? 1 : 0
            let idx2 = hint ? 3 : 2
            let idx3 = hint ? 7 : 4

            if (index === idx1) {
                return mapEmoji(text);
            }

            if (index === idx2) {
                return `**${text}**`;
            }

            if (index === idx3 && !text.includes('(')) {
                return mapEmoji(text);
            } else if (index === idx3 && hint == true) {
                return mapEmoji(text);
            }

            return text;
        }).join('');
    }

    archClient.messages.on('itemSent', async (_text, _item, nodes) => {
        try {
            const messageStr = formatNodes(nodes);
            if (discordChannel) {
                await discordChannel.send({ content: messageStr });
            } else {
                console.log('[Archipelago]', messageStr);
            }
        } catch (err) {
            console.error('Error forwarding Archipelago message to Discord:', err);
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
            await archClient.login(address, slot, 'The Binding of Isaac Repentance');
        } else {
            await archClient.login(address);
        }

        // Set up socket listeners after successful initial connection
        setupSocketListeners();

        console.log('Connected to the Archipelago server!');
        sendDiscordMessage('Connected to Archipelago server!');
    } catch (err) {
        console.error('Archipelago login failed:', err);
        sendDiscordMessage(`Failed to connect: ${err.message}`);
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

