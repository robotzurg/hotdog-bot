const Discord = require('discord.js');
const db = require("../db.js");

module.exports = {
	name: 'editreview',
    description: 'Edit a pre-existing review of your own.',
    args: true,
    usage: '<artist> | <song_name> | <rating> | <rate_desc>',
	execute(message, args) {
        
        let songName;
        let rmxArtist;

        if (args[1].toLowerCase().includes('remix')) {
            songName = args[1].substring(0, args[1].length - 7).split(' (')[0];
            rmxArtist = args[1].substring(0, args[1].length - 7).split(' (')[1];
        } else {
            songName = args[1];
            rmxArtist = false;
        }

        let rname;
        let rreview;
        let rscore;
        if (rmxArtist === false) {
            rname = db.reviewDB.get(args[0], `${args[1]}.${message.author}.name`);
            if (rname === undefined) return message.channel.send('No review found.');

            db.reviewDB.set(args[0], args[3], `${args[1]}.${message.author}.review`);
            rreview = db.reviewDB.get(args[0], `${args[1]}.${message.author}.review`);

            db.reviewDB.set(args[0], args[2], `${args[1]}.${message.author}.rate`);
            rscore = db.reviewDB.get(args[0], `${args[1]}.${message.author}.rate`);
        } else {
            rname = db.reviewDB.get(args[0], `${songName}.Remixers.${rmxArtist}.${message.author}.name`);
            if (rname === undefined) return message.channel.send('No review found.');

            db.reviewDB.set(args[0], args[3], `${songName}.Remixers.${rmxArtist}.${message.author}.review`);
            rreview = db.reviewDB.get(args[0], `${songName}.Remixers.${rmxArtist}.${message.author}.review`);

            db.reviewDB.set(args[0], args[2], `${songName}.Remixers.${rmxArtist}.${message.author}.rate`);
            rscore = db.reviewDB.get(args[0], `${songName}.Remixers.${rmxArtist}.${message.author}.rate`);
        }


		const exampleEmbed = new Discord.MessageEmbed()
            .setColor(`${message.member.displayHexColor}`)
            .setTitle(`${args[0]} - ${args[1]}`)
            .setAuthor(`${message.member.displayName}'s review`, `${message.author.avatarURL({ format: "png", dynamic: false })}`);
            exampleEmbed.setDescription(rreview)
            .setThumbnail(`${message.author.avatarURL({ format: "png", dynamic: false })}`)
            .addField('Rating: ', `**${rscore}**`, true);
        
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