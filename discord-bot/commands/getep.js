const Discord = require('discord.js');
const db = require("../db.js");

module.exports = {
    name: 'getep',
    type: 'Review DB',
    moreinfo: 'https://discord.com/channels/680864893552951306/794751896823922708/795553162773266463',
    aliases: ['getep', 'getlp', 'gete'],
    description: 'Get all the songs from a specific EP and display them in an embed message.',
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
        
        let artistName = args[0].split(' & ');

        if (!args[0].includes(',')) {
            artistName = args[0].split(' & ');
        } else {
            artistName = args[0].split(', ');
            if (artistName[artistName.length - 1].includes('&')) {
                let iter2 = artistName.pop();
                iter2 = iter2.split(' & ');
                iter2 = iter2.map(a => artistName.push(a));
                console.log(iter2);
            }
        }
        
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
                    let reviewNum = Object.keys(songObj);

                    reviewNum = reviewNum.filter(e => e !== 'Remixers');
                    reviewNum = reviewNum.filter(e => e !== 'EP');
                    reviewNum = reviewNum.filter(e => e !== 'Collab');
                    reviewNum = reviewNum.filter(e => e !== 'Image');
                    reviewNum = reviewNum.filter(e => e !== 'Vocals');

                    reviewNum = reviewNum.length;

                    exampleEmbed.addField(`**${epnum}. ${songArray[i]}**`, `\`${reviewNum} review${reviewNum > 1 ? 's' : ''}\``);
                }
            }

        if (epnum === 0) return message.channel.send('No EP found.');
        message.channel.send(exampleEmbed);
	},
};