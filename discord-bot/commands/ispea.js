const { SlashCommandBuilder } = require('discord.js');
const db = require('../db.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ispea')
        .setDescription('Find out if someone is pea!')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user.')
                .setRequired(true))
        .setDMPermission(false),
	async execute(interaction) {
        const taggedMember = interaction.options.getUser('user');

        const responses = [
            'pea.',
            `not pea.`,
            'very pea!',
            'not pea at all!',
            'unsure of themselves.',
            'so unbelievably pea, that I cannot compute this. Wow.',
            'so incredibly un-pea, I am truly amazed.',
            'so pea they are <:pepehehe:784594747406286868>',
            'sooooooooooooooooo not pea, they are cool and epic and pog!',
            'reaching Yul levels of pea...',
            'reaching Xeno levels of pea...',
            'quite the pea, wth wth wth how are you so pea, are you ok, do you need a doctor, I can go get a doctor if you need',
            'the most anti-pea ever, they HATE vegetables and it\'s quite obvious.',
            'based. Just straight up based.',
            'pea, Just straight up pea.',
            'a little pea.',
            'quite pea!',
            'a real pea of the day contender for sure. Maybe they\'ll get it next?',
            'guaranteed to end up being laughed at for their pea takes, so definitely pea.',
            '<:peepoLurk:1064997406409764945>'
        ];

        let pick;
        if (taggedMember != db.potd.get('current_potd')) {
            pick = responses[Math.floor(Math.random() * responses.length)];
            interaction.editReply(`<@${taggedMember.id}> is ${pick}`);
        } else {
            pick = `This user... <@${taggedMember.id}>... They've gone beyond simply being pea...\nThey've become pea of the day.`;
            interaction.editReply(`${pick}`);
        }
    },
};
