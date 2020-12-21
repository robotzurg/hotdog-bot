const Discord = require('discord.js');
const db = require("../db.js");

module.exports = {
	name: 'getsong',
    description: 'Get all the data about a song.',
    args: true,
    usage: '<artist> | <song>',
	execute(message, args) {
        
        const songObj = db.reviewDB.get(args[0], `${args[1]}`);
        const userArray = Object.keys(songObj);

		const exampleEmbed = new Discord.MessageEmbed()
            .setColor(`${message.member.displayHexColor}`)
            .setTitle(`${args[0]} - ${args[1]} ratings`);
            for (let i = 0; i < userArray.length; i++) {
                if (userArray[i] != 'EP') {
                    const rating = db.reviewDB.get(args[0], `${args[1]}.${userArray[i]}.rate`);
                    const name = db.reviewDB.get(args[0], `${args[1]}.${userArray[i]}.name`);
                    exampleEmbed.addField(`${name}:`, `Rating: ${rating}`);
                }
            }
        
        message.channel.send(exampleEmbed);
	},
};