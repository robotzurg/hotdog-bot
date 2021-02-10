// const Discord = require('discord.js');
const db = require("../db.js");

module.exports = {
    name: 'reviewed',
    type: 'Review DB',
    moreinfo: 'https://discord.com/channels/680864893552951306/794751896823922708/795553872143187968',
    description: 'See the top 5 songs on the server!',
	execute(message) {

        const dbKeyArray = db.reviewDB.keyArray();
        let artistsGoneThrough = [];
        let reviewNum = 0;
        
        for (let i = 0; i < dbKeyArray.length; i++) {
            let AsongArray = Object.keys(db.reviewDB.get(dbKeyArray[i]));
            AsongArray = AsongArray.filter(item => item !== 'Image');

            for (let ii = 0; ii < AsongArray.length; ii++) {
                let userArray = Object.keys(db.reviewDB.get(dbKeyArray[i], `["${AsongArray[ii]}"]`));
                if (!userArray.includes('Collab')) {
                    let songObj = db.reviewDB.get(dbKeyArray[i], `["${AsongArray[ii]}"]`);
                    Object.assign(songObj, { Collab: [] });
                    db.reviewDB.set(dbKeyArray[i], songObj, `["${AsongArray[ii]}"]`);
                }

                if (!userArray.includes('Vocals')) {
                    let songObj = db.reviewDB.get(dbKeyArray[i], `["${AsongArray[ii]}"]`);
                    Object.assign(songObj, { Vocals: [] });
                    db.reviewDB.set(dbKeyArray[i], songObj, `["${AsongArray[ii]}"]`);
                }

                if (userArray.includes(`<@${message.author.id}>`) && !artistsGoneThrough.includes(dbKeyArray[i])) {
                    reviewNum++;
                }
            }
        }

        message.channel.send(`${message.author} has sent ${reviewNum} reviews. (This command is not currently accurate. Please avoid using it for now!)`);
    },
};