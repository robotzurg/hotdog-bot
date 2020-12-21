const Discord = require('discord.js');
const db = require("../db.js");

module.exports = {
	name: 'getep',
    description: 'Get all the songs from a specific EP!',
    args: true,
    usage: '<artist> | <ep>',
	execute(message, args) {
        
        const artistObj = db.reviewDB.get(args[0]);
        const songArray = Object.keys(artistObj);

		const exampleEmbed = new Discord.MessageEmbed()
            .setColor(`${message.member.displayHexColor}`)
            .setTitle(`${args[0]} - ${args[1]} tracks`);
            for (let i = 0; i < songArray.length; i++) {
                const songObj = db.reviewDB.get(args[0], `${songArray[i]}`);
                const songEP = db.reviewDB.get(args[0], `${songArray[i]}.EP`);
                
                if (songEP === args[1]) {
                    const reviewNum = Object.keys(songObj).length - 1;
                    exampleEmbed.addField(`**${songArray[i]}**:`, `*(${reviewNum} review${reviewNum > 1 ? 's' : ''})*`);
                }
            }
        
        message.channel.send(exampleEmbed);
	},
};