const db = require("../db.js");

module.exports = {
    name: 'editsong',
    description: 'Edit a songs Friday Listening values! [ADMIN ONLY]',
    options: [
        {
            name: 'artist',
            type: 'STRING',
            description: 'Artist added to friday listening playlist.',
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
            required: true,
        },
    ],
    admin: true,
	execute(interaction) {
        const songObj = {
            artist: interaction.options[0].value,
            song: interaction.options[1].value,
            friday: interaction.options[2].value,
        };

        let list = db.friList.keyArray();
        for (let i = 0; i < list.length; i++) {
            let list_values = db.friList.get(list[i]);
            let list_array = list_values.keyArray();
            for (let ii = 0; ii < list_array.length; ii++) {
                if (interaction.options[1].value === '')
            }
        }

        db.friList.set(`${keyNum}`, songObj);

        //interaction.editReply(`Added ${db.friList.get(`${db.friList.count}`, `artist`)} - ${db.friList.get(`${db.friList.count}`, `song`)} to the Music Listening Playlist!`);
        interaction.deleteReply();
	},
};