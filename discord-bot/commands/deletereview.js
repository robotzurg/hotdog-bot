const db = require("../db.js");

module.exports = {
    name: 'deletereview',
    aliases: ['deletereview', 'deleter', 'delreview', 'delr'],
    description: 'Edit a pre-existing review of your own.',
    args: true,
    usage: '<artist> | <song_name>',
    execute(message, args) {
        let userToDelete;
        if (message.member.hasPermission('ADMINISTRATOR')) {
            userToDelete = message.mentions.users.first(); 
        } else {
            userToDelete = message.author;
        }

        let artistArray = args[0].split(' & ');
        let rname;
        let songName;
        let fullSongName;
        let rmxArtist;

        if (args[1].toLowerCase().includes('remix')) {
            fullSongName = args[1];
            songName = args[1].substring(0, args[1].length - 7).split(' (')[0];
            rmxArtist = args[1].substring(0, args[1].length - 7).split(' (')[1];
            artistArray.push(rmxArtist);

        } else {
            songName = args[1];
            rmxArtist = false;
        }

        let songObj;
        for (let i = 0; i < artistArray.length; i++) {

            if (rmxArtist === false) {
                rname = db.reviewDB.get(artistArray[i], `${songName}.<@${userToDelete.id}>.name`);
            } else if (artistArray[i] != rmxArtist) {
                rname = db.reviewDB.get(artistArray[i], `${songName}.Remixers.${rmxArtist}.<@${userToDelete.id}>.name`);
            } else if (artistArray[i] === rmxArtist) {
                rname = db.reviewDB.get(rmxArtist, `${fullSongName}.<@${userToDelete.id}>.name`);
            }

            if (rname === undefined) return message.channel.send('No review found. *Note that deleting EP reviews is currently not supported.*');

            //Non Single Stuff (if the artistArray[i] isn't the remix artist and there is no remix artist)
            if (artistArray[i] != rmxArtist && rmxArtist === false) {
                songObj = db.reviewDB.get(artistArray[i], `${songName}`);
                delete songObj[`<@${userToDelete.id}>`];

                db.reviewDB.set(artistArray[i], songObj, `${songName}`);
        
            // If there is a remix but we aren't on the remix artist
            } else if (artistArray[i] != rmxArtist && rmxArtist != false) {
                songObj = db.reviewDB.get(artistArray[i], `${songName}.Remixers.${rmxArtist}`);
                delete songObj[`<@${userToDelete.id}>`];
                console.log(songObj);
        
                db.reviewDB.set(artistArray[i], songObj, `${songName}.Remixers.${rmxArtist}`);
        
            //Lastly, if we are on the remix artist
            } else if (artistArray[i] === rmxArtist) {
                songObj = db.reviewDB.get(artistArray[i], `${fullSongName}`);
                delete songObj[`<@${userToDelete.id}>`];
                console.log(songObj);
        
                db.reviewDB.set(artistArray[i], songObj, `${fullSongName}`);

            }
        }

        message.channel.send(`Deleted <@${userToDelete.id}>'s review of ${args[0]} - ${args[1]}.`);
	},
};