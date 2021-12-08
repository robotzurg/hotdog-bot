// const prefix = require('./config.json');
const db = require("../db.js");

module.exports = {
    name: 'peapercent',
    description: 'Find out someones pea percentage',
    options: [{
        name: 'user',
        type: 'USER',
        description: 'Who you want to find out the pea percentage of',
        required: true,
    }],
	execute(interaction) {

        // Set up random number function
        function randomNumber(min, max) {  
            return Math.random() * (max - min) + min; 
        }  

        const taggedMember = interaction.options._hoistedOptions[0].value;

        let pick;
        if (taggedMember != db.potdID.get('ID')) {
            pick = randomNumber(1, 100)
            return interaction.editReply(`<@${taggedMember}>'s pea percentage is **${Math.round(pick)}%**!`);
        } else {
            return interaction.editReply(`<@${taggedMember}>'s pea percentage is over **9000%**!!!!`);
        }
        
    },
};