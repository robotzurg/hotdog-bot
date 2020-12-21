const Discord = require('discord.js');
const { prefix } = require('../config.json');
const db = require("../db.js");
const mailboxes = ['aeroface', 'av', 'emily', 'ethan', 'fridgey', 'hal', 'jeff', 'josh', 'lapplepieguy', 'meltered', 'nate', 'pup', 'shiro', 'steph', 'treez', 'valence', 'vol', 'xypod', 'yacob', 'yul'];

module.exports = {
	name: 'nrateep',
    description: '(Main Method) Create an EP/LP rating embed message! Use !end to end the chain. (DATABASE TESTING VERSION THIS CANNOT BE USED ATM)',
    args: true,
    usage: '<artist> | <ep/lp_name> | [op] <user_that_sent_ep/lp>',
	execute(message, args) {
        if (message.author.id === '122568101995872256') { 
        const command = message.client.commands.get('rateep');
        const is_mailbox = mailboxes.includes(message.channel.name);
        let userIsTagged;
        let taggedUser;
        let msgtoEdit;

        if (args.length < 2) {
            return message.channel.send(`Missing arguments!\nProper usage is: \`${prefix}${command.name} ${command.usage}\``);
        } else if (args.length === 2) {
            userIsTagged = false;
        } else if (args.length === 3) {
            if (message.mentions.users.first() != undefined) { 
                taggedUser = message.mentions.users.first(); 
                userIsTagged = true;
            } else { 
                userIsTagged = false;
            }
        }

        message.delete(message);

        let exampleEmbed = new Discord.MessageEmbed()
        .setColor(`${message.member.displayHexColor}`)
        .setTitle(`${args[0]} - ${args[1]}`);

        if (args[1].includes('EP')) {
            exampleEmbed.setAuthor(is_mailbox ? `${message.member.displayName}'s mailbox EP review` : `${message.member.displayName}'s EP review`, `${message.author.avatarURL({ format: "png", dynamic: false })}`);
        } else if (args[1].includes('LP')) {
            exampleEmbed.setAuthor(is_mailbox ? `${message.member.displayName}'s mailbox LP review` : `${message.member.displayName}'s LP review`, `${message.author.avatarURL({ format: "png", dynamic: false })}`);
        } else {
            exampleEmbed.setAuthor(is_mailbox ? `${message.member.displayName}'s mailbox review` : `${message.member.displayName}'s review`, `${message.author.avatarURL({ format: "png", dynamic: false })}`);
        }

        exampleEmbed.setThumbnail(`${message.author.avatarURL({ format: "png", dynamic: false })}`);
        if (userIsTagged === true) {
            exampleEmbed.setFooter(`Sent by ${taggedUser.username}`, `${taggedUser.avatarURL({ format: "png", dynamic: false })}`);
        }

        (message.channel.send(exampleEmbed)).then((msg) => {
            msgtoEdit = msg;
            msg.react('👂');
        });

        const filter = m => m.author.id === message.author.id && (m.content.includes('(') || m.content.includes('Overall') || m.content.includes('!end'));
        const collector = message.channel.createMessageCollector(filter, { idle: 900000 });
        const rankArray = [];
        let splitUpArray;
        let splitUpOverall;
        let nameOfSong;
        let songRating;
        let id_tag;
        let position;
        let overallString = -1;
        let artistArray = args[0].split(' & ');

        // console.log(args);
        
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
                splitUpArray = m.content.split('\n'); 
                rankArray.push(splitUpArray);
                songRating = splitUpArray[0].split(' '),
                    id_tag = '-',
                    position = songRating.indexOf(id_tag);

                if (~position) songRating.splice(position, 1);

                nameOfSong = songRating.splice(0, songRating.length - 1).join(" ");

                console.log(songRating[0].slice(1, -1));
                console.log(nameOfSong);
                console.log(splitUpArray[1]);
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

            exampleEmbed.setThumbnail(`${message.author.avatarURL({ format: "png", dynamic: false })}`);

            for (let i = 0; i < rankArray.length; i++) {
                exampleEmbed.addField(rankArray[i][0], rankArray[i][1]);
            }

            if (overallString != -1) {
                exampleEmbed.addField('Overall Thoughts:', overallString);
            }

            if (userIsTagged === true) {
                exampleEmbed.setFooter(`Sent by ${taggedUser.username}`, `${taggedUser.avatarURL({ format: "png", dynamic: false })}`);
            }

            //Add data to database
            // args[0]: Name of Artist
            // args[1]: Name of EP
            // nameOfSong: Song Name
            // songRating[0]: Song Rating
            // splitUpArray[1]: Song Review Description

            // If the artist db doesn't exist
            
            for (let i = 0; i < artistArray.length; i++) {
                if (db.reviewDB.get(artistArray[i]) === undefined) {
                    db.reviewDB.set(artistArray[i], { 
                        [nameOfSong]: { // Create the SONG DB OBJECT
                            [`<@${message.author.id}>`]: { 
                                name: message.member.displayName,
                                review: splitUpArray[1],
                                rate: songRating[0].slice(1, -1),
                            },
                            EP: args[1], 
                        },
                    });
                } else if(db.reviewDB.get(artistArray[i], `${nameOfSong}`) === undefined) { //If the artist db exists, check if the song db doesn't exist
                console.log('Song Not Detected!');
                const artistObj = db.reviewDB.get(artistArray[i]);

                    //Create the object that will be injected into the Artist object
                    const newsongObj = { 
                        [nameOfSong]: { 
                            [`<@${message.author.id}>`]: { 
                                name: message.member.displayName,
                                review: splitUpArray[1],
                                rate: songRating[0].slice(1, -1),
                            },
                            EP: args[1], 
                        },
                    };

                    //Inject the newsongobject into the artistobject and then put it in the database
                    Object.assign(artistObj, newsongObj);
                    db.reviewDB.set(artistArray[i], artistObj);

                } else if (db.reviewDB.get(artistArray[i], `${nameOfSong}.${message.author}`)) { // Check if you are already in the system
                    console.log('User is in the system!');
                    // return message.channel.send(`You already have a review for ${artistArray[i]} - ${songName} in the system! Use \`!getreview\` to get your review, or \`!editreview\` to edit your pre-existing review.`);
                } else {
                    console.log('User not detected!');
                    const songObj = db.reviewDB.get(artistArray[i], `${nameOfSong}`);

                    //Create the object that will be injected into the Song object
                    const newuserObj = {
                        [`<@${message.author.id}>`]: { 
                            name: message.member.displayName,
                            review: splitUpArray[1],
                            rate: songRating[0].slice(1, -1),
                        },
                    };

                    //Inject the newsongobject into the artistobject and then put it in the database
                    Object.assign(songObj, newuserObj);
                    console.log(songObj);
                    db.reviewDB.set(artistArray[i], songObj, `${nameOfSong}`);
                }
            }

            msgtoEdit.edit(exampleEmbed);

        });

    }
    },
};