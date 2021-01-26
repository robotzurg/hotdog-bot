const Discord = require('discord.js');
const db = require("../db.js");

module.exports = {
    name: 'getsong',
    type: 'Review DB',
    aliases: ['getsong', 'gets'],
    moreinfo: 'https://discord.com/channels/680864893552951306/794751896823922708/795552783960506370',
    description: 'Get all the data about a song and displays it in an embed message.\n\nYou can also put nothing for the artist argument, which will make the bot search the database for the song in question and display it.',
    args: true,
    usage: '<artist> [op] | <song>',
	execute(message, args) {

        let argArtistName = args[0];
        let argSongName = args[1];

        //Auto-adjustment to caps for each word
        argArtistName = argArtistName.split(' ');
        argArtistName = argArtistName.map(a => a.charAt(0).toUpperCase() + a.slice(1));
        argArtistName = argArtistName.join(' ');

        if (args.length === 1) {
            const dbKeyArray = db.reviewDB.keyArray();
            let options = [];
            
            for (let i = 0; i < dbKeyArray.length; i++) {
                let AsongArray = Object.keys(db.reviewDB.get(dbKeyArray[i]));
                AsongArray = AsongArray.filter(item => item !== 'Image');

                for (let ii = 0; ii < AsongArray.length; ii++) {
                    if (AsongArray[ii] === argArtistName && !db.reviewDB.get(dbKeyArray[i], `["${AsongArray[ii]}"].Vocals`).includes(dbKeyArray[i])) {
                        argArtistName = dbKeyArray[i];
                        argSongName = AsongArray[ii];
                        options.push([argArtistName, argSongName]);
                        options[options.length - 1] = options[options.length - 1].join(' | ');
                    } 
                }
            }
            
            if (options.length === 0) {
                return message.channel.send('There is no song in the database that exists with this name.');
            } else if (options.length > 1) {
                return message.channel.send(`Looks like multiple songs of the same name exist in the database. Please use \`!getSong <artist> | <song>\` on one of these songs to get more details:\n\`\`\`${options.join('\n')}\`\`\`\n*(Hint: You can copy paste the above into \`!getSong\`)*`);
            }
        }

        argSongName = argSongName.split(' ');
        argSongName = argSongName.map(a => a.charAt(0).toUpperCase() + a.slice(1));
        argSongName = argSongName.join(' ');

        if (argSongName.includes('EP') || argSongName.includes('LP') || argSongName.toLowerCase().includes('the remixes')) {
            return message.channel.send('This isn\'t a single! Please use `!getEP` to get EP/LP overviews.');
        }


        // Function to grab average of all ratings later
        let average = (array) => array.reduce((a, b) => a + b) / array.length;

        const artistName = argArtistName.split(' & ');

        for (let i = 0; i < artistName.length; i++) {
            if (!db.reviewDB.has(artistName[i])) {
                return message.channel.send(`The artist \`${artistName[i]}\` is not in the database, therefore this song isn't either.`);
            }
        }
        
        let songName = argSongName;
        let rmxArtist = false;
        let songObj;
        let songEP = false;
        let remixObj;
        let remixes = [];
        let fullSongName = false;

        let artistsEmbed = argArtistName;
        let vocalistsEmbed = [];

        //Take out the ft./feat.
        if (argSongName.includes('(feat')) {

            songName = argSongName.split(` (feat`);
            if (argSongName.toLowerCase().includes('remix')) { 
                rmxArtist = songName[1].split(' [')[1].slice(0, -6);
                fullSongName = `${songName} [${rmxArtist}Remix]`;
            }
            songName = songName[0];

        } else if (argSongName.includes('(ft')) {

            songName = argSongName.split(` (ft`);
            if (argSongName.toLowerCase().includes('remix')) { 
                rmxArtist = songName[1].split(' [')[1].slice(0, -6); 
                fullSongName = `${songName} [${rmxArtist}Remix]`;
            }
            songName = songName[0];

        }

        if (fullSongName === false) {
            fullSongName = songName;
        }
    
        //Remix preparation
        if (songName.toLowerCase().includes('remix')) {
            songName = argSongName.split(` [`)[0];
            rmxArtist = argSongName.split(' [')[1].slice(0, -7);
            fullSongName = `${songName} [${rmxArtist} Remix]`;
        } else if (songName.toLowerCase().includes('bootleg]')) {
            songName = argSongName.substring(0, argSongName.length - 10).split(' [')[0];
            rmxArtist = argSongName.substring(0, argSongName.length - 10).split(' [')[1];
            fullSongName = `${songName} [${rmxArtist} Bootleg]`;
        } else if (songName.toLowerCase().includes('flip]') || songName.toLowerCase().includes('edit]')) {
            songName = argSongName.substring(0, argSongName.length - 6).split(' [')[0];
            rmxArtist = argSongName.substring(0, argSongName.length - 6).split(' [')[1];
        }

        //Adjust (VIP)
        if (songName.includes('(VIP)')) {
            songName = songName.split(' (');
            songName = `${songName[0]} ${songName[1].slice(0, -1)}`;
        }

        // This is for adding in collaborators/vocalists into the name inputted into the embed title, NOT for getting data out.
        if (db.reviewDB.get(artistName[0], `["${songName}"].Collab`) != undefined) {
            if (db.reviewDB.get(artistName[0], `["${songName}"].Collab`).length != 0) {
                artistsEmbed = [artistName[0]];
                artistsEmbed.push(db.reviewDB.get(artistName[0], `["${songName}"].Collab`));
                artistsEmbed = artistsEmbed.join(' & ');
            }
        }

        if (db.reviewDB.get(artistName[0], `["${songName}"].Vocals`) != undefined) {
            if (db.reviewDB.get(artistName[0], `["${songName}"].Vocals`).length != 0) {
                vocalistsEmbed = [];
                vocalistsEmbed.push(db.reviewDB.get(artistName[0], `["${songName}"].Vocals`));
                vocalistsEmbed = vocalistsEmbed.join(' & ');
            }
        }


        if (rmxArtist === false) {
            songObj = db.reviewDB.get(artistName[0], `["${songName}"]`);
            songEP = db.reviewDB.get(artistName[0], `["${songName}"].EP`);
            remixObj = db.reviewDB.get(artistName[0], `["${songName}"].Remixers`);

            if (remixObj != false && remixObj != undefined && remixObj != null) {
                let remixObjKeys = Object.keys(remixObj);

                for (let i = 0; i < remixObjKeys.length; i++) {
                    remixes.push(`\`${remixObjKeys[i]} Remix\``);
                }
            }

            if (songEP === undefined) songEP = false;
        } else {
            songObj = db.reviewDB.get(rmxArtist, `["${fullSongName}"]`);
            songEP = db.reviewDB.get(rmxArtist, `["${fullSongName}"].EP`);
            if (songEP === undefined) songEP = false;
        }
        
        if (songObj === undefined) return message.channel.send('The requested song does not exist.\nUse `!getArtist` to get a full list of this artist\'s songs.');

        let userArray = Object.keys(songObj);
        
        userArray = userArray.filter(e => e !== 'EP');
        userArray = userArray.filter(e => e !== 'Image');
        userArray = userArray.filter(e => e !== 'Remixers');
        userArray = userArray.filter(e => e !== 'Collab');
        userArray = userArray.filter(e => e !== 'Vocals');
        
        const rankNumArray = [];

        const exampleEmbed = new Discord.MessageEmbed()
            .setColor(`${message.member.displayHexColor}`);

            if (!argSongName.includes('(feat') && !argSongName.includes('(ft') && vocalistsEmbed.length != 0) {
                vocalistsEmbed = `${argSongName} (ft. ${vocalistsEmbed})`;
                exampleEmbed.setTitle(`${artistsEmbed} - ${vocalistsEmbed}`);
            } else {
                exampleEmbed.setTitle(`${artistsEmbed} - ${argSongName}`);
            }

            for (let i = 0; i < userArray.length; i++) {
                if (userArray[i] != 'EP') {
                    let rating;
                    if (rmxArtist === false) {
                        rating = db.reviewDB.get(artistName[0], `["${songName}"].${userArray[i]}.rate`);
                    } else {
                        rating = db.reviewDB.get(artistName[0], `["${songName}"].Remixers.["${rmxArtist}"].${userArray[i]}.rate`);
                    }
                    rankNumArray.push(parseFloat(rating.slice(0, -3)));
                    userArray[i] = `${userArray[i]} \`${rating}\``;
                }
            }
            
            if (rankNumArray.length != 0) {
                exampleEmbed.setDescription(`*The average rating of this song is* ***${Math.round(average(rankNumArray) * 10) / 10}!***`);
            } else {
                exampleEmbed.setDescription(`*The average rating of this song is N/A*`);
            }

            if (userArray != 0) {
                exampleEmbed.addField('Reviews:', userArray);
            } else {
                exampleEmbed.addField('Reviews:', 'No reviews :(');
            }

            if (remixes.length != 0) {
                exampleEmbed.addField('Remixes:', remixes);
            } 

            if (rmxArtist === false) {
                if ((db.reviewDB.get(artistName[0], `["${songName}"].Image`)) === false) {
                    exampleEmbed.setThumbnail(message.author.avatarURL({ format: "png" }));
                } else {
                    exampleEmbed.setThumbnail(db.reviewDB.get(artistName[0], `["${songName}"].Image`));
                    if (songEP != false) {
                        exampleEmbed.setFooter(`from the ${songEP}`, db.reviewDB.get(artistName[0], `["${songName}"].Image`));
                    }
                }
            } else {
                if (db.reviewDB.get(artistName[0], `["${songName}"].Remixers.["${rmxArtist}"].Image`) === false) {
                    exampleEmbed.setThumbnail(message.author.avatarURL({ format: "png" }));
                } else {
                    exampleEmbed.setThumbnail(db.reviewDB.get(artistName[0], `["${songName}"].Remixers.["${rmxArtist}"].Image`));
                    if (songEP != false) {
                        exampleEmbed.setFooter(`from the ${songEP}`, db.reviewDB.get(artistName[0], `["${songName}"].Remixers.["${rmxArtist}"].Image`));
                    }
                }
            }
        
        message.channel.send(exampleEmbed);
	},
};