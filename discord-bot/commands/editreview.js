const Discord = require('discord.js');
const db = require("../db.js");

module.exports = {
    name: 'editreview',
    aliases: ['editreview', 'editr'],
    description: 'Edit a pre-existing review of your own.',
    args: true,
    usage: '<artist> | <song_name> | <rating> | <rate_desc>',
	execute(message, args) {

        if (args[1].toLowerCase().includes('ep') || args[1].toLowerCase().includes('lp') || args[1].toLowerCase().includes('remixes')) {
            return message.channel.send('EPs/LPs/Remix Package review edits are not supported yet. Please contact Jeff to have your EP/LP/Remix Package review edited, if needed.');
        }
        
        const artistArray = args[0].split(' & ');
        let songName;
        let rmxArtist;

        if (args[1].toLowerCase().includes('remix')) {
            songName = args[1].substring(0, args[1].length - 7).split(' (')[0];
            rmxArtist = args[1].substring(0, args[1].length - 7).split(' (')[1];
            artistArray.push(rmxArtist);
        } else {
            songName = args[1];
            rmxArtist = false;
        }

        
        let rname;
        let rreview;
        let rscore;
        for (let i = 0; i < artistArray.length; i++) {
            if (rmxArtist === false || artistArray[i] === rmxArtist) {
                rname = db.reviewDB.get(artistArray[i], `${args[1]}.${message.author}.name`);
                if (rname === undefined) return message.channel.send('No review found.');

                db.reviewDB.set(artistArray[i], args[3], `${args[1]}.${message.author}.review`);
                rreview = db.reviewDB.get(artistArray[i], `${args[1]}.${message.author}.review`);

                db.reviewDB.set(artistArray[i], args[2], `${args[1]}.${message.author}.rate`);
                rscore = db.reviewDB.get(artistArray[i], `${args[1]}.${message.author}.rate`);
            } else {
                rname = db.reviewDB.get(artistArray[i], `${songName}.Remixers.${rmxArtist}.${message.author}.name`);
                if (rname === undefined) return message.channel.send('No review found.');

                db.reviewDB.set(artistArray[i], args[3], `${songName}.Remixers.${rmxArtist}.${message.author}.review`);
                rreview = db.reviewDB.get(artistArray[i], `${songName}.Remixers.${rmxArtist}.${message.author}.review`);

                db.reviewDB.set(artistArray[i], args[2], `${songName}.Remixers.${rmxArtist}.${message.author}.rate`);
                rscore = db.reviewDB.get(artistArray[i], `${songName}.Remixers.${rmxArtist}.${message.author}.rate`);
            }
        }

        const thumbnailImage = db.reviewDB.get(artistArray[0], `${args[1]}.Image`);

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
        
        message.channel.send('Review edited:').then(msg => {
            msg.delete({ timeout: 15000 });
        })
        .catch(console.error);

        message.channel.send(exampleEmbed).then(msg => {
            msg.delete({ timeout: 15000 });
        })
        .catch(console.error);

        message.delete({ timeout: 15000 });
	},
};