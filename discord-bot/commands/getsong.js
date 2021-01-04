const Discord = require('discord.js');
const db = require("../db.js");

module.exports = {
	name: 'getsong',
    description: 'Get all the data about a song.',
    args: true,
    usage: '<artist> | <song>',
	execute(message, args) {

        if (args[1].includes('EP') || args[1].includes('LP') || !args[1].toLowerCase().includes('remixes')) {
            return message.channel.send('This isn\'t a single! Please use `!getEP` to get EP/LP overviews.');
        }

        // Function to grab average of all ratings later
        let average = (array) => array.reduce((a, b) => a + b) / array.length;

        const songObj = db.reviewDB.get(args[0], `${args[1]}`);
        const songEP = db.reviewDB.get(args[0], `${args[1]}.EP`);
        let userArray = Object.keys(songObj);
        
        userArray = userArray.filter(e => e !== 'EP')
            .filter(e => e !== 'Image')
            .filter(e => e !== 'Remixers');
        
        const rankNumArray = [];

        const exampleEmbed = new Discord.MessageEmbed()
            .setColor(`${message.member.displayHexColor}`)
            .setTitle(`${args[0]} - ${args[1]} ratings`);
            for (let i = 0; i < userArray.length; i++) {
                if (userArray[i] != 'EP') {
                    const rating = db.reviewDB.get(args[0], `${args[1]}.${userArray[i]}.rate`);
                    rankNumArray.push(parseInt(rating.slice(0, -3)));
                    userArray[i] = `${userArray[i]} \`${rating}\``;
                }
            }
            exampleEmbed.setDescription(`*The average rating of this song is ${average(rankNumArray)}!*`);
            exampleEmbed.addField('Reviews:', userArray);
            exampleEmbed.setThumbnail(db.reviewDB.get(args[0], `${args[1]}.Image`));
            if (songEP != false) {
                exampleEmbed.setFooter(`from ${songEP}`);
            }
        
        message.channel.send(exampleEmbed);
	},
};