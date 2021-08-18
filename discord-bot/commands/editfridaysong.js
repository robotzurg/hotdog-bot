const db = require("../db.js");

module.exports = {
    name: 'editfridaysong',
    description: 'Edit a song in Friday Listening. [ADMIN ONLY]',
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
        }, {
            name: 'friday',
            type: 'BOOLEAN',
            description: 'What to change the song to (if its in playlist or not)',
            required: true,
        },
    ],
    admin: false,
	execute(interaction) {
        const songObj = {
            artist: interaction.options._hoistedOptions[0].value,
            song: interaction.options._hoistedOptions[1].value,
            friday: interaction.options._hoistedOptions[2].value,
        };

        db.friList.set(`${interaction.options._hoistedOptions[0].value} - ${interaction.options._hoistedOptions[1].value}`, songObj);

        // interaction.editReply(`Added ${db.friList.get(`${db.friList.count}`, `artist`)} - ${db.friList.get(`${db.friList.count}`, `song`)} to the Music Listening Playlist!`);
        interaction.deleteReply();
	},
};