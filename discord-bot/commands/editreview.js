const Discord = require('discord.js');
const db = require("../db.js");

module.exports = {
    name: 'editreview',
    aliases: ['editreview', 'editr'],
    description: 'Edit a pre-existing review of your own.',
    args: true,
    usage: '<artist> | <song_name> | <rating> | <rate_desc>',
	execute(message, args) {
        
        //Auto-adjustment to caps for each word
        args[0] = args[0].split(' ');
        args[0] = args[0].map(a => a.charAt(0).toUpperCase() + a.slice(1));
        args[0] = args[0].join(' ');

        args[1] = args[1].split(' ');
        args[1] = args[1].map(a => a.charAt(0).toUpperCase() + a.slice(1));
        args[1] = args[1].join(' ');

        if (args[1].toLowerCase().includes('ep') || args[1].toLowerCase().includes('lp') || args[1].toLowerCase().includes('remixes')) {
            return message.channel.send('EPs/LPs/Remix Package review edits are not supported yet. Please contact Jeff to have your EP/LP/Remix Package review edited, if needed.');
        }
        
        let artistArray = args[0].split(' & ');

        if (!args[0].includes(',')) {
            artistArray = args[0].split(' & ');
        } else {
            artistArray = args[0].split(', ');
            if (artistArray[artistArray.length - 1].includes('&')) {
                let iter2 = artistArray.pop();
                iter2 = iter2.split(' & ');
                iter2 = iter2.map(a => artistArray.push(a));
                console.log(iter2);
            }
        }

        let songName = args[1];
        let rmxArtist;

        if (args[1].toLowerCase().includes('remix')) {
            songName = args[1].substring(0, args[1].length - 7).split(' (')[0];
            rmxArtist = args[1].substring(0, args[1].length - 7).split(' (')[1];
            artistArray.push(rmxArtist);
        } else {
            songName = args[1];
            rmxArtist = false;
        }

        //Take out the ft./feat.
        if (args[1].includes('(feat') || args[1].includes('(ft')) {
            songName = songName.split(` (f`);
            songName.splice(1);
        } else if (args[1].includes('feat')) {
            songName = songName.split('feat');
            songName.splice(1);
        } else if (args[1].includes('ft')) {
            songName = songName.split('ft');
            songName.splice(1);
        }

        
        let rname;
        let rreview;
        let rscore;
        for (let i = 0; i < artistArray.length; i++) {
            if (rmxArtist === false || artistArray[i] === rmxArtist) {
                rname = db.reviewDB.get(artistArray[i], `["${songName}"].${message.author}.name`);
                if (rname === undefined) return message.channel.send('No review found.');

                db.reviewDB.set(artistArray[i], args[3], `["${songName}"].${message.author}.review`);
                rreview = db.reviewDB.get(artistArray[i], `["${songName}"].${message.author}.review`);

                db.reviewDB.set(artistArray[i], args[2], `["${songName}"].${message.author}.rate`);
                rscore = db.reviewDB.get(artistArray[i], `["${songName}"].${message.author}.rate`);
            } else {
                rname = db.reviewDB.get(artistArray[i], `["${songName}"].Remixers.["${rmxArtist}"].${message.author}.name`);
                if (rname === undefined) return message.channel.send('No review found.');

                db.reviewDB.set(artistArray[i], args[3], `["${songName}"].Remixers.["${rmxArtist}"].${message.author}.review`);
                rreview = db.reviewDB.get(artistArray[i], `["${songName}"].Remixers.["${rmxArtist}"].${message.author}.review`);

                db.reviewDB.set(artistArray[i], args[2], `["${songName}"].Remixers.["${rmxArtist}"].${message.author}.rate`);
                rscore = db.reviewDB.get(artistArray[i], `["${songName}"].Remixers.["${rmxArtist}"].${message.author}.rate`);
            }
        }

        const thumbnailImage = db.reviewDB.get(artistArray[0], `["${songName}"].Image`);

		const exampleEmbed = new Discord.MessageEmbed()
            .setColor(`${message.member.displayHexColor}`)
            .setTitle(`${args[0]} - ${args[1]}`)
            .setAuthor(`${message.member.displayName}'s review`, `${message.author.avatarURL({ format: "png", dynamic: false })}`);
            exampleEmbed.setDescription(rreview);
            if (thumbnailImage === false) {
                exampleEmbed.setThumbnail(`${message.author.avatarURL({ format: "png", dynamic: false })}`);
            } else {
                exampleEmbed.setThumbnail(thumbnailImage);
            }
            
            exampleEmbed.addField('Rating: ', `**${rscore}**`, true);
        
        message.channel.send('Review edited:');

        message.channel.send(exampleEmbed);

        message.delete({ timeout: 15000 });
	},
};