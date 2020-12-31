const Discord = require('discord.js');
const db = require("../db.js");

module.exports = {
	name: 'getreviewep',
    description: 'Get an EP review from a user on the server that they have written! Putting nothing for <user> will replace <user> with yourself.',
    args: true,
    usage: '<artist> | <song/ep/lp> | [op] <user>',
	execute(message, args) {
        
        const artistObj = db.reviewDB.get(args[0]);
        if (artistObj === undefined) {
            return message.channel.send('No review found.');
        }
        const songArray = Object.keys(artistObj);
        const artistName = args[0].split(' & ');

        let taggedUser;
        let rname;
        let rreview;
        let rscore;
        let rsentby;
        let usrSentBy;
        let thumbnailImage;
        let rmxProg = -1;
        let overallString = false;

        const exampleEmbed = new Discord.MessageEmbed();
        for (let i = 0; i < songArray.length; i++) {
            const songEP = db.reviewDB.get(artistName[0], `${songArray[i]}.EP`);
            if (songEP.isArray(songEP) ? songEP[0] === args[1] : songEP === args[1]) {
                if (songEP.isArray(songEP)) {        
                    overallString = songEP[1];
                }
                let songName = songArray[i];
                let rmxArtist;

                if (Object.keys(db.reviewDB.get(artistName[0], `${songArray[i]}.Remixers`)).length != 0) {
                    rmxProg++;
                    rmxArtist = Object.keys(db.reviewDB.get(artistName[0], `${songArray[i]}.Remixers`))[rmxProg];
                } else {
                    rmxArtist = false;
                }

                if (args.length > 2) {
                    taggedUser = message.mentions.users.first();
                } else {
                    taggedUser = message.author;
                }

                if (rmxArtist === false) {
                    rname = db.reviewDB.get(artistName[0], `${songName}.${taggedUser}.name`);
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

                exampleEmbed.addField(`${songName} (${rscore})`, `${rreview}`);
            }

        }
                if (overallString != -1) {
                    exampleEmbed.addField('Overall Thoughts', overallString);
                }
                exampleEmbed.setColor(`${message.member.displayHexColor}`);
                exampleEmbed.setTitle(`${args[0]} - ${args[1]}`);
                exampleEmbed.setAuthor(rsentby != false ? `${rname}'s mailbox review` : `${rname}'s review`, `${taggedUser.avatarURL({ format: "png" })}`);
                if (args[1].includes('EP')) {
                    exampleEmbed.setAuthor(rsentby != false ? `${rname}'s mailbox EP review` : `${rname}'s EP review`, `${taggedUser.avatarURL({ format: "png", dynamic: false })}`);
                } else if (args[1].includes('LP')) {
                    exampleEmbed.setAuthor(rsentby != false ? `${rname}'s mailbox EP review` : `${rname}'s EP review`, `${taggedUser.avatarURL({ format: "png", dynamic: false })}`);
                } else {
                    exampleEmbed.setAuthor(rsentby != false ? `${rname}'s mailbox EP review` : `${rname}'s EP review`, `${taggedUser.avatarURL({ format: "png", dynamic: false })}`);
                }
                exampleEmbed.setThumbnail(thumbnailImage);
                if (rsentby != false) {
                    exampleEmbed.setFooter(`Sent by ${usrSentBy.displayName}`, `${usrSentBy.user.avatarURL({ format: "png" })}`);
                }
                
            message.channel.send(exampleEmbed);
	},
};