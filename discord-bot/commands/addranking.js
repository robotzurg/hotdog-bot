const Discord = require('discord.js');
const db = require("../db.js");
const mailboxes = ['aeroface', 'av', 'emily', 'ethan', 'fridgey', 'hal', 'jeff', 'josh', 'lapplepieguy', 'meltered', 'nate', 'pup', 'shiro', 'steph', 'treez', 'valence', 'vol', 'xypod', 'yacob', 'yul'];

module.exports = {
    name: 'addranking',
    aliases: ['addranking', 'rank'],
    description: 'Create a ranking review of an EP/LP/Compilation/Remix Package or really anything.',
    args: true,
    usage: '<artist> | <ep/lp_name> | [op] <image> | [op] <user_that_sent_ep/lp>',
	execute(message, args) {

        const command = message.client.commands.get('addranking');
        const is_mailbox = mailboxes.includes(message.channel.name);


        let taggedUser = false;
        let taggedMember = false;
        let thumbnailImage = message.author.avatarURL({ format: "png", dynamic: false });
        let msgtoEdit;

        if (args.length < 2) {
            return message.channel.send(`Missing arguments!\nProper usage is: \`${command.usage}\``);
        } else if (args.length === 3 || args.length === 4) {

            if (message.mentions.users.first() === undefined) { // If there isn't a user mentioned, then we know it's 3 arguments with no user mention.
                thumbnailImage = args[2];
            } else if (args.length === 3) { // If there is a user mentioned but only 3 arguments, then we know no image.
                taggedUser = message.mentions.users.first(); 
                taggedMember = message.mentions.members.first();
            } else if (args.length === 4) { // If there is both a user mentioned and 4 arguments, then we know both!
                thumbnailImage = args[2];
                taggedUser = message.mentions.users.first(); 
                taggedMember = message.mentions.members.first();
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

        exampleEmbed.setThumbnail(thumbnailImage)
        .addField('Ranking:', `\`\`\`\u200B\`\`\``, true);
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
        let fullSongName;
        let songRating;
        let id_tag;
        let position;
        let rmxArtist;
        let artistArray = args[0].split(' & ');
        let splitUpOverall;
        let overallString = -1;
        
        collector.on('collect', m => {
            if (m.content.includes('!end')) {
                collector.stop();
                m.delete();
                msgtoEdit.reactions.removeAll();
                return;
            } else if (m.content.includes(`Overall`)) {
                if (overallString === -1) {
                    splitUpOverall = m.content.split('\n');
                    splitUpOverall.shift();
                    overallString = splitUpOverall;
                    m.delete();
                }
            } else {
                rankArray.push(m.content);
                songRating = m.content.split(' '),
                    id_tag = '-',
                    position = songRating.indexOf(id_tag);

                if (~position) songRating.splice(position, 1);

                songName = songRating.splice(0, songRating.length - 1).join(" ");
                songRating[0] = songRating[0].slice(1, -1);

                //Remix preparation
                if (songName.toLowerCase().includes('remix')) {
                    console.log('Remix!');
                    fullSongName = songName;
                    songName = fullSongName.substring(0, fullSongName.length - 7).split(' (')[0];
                    rmxArtist = fullSongName.substring(0, fullSongName.length - 7).split(' (')[1];
                    artistArray = args[0].split(' & ');
                } else {
                    rmxArtist = false;
                    fullSongName = false;
                }

                rankPosition = songName.slice(0, -songName.length + 2);
                if (rankPosition.includes('.')) {
                    rankPosition = rankPosition.slice(0, -1);
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
            exampleEmbed.setThumbnail(thumbnailImage)
            .addField('Ranking:', `\`\`\`${rankArray.join('\n')}\`\`\``, true);
            
            if (taggedUser != false) {
                exampleEmbed.setFooter(`Sent by ${taggedMember.displayName}`, `${taggedUser.avatarURL({ format: "png", dynamic: false })}`);
            }

            //Add data to database
            // artistArray[i]: Name of Artist
            // args[1]: Name of EP
            // songName: Song Name
            // songRating[0]: Song Rating
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
                                    rate: songRating[0],
                                    sentby: taggedUser === false ? false : taggedUser.id,
                                    rankPosition: rankPosition,
                                },
                                EP: args[1],
                                Remixers: {},
                                Image: thumbnailImage,
                            },
                        });
                    } else if(db.reviewDB.get(artistArray[i], `${songName}`) === undefined) { //If the artist db exists, check if the song db doesn't exist
                    console.log('Song Not Detected!');
                    const artistObj = db.reviewDB.get(artistArray[i]);
    
                        //Create the object that will be injected into the Artist object
                        const newsongObj = { 
                            [songName]: { 
                                [`<@${message.author.id}>`]: { 
                                    name: message.member.displayName,
                                    review: 'This was from a ranking, so there is no written review for this song.',
                                    rate: songRating[0],
                                    sentby: taggedUser === false ? false : taggedUser.id,
                                    rankPosition: rankPosition,
                                },
                                EP: args[1],
                                Remixers: {},
                                Image: thumbnailImage,
                            },
                        };
    
                        //Inject the newsongobject into the artistobject and then put it in the database
                        Object.assign(artistObj, newsongObj);
                        db.reviewDB.set(artistArray[i], artistObj);
    
                    } else if (db.reviewDB.get(artistArray[i], `${songName}.${message.author}`)) { // Check if you are already in the system
                        console.log('User is in the system!');
                        // return message.channel.send(`You already have a review for ${artistArray[i]} - ${songName} in the system! Use \`!getreview\` to get your review, or \`!editreview\` to edit your pre-existing review.`);
                    } else {
                        console.log('User not detected!');
                        const songObj = db.reviewDB.get(artistArray[i], `${songName}`);
    
                        //Create the object that will be injected into the Song object
                        const newuserObj = {
                            [`<@${message.author.id}>`]: { 
                                name: message.member.displayName,
                                review: 'This was from a ranking, so there is no written review for this song.',
                                rate: songRating[0],
                                sentby: taggedUser === false ? false : taggedUser.id,
                                rankPosition: rankPosition,
                            },
                        };
    
                        //Inject the newsongobject into the artistobject and then put it in the database
                        Object.assign(songObj, newuserObj);
                        db.reviewDB.set(artistArray[i], songObj, `${songName}`);
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
                                    rate: songRating[0],
                                    sentby: taggedUser === false ? false : taggedUser.id,
                                    rankPosition: rankPosition,
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
                                            rate: songRating[0],
                                            sentby: taggedUser === false ? false : taggedUser.id,
                                            rankPosition: rankPosition,
                                        },
                                        EP: args[1],
                                        Image: thumbnailImage,
                                    },
                                },
                                Image: thumbnailImage,
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
                                    review: 'This was from a ranking, so there is no written review for this song.',
                                    rate: songRating[0],
                                    sentby: taggedUser === false ? false : taggedUser.id,
                                    rankPosition: rankPosition,
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
                                            rate: songRating[0],
                                            sentby: taggedUser === false ? false : taggedUser.id,
                                            rankPosition: rankPosition,
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
    
                    } else if (db.reviewDB.get(artistArray[i], `${songName}.Remixers.${rmxArtist}`) === undefined) { //If the song exists, check if the remix artist DB exists
                        console.log('Remix Artist not detected!');
    
                        const remixObj = db.reviewDB.get(artistArray[i], `${songName}.Remixers`);
                        //Create the object that will be injected into the Remixers object
                        const newremixObj = { 
                            [rmxArtist]: {
                                [`<@${message.author.id}>`]: { 
                                    name: message.member.displayName,
                                    review: 'This was from a ranking, so there is no written review for this song.',
                                    rate: songRating[0],
                                    sentby: taggedUser === false ? false : taggedUser.id,
                                    rankPosition: rankPosition,
                                },
                                EP: args[1],
                                Image: thumbnailImage,
                            },
                        };
    
                        Object.assign(remixObj, newremixObj);
                        db.reviewDB.set(artistArray[i], remixObj, `${songName}.Remixers`);
    
                    } else if (db.reviewDB.get(artistArray[i], `${songName}.Remixers.${rmxArtist}.${message.author}`)) { // Check if you are already in the system
                        console.log('User is in the system!');
                        // return message.channel.send(`You already have a review for ${artistArray[i]} - ${songName} in the system! Use \`!getreview\` to get your review, or \`!editreview\` to edit your pre-existing review.`);
                    } else {
                        console.log('User not detected!');
                        const remixsongObj = (artistArray[i] === rmxArtist) ? db.reviewDB.get(artistArray[i], `${songName}`) : db.reviewDB.get(artistArray[i], `${songName}.Remixers.${rmxArtist}`);
    
                        //Create the object that will be injected into the Song object
                        const newuserObj = {
                            [`<@${message.author.id}>`]: { 
                                name: message.member.displayName,
                                review: 'This was from a ranking, so there is no written review for this song.',
                                rate: songRating[0],
                                sentby: taggedUser === false ? false : taggedUser.id,
                                rankPosition: rankPosition,
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
            msgtoEdit.edit(exampleEmbed); 
        });
    },
};