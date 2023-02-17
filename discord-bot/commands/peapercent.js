const { SlashCommandBuilder } = require('discord.js');
const db = require('../db.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('peapercent')
        .setDescription('Find out someones pea percentage.')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user.')
                .setRequired(true))
        .setDMPermission(false),
	async execute(interaction) {
        // Set up random number function
        function randomNumber(min, max) {  
            return Math.random() * (max - min) + min; 
        }  

        const taggedMember = interaction.options._hoistedOptions[0].value;

        let pick;
        if (taggedMember != db.potd.get('current_potd')) {
            pick = randomNumber(1, 100)
            return interaction.editReply(`<@${taggedMember}>'s pea percentage is **${Math.round(pick)}%**!`);
        } else {
            return interaction.editReply(`<@${taggedMember}>'s pea percentage is over **9000%**!!!!`);
        }
    },
};