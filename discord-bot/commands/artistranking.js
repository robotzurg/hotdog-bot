const Discord = require('discord.js');
const db = require("../db.js");

module.exports = {
    name: 'artistranking',
    aliases: ['artistranking', 'artistrank'],
    description: 'Look at a ranking of all the artists songs, based on the average ratings in the server!',
    args: true,
    usage: '<artist>',
	execute(message, args) {
        let ranking = [];
		const artistObj = db.reviewDB.get(args[0]);
        if (artistObj === undefined) return message.channel.send('Artist not found.');
        const songArray = Object.keys(artistObj);
        let average = (array) => array.reduce((a, b) => a + b) / array.length;

        for (let i = 0; i < songArray.length; i++) {
            let userRatingArray = [];
            let songObj = db.reviewDB.get(args[0], `["${songArray[i]}"]`);
            let userArray = Object.keys(songObj);
    
            userArray = userArray.filter(e => e !== 'EP');
            userArray = userArray.filter(e => e !== 'Image');
            userArray = userArray.filter(e => e !== 'Remixers');
                    
            for (let ii = 0; ii < userArray.length; ii++) {
                let rating = parseFloat(db.reviewDB.get(args[0], `["${songArray[i]}"].${userArray[ii]}.rate`));
                userRatingArray.push(rating);
            }

            ranking.push({ name: songArray[i], rating: parseFloat(average(userRatingArray)), reviewnum: userArray.length });
            
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
};