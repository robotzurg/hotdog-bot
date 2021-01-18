const Discord = require('discord.js');
const db = require("../db.js");

module.exports = {
    name: 'getartist',
    aliases: ['getartist', 'geta'],
    description: 'Get all the songs from an artist.',
    args: true,
    usage: '<artist>',
	execute(message, args) {

        //Auto-adjustment to caps for each word
        args[0] = args[0].split(' ');
        args[0] = args[0].map(a => a.charAt(0).toUpperCase() + a.slice(1));
        args[0] = args[0].join(' ');

        const artistObj = db.reviewDB.get(args[0]);
        if (artistObj === undefined) return message.channel.send('Artist not found.');
        const songArray = Object.keys(artistObj);
        const EPs = {};
        const EPsOnEmbed = [];
        const singleArray = [];
        const remixArray = [];

        for (let i = 0; i < songArray.length; i++) { //EP preparation
            const songEP = db.reviewDB.get(args[0], `["${songArray[i]}"].EP`);
            const songObj = db.reviewDB.get(args[0], `["${songArray[i]}"]`);
            const reviewNum = Object.keys(songObj).length - 3;
            if (songEP != false) {
                if (EPs[`${songEP}`] === undefined) {
                    EPs[`${songEP}`] = { [songArray[i]]: reviewNum } ;
                } else {
                EPs[`${songEP}`][`${songArray[i]}`] = reviewNum;
                }
            }
        }

		const exampleEmbed = new Discord.MessageEmbed()
            .setColor(`${message.member.displayHexColor}`)
            .setTitle(`${args[0]}'s reviewed tracks`);
            for (let i = 0; i < songArray.length; i++) {
                const songObj = db.reviewDB.get(args[0], `["${songArray[i]}"]`);
                const songEP = db.reviewDB.get(args[0], `["${songArray[i]}"].EP`);
                const reviewNum = Object.keys(songObj).length - 3;

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

                    if (!songArray[i].includes('Remix')) {
                        singleArray.push(`-${songArray[i]}${songEP != false && songEP != undefined ? ` (${songEP})` : ''} ${songDetails}`);
                    } else {
                        remixArray.push(`-${songArray[i]}${songEP != false && songEP != undefined ? ` (${songEP})` : ''} ${songDetails}`);
                    }
                    
                }
            }
            
            if (singleArray.length != 0) {
                exampleEmbed.addField('Singles:', singleArray);
            }
            if (remixArray.length != 0) {
                exampleEmbed.addField('Remixes:', remixArray);
            }
            
            for (let i = 0; i < songArray.length; i++) {
                const songEP = db.reviewDB.get(args[0], `["${songArray[i]}"].EP`);

                if (songEP != false && songEP != undefined && !EPsOnEmbed.includes(songEP)) { //If it's an EP and the field doesn't already exist
                    const s = EPs[`${songEP}`]; 
                    let songsinEP = Object.keys(s);
                    songsinEP = songsinEP.map(x => x + ` \`${EPs[`${songEP}`][`${x}`]} review${EPs[`${songEP}`][`${x}`] > 1 ? 's' : ''}\``);
                    songsinEP = songsinEP.map(ii => '-' + ii);
                    songsinEP.join('\n');
                    exampleEmbed.addField(`${songEP}: `, songsinEP);
                    EPsOnEmbed.push(songEP);
                    
                }
            }
        
        message.channel.send(exampleEmbed);
	},
};