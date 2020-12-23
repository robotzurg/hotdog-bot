const Discord = require('discord.js');
const db = require("../db.js");

module.exports = {
	name: 'getreview',
    description: 'Get a review from a user on the server that they have written! Putting nothing for <user> will replace <user> with yourself.',
    args: true,
    usage: '<artist> | <song> | [op] <user>',
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

        let taggedUser;
        let rname;
        let rreview;
        let rscore;
        if (args.length > 2) {
            taggedUser = message.mentions.users.first();
        } else {
            taggedUser = message.author;
        }
        if (rmxArtist === false) {
            rname = db.reviewDB.get(args[0], `${songName}.${taggedUser}.name`);
            if (rname === undefined) return message.channel.send('No review found.');
            rreview = db.reviewDB.get(args[0], `${songName}.${taggedUser}.review`);
            rscore = db.reviewDB.get(args[0], `${songName}.${taggedUser}.rate`);
        } else {
            rname = db.reviewDB.get(args[0], `${songName}.Remixers.${rmxArtist}.${taggedUser}.name`);
            if (rname === undefined) return message.channel.send('No review found.');
            rreview = db.reviewDB.get(args[0], `${songName}.Remixers.${rmxArtist}.${taggedUser}.review`);
            rscore = db.reviewDB.get(args[0], `${songName}.Remixers.${rmxArtist}.${taggedUser}.rate`);
        }


            const exampleEmbed = new Discord.MessageEmbed()
                .setColor(`${message.member.displayHexColor}`)
                .setTitle(`${args[0]} - ${args[1]}`)
                .setAuthor(`${rname}'s review`, `${taggedUser.avatarURL({ format: "png", dynamic: false })}`);
                exampleEmbed.setDescription(rreview)
                .setThumbnail(`${taggedUser.avatarURL({ format: "png", dynamic: false })}`)
                .addField('Rating: ', `**${rscore}**`, true);
                
            message.channel.send(exampleEmbed);
	},
};