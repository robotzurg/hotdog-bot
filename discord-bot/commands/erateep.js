const Discord = require('discord.js');
const { prefix } = require('../config.json');
const mailboxes = ['aeroface', 'av', 'emily', 'ethan', 'fridgey', 'hal', 'jeff', 'josh', 'lapplepieguy', 'meltered', 'nate', 'pup', 'shiro', 'steph', 'treez', 'valence', 'vol', 'xypod', 'yacob', 'yul'];

module.exports = {
	name: 'erateep',
    description: '(Ethan Method) Create an EP/LP rating embed message! Use !end to end the chain.',
    args: true,
    usage: '<artist> | <ep/lp_name> | <overall_ep_thoughts> | [op] <user_that_sent_ep/lp>',
	execute(message, args) {

        const command = message.client.commands.get('erateep');
        const is_mailbox = mailboxes.includes(message.channel.name);
        let userIsTagged;
        let taggedUser;
        let msgtoEdit;

        if (args.length < 3) {
            return message.channel.send(`Missing arguments!\nProper usage is: \`${prefix}${command.name} ${command.usage}\``);
        } else if (args.length === 3) {
            userIsTagged = false;
        } else if (args.length === 4) {
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

        exampleEmbed.setDescription(args[2])
        .setThumbnail(`${message.author.avatarURL({ format: "png", dynamic: false })}`)
        .addField('Ranking:', `\`\`\`\u200B\`\`\``, true);
        if (userIsTagged === true) {
            exampleEmbed.setFooter(`Sent by ${taggedUser.username}`, `${taggedUser.avatarURL({ format: "png", dynamic: false })}`);
        }

        (message.channel.send(exampleEmbed)).then((msg) => {
            msgtoEdit = msg;
            msg.react('👂');
        });

        const filter = m => m.author.id === message.author.id;
        const collector = message.channel.createMessageCollector(filter, { idle: 900000 });
        const rankArray = [];

        collector.on('collect', m => {
            if (m.content.includes('!end')) {
                collector.stop();
                m.delete();
                msgtoEdit.reactions.removeAll();
                return;
            } else {
                rankArray.push(`${m.content}\n`); 
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

            exampleEmbed.setDescription(args[2])
            .setThumbnail(`${message.author.avatarURL({ format: "png", dynamic: false })}`)
            .addField('Ranking:', `\`\`\`${rankArray.join('')}\`\`\``, true);
            if (userIsTagged === true) {
                exampleEmbed.setFooter(`Sent by ${taggedUser.username}`, `${taggedUser.avatarURL({ format: "png", dynamic: false })}`);
            }

            msgtoEdit.edit(exampleEmbed);  
        });
    },
};