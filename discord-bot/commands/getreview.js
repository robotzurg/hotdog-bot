const Discord = require('discord.js');
const db = require("../db.js");
// bconst { prefix } = require('../config.json');
// const mailboxes = ['aeroface', 'av', 'emily', 'ethan', 'fridgey', 'hal', 'jeff', 'josh', 'lapplepieguy', 'meltered', 'nate', 'pup', 'shiro', 'steph', 'treez', 'valence', 'vol', 'xypod', 'yacob', 'yul'];

module.exports = {
	name: 'getreview',
	cooldown: 0,
    description: 'Ping!',
    args: true,
    usage: '<artist> | <song> | <user>',
	execute(message, args) {
		const taggedUser = message.mentions.users.first();
		const rname = db.reviewDB.get(args[0], `${args[1].trim()}.${taggedUser}.name`);
		const rreview = db.reviewDB.get(args[0], `${args[1].trim()}.${taggedUser}.review`);
		const rscore = db.reviewDB.get(args[0], `${args[1].trim()}.${taggedUser}.rate`);


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