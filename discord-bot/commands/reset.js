const db = require("../db.js");
const { genreList } = require('../arrays.json');

module.exports = {
	name: 'reset',
    description: 'Reset the game to base level with all current players. [ADMIN ONLY]',
	admin: true,
	execute(interaction) {
		let genreListRemove = genreList;
		
		db.genreRoulette.forEach((prop, key) => {
			console.log(genreListRemove);
			const genrePick = genreListRemove[Math.floor(Math.random() * genreListRemove.length)];
			db.genreRoulette.set(key, { genre: genrePick, status: 'alive' });
			genreListRemove = genreListRemove.filter(item => item != genrePick);
		});

		interaction.editReply('Game reset.');
	},
};