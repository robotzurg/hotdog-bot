/*const Discord = require('discord.js');
const db = require("../db.js");

module.exports = {
    name: 'highestsongs',
    type: 'Review DB',
    moreinfo: 'https://discord.com/channels/680864893552951306/794751896823922708/795553872143187968',
    aliases: ['highestsongs', 'topsongs'],
    description: 'See the top 5 songs on the server!',
	execute(message) {

        const dbKeyArray = db.reviewDB.keyArray();
        let average = (array) => array.reduce((a, b) => a + b) / array.length;
        
        for (let i = 0; i < dbKeyArray.length; i++) {
            let AsongArray = Object.keys(db.reviewDB.get(dbKeyArray[i]));
            AsongArray = AsongArray.filter(item => item !== 'Image');

            for (let ii = 0; ii < AsongArray.length; ii++) {
                let vocalCheck = [db.reviewDB.get(dbKeyArray[i], `["${AsongArray[ii]}"].Vocals`)].flat(1);
                let collabCheck = db.reviewDB.get(dbKeyArray[i], `["${AsongArray[ii]}"].Collab`);

                if (Array.isArray(collabCheck)) {
                    collabCheck = collabCheck.toString();
                }

                if (AsongArray[ii] === args[0] && !vocalCheck.includes(dbKeyArray[i]) && !options.includes(`${collabCheck} | ${AsongArray[ii]}`)) {
                    argArtistName = dbKeyArray[i];
                    argSongName = AsongArray[ii];
                    options.push([argArtistName, argSongName]);
                    options[options.length - 1] = options[options.length - 1].join(' | ');
                } 
            }
        }
    }

        ranking = ranking.sort(function(a, b) {
            return b.rating - a.rating;
        });
        
        const rankingEmbed = new Discord.MessageEmbed()
        .setColor(`${message.member.displayHexColor}`)
        .setTitle(`${args[0]}'s tracks, ranked`);

        for (let i = 0; i < ranking.length; i++) {
           rankingEmbed.addField(`${i + 1}. ${ranking[i].name} \`${ranking[i].reviewnum} review${ranking[i].reviewnum > 1 ? 's' : ''}\``, `Average Rating: \`${ranking[i].rating}\``);
        }

        
        message.channel.send(rankingEmbed);
    },
};*/