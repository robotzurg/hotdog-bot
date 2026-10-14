const { SlashCommandBuilder, InteractionContextType } = require('discord.js');
const db = require('../db.js');
const archipelago = require('../archipelago.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('archipelago-reconnect')
        .setDescription('Wakes the Archipelago room, then closes and reconnects the Archipelago connection.')
        .setContexts(InteractionContextType.Guild),

    async execute(interaction) {
        if (interaction.channel.id !== db.archipelago.get('server_channel')) {
            await interaction.reply({ content: 'This command can only be used in the Archipelago channel.' });
            return;
        }

        await interaction.reply({ content: 'Reconnecting to Archipelago...' });

        // The outcome is posted in this channel by the connection itself
        try {
            await archipelago.restart();
        } catch (err) {
            console.error('Failed to reconnect to Archipelago:', err);
            await interaction.followUp({ content: 'Failed to reconnect to Archipelago. Check the logs.' });
        }
    },
};
