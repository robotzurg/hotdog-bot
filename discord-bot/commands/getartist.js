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
        const EPs = {};
        const EPsOnEmbed = [];

        for (let i = 0; i < songArray.length; i++) {
            const songEP = db.reviewDB.get(args[0], `${songArray[i]}.EP`);
            if (songEP != false) {
                if (EPs[`${songEP}`] === undefined) {
                    console.log('Adding to EP');
                    EPs[`${songEP}`] = { [songArray[i]]: '' } ;
                } else {
                   EPs[`${songEP}`][`${songArray[i]}`] = ' ';
                }
            }
        }

        console.log(EPs);

		const exampleEmbed = new Discord.MessageEmbed()
            .setColor(`${message.member.displayHexColor}`)
            .setTitle(`${args[0]}'s reviewed tracks`);
            for (let i = 0; i < songArray.length; i++) {
                const songObj = db.reviewDB.get(args[0], `${songArray[i]}`);
                const songEP = db.reviewDB.get(args[0], `${songArray[i]}.EP`);
                const reviewNum = Object.keys(songObj).length - 1;

                if (songEP === false) { //If it's a single
                    exampleEmbed.addField(`${songArray[i]}${songEP != false ? ` (${songEP})` : ''}: `, `*(${reviewNum} review${reviewNum > 1 ? 's' : ''})*`);
                } else if (songEP != false && !EPsOnEmbed.includes(songEP)) { //If it's an EP and the field doesn't already exist
                    const s = EPs[`${songEP}`]; 
                    let songsinEP = Object.keys(s);
                    songsinEP = songsinEP.map(ii => '-' + ii);
                    songsinEP.join('\n');
                    exampleEmbed.addField(`${songEP}: `, songsinEP);
                    EPsOnEmbed.push(songEP);
                }
            }
        
        message.channel.send(exampleEmbed);
	},
};