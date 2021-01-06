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

        let argSongName = args[1];
        // Fix (VIP) if needed
        if (args[1].includes('(VIP)')) {
            args[1] = args[1].split(' (');
            argSongName = `${args[1][0]} ${args[1][1].slice(0, -1)}`;
        }

        // Function to grab average of all ratings later
        let average = (array) => array.reduce((a, b) => a + b) / array.length;

        const artistName = args[0].split(' & ');
        let songObj;
        let songEP;
        let fullSongName;
        let songName;
        let rmxArtist;

        if (argSongName.toLowerCase().includes('remix')) {
            fullSongName = argSongName;
            songName = rmxArtist = fullSongName.substring(0, fullSongName.length - 7).split(' (')[0];
            rmxArtist = fullSongName.substring(0, fullSongName.length - 7).split(' (')[1];
            songObj = db.reviewDB.get(rmxArtist, `${fullSongName}`);
            songEP = db.reviewDB.get(rmxArtist, `${fullSongName}.EP`);
        } else if (argSongName.toLowerCase().includes('bootleg')) {
            fullSongName = argSongName;
            songName = rmxArtist = fullSongName.substring(0, fullSongName.length - 9).split(' (')[0];
            rmxArtist = fullSongName.substring(0, fullSongName.length - 9).split(' (')[1];
            songObj = db.reviewDB.get(rmxArtist, `${fullSongName}`);
            songEP = db.reviewDB.get(rmxArtist, `${fullSongName}.EP`);
        } else if (argSongName.toLowerCase().includes('flip') || argSongName.toLowerCase().includes('edit')) {
            fullSongName = argSongName;
            songName = rmxArtist = fullSongName.substring(0, fullSongName.length - 6).split(' (')[0];
            rmxArtist = fullSongName.substring(0, fullSongName.length - 6).split(' (')[1];
            songObj = db.reviewDB.get(rmxArtist, `${fullSongName}`);
            songEP = db.reviewDB.get(rmxArtist, `${fullSongName}.EP`);
        } else {
            rmxArtist = false;
            fullSongName = false;
            songName = argSongName;
            songObj = db.reviewDB.get(artistName[0], `${argSongName}`);
            songEP = db.reviewDB.get(artistName[0], `${argSongName}.EP`);
        }

        if (songObj === undefined) return message.channel.send('The requested song does not exist.\nUse `!getArtist` to get a full list of this artist\'s songs.');

        let userArray = Object.keys(songObj);
        
        userArray = userArray.filter(e => e !== 'EP');
        userArray = userArray.filter(e => e !== 'Image');
        userArray = userArray.filter(e => e !== 'Remixers');
        
        const rankNumArray = [];

        const exampleEmbed = new Discord.MessageEmbed()
            .setColor(`${message.member.displayHexColor}`)
            .setTitle(`${args[0]} - ${argSongName} ratings`);
            for (let i = 0; i < userArray.length; i++) {
                if (userArray[i] != 'EP') {
                    let rating;
                    if (rmxArtist === false) {
                        rating = db.reviewDB.get(artistName[0], `${argSongName}.${userArray[i]}.rate`);
                    } else {
                        rating = db.reviewDB.get(rmxArtist, `${fullSongName}.${userArray[i]}.rate`);
                    }
                    rankNumArray.push(parseFloat(rating.slice(0, -3)));
                    userArray[i] = `${userArray[i]} \`${rating}\``;
                }
            }
            if (rankNumArray.length != 0) {
                exampleEmbed.setDescription(`*The average rating of this song is* ***${average(rankNumArray)}!***`);
            } else {
                exampleEmbed.setDescription(`*The average rating of this song is N/A*`);
            }

            if (userArray != 0) {
                exampleEmbed.addField('Reviews:', userArray);
            } else {
                exampleEmbed.addField('Reviews:', 'No reviews :(');
            }

            if (rmxArtist === false) {
                if ((db.reviewDB.get(artistName[0], `${argSongName}.Image`)) === false) {
                    exampleEmbed.setThumbnail(message.author.avatarURL({ format: "png" }));
                } else {
                    exampleEmbed.setThumbnail(db.reviewDB.get(artistName[0], `${argSongName}.Image`));
                    if (songEP != false) {
                        exampleEmbed.setFooter(`from the ${songEP}`, db.reviewDB.get(artistName[0], `${argSongName}.Image`));
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