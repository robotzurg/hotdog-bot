// const prefix = require('./config.json');
const db = require("../db.js");

module.exports = {
    name: 'ispea',
    description: 'Find out if someone is pea!',
    options: [{
        name: 'user',
        type: 'USER',
        description: 'Who you want to find out is pea or not.',
        required: true,
    }],
	execute(interaction) {
        const taggedMember = interaction.options[0].value;

        const responses = [
            'pea.',
            `not pea.`,
            'very pea!',
            'not pea at all!',
            'a little pea, but not too much.',
            'unsure of themselves.',
            'so unbelievably pea, that I cannot compute this. Wow.',
            'so incredibly un-pea, I am truly amazed.',
            'so pea they are <:pepehehe:784594747406286868>',
            'sooooooooooooooooo not pea, they are cool and epic and pog!',
            'reaching yul levels of pea...',
        ];

        let pick;
        if (taggedMember != db.potdID.get('ID')) {
            pick = responses[Math.floor(Math.random() * responses.length)];
            return interaction.editReply(`<@${taggedMember}> is ${pick}`);
        } else {
            pick = `This user... <@${taggedMember}>... They've gone beyond simply being pea...\nThey've become pea of the day.`;
            return interaction.editReply(`${pick}`);
        }
        
    },
};