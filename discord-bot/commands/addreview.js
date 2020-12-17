const Discord = require('discord.js');
const db = require("../db.js");
const { prefix } = require('../config.json');
const mailboxes = ['aeroface', 'av', 'emily', 'ethan', 'fridgey', 'hal', 'jeff', 'josh', 'lapplepieguy', 'meltered', 'nate', 'pup', 'shiro', 'steph', 'treez', 'valence', 'vol', 'xypod', 'yacob', 'yul'];

module.exports = {
	name: 'addreview',
    description: 'Create a song rating embed message!',
    args: true,
    usage: '<artist> | <song_name> | <rating> | <rate_desc> | [op] <user_that_sent_song>',
	execute(message, args) {
        if (message.author.id === '122568101995872256') { 
            const command = message.client.commands.get('addreview');
            const is_mailbox = mailboxes.includes(message.channel.name);
            let userIsTagged;
            let taggedUser;

            if (args.length < 4) {
                return message.channel.send(`Missing arguments!\nProper usage is: \`${prefix}${command.name} ${command.usage}\``);
            } else if (args.length === 4) {
                userIsTagged = false;
            } else if (args.length === 5) {
                if (message.mentions.users.first() != undefined) { 
                    taggedUser = message.mentions.users.first(); 
                    userIsTagged = true;
                } else { 
                    userIsTagged = false;
                }
            }

            const exampleEmbed = new Discord.MessageEmbed()
            .setColor(`${message.member.displayHexColor}`)
            .setTitle(`${args[0]} - ${args[1]}`)
            .setAuthor(is_mailbox ? `${message.member.displayName}'s mailbox review` : `${message.member.displayName}'s review`, `${message.author.avatarURL({ format: "png", dynamic: false })}`);
            exampleEmbed.setDescription(args[3])
            .setThumbnail(`${message.author.avatarURL({ format: "png", dynamic: false })}`)
            .addField('Rating: ', `**${args[2]}**`, true);
            if (userIsTagged === true) {
                exampleEmbed.setFooter(`Sent by ${taggedUser.username}`, `${taggedUser.avatarURL({ format: "png", dynamic: false })}`);
            }

            message.delete(message);

            //Add review to database
            // If the artist db doesn't exist
            if (db.reviewDB.get(args[0]) === undefined) {
                db.reviewDB.set(args[0], { 
                    [args[1]]: { // Create the SONG DB OBJECT
                        [`<@${message.author.id}>`]: { 
                            name: message.member.displayName,
                            review: args[3],
                            rate: args[2],
                        },
                        EP: 'Test EP', 
                    },
                });
            } else if(db.reviewDB.get(args[0], `${args[1]}`) === undefined) { //If the artist db exists, check if the song db doesn't exist
            console.log('Song Not Detected!');
            const artistObj = db.reviewDB.get(args[0]);

                //Create the object that will be injected into the Artist object
                const newsongObj = { 
                    [args[1]]: { 
                        [`<@${message.author.id}>`]: { 
                            name: message.member.displayName,
                            review: args[3],
                            rate: args[2],
                        },
                        EP: 'Test EP', 
                    },
                };

                //Inject the newsongobject into the artistobject and then put it in the database
                Object.assign(artistObj, newsongObj);
                db.reviewDB.set(args[0], artistObj);

            } else if (db.reviewDB.get(args[0], `${args[1]}.${message.author}`)) { // Check if you are already in the system
                console.log('User is in the system!');
                return message.channel.send(`You already have a review for ${args[0]} - ${args[1]} in the system! Use \`!getreview\` to get your review, or \`!editreview\` to edit your pre-existing review.`);
            } else {
                console.log('User not detected!');
                const songObj = db.reviewDB.get(args[0], `${args[1]}`);

                //Create the object that will be injected into the Song object
                const newuserObj = {
                    [`<@${message.author.id}>`]: { 
                        name: message.member.displayName,
                        review: args[3],
                        rate: args[2],
                    },
                };

                //Inject the newsongobject into the artistobject and then put it in the database
                Object.assign(songObj, newuserObj);
                console.log(songObj);
                db.reviewDB.set(args[0], songObj, `${args[1]}`);
            }
            // Send the embed rate message
            return message.channel.send(exampleEmbed); 
        }
    },
};