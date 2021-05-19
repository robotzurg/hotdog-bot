const db = require("../db.js");

module.exports = {
	name: 'clearsongs',
    description: 'Clear all Friday Listening Songs from the playlist. [ADMIN ONLY]',
	options: [],
	admin: false,
	execute(interaction) {
		db.friList.clear();
		interaction.editReply('Friday Playlist cleared.');
	},
};