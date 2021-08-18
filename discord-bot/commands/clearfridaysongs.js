const db = require("../db.js");

module.exports = {
	name: 'clearfridaysongs',
    description: 'Clear all Friday Listening Songs from the playlist. [ADMIN ONLY]',
	options: [],
	admin: false,
	execute(interaction) {
		db.friList.clear();
		interaction.editReply('Friday Playlist cleared.');
	},
};