const { SlashCommandBuilder, InteractionContextType } = require('discord.js');
const archipelago = require('../archipelago.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('archipelago-enabled')
        .setDescription('Turn the Archipelago connection on or off, e.g. while no Archipelago is running.')
        .addBooleanOption(option =>
            option.setName('enabled')
                .setDescription('Whether the bot should connect to Archipelago.')
                .setRequired(true))
        .setContexts(InteractionContextType.Guild),

    async execute(interaction) {
        const enabled = interaction.options.getBoolean('enabled');

        if (enabled === archipelago.isEnabled()) {
            await interaction.reply(`Archipelago is already ${enabled ? 'enabled' : 'disabled'}.`);
            return;
        }

        await interaction.reply(enabled ? 'Enabling Archipelago and connecting...' : 'Disabling Archipelago...');

        // The connection outcome is posted in the Archipelago channel by the connection itself
        try {
            await archipelago.setEnabled(enabled);
        } catch (err) {
            console.error('Failed to toggle Archipelago:', err);
            await interaction.followUp('Failed to change the Archipelago setting. Check the logs.');
        }
    },
};
