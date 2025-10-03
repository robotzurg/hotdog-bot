const { SlashCommandBuilder } = require('discord.js');
const db = require('../db.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-archipelago-settings')
        .setDescription('Set the settings for archipelago')
        .addStringOption(option => 
            option.setName('channel')
                .setDescription('The archipelago channel to set.')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('port')
                .setDescription('The archipelago port to set.')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('slot')
                .setDescription('The archipelago slot to set.')
                .setRequired(true))
        .setDMPermission(false),
	async execute(interaction) {
        const channel = interaction.options.getString('channel');
        const port = interaction.options.getString('port');
        const slot = interaction.options.getString('slot');
        db.archipelago.set('server_port', port);
        db.archipelago.set('server_channel', channel);
        db.archipelago.set('slot', slot);
        interaction.reply(`Archipelago port set to ${port}, server_channel set to ${channel}, slot set to ${slot}`);
    },
};
