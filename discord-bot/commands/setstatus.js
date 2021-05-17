const db = require("../db.js");

module.exports = {
    name: 'setstatus',
    description: 'Set the status of a current player in the Genre Roulette game. [Admin Only]',
    options: [
        {
            name: 'key',
            type: 'STRING',
            description: 'User Key',
            required: true,
        }, {
            name: 'status',
            type: 'STRING',
            description: 'Status of the User in the game.',
            required: true,
        },
    ],
    admin: true,
	execute(interaction) {
        const args = [];
        args[0] = interaction.options[0].value;
        args[1] = interaction.options[1].value;

        if (!db.genreRoulette.has(args[0])) return interaction.editReply(`${args[0]} is not in the game!`);

        const currentGenre = db.genreRoulette.get(args[0], 'genre');
        db.genreRoulette.set(args[0], { genre: currentGenre, status: args[1] });
        interaction.editReply(`Set ${args[0]}'s status to ${db.genreRoulette.get(args[0], `status`)}`);
	},
};