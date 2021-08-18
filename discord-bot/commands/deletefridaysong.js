const db = require("../db.js");

module.exports = {
    name: 'deletefridaysong',
    description: 'Delete a song from Friday Listening. [ADMIN ONLY]',
    options: [
        {
            name: 'artist',
            type: 'STRING',
            description: 'Artist to add to friday listening playlist.',
            required: true,
        }, {
            name: 'song_name',
            type: 'STRING',
            description: 'Song name of song added to friday listening playlist.',
            required: true,
        }
    ],
    admin: false,
	execute(interaction) {
        db.friList.delete(`${interaction.options._hoistedOptions[0].value} - ${interaction.options._hoistedOptions[1].value}`);
        interaction.deleteReply();
	},
};