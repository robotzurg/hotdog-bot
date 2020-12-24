const Discord = require('discord.js');
const db = require("../db.js");
const { prefix } = require('../config.json');
const mailboxes = ['aeroface', 'av', 'emily', 'ethan', 'fridgey', 'hal', 'jeff', 'josh', 'lapplepieguy', 'meltered', 'nate', 'pup', 'shiro', 'steph', 'treez', 'valence', 'vol', 'xypod', 'yacob', 'yul'];

module.exports = {
	name: 'addreview',
    description: 'Create a song rating embed message!',
    args: true,
    usage: '`<artist> | <song_name> | <rating> | <rate_desc> |  [op] <link_to_song_picture> | [op] <user_that_sent_song>`',
	execute(message, args) {
        // if (message.author.id === '122568101995872256') { 
            const command = message.client.commands.get('addreview');
            const is_mailbox = mailboxes.includes(message.channel.name);
            
            //Remix preparation
            let songName;
            let rmxArtist;
            if (args[1].toLowerCase().includes('remix')) {
                songName = args[1].substring(0, args[1].length - 7).split(' (')[0];
                rmxArtist = args[1].substring(0, args[1].length - 7).split(' (')[1];
            } else {
                songName = args[1];
                rmxArtist = false;
            }

            let artistArray = args[0].split(' & ');
            let taggedUser;
            let taggedMember;
            let thumbnailImage;

            if (args.length < 4) {
                return message.channel.send(`Missing arguments!\nProper usage is: \`${prefix}${command.name} ${command.usage}\``);
            } else if (args.length === 4) {

                taggedUser = false;
                taggedMember = false;
                thumbnailImage = message.author.avatarURL({ format: "png", dynamic: false });

            } else if (args.length === 5) {

                thumbnailImage = args[4];
                taggedUser = false;
                taggedMember = false;

            } else if (args.length === 6) {

                if (message.mentions.users.first() != undefined) { 
                    taggedUser = message.mentions.users.first(); 
                    taggedMember = message.mentions.members.first();
                } else { 
                    taggedUser = false;
                    taggedMember = false;
                }

                thumbnailImage = args[4];

            }

            const exampleEmbed = new Discord.MessageEmbed()
            .setColor(`${message.member.displayHexColor}`)
            .setTitle(`${args[0]} - ${args[1]}`)
            .setAuthor(is_mailbox ? `${message.member.displayName}'s mailbox review` : `${message.member.displayName}'s review`, `${message.author.avatarURL({ format: "png", dynamic: false })}`);
            exampleEmbed.setDescription(args[3])
            .setThumbnail(thumbnailImage)
            .addField('Rating: ', `**${args[2]}**`, true);
            if (taggedUser != false) {
                exampleEmbed.setFooter(`Sent by ${taggedMember.displayName}`, `${taggedUser.avatarURL({ format: "png", dynamic: false })}`);
            }

            message.delete(message);

            //Add review to database
            if (rmxArtist === false) {
                for (let i = 0; i < artistArray.length; i++) {
                    // If the artist db doesn't exist
                    if (db.reviewDB.get(artistArray[i]) === undefined) {
                        db.reviewDB.set(artistArray[i], { 
                            [args[1]]: { // Create the SONG DB OBJECT
                                [`<@${message.author.id}>`]: { 
                                    name: message.member.displayName,
                                    review: args[3],
                                    rate: args[2],
                                    sentby: taggedUser === false ? false : taggedUser.id,
                                },
                                EP: false, 
                                Remixers: {},
                                Image: thumbnailImage,
                            },
                        });
                    } else if(db.reviewDB.get(artistArray[i], `${args[1]}`) === undefined) { //If the artist db exists, check if the song db doesn't exist
                    console.log('Song Not Detected!');
                    const artistObj = db.reviewDB.get(artistArray[i]);

                        //Create the object that will be injected into the Artist object
                        const newsongObj = { 
                            [args[1]]: { 
                                [`<@${message.author.id}>`]: { 
                                    name: message.member.displayName,
                                    review: args[3],
                                    rate: args[2],
                                    sentby: taggedUser === false ? false : taggedUser.id,
                                },
                                EP: false, 
                                Remixers: {},
                                Image: thumbnailImage,
                            },
                        };

                        //Inject the newsongobject into the artistobject and then put it in the database
                        Object.assign(artistObj, newsongObj);
                        db.reviewDB.set(artistArray[i], artistObj);

                    } else if (db.reviewDB.get(artistArray[i], `${args[1]}.${message.author}`)) { // Check if you are already in the system
                        console.log('User is in the system!');
                        return message.channel.send(`You already have a review for ${artistArray[i]} - ${args[1]} in the system! Use \`!getreview\` to get your review, or \`!editreview\` to edit your pre-existing review.`);
                    } else {
                        console.log('User not detected!');
                        const songObj = db.reviewDB.get(artistArray[i], `${args[1]}`);

                        //Create the object that will be injected into the Song object
                        const newuserObj = {
                            [`<@${message.author.id}>`]: { 
                                name: message.member.displayName,
                                review: args[3],
                                rate: args[2],
                                sentby: taggedUser === false ? false : taggedUser.id,
                            },
                        };

                        //Inject the newsongobject into the songobject and then put it in the database
                        Object.assign(songObj, newuserObj);
                        db.reviewDB.set(artistArray[i], songObj, `${args[1]}`);
                    }
                }
            } else { //Same version of the above, but this time for REMIXES
                artistArray.push(rmxArtist);
                for (let i = 0; i < artistArray.length; i++) {
                    if (artistArray[i] === rmxArtist) {songName = args[1];} //Set the songname to the full name for the remix artist
                    // If the artist db doesn't exist
                    if (db.reviewDB.get(artistArray[i]) === undefined) {
                        console.log('Artist Not Detected!');
                        db.reviewDB.set(artistArray[i], { 
                            [songName]: artistArray[i] === rmxArtist ? { //For the remixer
                                [`<@${message.author.id}>`]: { 
                                    name: message.member.displayName,
                                    review: args[3],
                                    rate: args[2],  
                                    sentby: taggedUser === false ? false : taggedUser.id,
                                },
                                EP: false,
                                Remixers: false,
                                Image: thumbnailImage,
                            } : { // Create the SONG DB OBJECT, for the original artist
                                EP: false, 
                                Remixers: {
                                    [rmxArtist]: {
                                        [`<@${message.author.id}>`]: { 
                                            name: message.member.displayName,
                                            review: args[3],
                                            rate: args[2],  
                                            sentby: taggedUser === false ? false : taggedUser.id,
                                        },
                                        Image: thumbnailImage,
                                    },
                                },
                                Image: false,
                            },
                        });
                    } else if(db.reviewDB.get(artistArray[i], `${songName}`) === undefined) { //If the artist db exists, check if the song db doesn't exist
                    console.log('Song Not Detected!');
                    const artistObj = db.reviewDB.get(artistArray[i]);

                        //Create the object that will be injected into the Artist object
                        const newsongObj = { 
                            [songName]: artistArray[i] === rmxArtist ? { //For the remixer
                                [`<@${message.author.id}>`]: { 
                                    name: message.member.displayName,
                                    review: args[3],
                                    rate: args[2], 
                                    sentby: taggedUser === false ? false : taggedUser.id,
                                },
                                EP: false,
                                Remixers: false,
                                Image: thumbnailImage,
                            } : { // Create the SONG DB OBJECT, for the original artist
                                EP: false, 
                                Remixers: {
                                    [rmxArtist]: {
                                        [`<@${message.author.id}>`]: { 
                                            name: message.member.displayName,
                                            review: args[3],
                                            rate: args[2],  
                                            sentby: taggedUser === false ? false : taggedUser.id,
                                        },
                                        Image: thumbnailImage,
                                    },
                                },
                                Image: false,
                            },
                        };

                        //Inject the newsongobject into the artistobject and then put it in the database
                        Object.assign(artistObj, newsongObj);
                        console.log(artistArray[i]);
                        db.reviewDB.set(artistArray[i], artistObj);

                    } else if (db.reviewDB.get(artistArray[i], `${songName}.Remixers.${rmxArtist}`) === undefined) { //If the song exists, check if the remix artist DB exists
                        console.log('Remix Artist not detected!');

                        const remixObj = db.reviewDB.get(artistArray[i], `${songName}.Remixers`);
                        console.log(remixObj);
                        //Create the object that will be injected into the Remixers object
                        const newremixObj = { 
                            [rmxArtist]: {
                                [`<@${message.author.id}>`]: { 
                                    name: message.member.displayName,
                                    review: args[3],
                                    rate: args[2],  
                                    sentby: taggedUser === false ? false : taggedUser.id,
                                },
                                Image: thumbnailImage,
                            },
                        };

                        Object.assign(remixObj, newremixObj);
                        db.reviewDB.set(artistArray[i], remixObj, `${songName}.Remixers`);

                    } else if (db.reviewDB.get(artistArray[i], `${songName}.Remixers.${rmxArtist}.${message.author}`)) { // Check if you are already in the system
                        console.log('User is in the system!'); 
                        return message.channel.send(`You already have a review for ${artistArray[i]} - ${args[1]} in the system! Use \`!getreview\` to get your review, or \`!editreview\` to edit your pre-existing review.`);
                    } else {
                        console.log('User not detected!');
                        const remixsongObj = (artistArray[i] === rmxArtist) ? db.reviewDB.get(artistArray[i], `${songName}`) : db.reviewDB.get(artistArray[i], `${songName}.Remixers.${rmxArtist}`);

                        //Create the object that will be injected into the Song object
                        const newuserObj = {
                            [`<@${message.author.id}>`]: { 
                                name: message.member.displayName,
                                review: args[3],
                                rate: args[2],
                                sentby: taggedUser === false ? false : taggedUser.id,
                            },
                        };

                        //Inject the newsongobject into the songobject and then put it in the database
                        Object.assign(remixsongObj, newuserObj);
                        if (artistArray[i] === rmxArtist) {
                            db.reviewDB.set(artistArray[i], remixsongObj, `${songName}`);
                        } else {
                            db.reviewDB.set(artistArray[i], remixsongObj, `${songName}.Remixers.${rmxArtist}`); 
                        }
                    }
                }
            }
            // Send the embed rate message
            return message.channel.send(exampleEmbed); 
        // }
    },
};