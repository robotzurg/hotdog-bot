const Discord = require('discord.js');
const db = require("../db.js");

module.exports = {
	name: 'getartist',
    description: 'Get all the songs from an artist.',
    args: true,
    usage: '<artist>',
	execute(message, args) {
        
        const artistObj = db.reviewDB.get(args[0]);
        const songArray = Object.keys(artistObj);

		const exampleEmbed = new Discord.MessageEmbed()
            .setColor(`${message.member.displayHexColor}`)
            .setTitle(`${args[0]}'s tracks`);
            for (let i = 0; i < songArray.length; i++) {
                const songObj = db.reviewDB.get(args[0], `${songArray[i]}`);
                const reviewNum = Object.keys(songObj).length - 1;
                exampleEmbed.addField('Single: ', `**${songArray[i]}** *(${reviewNum} review${reviewNum > 1 ? 's' : ''})*`);
            }
        
        message.channel.send(exampleEmbed);
	},
};