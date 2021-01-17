const Discord = require('discord.js');
const db = require("../db.js");
const { mailboxes } = require('../arrays.json');

module.exports = {
    name: 'addranking',
    aliases: ['addranking', 'rank', `rankEP`, `addrankingep`],
    description: 'Create a ranking review of an EP/LP/Compilation/Remix Package or really anything.',
    args: true,
    usage: '<artist> | <ep/lp_name> | [op] <image> | [op] <user_that_sent_ep/lp>',
	execute(message, args) {
        
        if (args[0].includes(',')) {
            return message.channel.send('Using `,` to separate artists is not currently supported. Please use & to separate artists!');
        }

        if (!args[1].includes('EP') && !args[1].includes('LP') && !args[1].includes('Remixes')) {
            return message.channel.send('You can only use this command to rank EPs/LPs/Remix Packages. Comps are not yet supported.\nPlease use `!addReview` for singles!');
        }

        const command = message.client.commands.get('addranking');
        let is_mailbox = mailboxes.includes(message.channel.name);


        let taggedUser = false;
        let taggedMember = false;
        let thumbnailImage = false;
        let msgtoEdit;

        if (args.length < 2) {
            return message.channel.send(`Missing arguments!\nProper usage is: \`${command.usage}\``);
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
        }

        message.delete(message);

        let exampleEmbed = new Discord.MessageEmbed()
        .setColor(`${message.member.displayHexColor}`)
        .setTitle(`${args[0]} - ${args[1]}`);

        if (args[1].includes('EP') || args[1].includes('The Remixes')) {
            exampleEmbed.setAuthor(is_mailbox ? `${message.member.displayName}'s mailbox EP ranking` : `${message.member.displayName}'s EP ranking`, `${message.author.avatarURL({ format: "png", dynamic: false })}`);
        } else if (args[1].includes('LP')) {
            exampleEmbed.setAuthor(is_mailbox ? `${message.member.displayName}'s mailbox LP ranking` : `${message.member.displayName}'s LP ranking`, `${message.author.avatarURL({ format: "png", dynamic: false })}`);
        } else {
            exampleEmbed.setAuthor(is_mailbox ? `${message.member.displayName}'s mailbox ranking` : `${message.member.displayName}'s ranking`, `${message.author.avatarURL({ format: "png", dynamic: false })}`);
        }

        if (thumbnailImage === false) {
            exampleEmbed.setThumbnail(message.author.avatarURL({ format: "png", dynamic: false }));
        } else {
            exampleEmbed.setThumbnail(thumbnailImage);
        }

        exampleEmbed.addField('Ranking:', `\`\`\`\u200B\`\`\``, true);
        if (taggedUser != false) {
            exampleEmbed.setFooter(`Sent by ${taggedMember.displayName}`, `${taggedUser.avatarURL({ format: "png", dynamic: false })}`);
        }

        (message.channel.send(exampleEmbed)).then((msg) => {
            msgtoEdit = msg;
            msg.react('👂');
        });

        const filter = m => m.author.id === message.author.id && (m.content.includes('(') || m.content.includes(')') || m.content.toLowerCase().includes('overall') || m.content.includes('!end'));
        const collector = message.channel.createMessageCollector(filter, { idle: 900000 });
        const rankArray = ['\n'];

        let rankPosition = 0;
        let songName;
        let fullSongName = false;
        let songRating;
        let rmxArtist = false;
        let artistArray = args[0].split(' & ');
        let splitUpOverall;
        let overallString = -1;
        
        collector.on('collect', m => {

            if (m.content.includes('!end')) {
                collector.stop();
                m.delete();
                msgtoEdit.reactions.removeAll();
                return;
            } else if (m.content.includes(`Overall\n`)) {

                if (overallString === -1) {
                    splitUpOverall = m.content.split('\n');
                    splitUpOverall.shift();
                    overallString = splitUpOverall;
                    m.delete();
                }
                
                let songArray;
                for (let ii = 0; ii < artistArray.length; ii++) {
                    songArray = Object.keys(db.reviewDB.get(artistArray[ii]));
                    for (let i = 0; i < songArray.length; i++) {
                        if (!songArray[i].includes('Remix')) {
                            let songRemixes = db.reviewDB.get(artistArray[ii], `${songArray[i]}.Remixers`);
                            let songEP;

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
                        }
                    }
                }
                collector.stop();
                msgtoEdit.reactions.removeAll();

            } else {
                artistArray = args[0].split(' & ');
                rankPosition++; //Start by upping the rank position, so we can go from 1-whatever
                rankArray.push(`${rankPosition}. ${m.content}`);
                songRating = m.content.split(' '),
                songName = songRating.splice(0, songRating.length - 1).join(" ");
                songRating = songRating[0].slice(1, -1);

                if (songName.includes('(feat') || songName.includes('(ft')) {
                    songName = songName.split(` (f`);
                    if (songName[1].toLowerCase().includes('remix')) { 
                        songName = [songName[0], songName[1].split(`[`)];
                        rmxArtist = songName[1][1].slice(0, -7); 
                        fullSongName = `${songName[0]} [${rmxArtist} Remix]`;
                    } else {
                        rmxArtist = false;
                        fullSongName = false;
                    }
                    
                    songName = songName[0];
                }

                //Remix preparation
                if (songName.toString().toLowerCase().includes('remix')) {
                    fullSongName = songName;
                    songName = fullSongName.substring(0, fullSongName.length - 7).split(' [')[0];
                    rmxArtist = fullSongName.substring(0, fullSongName.length - 7).split(' [')[1];
                    artistArray = args[0].split(' & ');
                } else if (songName.toString().toLowerCase().includes('bootleg')) {
                    fullSongName = songName;
                    songName = fullSongName.substring(0, fullSongName.length - 9).split(' [')[0];
                    rmxArtist = fullSongName.substring(0, fullSongName.length - 9).split(' [')[1];
                    artistArray = args[0].split(' & ');
                } else if (songName.toString().toLowerCase().includes('flip') || songName.toString().toLowerCase().includes('edit')) {
                    fullSongName = songName;
                    songName = fullSongName.substring(0, fullSongName.length - 6).split(' [')[0];
                    rmxArtist = fullSongName.substring(0, fullSongName.length - 6).split(' [')[1];
                    artistArray = args[0].split(' & ');
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
                            artistArray.push(epSingleCollabArtists[i]);
                        }   
                    } else {
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

                m.delete();
            }

            exampleEmbed = new Discord.MessageEmbed()
            .setColor(`${message.member.displayHexColor}`)
            .setTitle(`${args[0]} - ${args[1]}`);

            if (args[1].includes('EP') || args[1].includes('The Remixes')) {
                exampleEmbed.setAuthor(is_mailbox ? `${message.member.displayName}'s mailbox EP ranking` : `${message.member.displayName}'s EP ranking`, `${message.author.avatarURL({ format: "png", dynamic: false })}`);
            } else if (args[1].includes('LP')) {
                exampleEmbed.setAuthor(is_mailbox ? `${message.member.displayName}'s mailbox LP ranking` : `${message.member.displayName}'s LP ranking`, `${message.author.avatarURL({ format: "png", dynamic: false })}`);
            } else {
                exampleEmbed.setAuthor(is_mailbox ? `${message.member.displayName}'s mailbox ranking` : `${message.member.displayName}'s ranking`, `${message.author.avatarURL({ format: "png", dynamic: false })}`);
            }

            if (overallString != -1) {
                exampleEmbed.setDescription(`${overallString}`);
            }

            if (thumbnailImage === false) {
                exampleEmbed.setThumbnail(message.author.avatarURL({ format: "png", dynamic: false }));
            } else {
                exampleEmbed.setThumbnail(thumbnailImage);
            }

            exampleEmbed.addField('Ranking:', `\`\`\`${rankArray.join('\n')}\`\`\``, true);
            
            if (taggedUser != false) {
                exampleEmbed.setFooter(`Sent by ${taggedMember.displayName}`, `${taggedUser.avatarURL({ format: "png", dynamic: false })}`);
            }

            if (overallString != -1) {
                return msgtoEdit.edit(exampleEmbed); 
            }

            //Add data to database
            // artistArray[i]: Name of Artist
            // args[1]: Name of EP
            // songName: Song Name
            // songRating: Song Rating
            // rmxArtist: Remix Artist

            // If the artist db doesn't exist
            if (rmxArtist === false) {
                for (let i = 0; i < artistArray.length; i++) {
                    if (db.reviewDB.get(artistArray[i]) === undefined) {
                        db.reviewDB.set(artistArray[i], { 
                            [songName]: { // Create the SONG DB OBJECT
                                [`<@${message.author.id}>`]: { 
                                    name: message.member.displayName,
                                    review: 'This was from a ranking, so there is no written review for this song.',
                                    rate: songRating,
                                    sentby: taggedUser === false ? false : taggedUser.id,
                                    rankPosition: rankPosition,
                                    EPOverall: false,
                                },
                                EP: args[1],
                                Remixers: {},
                                Image: thumbnailImage,
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
                                    review: 'This was from a ranking, so there is no written review for this song.',
                                    rate: songRating,
                                    sentby: taggedUser === false ? false : taggedUser.id,
                                    rankPosition: rankPosition,
                                    EPOverall: false,
                                },
                                EP: args[1],
                                Remixers: {},
                                Image: thumbnailImage,
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
                                review: 'This was from a ranking, so there is no written review for this song.',
                                rate: songRating,
                                sentby: taggedUser === false ? false : taggedUser.id,
                                rankPosition: rankPosition,
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
                                review: 'This was from a ranking, so there is no written review for this song.',
                                rate: songRating,
                                sentby: taggedUser === false ? false : taggedUser.id,
                                rankPosition: rankPosition,
                                EPOverall: false,
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
                            [songName]: artistArray[i] === rmxArtist ? { //For the remixer
                                [`<@${message.author.id}>`]: { 
                                    name: message.member.displayName,
                                    review: 'This was from a ranking, so there is no written review for this song.',
                                    rate: songRating,
                                    sentby: taggedUser === false ? false : taggedUser.id,
                                    rankPosition: rankPosition,
                                    EPOverall: false,
                                },
                                EP: args[1],
                                Remixers: false,
                                Image: thumbnailImage,
                            } : { // Create the SONG DB OBJECT, for the original artist
                                EP: args[1],
                                Remixers: {
                                    [rmxArtist]: {
                                        [`<@${message.author.id}>`]: { 
                                            name: message.member.displayName,
                                            review: 'This was from a ranking, so there is no written review for this song.',
                                            rate: songRating,
                                            sentby: taggedUser === false ? false : taggedUser.id,
                                            rankPosition: rankPosition,
                                            EPOverall: false,
                                        },
                                        EP: args[1],
                                        Image: thumbnailImage,
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
                                    review: 'This was from a ranking, so there is no written review for this song.',
                                    rate: songRating,
                                    sentby: taggedUser === false ? false : taggedUser.id,
                                    rankPosition: rankPosition,
                                    EPOverall: false,
                                },
                                EP: args[1],
                                Remixers: false,
                                Image: thumbnailImage,
                            } : { // Create the SONG DB OBJECT, for the original artist
                                EP: args[1],
                                Remixers: {
                                    [rmxArtist]: {
                                        [`<@${message.author.id}>`]: { 
                                            name: message.member.displayName,
                                            review: 'This was from a ranking, so there is no written review for this song.',
                                            rate: songRating,
                                            sentby: taggedUser === false ? false : taggedUser.id,
                                            rankPosition: rankPosition,
                                            EPOverall: false,
                                        },
                                        EP: args[1],
                                        Image: thumbnailImage,
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
                                    review: 'This was from a ranking, so there is no written review for this song.',
                                    rate: songRating,
                                    sentby: taggedUser === false ? false : taggedUser.id,
                                    rankPosition: rankPosition,
                                    EPOverall: false,
                                },
                                EP: args[1],
                                Image: thumbnailImage,
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
                                review: 'This was from a ranking, so there is no written review for this song.',
                                rate: songRating,
                                sentby: taggedUser === false ? false : taggedUser.id,
                                rankPosition: rankPosition,
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
                                review: 'This was from a ranking, so there is no written review for this song.',
                                rate: songRating,
                                sentby: taggedUser === false ? false : taggedUser.id,
                                rankPosition: rankPosition,
                                EPOverall: false,
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