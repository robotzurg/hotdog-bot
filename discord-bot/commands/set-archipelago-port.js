const { SlashCommandBuilder } = require('discord.js');
const db = require('../db.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-archipelago-settings')
        .setDescription('Set the settings for archipelago')
        .addChannelOption(option => 
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
        .addStringOption(option =>
            option.setName('game')
                .setDescription('The archipelago game name to log in as.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('room_url')
                .setDescription('The archipelago.gg room URL, used to auto-detect port changes and keep the room awake.')
                .setRequired(false))
        .setDMPermission(false),
	async execute(interaction) {
        const channel = interaction.options.getChannel('channel');
        const port = interaction.options.getString('port');
        const slot = interaction.options.getString('slot');
        const game = interaction.options.getString('game');
        const roomUrl = interaction.options.getString('room_url');
        db.archipelago.set('server_port', port);
        db.archipelago.set('server_channel', channel.id);
        db.archipelago.set('slot', slot);
        db.archipelago.set('game', game);
        if (roomUrl) db.archipelago.set('room_url', roomUrl);
        interaction.reply(`Archipelago port set to ${port}, server_channel set to ${channel}, slot set to ${slot}, game set to ${game}${roomUrl ? `, room_url set to ${roomUrl}` : ''}`);
    },
};
