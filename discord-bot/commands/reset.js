const db = require("../db.js");

module.exports = {
	name: 'reset',
    description: 'Reset the game to base level with all current players.',
	execute(message) {
		if (message.member.hasPermission('ADMINISTRATOR')) {
		
			db.genreRoulette.forEach((prop, key) => {
				const genrePick = message.client.genreList[Math.floor(Math.random() * message.client.genreList.length)];
				db.genreRoulette.set(key, { genre: genrePick, status: 'alive' });
			});

			const friIDmsg = db.friID.get('friID');
			const channeltoSearch = message.guild.channels.cache.find(ch => ch.name === 'friday-playlist');
			(channeltoSearch.messages.fetch(friIDmsg)).then((msg) => {
				msg.reactions.removeAll();
			});

			message.channel.send('Game reset.');

		} else { return message.reply('You don\'t have the perms to use this command!'); }
	},
};