const Discord = require('discord.js');
const db = require("../db.js");

module.exports = {
    name: 'getreview',
    aliases: ['getreview', 'getr'],
    description: 'Get a review from a user on the server that they have written! Putting nothing for <user> will replace <user> with yourself.',
    args: true,
    usage: '<artist> | <song/ep/lp> | [op] <user>',
	execute(message, args) {

        let songName;
        let rmxArtist;

        if (args[1].toLowerCase().includes('remix')) {
            songName = args[1].substring(0, args[1].length - 7).split(' (')[0];
            rmxArtist = args[1].substring(0, args[1].length - 7).split(' (')[1];
        } else {
            songName = args[1];
            rmxArtist = false;
        }

        const artistName = args[0].split(' & ');

        let taggedUser;
        let rname;
        let rreview;
        let rscore;
        let rsentby;
        let usrSentBy;
        let thumbnailImage;
        if (args.length > 2) {
            taggedUser = message.mentions.users.first();
        } else {
            taggedUser = message.author;
        }
        if (rmxArtist === false) {
            rname = db.reviewDB.get(artistName[0], `${songName}.${taggedUser}.name`);
            if (rname === undefined) return message.channel.send('No review found. *Note that for EP reviews, you need to use `!getReviewEP`.*');
            rreview = db.reviewDB.get(artistName[0], `${songName}.${taggedUser}.review`);
            rscore = db.reviewDB.get(artistName[0], `${songName}.${taggedUser}.rate`);
            rsentby = db.reviewDB.get(artistName[0], `${songName}.${taggedUser}.sentby`);
            if (rsentby != false) {
                usrSentBy = message.guild.members.cache.get(rsentby);              
            }
            
            if (db.reviewDB.get(artistName[0], `${songName}.Image`) != false) {
                thumbnailImage = db.reviewDB.get(artistName[0], `${songName}.Image`);
            } else {
                thumbnailImage = message.author.avatarURL({ format: "png", dynamic: false });
            }
        } else {
            rname = db.reviewDB.get(artistName[0], `${songName}.Remixers.${rmxArtist}.${taggedUser}.name`);
            if (rname === undefined) return message.channel.send('No review found. *Note that for EP reviews, you need to use `!getReviewEP`.*');
            rreview = db.reviewDB.get(artistName[0], `${songName}.Remixers.${rmxArtist}.${taggedUser}.review`);
            rscore = db.reviewDB.get(artistName[0], `${songName}.Remixers.${rmxArtist}.${taggedUser}.rate`);
            rsentby = db.reviewDB.get(artistName[0], `${songName}.Remixers.${rmxArtist}.${taggedUser}.sentby`);
            if (rsentby != false) {
                usrSentBy = message.guild.members.cache.get(rsentby);              
            }     

            if (db.reviewDB.get(artistName[0], `${songName}.Remixers.${rmxArtist}.Image`)) {
                thumbnailImage = db.reviewDB.get(artistName[0], `${songName}.Remixers.${rmxArtist}.Image`);
            } else {
                thumbnailImage = message.author.avatarURL({ format: "png", dynamic: false });
            }
        }


            const exampleEmbed = new Discord.MessageEmbed()
                .setColor(`${message.member.displayHexColor}`)
                .setTitle(`${args[0]} - ${args[1]}`)
                .setAuthor(rsentby != false ? `${rname}'s mailbox review` : `${rname}'s review`, `${taggedUser.avatarURL({ format: "png" })}`);
                exampleEmbed.setDescription(rreview)
                .setThumbnail(thumbnailImage)
                .addField('Rating: ', `**${rscore}**`, true);
                if (rsentby != false) {
                    exampleEmbed.setFooter(`Sent by ${usrSentBy.displayName}`, `${usrSentBy.user.avatarURL({ format: "png" })}`);
                }
                
            message.channel.send(exampleEmbed);
	},
};