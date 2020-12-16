const Discord = require('discord.js');
const db = require("../db.js");

module.exports = {
	name: 'editreview',
    description: 'Edit a pre-existing review of your own.',
    args: true,
    usage: '<artist> | <song_name> | <rating> | <rate_desc> | [op] <user_that_sent_song>',
	execute(message, args) {
        const rname = db.reviewDB.get(args[0], `${args[1]}.${message.author}.name`);
        if (rname === undefined) return message.channel.send('No review found.');

        db.reviewDB.set(args[0], args[3], `${args[1]}.${message.author}.review`);
        const rreview = db.reviewDB.get(args[0], `${args[1]}.${message.author}.review`);
        db.reviewDB.set(args[0], args[2], `${args[1]}.${message.author}.rate`);
		const rscore = db.reviewDB.get(args[0], `${args[1]}.${message.author}.rate`);


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