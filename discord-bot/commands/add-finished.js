const { SlashCommandBuilder } = require('discord.js');
const db = require('../db.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-finished')
        .setDescription('Add an Archipelago slot to the finished games list')
        .addStringOption(option => 
            option.setName('slot')
                .setDescription('The Archipelago slot name (e.g., AriaSouls, AllRepo)')
                .setRequired(true))
        .setDMPermission(false),
    async execute(interaction) {
        const slot = interaction.options.getString('slot');

        // Initialize finished list if it doesn't exist
        if (!db.archipelago.has('finished_games')) {
            db.archipelago.set('finished_games', []);
        }

        const finishedList = db.archipelago.get('finished_games');
        
        // Check if already in the list
        if (finishedList.includes(slot)) {
            interaction.reply(`**${slot}** is already in the finished games list!`);
            return;
        }

        // Add the slot to the finished games list
        finishedList.push(slot);
        db.archipelago.set('finished_games', finishedList);

        interaction.reply(`Added **${slot}** to the finished games list!`);
    },
};
