const Discord = require('discord.js');
const db = require("../db.js");

module.exports = {
    name: 'getreview',
    aliases: ['getreview', 'getr'],
    description: 'Get a review from a user on the server that they have written! Putting nothing for <user> will replace <user> with yourself.',
    args: true,
    usage: '<artist> | <song/ep/lp> | [op] <user>',
	execute(message, args) {

        //Auto-adjustment to caps for each word
        args[0] = args[0].split(' ');
        args[0] = args[0].map(a => a.charAt(0).toUpperCase() + a.slice(1));
        args[0] = args[0].join(' ');

        args[1] = args[1].split(' ');
        args[1] = args[1].map(a => a.charAt(0).toUpperCase() + a.slice(1));
        args[1] = args[1].join(' ');

        // Fix (VIP) if needed
        if (args[1].includes('(VIP)')) {
            args[1] = args[1].split(' (');
            args[1] = `${args[1][0]} ${args[1][1].slice(0, -1)}`;
        }

        let songName = args[1];
        let rmxArtist;

        if (args[1].toLowerCase().includes('remix')) {
            songName = args[1].substring(0, args[1].length - 7).split(' [')[0];
            rmxArtist = args[1].substring(0, args[1].length - 7).split(' [')[1];
        } else {
            songName = args[1];
            rmxArtist = false;
        }

        //Take out the ft./feat.
        if (args[1].includes('(feat') || args[1].includes('(ft')) {
            songName = songName.split(` (f`);
            songName.splice(1);
        } else if (args[1].includes('feat')) {
            songName = songName.split('feat');
            songName.splice(1);
        } else if (args[1].includes('ft')) {
            songName = songName.split('ft');
            songName.splice(1);
        }


        const artistName = args[0].split(' & ');

        let taggedUser;
        let taggedMember;
        let rname;
        let rreview;
        let rscore;
        let rsentby;
        let usrSentBy;
        let thumbnailImage;
        let epfrom = db.reviewDB.get(artistName[0], `["${songName}"].EP`);
        if (args.length > 2) {
            taggedUser = message.mentions.users.first();
            taggedMember = message.mentions.members.first();
        } else {
            taggedUser = message.author;
            taggedMember = message.member;
        }
        if (rmxArtist === false) {
            rname = db.reviewDB.get(artistName[0], `["${songName}"].${taggedUser}.name`);
            if (rname === undefined) return message.channel.send('No review found. *Note that for EP reviews, you need to use `!getReviewEP`.*');
            rreview = db.reviewDB.get(artistName[0], `["${songName}"].${taggedUser}.review`);
            rscore = db.reviewDB.get(artistName[0], `["${songName}"].${taggedUser}.rate`);
            rsentby = db.reviewDB.get(artistName[0], `["${songName}"].${taggedUser}.sentby`);
            if (rsentby != false) {
                usrSentBy = message.guild.members.cache.get(rsentby);              
            }
            
            if (db.reviewDB.get(artistName[0], `["${songName}"].Image`) != false) {
                thumbnailImage = db.reviewDB.get(artistName[0], `["${songName}"].Image`);
            } else {
                thumbnailImage = taggedUser.avatarURL({ format: "png" });
            }
        } else {
            rname = db.reviewDB.get(artistName[0], `["${songName}"].Remixers.["${rmxArtist}"].${taggedUser}.name`);
            if (rname === undefined) return message.channel.send('No review found. *Note that for EP reviews, you need to use `!getReviewEP`.*');
            rreview = db.reviewDB.get(artistName[0], `["${songName}"].Remixers.["${rmxArtist}"].${taggedUser}.review`);
            rscore = db.reviewDB.get(artistName[0], `["${songName}"].Remixers.["${rmxArtist}"].${taggedUser}.rate`);
            rsentby = db.reviewDB.get(artistName[0], `["${songName}"].Remixers.["${rmxArtist}"].${taggedUser}.sentby`);
            if (rsentby != false) {
                usrSentBy = message.guild.members.cache.get(rsentby);              
            }     

            if (db.reviewDB.get(artistName[0], `["${songName}"].Remixers.["${rmxArtist}"].Image`)) {
                thumbnailImage = db.reviewDB.get(artistName[0], `["${songName}"].Remixers.["${rmxArtist}"].Image`);
            } else {
                thumbnailImage = taggedUser.avatarURL({ format: "png" });
            }
        }


            const exampleEmbed = new Discord.MessageEmbed()
                .setColor(`${taggedMember.displayHexColor}`)
                .setTitle(`${args[0]} - ${args[1]}`)
                .setAuthor(rsentby != false ? `${rname}'s mailbox review` : `${rname}'s review`, `${taggedUser.avatarURL({ format: "png" })}`);
                exampleEmbed.setDescription(rreview)
                .setThumbnail(thumbnailImage)
                .addField('Rating: ', `**${rscore}**`, true);
                if (rsentby != false) {
                    exampleEmbed.setFooter(`Sent by ${usrSentBy.displayName}`, `${usrSentBy.user.avatarURL({ format: "png" })}`);
                } else if (epfrom != undefined && epfrom != false) {
                    exampleEmbed.setFooter(`from the ${epfrom}`, thumbnailImage);
                }
                
            message.channel.send(exampleEmbed);
	},
};