const { SlashCommandBuilder } = require('discord.js');
const db = require('../db.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear-ap-history')
        .setDescription('Permanently delete all recorded Archipelago history (items + deaths)')
        .addStringOption(option =>
            option.setName('confirm')
                .setDescription('Type "yes" to confirm')
                .setRequired(true))
        .setDMPermission(false),

    async execute(interaction) {
        const confirm = interaction.options.getString('confirm');
        if (confirm.toLowerCase() !== 'yes') {
            await interaction.reply({ content: 'Confirmation not received. Type `yes` to confirm. History was not cleared.', ephemeral: true });
            return;
        }

        const history = db.archipelago.get('ap_history') ?? [];
        const count = history.length;
        db.archipelago.set('ap_history', []);
        await interaction.reply({ content: `Cleared **${count}** events from Archipelago history.`, ephemeral: true });
    },
};
