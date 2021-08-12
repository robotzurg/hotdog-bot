const db = require("../db.js");
const { genreList } = require('../arrays.json');

module.exports = {
    name: 'addmember',
    description: 'Add a member to the genre roulette game. [Admin Only]',
    options: [{
        name: 'user',
        type: 'STRING',
        description: 'User to add to the game.',
        required: true,
    }],
    admin: true,
	execute(interaction) {
        const user = interaction.options._hoistedOptions[0].value;
        const genrePick = genreList[Math.floor(Math.random() * genreList.length)];
        const userObj = {
            genre: genrePick,
            status: 'alive',
        };
        db.genreRoulette.set(`${user}`, userObj);
        interaction.editReply(`${user}'s genre has been set to ${db.genreRoulette.get(user, `genre`)}.`);
        interaction.followUp(`${user}'s status has been set to ${db.genreRoulette.get(user, `status`)}.`);
	},
};