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
        .setDMPermission(false),
	async execute(interaction) {
        const channel = interaction.options.getString('channel');
        const port = interaction.options.getString('port');
        db.archipelago.set('server_port', port);
        db.archipelago.set('server_channel', channel);
        interaction.reply(`Archipelago port set to ${port}`);
    },
};
