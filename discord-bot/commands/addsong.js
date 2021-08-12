const db = require("../db.js");

module.exports = {
    name: 'addsong',
    description: 'Add a song to Friday Listening! [ADMIN ONLY]',
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
            description: 'Add this to the main playlist, or no?',
            required: false,
        },
    ],
    admin: true,
	execute(interaction) {
        const songObj = {
            artist: interaction.options._hoistedOptions[0].value,
            song: interaction.options._hoistedOptions[1].value,
            friday: false,
        };

        if (interaction.options.length === 3) {
            songObj.friday = interaction.options._hoistedOptions[2].value;
        }


        const keyNum = db.friList.count + 1;

        db.friList.set(`${keyNum}`, songObj);

        //interaction.editReply(`Added ${db.friList.get(`${db.friList.count}`, `artist`)} - ${db.friList.get(`${db.friList.count}`, `song`)} to the Music Listening Playlist!`);
        interaction.deleteReply();
	},
};