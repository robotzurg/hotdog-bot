const Discord = require('discord.js');
const db = require("../db.js");
// const DiscordPages = require("discord-pages");

module.exports = {
    name: 'getartist',
    type: 'Review DB',
    moreinfo: 'https://discord.com/channels/680864893552951306/794751896823922708/795552571170357258',
    aliases: ['getartist', 'geta'],
    description: 'Get all the songs from an artist and display them in an embed message.',
    args: true,
    usage: '<artist>',
	execute(message, args) {

        //Auto-adjustment to caps for each word
        args[0] = args[0].split(' ');
        args[0] = args[0].map(a => a.charAt(0).toUpperCase() + a.slice(1));
        args[0] = args[0].join(' ');

        // Function to grab average of all ratings later
        let average = (array) => array.reduce((a, b) => a + b) / array.length;

        const artistObj = db.reviewDB.get(args[0]);
        if (artistObj === undefined) return message.channel.send('Artist not found.');
        const artistImage = artistObj.Image;
        let songArray = Object.keys(artistObj);
        songArray = songArray.filter(item => item !== 'Image');
        songArray = songArray.filter(item => item !== 'Collab');
        songArray = songArray.filter(item => item !== 'Vocals');
        const EPs = {};
        const EPsOnEmbed = [];
        const singleArray = [];
        const remixArray = [];
        let reviewNum;

        for (let i = 0; i < songArray.length; i++) { //EP preparation
            const songEP = db.reviewDB.get(args[0], `["${songArray[i]}"].EP`);
            const songObj = db.reviewDB.get(args[0], `["${songArray[i]}"]`);
            reviewNum = Object.keys(songObj);

                reviewNum = reviewNum.filter(e => e !== 'Remixers');
                reviewNum = reviewNum.filter(e => e !== 'EP');
                reviewNum = reviewNum.filter(e => e !== 'Collab');
                reviewNum = reviewNum.filter(e => e !== 'Image');
                reviewNum = reviewNum.filter(e => e !== 'Vocals');

            reviewNum = reviewNum.length;
            if (songEP != false) {
                if (EPs[`${songEP}`] === undefined) {
                    EPs[`${songEP}`] = { [songArray[i]]: reviewNum } ;
                } else {
                EPs[`${songEP}`][`${songArray[i]}`] = reviewNum;
                }
            }
        }

        let rankNumArray = [];

		const exampleEmbed = new Discord.MessageEmbed()
            .setColor(`${message.member.displayHexColor}`)
            .setTitle(`${args[0]}'s reviewed tracks`);
            if (artistImage != false && artistImage != undefined) {
                exampleEmbed.setThumbnail(artistImage);
            }
            for (let i = 0; i < songArray.length; i++) {
                const songObj = db.reviewDB.get(args[0], `["${songArray[i]}"]`);
                const songEP = db.reviewDB.get(args[0], `["${songArray[i]}"].EP`);
                reviewNum = Object.keys(songObj);

                reviewNum = reviewNum.filter(e => e !== 'Remixers');
                reviewNum = reviewNum.filter(e => e !== 'EP');
                reviewNum = reviewNum.filter(e => e !== 'Collab');
                reviewNum = reviewNum.filter(e => e !== 'Image');
                reviewNum = reviewNum.filter(e => e !== 'Vocals');
                reviewNum = reviewNum.filter(e => e !== 'EPpos');
                
                for (let ii = 0; ii < reviewNum.length; ii++) {
                    if (!songArray[i].includes('EP') && !songArray[i].includes('LP') && !songArray[i].includes('/') && !songArray[i].includes('Remixes')) {
                        let rating;
                        rating = db.reviewDB.get(args[0], `["${songArray[i]}"].["${reviewNum[ii]}"].rate`);
                        rankNumArray.push(parseFloat(rating.slice(0, -3)));
                    }
                }

                reviewNum = reviewNum.length;

                if (songEP === false || songEP === undefined) {

                    let songDetails;
                    let remixerKeys;

                    if (typeof db.reviewDB.get(args[0], `["${songArray[i]}"].Remixers`) === 'object') {
                        remixerKeys = Object.keys(db.reviewDB.get(args[0], `["${songArray[i]}"].Remixers`));
                    } else {
                        remixerKeys = {};
                    }
                    
                    if (remixerKeys.length > 0) {
                        const songRemixersObj = db.reviewDB.get(args[0], `["${songArray[i]}"].Remixers`);
                        const songRemixersAmt = Object.keys(songRemixersObj).length;
                        songDetails = [`\`${reviewNum} review${reviewNum > 1 || reviewNum === 0 ? 's' : ''}\``, `\`${songRemixersAmt} remix${songRemixersAmt > 1 ? 'es' : ''}\``];
                        songDetails = songDetails.join(' ');

                    } else {
                        songDetails = `\`${reviewNum} review${reviewNum > 1 || reviewNum === 0 ? 's' : ''}\``;
                    }

                    if (!songArray[i].includes('Remix') && !songArray[i].includes('EP') && !songArray[i].includes('LP') && !songArray[i].includes('/')) {
                        singleArray.push(`-${songArray[i]}${songEP != false && songEP != undefined ? ` (${songEP})` : ''} ${songDetails}`);
                        singleArray[singleArray.length - 1] = singleArray[singleArray.length - 1].replace('*', '\\*');
                    } else if (!songArray[i].includes('EP') && !songArray[i].includes('LP') && !songArray[i].includes('/')) {
                        remixArray.push(`-${songArray[i]}${songEP != false && songEP != undefined ? ` (${songEP})` : ''} ${songDetails}`);
                        remixArray[remixArray.length - 1] = remixArray[remixArray.length - 1].replace('*', '\\*');
                    }
                    
                }
            }
            
            if (singleArray.length != 0) {
                exampleEmbed.addField('Singles:', singleArray);
            }
            if (remixArray.length != 0) {
                exampleEmbed.addField('Remixes:', remixArray);
            }

            exampleEmbed.setDescription(`*The average rating of this artist is* ***${Math.round(average(rankNumArray) * 10) / 10}!***`);
            
            for (let i = 0; i < songArray.length; i++) {
                const songEP = db.reviewDB.get(args[0], `["${songArray[i]}"].EP`);

                if (songEP != false && songEP != undefined && !EPsOnEmbed.includes(songEP)) { //If it's an EP and the field doesn't already exist
                    const s = EPs[`${songEP}`]; 
                    let songsinEP = Object.keys(s);
                    songsinEP = songsinEP.map(x => x + ` \`${EPs[`${songEP}`][`${x}`]} review${EPs[`${songEP}`][`${x}`] > 1 ? 's' : ''}\``);
                    songsinEP = songsinEP.map(ii => '-' + ii);
                    songsinEP = songsinEP.map(ii => ii.replace('*', '\\*'));
                    songsinEP.join('\n');
                    exampleEmbed.addField(`${songEP}: `, songsinEP);
                    EPsOnEmbed.push(songEP);
                    
                }
            }
        
        message.channel.send(exampleEmbed);
	},
};