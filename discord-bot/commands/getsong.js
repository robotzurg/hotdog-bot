const Discord = require('discord.js');
const db = require("../db.js");

module.exports = {
	name: 'getsong',
    description: 'Get all the data about a song.',
    args: true,
    usage: '<artist> | <song>',
	execute(message, args) {

        if (args.length === 1) {
            return message.channel.send(`Missing arguments!\nProper usage is: \`<artist> | <song>\``);
        }

        if (args[1].includes('EP') || args[1].includes('LP') || args[1].toLowerCase().includes('the remixes')) {
            return message.channel.send('This isn\'t a single! Please use `!getEP` to get EP/LP overviews.');
        }


        // Function to grab average of all ratings later
        let average = (array) => array.reduce((a, b) => a + b) / array.length;

        const artistName = args[0].split(' & ');

        for (let i = 0; i < artistName.length; i++) {
            if (!db.reviewDB.has(artistName[i])) {
                return message.channel.send(`The artist \`${artistName[i]}\` is not in the database, therefore this song isn't either.`);
            }
        }
        
        let songName = args[1];
        let rmxArtist = false;
        let songObj;
        let songEP = false;
        let fullSongName = false;
        

        //Take out the ft./feat.
        if (args[1].includes('(feat')) {

            songName = args[1].split(` (feat`);
            if (args[1].toLowerCase().includes('remix')) { rmxArtist = songName[1].split(' [')[1].slice(0, -6); }
            songName = songName[0];
            fullSongName = `${songName} [${rmxArtist}Remix]`;

        } else if (args[1].includes('(ft')) {

            songName = args[1].split(` (ft`);
            if (args[1].toLowerCase().includes('remix')) { rmxArtist = songName[1].split(' [')[1].slice(0, -6); }
            songName = songName[0];
            fullSongName = `${songName} [${rmxArtist}Remix]`;

        }

        if (fullSongName === false) {
            fullSongName = songName;
        }
    
        //Remix preparation
        if (songName.toLowerCase().includes('remix')) {
            songName = args[1].split(` [`)[0];
            rmxArtist = args[1].split(' [')[1].slice(0, -7);
            fullSongName = `${songName} [${rmxArtist} Remix]`;
        } else if (songName.toLowerCase().includes('bootleg]')) {
            songName = args[1].substring(0, args[1].length - 10).split(' [')[0];
            rmxArtist = args[1].substring(0, args[1].length - 10).split(' [')[1];
            fullSongName = `${songName} [${rmxArtist} Bootleg]`;
        } else if (songName.toLowerCase().includes('flip]') || songName.toLowerCase().includes('edit]')) {
            songName = args[1].substring(0, args[1].length - 6).split(' [')[0];
            rmxArtist = args[1].substring(0, args[1].length - 6).split(' [')[1];
        }

        //Adjust (VIP)
        if (songName.includes('(VIP)')) {
            songName = songName.split(' (');
            songName = `${songName[0]} ${songName[1].slice(0, -1)}`;
        }

        if (rmxArtist === false) {
            songObj = db.reviewDB.get(artistName[0], `${songName}`);
            songEP = db.reviewDB.get(artistName[0], `${songName}.EP`);
            if (songEP === undefined) songEP = false;
        } else {
            songObj = db.reviewDB.get(rmxArtist, `${fullSongName}`);
            songEP = db.reviewDB.get(rmxArtist, `${fullSongName}.EP`);
            if (songEP === undefined) songEP = false;
        }
        
        if (songObj === undefined) return message.channel.send('The requested song does not exist.\nUse `!getArtist` to get a full list of this artist\'s songs.');

        let userArray = Object.keys(songObj);
        
        userArray = userArray.filter(e => e !== 'EP');
        userArray = userArray.filter(e => e !== 'Image');
        userArray = userArray.filter(e => e !== 'Remixers');
        
        const rankNumArray = [];

        const exampleEmbed = new Discord.MessageEmbed()
            .setColor(`${message.member.displayHexColor}`)
            .setTitle(`${args[0]} - ${fullSongName} ratings`);
            for (let i = 0; i < userArray.length; i++) {
                if (userArray[i] != 'EP') {
                    let rating;
                    if (rmxArtist === false) {
                        rating = db.reviewDB.get(artistName[0], `${songName}.${userArray[i]}.rate`);
                    } else {
                        rating = db.reviewDB.get(artistName[0], `${songName}.Remixers.${rmxArtist}.${userArray[i]}.rate`);
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

            if (rmxArtist === false) {
                if ((db.reviewDB.get(artistName[0], `${songName}.Image`)) === false) {
                    exampleEmbed.setThumbnail(message.author.avatarURL({ format: "png" }));
                } else {
                    exampleEmbed.setThumbnail(db.reviewDB.get(artistName[0], `${songName}.Image`));
                    if (songEP != false) {
                        exampleEmbed.setFooter(`from the ${songEP}`, db.reviewDB.get(artistName[0], `${songName}.Image`));
                    }
                }
            } else {
                if (db.reviewDB.get(artistName[0], `${songName}.Remixers.${rmxArtist}.Image`) === false) {
                    exampleEmbed.setThumbnail(message.author.avatarURL({ format: "png" }));
                } else {
                    exampleEmbed.setThumbnail(db.reviewDB.get(artistName[0], `${songName}.Remixers.${rmxArtist}.Image`));
                    if (songEP != false) {
                        exampleEmbed.setFooter(`from the ${songEP}`, db.reviewDB.get(artistName[0], `${songName}.Remixers.${rmxArtist}.Image`));
                    }
                }
            }
        
        message.channel.send(exampleEmbed);
	},
};