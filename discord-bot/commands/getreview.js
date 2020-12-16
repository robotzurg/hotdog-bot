const Discord = require('discord.js');
const db = require("../db.js");

module.exports = {
	name: 'getreview',
    description: 'Get a review from a user on the server that they have written!',
    args: true,
    usage: '<artist> | <song> | <user>',
	execute(message, args) {
        const taggedUser = message.mentions.users.first();
        const rname = db.reviewDB.get(args[0], `${args[1]}.${taggedUser}.name`);
        if (rname === undefined) return message.channel.send('No review found.');
		const rreview = db.reviewDB.get(args[0], `${args[1]}.${taggedUser}.review`);
		const rscore = db.reviewDB.get(args[0], `${args[1]}.${taggedUser}.rate`);


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