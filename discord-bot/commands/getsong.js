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
        let songObj;
        let songEP;
        let fullSongName;
        let songName;
        let rmxArtist;

        if (args[1].toLowerCase().includes('remix')) {
            fullSongName = args[1];
            songName = rmxArtist = fullSongName.substring(0, fullSongName.length - 7).split(' (')[0];
            rmxArtist = fullSongName.substring(0, fullSongName.length - 7).split(' (')[1];
            songObj = db.reviewDB.get(rmxArtist, `${fullSongName}`);
            songEP = db.reviewDB.get(rmxArtist, `${fullSongName}.EP`);
        } else if (args[1].toLowerCase().includes('bootleg')) {
            fullSongName = args[1];
            songName = rmxArtist = fullSongName.substring(0, fullSongName.length - 9).split(' (')[0];
            rmxArtist = fullSongName.substring(0, fullSongName.length - 9).split(' (')[1];
            songObj = db.reviewDB.get(rmxArtist, `${fullSongName}`);
            songEP = db.reviewDB.get(rmxArtist, `${fullSongName}.EP`);
        } else if (args[1].toLowerCase().includes('flip') || args[1].toLowerCase().includes('edit')) {
            fullSongName = args[1];
            songName = rmxArtist = fullSongName.substring(0, fullSongName.length - 6).split(' (')[0];
            rmxArtist = fullSongName.substring(0, fullSongName.length - 6).split(' (')[1];
            songObj = db.reviewDB.get(rmxArtist, `${fullSongName}`);
            songEP = db.reviewDB.get(rmxArtist, `${fullSongName}.EP`);
        } else {
            rmxArtist = false;
            fullSongName = false;
            songName = args[1];
            songObj = db.reviewDB.get(artistName[0], `${args[1]}`);
            songEP = db.reviewDB.get(artistName[0], `${args[1]}.EP`);
        }

        let userArray = Object.keys(songObj);
        
        userArray = userArray.filter(e => e !== 'EP');
        userArray = userArray.filter(e => e !== 'Image');
        userArray = userArray.filter(e => e !== 'Remixers');
        
        const rankNumArray = [];

        const exampleEmbed = new Discord.MessageEmbed()
            .setColor(`${message.member.displayHexColor}`)
            .setTitle(`${args[0]} - ${args[1]} ratings`);
            for (let i = 0; i < userArray.length; i++) {
                if (userArray[i] != 'EP') {
                    let rating;
                    if (rmxArtist === false) {
                        rating = db.reviewDB.get(artistName[0], `${args[1]}.${userArray[i]}.rate`);
                    } else {
                        rating = db.reviewDB.get(rmxArtist, `${fullSongName}.${userArray[i]}.rate`);
                    }
                    rankNumArray.push(parseInt(rating.slice(0, -3)));
                    userArray[i] = `${userArray[i]} \`${rating}\``;
                }
            }
            exampleEmbed.setDescription(`*The average rating of this song is ${average(rankNumArray)}!*`);
            exampleEmbed.addField('Reviews:', userArray);
            if (rmxArtist === false) {
                console.log(artistName[0]);
                console.log(args[1]);
                if (db.reviewDB.get(db.reviewDB.get(artistName[0], `${args[1]}.Image`)) === false) {
                    exampleEmbed.setThumbnail(message.author.avatarURL({ format: "png" }));
                } else {
                    exampleEmbed.setThumbnail(db.reviewDB.get(artistName[0], `${args[1]}.Image`));
                }
            } else {
                if (db.reviewDB.get(artistName[0], `${songName}.Remixers.${rmxArtist}.Image`) === false) {
                    exampleEmbed.setThumbnail(message.author.avatarURL({ format: "png" }));
                } else {
                    exampleEmbed.setThumbnail(db.reviewDB.get(artistName[0], `${songName}.Remixers.${rmxArtist}.Image`));
                }
            }
            if (songEP != false) {
                exampleEmbed.setFooter(`from ${songEP}`);
            }
        
        message.channel.send(exampleEmbed);
	},
};