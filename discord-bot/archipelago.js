
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
                await archClient.login(address, slot, 'Clique');
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
                case 'Jeff-CRYPT':
                    return `${text} <:necrodancer:1443882720928206959>`;
                case 'Jeff-ALTTP':
                    return `${text} <:lttp:1443882719749607506>`;
                case 'Jeff-C':
                case 'NateCeleste':
                case 'iapg-celeste':
                case 'Yacob-C':
                    return `${text} <:celeste:1443882718591975444>`;
                case 'Jeff-C64':
                    return `${text} <:celeste64:1443882717623353354>`;
                case 'Jeff-CHESS':
                    return `${text} ♟️`;
                case 'Jeff-YD':
                    return `${text} 🎲`;
                case 'AvTruck':
                    return `${text} <:clustertruck:1443882716725645342>`;
                case 'Avresa':
                case 'RaveelGK':
                case 'NateGK':
                    return `${text} <:garfieldkart:1443882713957404804>`;
                case 'AvHitman':
                    return `${text} <:hitman:1443882715698040832>`;
                case 'AvScoob':
                    return `${text} <:scoobydoo:1443882712988520539>`;
                case 'AvSimp':
                    return `${text} <:simpsons:1443882712074289255>`;
                case 'AvSWCS':
                    return `${text} <:legostarwars:1426636286294233199>`;
                case 'AvTyger':
                case 'NateTy':
                    return `${text} <:tytiger:1426636336672018553>`;
                case 'AvOri':
                case 'Yacob-ORI':
                case 'NateOri':
                    return `${text} <:oriwotw:1426636447817138397>`
                case 'Ethan-K64':
                    return `${text} <:kirby64:1443882711159930953>`;
                case 'Ethan-PSY':
                    return `${text} <:psychonauts:1443882709809238107>`;
                case 'Ethan-Paint':
                    return `${text} 🎨`;
                case 'Ethan-LGG':
                    return `${text} <:lilgator:1443882708873904180>`;
                case 'Ethan-BW':
                case 'AriaPokemon':
                    return `${text} <:pkmnblack:1426636870363643995>`;
                case 'NateWord':
                    return `${text} <:wordle:1443882707942768693>`;
                case 'NateClique':
                case 'HDWClique':
                    return `${text} <:clique:1443882706550390805>`;
                case 'NateWitness':
                    return `${text} <:witness:1443882705895952384>`;
                case 'NateGenshin':
                    return `${text} <:genshin:1443882704834658387>`;
                case 'vlad-ash':
                    return `${text} <:shorthike:1443882704084140042>`;
                case 'vlad-sha':
                    return `${text} <:shapez:1443882702741966848>`;
                case 'vlad-dd':
                    return `${text} <:deathsdoor:1443882701726941274>`;
                case 'vlad-ter':
                    return `${text} <:calamity:1443882700728438907>`;
                case 'vlad-blas':
                    return `${text} <:blasphemous:1443882699726131270>`;
                case 'vlad-ultra':
                case 'Yacob-ULTRA':
                    return `${text} <:ultrakill:1426636375863722075>`;
                case 'RavelInscryptio':
                    return `${text} <:inscryption:1443882698337816641>`;
                case 'RaveelFFPS':
                    return `${text} <:fnaf6:1443882697524121671>`;
                case 'RaveelBW':
                    return `${text} <:pkmnwhite:1426636855809413160>`;
                case 'iapg-HK':
                    return `${text} <:hollowknight:1423880850658955374>`;
                case 'iapg-UT':
                    return `${text} <:undertale:1443882696504770562>`;
                case 'Yacob-KH2':
                    return `${text} <:kingdomhearts2:1423886593399455784>`;
                case 'Yacob-SOL':
                    return `${text} <:ninesols:1443882695913504822>`;
                case 'Yacob-DS3':
                    return `${text} <:darksouls3:1443882694642499688>`;
                case 'Yacob-MIKU':
                    return `${text} <:divamegamix:1426636473150734437>`;
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
            await archClient.login(address, slot, 'Clique');
        } else {
            await archClient.login(address);
        }

        // Set up socket listeners after successful initial connection
        setupSocketListeners();

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

