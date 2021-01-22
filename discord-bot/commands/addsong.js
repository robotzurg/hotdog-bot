const db = require("../db.js");

module.exports = {
    name: 'addsong',
    type: 'Admin',
    description: 'Add a song to Friday Listening! [ADMIN ONLY]',
    args: true,
    usage: '<artist> | <song> | <[op] friday>',
	execute(message, args) {
        if (message.member.hasPermission('ADMINISTRATOR')) {
            const songObj = {
                artist: args[0],
                song: args[1],
                friday: false,
            };

            if (args.length === 3) {
                songObj.friday = true;
            }


            const keyNum = db.friList.count + 1;

            db.friList.set(`${keyNum}`, songObj);

            message.channel.send(`Added ${db.friList.get(`${db.friList.count}`, `artist`)} - ${db.friList.get(`${db.friList.count}`, `song`)} to the Music Listening Playlist!`).then(msg => {
                msg.delete({ timeout: 10000 }); 
            })
            .catch(console.error);

            message.delete({ timeout: 10000 });
        } else { return message.reply('You don\'t have the perms to use this command!').then(msg => { msg.delete({ timeout: 10000 }); }); }
	},
};