
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

    // Helper to format nodes into a message string safely
    function formatNodes(nodes, hint = false) {
        if (!Array.isArray(nodes)) return String(nodes || '');
        // Games which are considered "finished"; if any appear in the nodes
        // we will prefix the entire message with "-#" to match the format used
        // elsewhere (see check-logic.js)
        let finishedGames = db.archipelago.get('finished_games') || [
            "AriaSouls",
            "AllRepo",
            "Yacob-KH",
            "NateTruck",
            "AriaChess",
            "NateOriK"
        ];

        // determine presence of any finished game node
        const anyFinished = nodes.some(n => n && typeof n.text === 'string' && finishedGames.includes(n.text.replace('\'s', '')));

        const mapEmoji = (text) => {
            formatText = text.replace('\'s', '')
            switch (text) {
                case 'AriaCeleste':
                case 'Ethan-Celeste':
                case 'RaveelCeleste':
                    return `${text} <:celeste:1443882718591975444>`;
                case 'AllFactory':
                    return `${text} <:satisfactory:1487560192899153940>`;
                case 'AllMinecraft':
                    return `${text} <:minecraft:1439370850728935434>`;
                case 'AllRepo':
                    return `${text} <:repo:1469451338936090848>`;
                case 'AvNiko':
                    return `${text} <:herecomesniko:1426636312479399947>`; 
                case 'AvHat':
                    return `${text} <:hatintime:1423880268460326995>`;
                case 'Ethan-DKC':
                    return `${text} <:dkc1:1487560041895690475>`; 
                case 'NatePvZ':
                    return `${text} <:pvz:1469420270849757327>`;
                case 'Jeff-Stardew':
                    return `${text} <:stardew:1423880027707015199>`;
                case 'AriaChess':
                    return `${text} <:checksmate:1487620249506545855>`;
                case 'AriaLilies':
                    return `${text} <:enderlilies:1469420829698691260>`; 
                case 'AriaPizza':
                case 'RaveelPizza':
                    return `${text} <:pizzatower:1487620161526698084>`; 
                case 'AriaTruck':
                case 'Jeff-Truck':
                    return `${text} <:clustertruck:1443882716725645342>`;
                case 'Ethan-Peggle':
                    return `${text} <:peggle:1487561333808435210>`;
                case 'Ethan-Taxi':
                    return `${text} <:yellowtaxi:1487560196187488317>`;
                case 'Ethan-TOEM':
                    return `${text} <:toem:1487560818341056623>`;
                case 'Ethan-Hylics':
                    return `${text} <:hylics2:1426636541756964976>`; 
                case 'Ethan-Yoku':
                    return `${text} <:yoku:1487560197445652601>`;
                case 'NateGo':
                    return `${text} <:archipela_go:1487560042973761708>`; 
                case 'NateHunie':
                    return `${text} <:huniepop:1487560044324065561>`; 
                case 'NateMK':
                    return `${text} <:mariokartwii:1487560187421393057>`; 
                case 'NateTy':
                case 'AvTy':
                    return `${text} <:tytiger:1426636336672018553>`; 
                case 'NateWitch':
                case 'AvWitch':
                    return `${text} <:flipwitch:1469420881787752687>`; 
                case 'NateXeno':
                    return `${text} <:xenobladex:1487560193926496417>`;
                case 'AvGK':
                case 'NateGK':
                    return `${text} <:garfieldkart:1443882713957404804>`;
                case 'KirbyKSS':
                    return `${text} <:kirbyss:1469419868649558222>`;
                case 'Jeff-C64':
                    return `${text} <:celeste64:1443882717623353354>`; 
                case 'Jeff-COTM':
                    return `${text} <:cotm:1487619791869972533>`; 
                case 'Jeff-SP':
                    return `${text} <:savingprincess:1487560528850059466>`;
                case 'Jeff-TS':
                    return `${text} <:timespinner:1487560529915547868>`;
                case 'Jeff-UT':
                    return `${text} <:undertale:1443882696504770562>`; 
                case 'Ethan-Duck':
                case 'Jeff-DUCK':
                    return `${text} <:duck:1469419866946666749>`;
                case 'NateRabi':
                    return `${text} <:rabiribi:1469419871103221933>`;
                case 'Yacob-KH':
                    return `${text} <:kh1:1469419867705835642>`;
                case 'AriaOri':
                case 'Ethan-Ori':
                case 'NateOri':
                case 'RaveelOri':
                    return `${text} <:oriwotw:1426636447817138397>`
                case 'HDWClique':
                    return `${text} <:clique:1443882706550390805>`;
                case 'AvGenshin':
                    return `${text} <:genshin:1443882704834658387>`;
                case 'AriaHollow':
                case 'vlad-hk':
                case 'Yacob-HK':
                    return `${text} <:hollowknight:1423880850658955374>`;
                case 'RaveelConquest':
                    return `${text} <:startrek:1487560781783634083>`; 
                case 'RaveelXY':
                    return `${text} <:pkmny:1487560190881698003>`; 
                case 'RaveelZA':
                    return `${text} <:legendsza:1487560304870166589>`;
                case 'vlad-dd':
                    return `${text} <:deathsdoor:1443882701726941274>`;
                case 'vlad-fm':
                    return `${text} <:frogmonster:1487562749067395212>`;
                case 'vlad-mini':
                    return `${text} <:minishoot:1487617839031521460>`; 
                case 'vlad-ref':
                    return `${text} <:refunct:1487617840096874566>`;
                case 'Yacob-KH2':
                case 'Jeff-KH2':
                    return `${text} <:kingdomhearts2:1423886593399455784>`;
                case 'Yacob-Lies':
                    return `${text} <:liesofp:1487560880269951057>`;
                case 'Yacob-MIKU':
                    return `${text} <:divamegamix:1426636473150734437>`; 
                case 'Yacob-OOT':
                    return `${text} <:oot:1487560377578553426>`;
                case 'Yacob-SOLS':
                case 'Jeff-SOL':
                    return `${text} <:ninesols:1443882695913504822>`; 
                case 'Yacob-SUNSHINE':
                    return `${text} <:mariosunshine:1487560188738404492>`; 
                case 'Yacob-TP':
                    return `${text} <:twilightprincess:1426636411980877985>`; 
                case 'AriaSouls':
                    return `${text} <:darksouls3:1443882694642499688>`;
                default:
                    return text;
            }
        };

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
                return `**${text}**`;
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

