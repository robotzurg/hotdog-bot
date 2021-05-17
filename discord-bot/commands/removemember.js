const db = require("../db.js");

module.exports = {
    name: 'removemember',
    description: 'Remove a member from the genre roulette game. [Admin Only]',
    options: [{
        name: 'user',
        type: 'STRING',
        description: 'User to remove from the game.',
        required: true,
    }],
    admin: true,
	execute(interaction) {
            const user = interaction.options[0].value;
            if (!db.genreRoulette.has(user)) return interaction.editReply(`${user} is not in the game!`);

            db.genreRoulette.delete(user);
            interaction.editReply(`${user} has been removed from the game.`);
	},
};