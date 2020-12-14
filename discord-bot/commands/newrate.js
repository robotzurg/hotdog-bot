const Discord = require('discord.js');
const db = require("../db.js");
const { prefix } = require('../config.json');
const mailboxes = ['aeroface', 'av', 'emily', 'ethan', 'fridgey', 'hal', 'jeff', 'josh', 'lapplepieguy', 'meltered', 'nate', 'pup', 'shiro', 'steph', 'treez', 'valence', 'vol', 'xypod', 'yacob', 'yul'];

module.exports = {
	name: 'newrate',
    description: 'Create a song rating embed message!',
    args: true,
    usage: '<artist> | <song_name> | <rate_desc> | <rating> | [op] <user_that_sent_song>',
	execute(message, args) {
        if (message.author.id === '122568101995872256') { 
            const command = message.client.commands.get('rate');
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
            // .setURL('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
            exampleEmbed.setDescription(args[2])
            .setThumbnail(`${message.author.avatarURL({ format: "png", dynamic: false })}`)
            // .addFields(
            //    { name: 'Regular field title', value: 'Some value here' },
            //    { name: '\u200B', value: '\u200B' },
            //    { name: 'Inline field title', value: 'Some value here', inline: true },
            //    { name: 'Inline field title', value: 'Some value here', inline: true },
            // )
            .addField('Rating: ', `**${args[3]}**`, true);
            // .setImage('${message.author.avatarURL({ format: "png", dynamic: false })}`')
            // .setTimestamp()
            if (userIsTagged === true) {
                exampleEmbed.setFooter(`Sent by ${taggedUser.username}`, `${taggedUser.avatarURL({ format: "png", dynamic: false })}`);
            }

            message.delete(message);

            //Add review to database
            db.reviewDB.set(args[0], { 
                [args[1]]: { 
                    [`<@${message.author.id}>`]: { 
                        name: message.member.displayName,
                        review: args[2],
                        rate: args[3],
                    },
                    EP: false, 
                },
            });

            return message.channel.send(exampleEmbed); 
        }

    },
};