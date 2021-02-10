const Discord = require('discord.js');
const { prefix } = require('../config.json');
const db = require("../db.js");
const { mailboxes } = require('../arrays.json');

module.exports = {
    name: 'addreviewep',
    type: 'Review DB',
    moreinfo: 'https://discord.com/channels/680864893552951306/794751896823922708/794769347443818527',
    aliases: ['addreviewep', 'reviewep', 're'],
    description: 'Create an EP/LP review embed message! Use !end to end the chain.',
    args: true,
    usage: '<artist> | <ep/lp_name> | [op] <image> | [op] <user_that_sent_ep/lp>',
	execute(message, args) {

        //Auto-adjustment to caps for each word
        args[0] = args[0].split(' ');
        args[0] = args[0].map(a => a.charAt(0).toUpperCase() + a.slice(1));
        args[0] = args[0].join(' ');

        args[1] = args[1].split(' ');
        args[1] = args[1].map(a => a.charAt(0).toUpperCase() + a.slice(1));
        args[1] = args[1].join(' ');

        if (args[0].includes(',')) {
            return message.channel.send('Using `,` to separate artists is not currently supported with EPs/LPs. Please use & to separate artists!').then(msg => { msg.delete({ timeout: 15000 }); message.delete({ timeout: 15000 }); });
        }

        if (!args[1].toLowerCase().includes('ep') && !args[1].toLowerCase().includes('lp') && !args[1].toLowerCase().includes('remixes') && !args[1].includes('/')) {
            args[1] = args[1].concat(' EP');
        }

        const command = message.client.commands.get('addreviewep');
        let is_mailbox = mailboxes.includes(message.channel.name);
        
        let taggedUser = false;
        let taggedMember = false;
        let thumbnailImage = false;
        let msgtoEdit;
        let message_id;

        if (args.length < 2) {
            return message.channel.send(`Missing arguments!\nProper usage is: \`${prefix}${command.name} ${command.usage}\``);
        } else if (args.length === 3 || args.length === 4) {

            if (message.mentions.users.first() === undefined) { // If there isn't a user mentioned, then we know it's 3 arguments with no user mention.
                thumbnailImage = args[2];
            } else if (args.length === 3) { // If there is a user mentioned but only 3 arguments, then we know no image.
                taggedUser = message.mentions.users.first(); 
                taggedMember = message.mentions.members.first();
                is_mailbox = true;
            } else if (args.length === 4) { // If there is both a user mentioned and 4 arguments, then we know both!
                thumbnailImage = args[2];
                taggedUser = message.mentions.users.first(); 
                taggedMember = message.mentions.members.first();
                is_mailbox = true;
            }

            if (thumbnailImage.includes('spotify')) {
                message.author.presence.activities.forEach((activity) => {
                    if (activity.type === 'LISTENING' && activity.name === 'Spotify' && activity.assets !== null) {
                        thumbnailImage = `https://i.scdn.co/image/${activity.assets.largeImage.slice(8)}`;
                    }
                });
            }

        }

        message.delete(message);

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

        if (db.reviewDB.has(artistArray[0]) && thumbnailImage === false) {

                let iCheckSongObj = db.reviewDB.get(artistArray[0]);
                iCheckSongObj = Object.keys(iCheckSongObj);
                iCheckSongObj = iCheckSongObj.filter(e => e !== 'Image');

                if (iCheckSongObj.length != 0) {
                    for (let i = 0; i < iCheckSongObj.length; i++) {
                        if (db.reviewDB.get(artistArray[0], `["${iCheckSongObj[i]}"].EP`) != args[1]) break;
                        thumbnailImage = db.reviewDB.get(artistArray[0], `["${iCheckSongObj[i]}"].Image`);

                        if (thumbnailImage === undefined || thumbnailImage === false || thumbnailImage === null) {
                            thumbnailImage = message.author.avatarURL({ format: "png", dynamic: false });
                        } else {
                            break;
                        }
                    }
                }

        } else if (thumbnailImage === false) {
            thumbnailImage = message.author.avatarURL({ format: "png", dynamic: false });
        }

        let exampleEmbed = new Discord.MessageEmbed()
        .setColor(`${message.member.displayHexColor}`)
        .setTitle(`${args[0]} - ${args[1]}`);

        if (args[1].includes('EP') || args[1].includes('The Remixes')) {
            exampleEmbed.setAuthor(is_mailbox ? `${message.member.displayName}'s mailbox EP review` : `${message.member.displayName}'s EP review`, `${message.author.avatarURL({ format: "png", dynamic: false })}`);
        } else if (args[1].includes('LP')) {
            exampleEmbed.setAuthor(is_mailbox ? `${message.member.displayName}'s mailbox LP review` : `${message.member.displayName}'s LP review`, `${message.author.avatarURL({ format: "png", dynamic: false })}`);
        } else {
            exampleEmbed.setAuthor(is_mailbox ? `${message.member.displayName}'s mailbox review` : `${message.member.displayName}'s review`, `${message.author.avatarURL({ format: "png", dynamic: false })}`);
        }

        if (thumbnailImage === false) {
            exampleEmbed.setThumbnail(message.author.avatarURL({ format: "png", dynamic: false }));
        } else {
            exampleEmbed.setThumbnail(thumbnailImage);
        }

        if (taggedUser != false) {
            exampleEmbed.setFooter(`Sent by ${taggedMember.displayName}`, `${taggedUser.avatarURL({ format: "png", dynamic: false })}`);
        }

        (message.channel.send(exampleEmbed)).then((msg) => {
            msgtoEdit = msg;
            msg.react('👂');
            message_id = msg.id;
        });

        const filter = m => m.author.id === message.author.id && (m.content.includes('(') || m.content.includes('[') || m.content.toLowerCase().includes('overall') || m.content.includes('!end'));
        const collector = message.channel.createMessageCollector(filter, { idle: 900000 });
        const rankArray = [];
        let splitUpArray;
        let splitUpOverall;
        let songName;
        let fullSongName;
        let songRating;
        let songReview;
        let rmxArtist;
        let featArtists = false;
        let overallString = -1;
        
        collector.on('collect', m => {

            if (m.content.includes('!end')) {
                collector.stop();
                m.delete();
                msgtoEdit.reactions.removeAll();
                return;
            } else if (m.content.includes(`!overall`)) {

                if (overallString === -1) {
                    splitUpOverall = m.content.split('\n');
                    splitUpOverall.shift();
                    overallString = splitUpOverall;
                    m.delete();
                }

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

                let songArray;
                for (let ii = 0; ii < artistArray.length; ii++) {
                    songArray = Object.keys(db.reviewDB.get(artistArray[ii]));
                    for (let i = 0; i < songArray.length; i++) {
                        if (!songArray[i].includes('Remix')) {
                            let songRemixes = db.reviewDB.get(artistArray[ii], `${songArray[i]}.Remixers`);
                            let songEP;

                            if (songRemixes != false && songRemixes != undefined && songRemixes != null) {
                                if (Object.keys(songRemixes).length === 0) {
                                    songEP = db.reviewDB.get(artistArray[ii], `${songArray[i]}.EP`);
                                    if (songEP === args[1]) {
                                        db.reviewDB.set(artistArray[ii], overallString[0], `${songArray[i]}.<@${message.author.id}>.EPOverall`);
                                    }
                                } else {
                                    for (let rmxNum = 0; rmxNum < Object.keys(songRemixes).length; rmxNum++) {
                                        songEP = db.reviewDB.get(artistArray[ii], `${songArray[i]}.Remixers.${Object.keys(songRemixes)[rmxNum]}.EP`);
                                        if (songEP === args[1]) {
                                            db.reviewDB.set(artistArray[ii], overallString[0], `${songArray[i]}.Remixers.${Object.keys(songRemixes)[rmxNum]}.<@${message.author.id}>.EPOverall`);
                                        }  
                                    }
                                }
                            } else {
                                songEP = db.reviewDB.get(artistArray[ii], `${songArray[i]}.EP`);
                                if (songEP === args[1]) {
                                    db.reviewDB.set(artistArray[ii], overallString[0], `${songArray[i]}.<@${message.author.id}>.EPOverall`);
                                }
                            }
                        }
                    }
                }

                collector.stop();
                msgtoEdit.reactions.removeAll();

            } else {

                if (!m.content.includes('/10')) {
                    m.delete();
                    return message.channel.send(`You forgot to add a ranking! Here's what you sent, so that you can copy and fix it.\n${m.content}`).then(msg => {
                        msg.delete({ timeout: 15000 }); 
                    })
                    .catch(console.error);
                }

                featArtists = [];
                artistArray = args[0].split(' & ');
                splitUpArray = m.content.split('\n'); 
                songReview = splitUpArray[1];
                if (songReview === undefined) {
                    songReview = 'No written review.';
                    splitUpArray[1] = 'No written review.';
                }

                rankArray.push(splitUpArray);
                songRating = splitUpArray[0].split(' '),
                songName = songRating.splice(0, songRating.length - 1).join(" ");
                songRating = songRating[0].slice(0, -1);
                songRating = songRating.slice(1);

                //Remix preparation
                if (songName.toString().toLowerCase().includes('remix')) {
                    fullSongName = songName;
                    songName = fullSongName.substring(0, fullSongName.length - 7).split(' [')[0];
                    rmxArtist = fullSongName.substring(0, fullSongName.length - 7).split(' [')[1];
                    artistArray = args[0].split(' & ');

                    rmxArtist = rmxArtist.split(' ');
                    rmxArtist = rmxArtist.map(a => a.charAt(0).toUpperCase() + a.slice(1));
                    rmxArtist = rmxArtist.join(' ');

                } else if (songName.toString().toLowerCase().includes('bootleg')) {
                    fullSongName = songName;
                    songName = fullSongName.substring(0, fullSongName.length - 9).split(' [')[0];
                    rmxArtist = fullSongName.substring(0, fullSongName.length - 9).split(' [')[1];
                    artistArray = args[0].split(' & ');

                    rmxArtist = rmxArtist.split(' ');
                    rmxArtist = rmxArtist.map(a => a.charAt(0).toUpperCase() + a.slice(1));
                    rmxArtist = rmxArtist.join(' ');

                } else if (songName.toString().toLowerCase().includes('flip') || songName.toString().toLowerCase().includes('edit')) {
                    fullSongName = songName;
                    songName = fullSongName.substring(0, fullSongName.length - 6).split(' [')[0];
                    rmxArtist = fullSongName.substring(0, fullSongName.length - 6).split(' [')[1];
                    artistArray = args[0].split(' & ');

                    rmxArtist = rmxArtist.split(' ');
                    rmxArtist = rmxArtist.map(a => a.charAt(0).toUpperCase() + a.slice(1));
                    rmxArtist = rmxArtist.join(' ');
                } else {
                    rmxArtist = false;
                }

                if (songName.includes('(feat') || songName.includes('(ft')) {
                    songName = songName.split(` (f`);
                    featArtists = songName[1].slice(3).slice(0, -1).split(' & ');

                    if (songName[1].toLowerCase().includes('remix')) { 
                        songName = [songName[0], songName[1].split(`[`)];
                        rmxArtist = songName[1][1].slice(0, -7); 

                        songName[0] = songName[0].split(' ');
                        songName[0] = songName[0].map(a => a.charAt(0).toUpperCase() + a.slice(1));
                        songName[0] = songName[0].join(' ');

                        rmxArtist = rmxArtist.split(' ');
                        rmxArtist = rmxArtist.map(a => a.charAt(0).toUpperCase() + a.slice(1));
                        rmxArtist = rmxArtist.join(' ');

                        fullSongName = `${songName[0]} [${rmxArtist} Remix]`;
                    } else {
                        rmxArtist = false;
                        fullSongName = false;
                    }
                    
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
                }

                if (songName.includes('(with')) {
                    songName = songName.split(' (with ');
                    let epSingleCollabArtists = songName[1].substring(0, songName[1].length - 1);
                    if (songName[1].includes('&')) {
                        epSingleCollabArtists = songName[1].split(' & ');
                        epSingleCollabArtists[epSingleCollabArtists.length - 1] = epSingleCollabArtists[epSingleCollabArtists.length - 1].substring(0, epSingleCollabArtists[epSingleCollabArtists.length - 1].length - 1);
                    }

                    if (Array.isArray(epSingleCollabArtists)) {
                        for (let i = 0; i < epSingleCollabArtists.length; i++) {
                            epSingleCollabArtists[i] = epSingleCollabArtists[i].split(' ');
                            epSingleCollabArtists[i] = epSingleCollabArtists[i].map(a => a.charAt(0).toUpperCase() + a.slice(1));
                            epSingleCollabArtists[i] = epSingleCollabArtists[i].join(' ');

                            artistArray.push(epSingleCollabArtists[i]);
                        }   
                    } else {
                        epSingleCollabArtists = epSingleCollabArtists.split(' ');
                        epSingleCollabArtists = epSingleCollabArtists.map(a => a.charAt(0).toUpperCase() + a.slice(1));
                        epSingleCollabArtists = epSingleCollabArtists.join(' ');

                        artistArray.push(epSingleCollabArtists);
                    }

                    songName = songName[0];
                }

                if (songName.includes('(VIP)')) {
                    songName = songName.split(' (');
                    songName = `${songName[0]} ${songName[1].slice(0, -1)}`;

                    if (rmxArtist != false) {
                        fullSongName = fullSongName.split(' [');
                        fullSongName = `${songName} [${fullSongName[1].slice(0, -1)}]`;
                    }
                }  

                songName = songName.split(' ');
                songName = songName.map(a => a.charAt(0).toUpperCase() + a.slice(1));
                songName = songName.join(' ');

                m.delete();
            }
            
            exampleEmbed = new Discord.MessageEmbed()
            .setColor(`${message.member.displayHexColor}`)
            .setTitle(`${args[0]} - ${args[1]}`);

            if (args[1].includes('EP')) {
                exampleEmbed.setAuthor(is_mailbox ? `${message.member.displayName}'s mailbox EP review` : `${message.member.displayName}'s EP review`, `${message.author.avatarURL({ format: "png", dynamic: false })}`);
            } else if (args[1].includes('LP')) {
                exampleEmbed.setAuthor(is_mailbox ? `${message.member.displayName}'s mailbox LP review` : `${message.member.displayName}'s LP review`, `${message.author.avatarURL({ format: "png", dynamic: false })}`);
            } else {
                exampleEmbed.setAuthor(is_mailbox ? `${message.member.displayName}'s mailbox review` : `${message.member.displayName}'s review`, `${message.author.avatarURL({ format: "png", dynamic: false })}`);
            }

            if (thumbnailImage === false) {
                exampleEmbed.setThumbnail(message.author.avatarURL({ format: "png", dynamic: false }));
            } else {
                exampleEmbed.setThumbnail(thumbnailImage);
            }
            
            for (let i = 0; i < rankArray.length; i++) {
                exampleEmbed.addField(rankArray[i][0], rankArray[i][1]);
            }

            if (overallString != -1) {
                exampleEmbed.addField('Overall Thoughts:', overallString);
            }

            if (taggedUser != false) {
                exampleEmbed.setFooter(`Sent by ${taggedMember.displayName}`, `${taggedUser.avatarURL({ format: "png", dynamic: false })}`);
            }

            if (overallString != -1) {
                return msgtoEdit.edit(exampleEmbed);
            }


            //Add data to database
            // args[0]: Name of Artist
            // args[1]: Name of EP
            // songName: Song Name
            // songRating[0]: Song Rating
            // songReview: Song Review Description

            // If the artist db doesn't exist
            if (rmxArtist === false || rmxArtist === undefined) {
            for (let i = 0; i < artistArray.length; i++) {
                if (db.reviewDB.get(artistArray[i]) === undefined) {
                    db.reviewDB.set(artistArray[i], { 
                        Image: false,
                        [songName]: { // Create the SONG DB OBJECT
                            [`<@${message.author.id}>`]: { 
                                name: message.member.displayName,
                                review: songReview,
                                rate: songRating,
                                sentby: taggedUser === false ? false : taggedUser.id,
                                EPOverall: false,
                                msg_id: message_id,
                            },
                            EP: args[1],
                            Remixers: {},
                            Image: thumbnailImage,
                            Collab: artistArray.filter(word => !featArtists.includes(word) && artistArray[i] != word),
                            Vocals: featArtists,
                        },
                    });
                } else if(db.reviewDB.get(artistArray[i], `["${songName}"]`) === undefined) { //If the artist db exists, check if the song db doesn't exist
                console.log('Song Not Detected!');
                const artistObj = db.reviewDB.get(artistArray[i]);

                    //Create the object that will be injected into the Artist object
                    const newsongObj = { 
                        [songName]: { 
                            [`<@${message.author.id}>`]: { 
                                name: message.member.displayName,
                                review: songReview,
                                rate: songRating,
                                sentby: taggedUser === false ? false : taggedUser.id,
                                EPOverall: false,
                                msg_id: message_id,
                            },
                            EP: args[1],
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
                    const songObj = db.reviewDB.get(artistArray[i], `["${songName}"]`);
                    delete songObj[`<@${message.author.id}>`];
        
                    const newuserObj = {
                        [`<@${message.author.id}>`]: { 
                            name: message.member.displayName,
                            review: songReview,
                            rate: songRating,
                            sentby: taggedUser === false ? false : taggedUser.id,
                            msg_id: message_id,
                        },
                    };

                    Object.assign(songObj, newuserObj);
                    db.reviewDB.set(artistArray[i], songObj, `["${songName}"]`);
                    db.reviewDB.set(artistArray[i], args[1], `["${songName}"].EP`); //Format song to include the EP
                    db.reviewDB.set(artistArray[i], thumbnailImage, `["${songName}"].Image`);
                } else {
                    console.log('User not detected!');
                    const songObj = db.reviewDB.get(artistArray[i], `["${songName}"]`);

                    //Create the object that will be injected into the Song object
                    const newuserObj = {
                        [`<@${message.author.id}>`]: { 
                            name: message.member.displayName,
                            review: songReview,
                            rate: songRating,
                            sentby: taggedUser === false ? false : taggedUser.id,
                            EPOverall: false,
                            msg_id: message_id,
                        },
                    };

                    //Inject the newsongobject into the artistobject and then put it in the database
                    Object.assign(songObj, newuserObj);
                    db.reviewDB.set(artistArray[i], songObj, `["${songName}"]`);
                    db.reviewDB.set(artistArray[i], args[1], `["${songName}"].EP`); //Format song to include the EP
                    db.reviewDB.set(artistArray[i], thumbnailImage, `["${songName}"].Image`);
                }
            }
        } else { //The same but for remixes
            artistArray.push(rmxArtist);
            for (let i = 0; i < artistArray.length; i++) {
                if (artistArray[i] === rmxArtist) {songName = fullSongName;} //Set the songname to the full name for the remix artist
            
                // If the artist db doesn't exist
                if (db.reviewDB.get(artistArray[i]) === undefined) {
                    console.log('Artist Not Detected!');
                    db.reviewDB.set(artistArray[i], { 
                        Image: false,
                        [songName]: artistArray[i] === rmxArtist ? { //For the remixer
                            [`<@${message.author.id}>`]: { 
                                name: message.member.displayName,
                                review: songReview,
                                rate: songRating,
                                sentby: taggedUser === false ? false : taggedUser.id,
                                EPOverall: false,
                                msg_id: message_id,
                            },
                            EP: args[1],
                            Remixers: false,
                            Image: thumbnailImage,
                            Collab: artistArray.filter(word => !featArtists.includes(word) && artistArray[i] != word),
                            Vocals: featArtists,
                        } : { // Create the SONG DB OBJECT, for the original artist
                            EP: args[1],
                            Remixers: {
                                [rmxArtist]: {
                                    [`<@${message.author.id}>`]: { 
                                        name: message.member.displayName,
                                        review: songReview,
                                        rate: songRating,
                                        sentby: taggedUser === false ? false : taggedUser.id,
                                        EPOverall: false,
                                        msg_id: message_id,
                                    },
                                    Image: thumbnailImage,
                                    EP: args[1],
                                    Collab: artistArray.filter(word => !featArtists.includes(word) && artistArray[i] != word),
                                    Vocals: featArtists,
                                },
                            },
                            Image: thumbnailImage,
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
                                review: songReview,
                                rate: songRating,
                                sentby: taggedUser === false ? false : taggedUser.id,
                                EPOverall: false,
                                msg_id: message_id,
                            },
                            EP: args[1],
                            Remixers: false,
                            Image: thumbnailImage,
                            Collab: artistArray.filter(word => !featArtists.includes(word) && artistArray[i] != word),
                            Vocals: featArtists,
                        } : { // Create the SONG DB OBJECT, for the original artist
                            EP: args[1],
                            Remixers: {
                                [rmxArtist]: {
                                    [`<@${message.author.id}>`]: { 
                                        name: message.member.displayName,
                                        review: songReview,
                                        rate: songRating,
                                        sentby: taggedUser === false ? false : taggedUser.id,
                                        EPOverall: false,
                                        msg_id: message_id,
                                    },
                                    Image: thumbnailImage,
                                    EP: args[1],
                                    Collab: artistArray.filter(word => !featArtists.includes(word) && artistArray[i] != word),
                                    Vocals: featArtists,    
                                },
                            },
                            Image: thumbnailImage,
                        },
                    };

                    //Inject the newsongobject into the artistobject and then put it in the database
                    Object.assign(artistObj, newsongObj);
                    db.reviewDB.set(artistArray[i], artistObj);

                } else if (db.reviewDB.get(artistArray[i], `["${songName}"].Remixers.["${rmxArtist}"]`) === undefined) { //If the song exists, check if the remix artist DB exists
                    console.log('Remix Artist not detected!');

                    const remixObj = db.reviewDB.get(artistArray[i], `["${songName}"].Remixers`);
                    //Create the object that will be injected into the Remixers object
                    const newremixObj = { 
                        [rmxArtist]: {
                            [`<@${message.author.id}>`]: { 
                                name: message.member.displayName,
                                review: songReview,
                                rate: songRating,
                                sentby: taggedUser === false ? false : taggedUser.id,
                                EPOverall: false,
                                msg_id: message_id,
                            },
                            EP: args[1],
                            Image: thumbnailImage,
                            Collab: artistArray.filter(word => !featArtists.includes(word) && artistArray[i] != word),
                            Vocals: featArtists,
                        },
                    };

                    Object.assign(remixObj, newremixObj);
                    db.reviewDB.set(artistArray[i], remixObj, `["${songName}"].Remixers`);

                } else if (db.reviewDB.get(artistArray[i], `["${songName}"].Remixers.["${rmxArtist}"].${message.author}`)) { // Check if you are already in the system
                    console.log('User is in the system!');
                    const remixsongObj = (artistArray[i] === rmxArtist) ? db.reviewDB.get(artistArray[i], `["${songName}"]`) : db.reviewDB.get(artistArray[i], `["${songName}"].Remixers.["${rmxArtist}"]`);
                    delete remixsongObj[`<@${message.author.id}>`];
        
                    const newuserObj = {
                        [`<@${message.author.id}>`]: { 
                            name: message.member.displayName,
                            review: songReview,
                            rate: songRating,
                            sentby: taggedUser === false ? false : taggedUser.id,
                            msg_id: message_id,
                        },
                    };

                    Object.assign(remixsongObj, newuserObj);
                    if (artistArray[i] === rmxArtist) {
                        db.reviewDB.set(artistArray[i], remixsongObj, `["${songName}"]`);
                        db.reviewDB.set(artistArray[i], args[1], `["${songName}"].EP`); //Format song to include the EP
                        db.reviewDB.set(artistArray[i], thumbnailImage, `["${songName}"].Image`);
                    } else {
                        db.reviewDB.set(artistArray[i], remixsongObj, `["${songName}"].Remixers.["${rmxArtist}"]`); 
                        db.reviewDB.set(artistArray[i], args[1], `["${songName}"].Remixers.["${rmxArtist}"].EP`); //Format song to include the EP
                        db.reviewDB.set(artistArray[i], thumbnailImage, `["${songName}"].Remixers.["${rmxArtist}"].Image`);
                    }

                } else {
                    console.log('User not detected!');
                    const remixsongObj = (artistArray[i] === rmxArtist) ? db.reviewDB.get(artistArray[i], `["${songName}"]`) : db.reviewDB.get(artistArray[i], `["${songName}"].Remixers.["${rmxArtist}"]`);

                    //Create the object that will be injected into the Song object
                    const newuserObj = {
                        [`<@${message.author.id}>`]: { 
                            name: message.member.displayName,
                            review: songReview,
                            rate: songRating,
                            sentby: taggedUser === false ? false : taggedUser.id,
                            EPOverall: false,
                            msg_id: message_id,
                        },
                    };

                    //Inject the newsongobject into the songobject and then put it in the database
                    Object.assign(remixsongObj, newuserObj);
                    if (artistArray[i] === rmxArtist) {
                        db.reviewDB.set(artistArray[i], remixsongObj, `["${songName}"]`);
                        db.reviewDB.set(artistArray[i], args[1], `["${songName}"].EP`); //Format song to include the EP
                        db.reviewDB.set(artistArray[i], thumbnailImage, `["${songName}"].Image`);
                    } else {
                        db.reviewDB.set(artistArray[i], remixsongObj, `["${songName}"].Remixers.["${rmxArtist}"]`); 
                        db.reviewDB.set(artistArray[i], args[1], `["${songName}"].Remixers.["${rmxArtist}"].EP`); //Format song to include the EP
                        db.reviewDB.set(artistArray[i], thumbnailImage, `["${songName}"].Remixers.["${rmxArtist}"].Image`);
                    }
                }
            }
        }

            msgtoEdit.edit(exampleEmbed);

        });

    },
};