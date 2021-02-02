const Discord = require('discord.js');
const db = require("../db.js");

module.exports = {
    name: 'getreviewep',
    type: 'Review DB',
    aliases: ['getreviewep', 'getrep', 'getreviewlp', 'getrlp'],
    description: 'Get an EP review from a user on the server that they have written! Putting nothing for <user> will replace <user> with yourself.',
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

        if (!args[1].toLowerCase().includes('ep') && !args[1].toLowerCase().includes('lp') && !args[1].toLowerCase().includes('remixes')) {
            args[1] = args[1].concat(' EP');
        }

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
        if (artistObj === undefined) {
            return message.channel.send('No artist found.');
        }

        const songArray = Object.keys(artistObj);

        let taggedUser;
        let taggedMember;
        let rname;
        let rreview;
        let rscore;
        let rsentby;
        let roverall;
        let rrankpos;
        let songRanking = [];
        let usrSentBy;
        let thumbnailImage;
        let rmxProg = -1;
        let checkforEP = false;

        const exampleEmbed = new Discord.MessageEmbed();
        for (let i = 0; i < songArray.length; i++) {
            const songEP = db.reviewDB.get(artistName[0], `["${songArray[i]}"].EP`);
            if (songEP === args[1]) {
                checkforEP = true;
                let songName = songArray[i];
                let rmxArtist;

                if (Object.keys(db.reviewDB.get(artistName[0], `["${songArray[i]}"].Remixers`)).length != 0) {
                    rmxProg++;
                    rmxArtist = Object.keys(db.reviewDB.get(artistName[0], `["${songArray[i]}"].Remixers`))[rmxProg];
                } else {
                    rmxArtist = false;
                }

                if (args.length > 2) {
                    taggedUser = message.mentions.users.first();
                    taggedMember = message.mentions.members.first();
                } else {
                    taggedUser = message.author;
                    taggedMember = message.member;
                }

                if (rmxArtist === false) {
                    rname = db.reviewDB.get(artistName[0], `["${songName}"].${taggedUser}.name`);
                    if (rname === undefined) return message.channel.send('No review found.');
                    rreview = db.reviewDB.get(artistName[0], `["${songName}"].${taggedUser}.review`);
                    rscore = db.reviewDB.get(artistName[0], `["${songName}"].${taggedUser}.rate`);
                    rsentby = db.reviewDB.get(artistName[0], `["${songName}"].${taggedUser}.sentby`);
                    roverall = db.reviewDB.get(artistName[0], `["${songName}"].${taggedUser}.EPOverall`);
                    rrankpos = db.reviewDB.get(artistName[0], `["${songName}"].${taggedUser}.rankPosition`);
                    if (rrankpos != undefined) songRanking.push(`${rrankpos}. ${songName} (${rscore})`);
                    if (rsentby != false) {
                        usrSentBy = message.guild.members.cache.get(rsentby);              
                    }
                    if (db.reviewDB.get(artistName[0], `["${songName}"].Image`) != false) {
                        thumbnailImage = db.reviewDB.get(artistName[0], `["${songName}"].Image`);
                    } else {
                        thumbnailImage = taggedUser.avatarURL({ format: "png" });
                    }
                } else {
                    rname = db.reviewDB.get(artistName[0], `["${songName}"].Remixers.${rmxArtist}.${taggedUser}.name`);
                    if (rname === undefined) return message.channel.send('No review found.');
                    rreview = db.reviewDB.get(artistName[0], `["${songName}"].Remixers.${rmxArtist}.${taggedUser}.review`);
                    rscore = db.reviewDB.get(artistName[0], `["${songName}"].Remixers.${rmxArtist}.${taggedUser}.rate`);
                    rsentby = db.reviewDB.get(artistName[0], `["${songName}"].Remixers.${rmxArtist}.${taggedUser}.sentby`);
                    roverall = db.reviewDB.get(artistName[0], `["${songName}"].Remixers.${rmxArtist}.${taggedUser}.EPOverall`);
                    rrankpos = db.reviewDB.get(artistName[0], `["${songName}"].Remixers.${rmxArtist}.${taggedUser}.rankPosition`);
                    if (rrankpos != undefined) songRanking.push(`${rrankpos}. ${songName} (${rscore})`);
                    if (rsentby != false) {
                        usrSentBy = message.guild.members.cache.get(rsentby);              
                    }     

                    if (db.reviewDB.get(artistName[0], `["${songName}"].Remixers.${rmxArtist}.Image`)) {
                        thumbnailImage = db.reviewDB.get(artistName[0], `["${songName}"].Remixers.${rmxArtist}.Image`);
                    } else {
                        thumbnailImage = taggedUser.avatarURL({ format: "png" });
                    }
                }

                if (songRanking.length === 0) {
                    exampleEmbed.addField(`${songName} (${rscore})`, `${rreview}`);
                }
            }
        }

        if (songRanking.length != 0) {
            exampleEmbed.addField('Ranking:', `\`\`\`${songRanking.join('\n')}\`\`\``);
        }
        // Check if any of the songs in the artist DB are attached to the requested EP
        if (checkforEP === false) {
            return message.channel.send('No EP found.');
        }

        if (roverall != false && roverall != undefined && songRanking.length === 0) {
            exampleEmbed.addField('Overall Thoughts', roverall);
        } else if (roverall != false && roverall != undefined && songRanking.length != 0) {
            exampleEmbed.setDescription(roverall);
        }

        exampleEmbed.setColor(`${taggedMember.displayHexColor}`);
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