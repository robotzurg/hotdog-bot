const { SlashCommandBuilder } = require('discord.js');
const db = require('../db.js');
const archipelago = require('../archipelago.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('archipelago-reconnect')
        .setDescription('Closes and reconnects the Archipelago connection.')
        .setDMPermission(false),

    async execute(interaction) {
        if (interaction.channel.id !== db.archipelago.get('server_channel')) {
            await interaction.reply({ content: 'This command can only be used in the Archipelago channel.' });
            return;
        }

        await interaction.reply({ content: 'Reconnecting to Archipelago...' });

        try {
            await archipelago.restart(interaction.client, db);
        } catch (err) {
            console.error('Failed to reconnect to Archipelago:', err);
            await interaction.followUp({ content: 'Failed to reconnect to Archipelago. Check the logs.' });
        }
    },
};
