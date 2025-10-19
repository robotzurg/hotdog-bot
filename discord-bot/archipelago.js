/**
 * Start the Archipelago client and forward messages into a Discord channel.
 * Dynamically imports the ESM-only `archipelago.js` package so this file can remain CommonJS.
 * @param {import('discord.js').Client} discordClient
 * @param {object} db
 * @param {boolean} isReconnect - Whether this is a reconnection attempt
 */
async function start(discordClient, db, isReconnect = false) {
    // Dynamically import the ESM-only package inside the async function
    let ArchipelagoClient;
    try {
        const mod = await import('archipelago.js');
        ArchipelagoClient = mod.Client || mod.default || mod;
    } catch (err) {
        console.error('Failed to import archipelago.js (ESM-only):', err);
        throw err;
    }

    // Ensure a WebSocket implementation exists in Node
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

    // Provide a navigator.userAgent for libraries that expect a browser-like env
    if (typeof globalThis.navigator !== 'object' || typeof globalThis.navigator?.userAgent !== 'string') {
        try {
            globalThis.navigator = globalThis.navigator || {};
            globalThis.navigator.userAgent = `Node/${process.version} (${process.platform})`;
        } catch (err) {
            console.warn('Unable to set global navigator.userAgent:', err);
        }
    }

    const archClient = new ArchipelagoClient();

    const channelId = db.archipelago.get('server_channel');
    let discordChannel = null;

    if (channelId) {
        try {
            discordChannel = await discordClient.channels.fetch(channelId);
        } catch (err) {
            console.error('Failed to fetch Discord channel for Archipelago messages:', err);
        }
    }

    // Helper to format nodes into a message string safely
    function formatNodes(nodes, hint=false) {
        if (!Array.isArray(nodes)) return String(nodes || '');
        
        const mapEmoji = (text) => {
            const formatText = text.replace('\'s', '');
            switch (formatText) {
                case 'Ethan-KD3': return `${text} <:kirbydreamland:1426636560723607585>`;
                case 'Ethan-H2': return `${text} <:hylics2:1426636541756964976>`;
                case 'Ethan-SR': return `${text} <:sonicrush:1426636527131430973>`;
                case 'Ethan-SMO': return `${text} <:smo:1426636511574622380>`;
                case 'Jeff-TBOI': return `${text} <:isaac:1426637153483624518>`;
                case 'Jeff-CLUB': return `${text} <:clubhouse:1426637140875411588>`;
                case 'Jeff-PKMN': return `${text} <:pkmnwhite:1426636855809413160>`;
                case 'YacobJeff-KTANE': return `${text} <:ktane:1426637126233100378>`;
                case 'Jeff-WOTW': return `${text} <:oriwotw:1426636447817138397>`;
                case 'Yacob-PKMN': return `${text} <:pkmnblack:1426636870363643995>`;
                case 'Yacob-SLY': return `${text} <:slytwo:1426636387532406947>`;
                case 'AllLethal': return `${text} <:lethal:1426636493543309502>`;
                case 'AvHat': return `${text} <:hatintime:1423880268460326995>`;
                case 'AvLego': return `${text} <:legostarwars:1426636286294233199>`;
                case 'AvNiko': return `${text} <:herecomesniko:1426636312479399947>`;
                case 'AvTyTiger': return `${text} <:tytiger:1426636336672018353>`;
                case 'HDW-DRG': return `${text} <:drg:1426636430657982534>`;
                case 'NateCuphead': return `${text} <:cuphead:1423881140275777578>`;
                case 'NateHat': return `${text} <:hatintime:1423880268460326995>`;
                case 'NateMario': return `${text} <:marioworld:1426636242816077967>`;
                case 'NateEmerald': return `${text} <:pkmnemerald:1426636252232290315>`;
                case 'NateOri': return `${text} <:oriforest:1423880585331478608>`;
                case 'Vlad-Hades': return `${text} <:hades:1426636348135182462>`;
                case 'Vlad-HK': return `${text} <:hollowknight:1423880850658955374>`;
                case 'Vlad-Ultra': return `${text} <:ultrakill:1426636375863722075>`;
                case 'Yacob-MIKU': return `${text} <:divamegamix:1426636473150734437>`;
                case 'Yacob-TP': return `${text} <:twilightprincess:1426636411980877985>`;
                default: return text;
            }
        };

        return nodes.map((node, index) => {
            const text = node && typeof node.text === 'string' ? node.text : '';
            let idx1 = hint ? 1 : 0;
            let idx2 = hint ? 3 : 2;
            let idx3 = hint ? 7 : 4;

            if (index === idx1) return mapEmoji(text);
            if (index === idx2) return `**${text}**`;
            if (index === idx3 && !text.includes('(')) return mapEmoji(text);
            else if (index === idx3 && hint === true) return mapEmoji(text);

            return text;
        }).join('');
    }

    // Set up message event handlers
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

    archClient.messages.on('itemHinted', async (_text, _item, _found, nodes) => {
        try {
            const messageStr = formatNodes(nodes, true);
            if (discordChannel) {
                await discordChannel.send({ content: messageStr });
            } else {
                console.log('[Archipelago]', messageStr);
            }
        } catch (err) {
            console.error('Error forwarding Archipelago message to Discord:', err);
        }
    });

    archClient.items.on('itemHinted', async (hint) => {
        try {
            const messageStr = formatNodes(hint, true);
            if (discordChannel) {
                await discordChannel.send({ content: messageStr });
            } else {
                console.log('[Archipelago]', messageStr);
            }
        } catch (err) {
            console.error('Error forwarding Archipelago message to Discord:', err);
        }
    });

    const port = db.archipelago.get('server_port');
    const slot = db.archipelago.get('slot');

    if (!port) {
        console.error('Archipelago server_port is not configured in the database. Skipping Archipelago login.');
        return archClient;
    }

    const address = `archipelago.gg:${port}`;

    try {
        if (slot) {
            await archClient.login(address, slot);
        } else {
            await archClient.login(address);
        }
        if (isReconnect) {
            console.log('Reconnected to the Archipelago server!');
        } else {
            console.log('Connected to the Archipelago server!');
        }
    } catch (err) {
        console.error('Archipelago login failed:', err);
        throw err;
    }

    return archClient;
}

/**
 * Set up automatic reconnection for the Archipelago client
 * @param {import('discord.js').Client} discordClient
 * @param {object} db
 * @param {object} archClient - The current Archipelago client
 * @returns {Function} cleanup function to stop reconnection attempts
 */
function setupReconnection(discordClient, db, getArchClient, setArchClient) {
    let reconnectTimeout = null;
    let isReconnecting = false;

    async function attemptReconnect() {
        if (isReconnecting) {
            console.log('Reconnection already in progress, skipping...');
            return;
        }

        isReconnecting = true;
        console.log('Attempting to reconnect to Archipelago server...');

        try {
            const newClient = await start(discordClient, db, true);
            setArchClient(newClient);
            
            // Set up disconnect handler for the new client
            setupDisconnectHandler(newClient);
            
            isReconnecting = false;
        } catch (err) {
            console.error('Reconnection failed, will retry in 30 seconds:', err);
            isReconnecting = false;
            
            // Retry after 30 seconds
            reconnectTimeout = setTimeout(attemptReconnect, 30000);
        }
    }

    function setupDisconnectHandler(client) {
        // Listen for WebSocket close events
        if (client && client.socket) {
            client.socket.addEventListener('close', () => {
                console.log('Archipelago connection closed, attempting reconnect...');
                attemptReconnect();
            });

            client.socket.addEventListener('error', (err) => {
                console.error('Archipelago WebSocket error:', err);
            });
        }
    }

    // Set up initial disconnect handler
    const currentClient = getArchClient();
    if (currentClient) {
        setupDisconnectHandler(currentClient);
    }

    // Optional: Periodic health check (every 5 minutes)
    const healthCheckInterval = setInterval(() => {
        const client = getArchClient();
        if (client && client.socket && client.socket.readyState !== 1) {
            console.log('Archipelago connection not healthy, reconnecting...');
            attemptReconnect();
        }
    }, 5 * 60 * 1000);

    // Return cleanup function
    return () => {
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        clearInterval(healthCheckInterval);
    };
}

module.exports = { start, setupReconnection };