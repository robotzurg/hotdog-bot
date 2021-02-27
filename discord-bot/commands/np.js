const Discord = require('discord.js');
const db = require('../db.js');

module.exports = {
	name: 'np',
	type: 'Fun',
	description: 'Display your currently playing song on Spotify!',
	execute(message) {
        let sent = false;
        // Function to grab average of all ratings later
        let average = (array) => array.reduce((a, b) => a + b) / array.length;
        message.author.presence.activities.forEach((activity) => {
            if (activity.type === 'LISTENING' && activity.name === 'Spotify' && activity.assets !== null) {
                let artists = activity.state;
                let artistArray = [activity.state];
                if (artists.includes(';')) {
                    artists = artists.split('; ');
                    artistArray = artists;
                    artists = artists.join(' & ');
                }
                if (activity.details.includes('- Extended Mix')) {
                    activity.details = activity.details.replace('- Extended Mix', `(Extended Mix)`);
                }

                const exampleEmbed = new Discord.MessageEmbed()
                .setColor(`${message.member.displayHexColor}`)
                .setTitle(`${artists} - ${activity.details}`)
                .setAuthor(`${message.member.displayName}'s current song`, `${message.author.avatarURL({ format: "png", dynamic: false })}`);

                artistArray[0] = artistArray[0].split(' ');
                artistArray[0] = artistArray[0].map(a => a.charAt(0).toUpperCase() + a.slice(1));
                artistArray[0] = artistArray[0].join(' ');

                if (db.reviewDB.has(artistArray[0]) && !activity.details.toLowerCase().includes('remix')) {

                    activity.details = activity.details.split(' ');
                    activity.details = activity.details.map(a => a.charAt(0).toUpperCase() + a.slice(1));
                    activity.details = activity.details.join(' ');

                    if (db.reviewDB.get(artistArray[0], `["${activity.details}"]`) != undefined) {

                        let userArray = Object.keys(db.reviewDB.get(artistArray[0], `["${activity.details}"]`));
            
                        userArray = userArray.filter(e => e !== 'EP');
                        userArray = userArray.filter(e => e !== 'Image');
                        userArray = userArray.filter(e => e !== 'Remixers');
                        userArray = userArray.filter(e => e !== 'Collab');
                        userArray = userArray.filter(e => e !== 'Vocals');
                        userArray = userArray.filter(e => e !== 'EPpos');
                        
                        const rankNumArray = [];

                            for (let i = 0; i < userArray.length; i++) {
                                if (userArray[i] != 'EP') {
                                    let rating;
                                    rating = db.reviewDB.get(artistArray[0], `["${activity.details}"].${userArray[i]}.rate`);
                                    rankNumArray.push(parseFloat(rating.slice(0, -3)));
                                    userArray[i] = [parseFloat(rating.slice(0, -3)), `${userArray[i]} \`${rating}\``];
                                }
                            }

                        exampleEmbed.setDescription(`Reviews: \`${userArray.length} reviews\`\nAverage Rating: \`${Math.round(average(rankNumArray) * 10) / 10}\``);

                        if (db.reviewDB.get(artistArray[0], `["${activity.details}"].EP`) != undefined && db.reviewDB.get(artistArray[0], `["${activity.details}"].EP`) != false) {
                            exampleEmbed.setFooter(`from ${db.reviewDB.get(artistArray[0], `["${activity.details}"].EP`)}`, db.reviewDB.get(artistArray[0], `["${db.reviewDB.get(artistArray[0], `["${activity.details}"].EP`)}"].Image`));
                        }
                    } else {
                        exampleEmbed.setDescription(`This song has not been reviewed in the database.`);
                    }

                } else {
                    if (!activity.details.toLowerCase().includes('remix')) {
                        exampleEmbed.setDescription(`This artist is not been reviewed in the database.`);
                    } else {
                        exampleEmbed.setDescription(`Remixes are not supported for database info with this command.`);
                    }
                }

                exampleEmbed.setThumbnail(`https://i.scdn.co/image/${activity.assets.largeImage.slice(8)}`);
                
                message.channel.send(exampleEmbed);
                sent = true;
            }
        });

        if (sent === false) return message.channel.send('You aren\'t playing a song on Spotify.');
	},
};