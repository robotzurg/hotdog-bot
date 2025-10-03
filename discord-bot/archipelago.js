const { Client: ArchipelagoClient } = require('archipelago.js');

/**
 * Start the Archipelago client and forward messages into a Discord channel.
 * @param {import('discord.js').Client} discordClient
 * @param {object} db
 */
async function start(discordClient, db) {
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

    archClient.messages.on('message', async (content) => {
        try {
            if (discordChannel) {
                await discordChannel.send({ content });
            } else {
                console.log('[Archipelago]', content);
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
