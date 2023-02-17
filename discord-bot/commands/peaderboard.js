const { SlashCommandBuilder } = require('discord.js');
const db = require('../db.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('peaderboard')
        .setDescription('View the pea of the day leaderboard.')
        .setDMPermission(false),
	async execute(interaction) {
        interaction.editReply('Peaderboard here');
    },
};