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

        let argArtistName;
        let argEPName;

        if (args.length === 2) {
            argArtistName = args[0];
            argEPName = args[1];
        } else if (args.length === 1) {
            argArtistName = false;
            argEPName = args[0];
        }

        args[0] = args[0].split(' ');
        args[0] = args[0].map(a => a.charAt(0).toUpperCase() + a.slice(1));
        args[0] = args[0].join(' ');

        if (argArtistName === false) {
            const dbKeyArray = db.reviewDB.keyArray();
            let options = [];
            
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
                        argEPName = AsongArray[ii];
                        options.push([argArtistName, argEPName]);
                        options[options.length - 1] = options[options.length - 1].join(' | ');
                    } 
                }
            }
            
            if (options.length === 0) {
                return message.channel.send('There is no EP/LP in the database that exists with this name.');
            } else if (options.length > 1) {
                return message.channel.send(`Looks like multiple EPs/LPs of the same name exist in the database. Please use \`!getReviewEP <artist> | <ep/lp>\` on one of these songs to get the review:\n\`\`\`${options.join('\n')}\`\`\`\n*(Tip: You can copy paste the above artist/eplp pairs into \`!getReviewEP\` as arguments.)*`);
            }
        }

        let artistName;

        if (!args[0].includes(',')) {
            artistName = argArtistName.split(' & ');
        } else {
            artistName = argArtistName.split(', ');
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

        const songArray = db.reviewDB.get(artistName[0], `["${argEPName}"].Songs`);
        if (songArray === undefined) {
            return message.channel.send('No EP found.');
        }
        let epThumbnail = db.reviewDB.get(artistName[0], `["${argEPName}"].Image`);

		const exampleEmbed = new Discord.MessageEmbed()
            .setColor(`${message.member.displayHexColor}`)
            .setTitle(`${argArtistName} - ${argEPName} tracks`);
            let epnum = 0;
            for (let i = 0; i < songArray.length; i++) {

                let songName = songArray[i];
                let rmxArtist = false;

                if (songArray[i].toLowerCase().includes('remix')) {
                    songName = songArray[i].substring(0, songArray[i].length - 7).split(' [')[0];
                    rmxArtist = songArray[i].substring(0, songArray[i].length - 7).split(' [')[1];
                }

                let songObj;

                if (rmxArtist === false) {
                    songObj = db.reviewDB.get(artistName[0], `["${songArray[i]}"]`);
                } else {
                    songObj = db.reviewDB.get(artistName[0], `["${songName}"].Remixers.["${rmxArtist}"]`);
                }

                if (epThumbnail != false && epThumbnail != undefined) {
                    exampleEmbed.setThumbnail(epThumbnail);
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
                reviewNum = reviewNum.filter(e => e !== 'Songs');
                reviewNum = reviewNum.length;

                exampleEmbed.addField(`${epnum}. ${songArray[i]}`, `\`${reviewNum} review${reviewNum > 1 ? 's' : ''}\``);
            }

        message.channel.send(exampleEmbed);
	},
};