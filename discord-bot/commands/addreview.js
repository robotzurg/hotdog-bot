const Discord = require('discord.js');
const db = require("../db.js");
const { prefix } = require('../config.json');
const { mailboxes } = require('../arrays.json');

module.exports = {
    name: 'addreview',
    aliases: ['addreview', 'review'],
    description: 'Create a song rating embed message!',
    args: true,
    usage: '`<artist> | <song_name> | <rating> | <rate_desc> |  [op] <link_to_song_picture> | [op] <user_that_sent_song>`',
	execute(message, args) {

        let rating = args[2];
        let review = args[3];

        if (args[2].length > 10) {
            rating = args[3];
            review = args[2];
        }

        if (args[1].includes('EP') || args[1].toLowerCase().includes('LP') || args[1].toLowerCase().includes('Remixes')) {
            return message.channel.send('You can only use this command to rank singles/single remixes.\nPlease use `!addReviewEP` for EP Reviews/Rankings!');
        }

        const command = message.client.commands.get('addreview');
        const is_mailbox = mailboxes.includes(message.channel.name);
        
        //Remix preparation
        let songName;
        let rmxArtist;
        if (args[1].toLowerCase().includes('remix')) {
            songName = args[1].substring(0, args[1].length - 7).split(' (')[0];
            rmxArtist = args[1].substring(0, args[1].length - 7).split(' (')[1];
        } else if (args[1].toLowerCase().includes('bootleg)')) {
            songName = args[1].substring(0, args[1].length - 9).split(' (')[0];
            rmxArtist = args[1].substring(0, args[1].length - 9).split(' (')[1];
        } else if (args[1].toLowerCase().includes('flip)') || args[1].toLowerCase().includes('edit)')) {
            songName = args[1].substring(0, args[1].length - 6).split(' (')[0];
            rmxArtist = args[1].substring(0, args[1].length - 6).split(' (')[1];
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

        //Adjust (VIP)
        if (songName.includes('(VIP)')) {
            songName = songName.split(' (');
            songName = `${songName[0]} ${songName[1].slice(0, -1)}`;
        }
        
        let artistArray = args[0].split(' & ');
        let taggedUser = false;
        let taggedMember = false;
        let thumbnailImage;
        if (db.reviewDB.has(artistArray[0])) {
            if (rmxArtist === false) {
                thumbnailImage = db.reviewDB.get(artistArray[0], `${songName}.Image`);
                if (thumbnailImage === undefined) thumbnailImage = message.author.avatarURL({ format: "png", dynamic: false });
            } else {
                thumbnailImage = db.reviewDB.get(artistArray[0], `${songName}.Remixers.${rmxArtist}.Image`);
                if (thumbnailImage === undefined) thumbnailImage = message.author.avatarURL({ format: "png", dynamic: false });
            }
        } else {
            thumbnailImage = message.author.avatarURL({ format: "png", dynamic: false });
        }

        if (args.length < 4) {
            return message.channel.send(`Missing arguments!\nProper usage is: \`${prefix}${command.name} ${command.usage}\``);
        } else if (args.length === 5 || args.length === 6) {

            if (message.mentions.users.first() === undefined) { // If there isn't a user mentioned, then we know it's 3 arguments with no user mention.
                thumbnailImage = args[4];
            } else if (args.length === 3) { // If there is a user mentioned but only 3 arguments, then we know no image.
                taggedUser = message.mentions.users.first(); 
                taggedMember = message.mentions.members.first();
            } else if (args.length === 4) { // If there is both a user mentioned and 4 arguments, then we know both!
                thumbnailImage = args[4];
                taggedUser = message.mentions.users.first(); 
                taggedMember = message.mentions.members.first();
            }
        }

        const exampleEmbed = new Discord.MessageEmbed()
        .setColor(`${message.member.displayHexColor}`)
        .setTitle(`${args[0]} - ${args[1]}`)
        .setAuthor(is_mailbox ? `${message.member.displayName}'s mailbox review` : `${message.member.displayName}'s review`, `${message.author.avatarURL({ format: "png", dynamic: false })}`);
        exampleEmbed.setDescription(review)
        .setThumbnail(thumbnailImage)
        .addField('Rating: ', `**${rating}**`, true);
        if (taggedUser != false) {
            exampleEmbed.setFooter(`Sent by ${taggedMember.displayName}`, `${taggedUser.avatarURL({ format: "png", dynamic: false })}`);
        }

        message.delete(message);

        //Add review to database
        //Quick thumbnail image check to assure we aren't putting in an avatar
        if (thumbnailImage.includes('avatar') === true) {
            thumbnailImage = false;
        }

        if (rmxArtist === false) {
            for (let i = 0; i < artistArray.length; i++) {
                // If the artist db doesn't exist
                if (db.reviewDB.get(artistArray[i]) === undefined) {
                    db.reviewDB.set(artistArray[i], { 
                        [args[1]]: { // Create the SONG DB OBJECT
                            [`<@${message.author.id}>`]: { 
                                name: message.member.displayName,
                                review: review,
                                rate: rating,
                                sentby: taggedUser === false ? false : taggedUser.id,
                                rankPosition: -1,
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
                                review: review,
                                rate: rating,
                                sentby: taggedUser === false ? false : taggedUser.id,
                                rankPosition: -1,
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
                            review: review,
                            rate: rating,
                            sentby: taggedUser === false ? false : taggedUser.id,
                            rankPosition: -1,
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
                                review: review,
                                rate: rating,  
                                sentby: taggedUser === false ? false : taggedUser.id,
                                rankPosition: -1,
                            },
                            EP: false,
                            Remixers: {},
                            Image: thumbnailImage,
                        } : { // Create the SONG DB OBJECT, for the original artist
                            EP: false, 
                            Remixers: {
                                [rmxArtist]: {
                                    [`<@${message.author.id}>`]: { 
                                        name: message.member.displayName,
                                        review: review,
                                        rate: rating,  
                                        sentby: taggedUser === false ? false : taggedUser.id,
                                        rankPosition: -1,
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
                                review: review,
                                rate: rating, 
                                sentby: taggedUser === false ? false : taggedUser.id,
                                rankPosition: -1,
                            },
                            EP: false,
                            Remixers: {},
                            Image: thumbnailImage,
                        } : { // Create the SONG DB OBJECT, for the original artist
                            EP: false, 
                            Remixers: {
                                [rmxArtist]: {
                                    [`<@${message.author.id}>`]: { 
                                        name: message.member.displayName,
                                        review: review,
                                        rate: rating,  
                                        sentby: taggedUser === false ? false : taggedUser.id,
                                        rankPosition: -1,
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
                                review: review,
                                rate: rating,  
                                sentby: taggedUser === false ? false : taggedUser.id,
                                rankPosition: -1,
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
                            review: review,
                            rate: rating,
                            sentby: taggedUser === false ? false : taggedUser.id,
                            rankPosition: -1,
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
    },
};