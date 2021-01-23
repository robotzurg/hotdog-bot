const Discord = require('discord.js');
const db = require("../db.js");
const { prefix } = require('../config.json');
const { mailboxes } = require('../arrays.json');

module.exports = {
    name: 'addreview',
    type: 'Review DB',
    aliases: ['addreview', 'review', 'r'],
    moreinfo: 'https://discord.com/channels/680864893552951306/794751896823922708/794766841444433941',
    description: 'Create a song review embed message!',
    args: true,
    usage: '<artist> | <song_name> | <rating> | <rate_desc> |  [op] <link_to_song_picture> | [op] <user_that_sent_song>',
	execute(message, args) {

        //Auto-adjustment to caps for each word
        args[0] = args[0].split(' ');
        args[0] = args[0].map(a => a.charAt(0).toUpperCase() + a.slice(1));
        args[0] = args[0].join(' ');

        args[1] = args[1].split(' ');
        args[1] = args[1].map(a => a.charAt(0).toUpperCase() + a.slice(1));
        args[1] = args[1].join(' ');

        let taggedUser = false;
        let taggedMember = false;
        let thumbnailImage = false;
        
        if (args.length < 4) {
            return message.channel.send(`Missing arguments!\nProper usage is: \`${prefix}${command.name} ${command.usage}\``);
        } else if (args.length === 5 || args.length === 6) {

            if (message.mentions.users.first() === undefined) { // If there isn't a user mentioned, then we know it's 3 arguments with no user mention.
                thumbnailImage = args[4];
            } else if (args.length === 5) { // If there is a user mentioned but only 3 arguments, then we know no image.
                taggedUser = message.mentions.users.first(); 
                taggedMember = message.mentions.members.first();
                is_mailbox = true;
            } else if (args.length === 6) { // If there is both a user mentioned and 4 arguments, then we know both!
                thumbnailImage = args[4];
                taggedUser = message.mentions.users.first(); 
                taggedMember = message.mentions.members.first();
                is_mailbox = true;
            }

            if (thumbnailImage.includes('|')) {
                return message.channel.send('Please make sure you don\'t have any **|** characters in your URL!');
            }

        }

        // [] check
        if (args[1].includes('Remix)')) {
            return message.channel.send('Please use [] for remixes, not ()!');
        }

        let rating = args[2].replace(/\s+/g, '');
        let review = args[3];

        if (args[2].length > 10) {
            rating = args[3].replace(/\s+/g, '');
            review = args[2];
        }

        if (rating.includes('(') && rating.includes(')')) {
            rating = rating.split('(');
            rating = rating.join(' ');
            rating = rating.split(')');
            rating = rating.join(' ');
            rating = rating.trim();
        } 

        // EP/LP check
        if (args[1].includes('EP') || args[1].toLowerCase().includes('LP') || args[1].toLowerCase().includes('Remixes')) {
            return message.channel.send('You can only use this command to rank singles/single remixes.\nPlease use `!addReviewEP` for EP Reviews/Rankings!');
        }

        let artistArray;

        if (!args[0].includes(',')) {
            artistArray = args[0].split(' & ');
        } else {
            artistArray = args[0].split(', ');
            if (artistArray[artistArray.length - 1].includes('&')) {
                let iter2 = artistArray.pop();
                iter2 = iter2.split(' & ');
                iter2 = iter2.map(a => artistArray.push(a));
                console.log(iter2);
            }
        }

        const command = message.client.commands.get('addreview');
        let is_mailbox = mailboxes.includes(message.channel.name);

        let songName = args[1];
        let featArtists = [];
        let rmxArtist = false;
        let remixsongName;

        //Take out the ft./feat.
        if (args[1].includes('(feat')) {

            songName = args[1].split(` (feat`);
            if (songName[1].includes(`[`)) {
                featArtists = songName[1].split('[');
                featArtists = featArtists[0].slice(2).slice(0, -2).split(' & ');
            } else {
                featArtists = songName[1].slice(2).slice(0, -1).split(' & ');
            }
            if (args[1].toLowerCase().includes('remix')) { rmxArtist = songName[1].split(' [')[1].slice(0, -7); }
            songName = songName[0];

            if (Array.isArray(featArtists)) {
                for (let i = 0; i < featArtists.length; i++) {
                    featArtists[i] = featArtists[i].split(' ');
                    featArtists[i] = featArtists[i].map(a => a.charAt(0).toUpperCase() + a.slice(1));
                    featArtists[i] = featArtists[i].join(' ');

                    artistArray.push(featArtists[i]);
                }
            } else if (featArtists != false) {
                featArtists = featArtists.split(' ');
                featArtists = featArtists.map(a => a.charAt(0).toUpperCase() + a.slice(1));
                featArtists = featArtists.join(' ');

                artistArray.push(featArtists);
            }

        } else if (args[1].includes('(ft')) {

            songName = args[1].split(` (ft`);
            if (songName[1].includes(`[`)) {
                featArtists = songName[1].split('[');
                featArtists = featArtists[0].slice(2).slice(0, -2).split(' & ');
            } else {
                featArtists = songName[1].slice(2).slice(0, -1).split(' & ');
            }
            if (args[1].toLowerCase().includes('remix')) { rmxArtist = songName[1].split(' [')[1].slice(0, -7); }
            songName = songName[0];

            if (Array.isArray(featArtists)) {
                for (let i = 0; i < featArtists.length; i++) {
                    featArtists[i] = featArtists[i].split(' ');
                    featArtists[i] = featArtists[i].map(a => a.charAt(0).toUpperCase() + a.slice(1));
                    featArtists[i] = featArtists[i].join(' ');

                    artistArray.push(featArtists[i]);
                }
            } else {
                featArtists = featArtists.split(' ');
                featArtists = featArtists.map(a => a.charAt(0).toUpperCase() + a.slice(1));
                featArtists = featArtists.join(' ');

                artistArray.push(featArtists);
            }

        }

        //Remix preparation
        if (songName.toLowerCase().includes('remix')) {
            remixsongName = songName;
            songName = args[1].split(` [`)[0];
            rmxArtist = args[1].split(' [')[1].slice(0, -7);
        } else if (songName.toLowerCase().includes('bootleg]')) {
            songName = args[1].substring(0, args[1].length - 9).split(' [')[0];
            rmxArtist = args[1].substring(0, args[1].length - 9).split(' [')[1];
        } else if (songName.toLowerCase().includes('flip]') || songName.toLowerCase().includes('edit]')) {
            songName = args[1].substring(0, args[1].length - 6).split(' [')[0];
            rmxArtist = args[1].substring(0, args[1].length - 6).split(' [')[1];
        }

        console.log(songName);
        console.log(rmxArtist);

        //Adjust (VIP)
        if (songName.includes('(VIP)')) {
            songName = songName.split(' (');
            songName = `${songName[0]} ${songName[1].slice(0, -1)}`;
        }
        
        if (db.reviewDB.has(artistArray[0]) && thumbnailImage === false) {
            if (rmxArtist === false) {
                thumbnailImage = db.reviewDB.get(artistArray[0], `["${songName}"].Image`);
                if (thumbnailImage === undefined || thumbnailImage === false || thumbnailImage === null) thumbnailImage = message.author.avatarURL({ format: "png", dynamic: false });
            } else {
                thumbnailImage = db.reviewDB.get(artistArray[0], `["${songName}"].Remixers.["${rmxArtist}"].Image`);
                if (thumbnailImage === undefined || thumbnailImage === false || thumbnailImage === null) thumbnailImage = message.author.avatarURL({ format: "png", dynamic: false });
            }
        } else if (thumbnailImage === false) {
            thumbnailImage = message.author.avatarURL({ format: "png", dynamic: false });
        }

        const exampleEmbed = new Discord.MessageEmbed()
        .setColor(`${message.member.displayHexColor}`)
        .setTitle(`${args[0]} - ${args[1]}`)
        .setAuthor(is_mailbox ? `${message.member.displayName}'s mailbox review` : `${message.member.displayName}'s review`, `${message.author.avatarURL({ format: "png", dynamic: false })}`);
        exampleEmbed.setDescription(review);
        exampleEmbed.setThumbnail(thumbnailImage);
        exampleEmbed.addField('Rating: ', `**${rating}**`, true);
        if (taggedUser != false) {
            exampleEmbed.setFooter(`Sent by ${taggedMember.displayName}`, `${taggedUser.avatarURL({ format: "png", dynamic: false })}`);
        }

        message.delete(message);

        //Add review to database
        //Quick thumbnail image check to assure we aren't putting in an avatar
        if (thumbnailImage === undefined || thumbnailImage === null || thumbnailImage === false) { 
            thumbnailImage = false;
        } else if (thumbnailImage.includes('avatar') === true) {
            thumbnailImage = false;
        }

        if (rmxArtist === false || rmxArtist === undefined) {
            for (let i = 0; i < artistArray.length; i++) {
                // If the artist db doesn't exist
                if (db.reviewDB.get(artistArray[i]) === undefined) {
                    db.reviewDB.set(artistArray[i], { 
                        [songName]: { // Create the SONG DB OBJECT
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
                            Collab: artistArray.filter(word => !featArtists.includes(word) && artistArray[i] != word),
                            Vocals: featArtists,
                        },
                        Image: false,
                    });
                } else if(db.reviewDB.get(artistArray[i], `["${songName}"]`) === undefined) { //If the artist db exists, check if the song db doesn't exist
                console.log('Song Not Detected!');
                const artistObj = db.reviewDB.get(artistArray[i]);

                    //Create the object that will be injected into the Artist object
                    const newsongObj = { 
                        [songName]: { 
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
                            Collab: artistArray.filter(word => !featArtists.includes(word) && artistArray[i] != word),
                            Vocals: featArtists,
                        },
                    };

                    //Inject the newsongobject into the artistobject and then put it in the database
                    Object.assign(artistObj, newsongObj);
                    db.reviewDB.set(artistArray[i], artistObj);

                } else if (db.reviewDB.get(artistArray[i], `["${songName}"].${message.author}`)) { // Check if you are already in the system
                    console.log('User is in the system!');
                    return message.reply(`You already have a review for ${artistArray[i]} - ${args[1]} in the system! Use \`!getreview\` to get your review, or \`!editreview\` to edit your pre-existing review.`);
                } else {
                    console.log('User not detected!');
                    const songObj = db.reviewDB.get(artistArray[i], `["${songName}"]`);

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
                    db.reviewDB.set(artistArray[i], songObj, `["${songName}"]`);
                    db.reviewDB.set(artistArray[i], thumbnailImage, `["${songName}"].Image`);
                }
            }
        } else { //Same version of the above, but this time for REMIXES
            artistArray.push(rmxArtist);
            for (let i = 0; i < artistArray.length; i++) {
                if (artistArray[i] === rmxArtist) {songName = remixsongName;} //Set the songname to the full name for the remix artist
                // If the artist db doesn't exist
                if (db.reviewDB.get(artistArray[i]) === undefined) {
                    console.log('Artist Not Detected!');
                    db.reviewDB.set(artistArray[i], { 
                        Image: false,
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
                            Collab: artistArray.filter(word => !featArtists.includes(word) && artistArray[i] != word),
                            Vocals: featArtists,
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
                                    Collab: artistArray.filter(word => !featArtists.includes(word) && artistArray[i] != word),
                                    Vocals: featArtists,
                                },
                            },
                            Image: false,
                        },
                    });
                } else if(db.reviewDB.get(artistArray[i], `["${songName}"]`) === undefined) { //If the artist db exists, check if the song db doesn't exist
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
                            Collab: artistArray.filter(word => !featArtists.includes(word) && artistArray[i] != word),
                            Vocals: featArtists,
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
                                    Collab: artistArray.filter(word => !featArtists.includes(word) && artistArray[i] != word),
                                    Vocals: featArtists,
                                },
                            },
                            Image: false,
                        },
                    };

                    //Inject the newsongobject into the artistobject and then put it in the database
                    Object.assign(artistObj, newsongObj);
                    console.log(artistArray[i]);
                    db.reviewDB.set(artistArray[i], artistObj);

                } else if (db.reviewDB.get(artistArray[i], `["${songName}"].Remixers.["${rmxArtist}"]`) === undefined && artistArray[i] != rmxArtist) { //If the song exists, check if the remix artist DB exists
                    console.log('Remix Artist not detected!');

                    const remixObj = db.reviewDB.get(artistArray[i], `["${songName}"].Remixers`);
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
                            Collab: artistArray.filter(word => !featArtists.includes(word) && artistArray[i] != word),
                            Vocals: featArtists,
                        },
                    };

                    Object.assign(remixObj, newremixObj);
                    db.reviewDB.set(artistArray[i], remixObj, `["${songName}"].Remixers`);

                } else if (db.reviewDB.get(artistArray[i], `["${songName}"].Remixers.["${rmxArtist}"].${message.author}`)) { // Check if you are already in the system
                    console.log('User is in the system!'); 
                    return message.channel.send(`You already have a review for ${artistArray[i]} - ${args[1]} in the system! Use \`!getreview\` to get your review, or \`!editreview\` to edit your pre-existing review.`);
                } else {
                    console.log('User not detected!');
                    const remixsongObj = (artistArray[i] === rmxArtist) ? db.reviewDB.get(artistArray[i], `["${songName}"]`) : db.reviewDB.get(artistArray[i], `["${songName}"].Remixers.["${rmxArtist}"]`);
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
                        db.reviewDB.set(artistArray[i], remixsongObj, `["${songName}"]`);
                        //db.reviewDB.set(artistArray[i], thumbnailImage, `["${songName}"].Image`);
                    } else {
                        db.reviewDB.set(artistArray[i], remixsongObj, `["${songName}"].Remixers.["${rmxArtist}"]`);
                        db.reviewDB.set(artistArray[i], thumbnailImage, `["${songName}"].Remixers.["${rmxArtist}"].Image`);
                    }
                }
            }
        }
        // Send the embed rate message
        return message.channel.send(exampleEmbed); 
    },
};