const Discord = require('discord.js');
const db = require("../db.js");

module.exports = {
    name: 'getep',
    aliases: ['getep', 'getlp', 'gete'],
    description: 'Get all the songs from a specific EP!',
    args: true,
    usage: '<artist> | <ep>',
	execute(message, args) {

        //Auto-adjustment to caps for each word
        args[0] = args[0].split(' ');
        args[0] = args[0].map(a => a.charAt(0).toUpperCase() + a.slice(1));
        args[0] = args[0].join(' ');

        args[1] = args[1].split(' ');
        args[1] = args[1].map(a => a.charAt(0).toUpperCase() + a.slice(1));
        args[1] = args[1].join(' ');


        if (!args[1].includes('EP') && !args[1].includes('LP') && !args[1].toLowerCase().includes('remixes')) {
            return message.channel.send('This isn\'t an EP! Please use `!getSong` to get single overviews.');
        }
        
        const artistName = args[0].split(' & ');
        const artistObj = db.reviewDB.get(artistName[0]);
        const songArray = Object.keys(artistObj);
        let songThumbnail = false;

		const exampleEmbed = new Discord.MessageEmbed()
            .setColor(`${message.member.displayHexColor}`)
            .setTitle(`${args[0]} - ${args[1]} tracks`);
            let epnum = 0;
            for (let i = 0; i < songArray.length; i++) {
                const songObj = db.reviewDB.get(artistName[0], `["${songArray[i]}"]`);
                const songEP = db.reviewDB.get(artistName[0], `["${songArray[i]}"].EP`);
                if (songEP === args[1]) {
                    if (songThumbnail === false) songThumbnail = db.reviewDB.get(artistName[0], `["${songArray[i]}"].Image`);
                    if (songThumbnail != false) {
                        exampleEmbed.setThumbnail(songThumbnail);
                    } else {
                        exampleEmbed.setThumbnail(message.author.avatarURL({ format: "png", dynamic: false }));
                    }

                    epnum++;
                    const reviewNum = Object.keys(songObj).length - 3;
                    exampleEmbed.addField(`**${epnum}. ${songArray[i]}**`, `\`${reviewNum} review${reviewNum > 1 ? 's' : ''}\``);
                }
            }

        if (epnum === 0) return message.channel.send('No EP found.');
        message.channel.send(exampleEmbed);
	},
};