
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
    function formatNodes(nodes) {
        if (!Array.isArray(nodes)) return String(nodes || '');

        const mapEmoji = (text) => {
            switch (text) {
                case 'AvHat':
                case 'Yacob-AHIT':
                    return `${text} <:hatintime:1423880268460326995>`;
                case 'AvOri':
                    return `${text} <:oriforest:1423880585331478608>`;
                case 'Ethan-CH':
                    return `${text} <:cuphead:1423881140275777578>`;
                case 'Ethan-ROR2':
                    return `${text} <:riskofrain2:1423881039729790987>`;
                case 'Yacob-KH2':
                    return `${text} <:kingdomhearts2:1423886593399455784>`;
                case 'Jeff-HK':
                case 'NateHK':
                    return `${text} <:hollowknight:1423880850658955374>`;
                case 'Jeff-STAR':
                    return `${text} <:stardew:1423880027707015199>`;
                case 'NateMM':
                    return `${text} <:majorasmask:1423881280931500125>`;
                case 'VladSub':
                    return `${text} <:subnautica:1423881431792222278>`;
                case 'VladTerraria':
                    return `${text} <:terraria:1423881567499190364>`;
                default:
                    return text;
            }
        };

        return nodes.map((node, index) => {
            const text = node && typeof node.text === 'string' ? node.text : '';

            if (index === 0) {
                return mapEmoji(text);
            }

            if (index === 2) {
                return `**${text}**`;
            }

            if (index === 4 && !text.includes('(')) {
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

    archClient.messages.on('itemHinted', async (_text, _item, _found, nodes) => {
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
        console.log('Connected to the Archipelago server!');
    } catch (err) {
        console.error('Archipelago login failed:', err);
    }

    return archClient;
}

module.exports = { start };

