const { SlashCommandBuilder } = require('discord.js');
const db = require('../db.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset-finished')
        .setDescription('Clear the finished games list')
        .setDMPermission(false),
    async execute(interaction) {
        db.archipelago.set('finished_games', []);
        interaction.reply('Finished games list has been cleared!');
    },
};
