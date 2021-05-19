const db = require("../db.js");
const { genreList } = require('../arrays.json');

module.exports = {
	name: 'reset',
    description: 'Reset the game to base level with all current players. [ADMIN ONLY]',
admin: true,
	execute(interaction) {
		
			db.genreRoulette.forEach((prop, key) => {
				const genrePick = genreList[Math.floor(Math.random() * genreList.length)];
				db.genreRoulette.set(key, { genre: genrePick, status: 'alive' });
			});

			const friIDmsg = db.friID.get('friID');
			const channeltoSearch = interaction.guild.channels.cache.find(ch => ch.name === 'friday-playlist');
			(channeltoSearch.messages.fetch(friIDmsg)).then((msg) => {
				msg.reactions.removeAll();
			});

			interaction.editReply('Game reset.');

	},
};