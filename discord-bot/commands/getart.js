const Discord = require('discord.js');
const db = require("../db.js");

module.exports = {
    name: 'getart',
    description: 'Get a song art',
    args: true,
    usage: '<artist> | <song>',
	execute(message, args) {

        //Auto-adjustment to caps for each word
        args[0] = args[0].split(' ');
        args[0] = args[0].map(a => a.charAt(0).toUpperCase() + a.slice(1));
        args[0] = args[0].join(' ');

        args[1] = args[1].split(' ');
        args[1] = args[1].map(a => a.charAt(0).toUpperCase() + a.slice(1));
        args[1] = args[1].join(' ');


        if (args[1].includes('EP') && args[1].includes('LP') && args[1].toLowerCase().includes('remixes')) {
            return message.channel.send('This command does not support EPs/LPs yet. Instead, check for a single from the EP/LP you are looking for.');
        }
        
        const artistName = args[0].split(' & ')[0];
        if (!db.reviewDB.has(artistName)) return message.channel.send('No artist found.');
        let image;
        let songName = args[1];
        let rmxArtist = false;

        //Take out the ft./feat.
        if (args[1].includes('(feat')) {

            songName = args[1].split(` (feat`);
            if (args[1].toLowerCase().includes('remix')) { rmxArtist = songName[1].split(' [')[1].slice(0, -7); }
            songName = songName[0];

        } else if (args[1].includes('(ft')) {

            songName = args[1].split(` (ft`);
            if (args[1].toLowerCase().includes('remix')) { rmxArtist = songName[1].split(' [')[1].slice(0, -7); }
            songName = songName[0];

        }

        //Remix preparation
        if (songName.toLowerCase().includes('remix')) {
            songName = args[1].split(` [`)[0];
            rmxArtist = args[1].split(' [')[1].slice(0, -7);
        } else if (songName.toLowerCase().includes('bootleg]')) {
            songName = args[1].substring(0, args[1].length - 9).split(' [')[0];
            rmxArtist = args[1].substring(0, args[1].length - 9).split(' [')[1];
        } else if (songName.toLowerCase().includes('flip]') || songName.toLowerCase().includes('edit]')) {
            songName = args[1].substring(0, args[1].length - 6).split(' [')[0];
            rmxArtist = args[1].substring(0, args[1].length - 6).split(' [')[1];
        }

        if (db.reviewDB.get(artistName, `["${songName}"]`) === undefined) return message.channel.send(`No song found.`);

        if (rmxArtist === false) {
            image = db.reviewDB.get(artistName, `["${songName}"].Image`);
            
        } else {
            image = db.reviewDB.get(rmxArtist, `["${songName} [${rmxArtist} Remix]"].Image`);
        }

        if (image === false || image === undefined || image === null) return message.channel.send('There is no art put in the database for this song.');

		const exampleEmbed = new Discord.MessageEmbed()
            .setColor(`${message.member.displayHexColor}`)
            .setTitle(`Art for ${args[0]} - ${args[1]}`)
            .setImage(image);

        message.channel.send(exampleEmbed);
	},
};