const db = require("../db.js");
const { prefix } = require('../config.json');

module.exports = {
	name: 'setstatus',
    description: 'Set the status of a current player in the Genre Roulette game. [Admin Only]',
    args: true,
    usage: '<key> <status>',
	execute(message, args) {
        if (message.member.hasPermission('ADMINISTRATOR')) {
            const command = message.client.commands.get(`setstatus`);
            if (!db.genreRoulette.has(args[0])) return message.reply(`${args[0]} is not in the game!`);
            if (args.length < 2) return message.reply(`Not enough arguments!\nThe proper usage would be \`${prefix}setStatus ${command.usage}\`.`);

            const currentGenre = db.genreRoulette.get(args[0], 'genre');
            db.genreRoulette.set(args[0], { genre: currentGenre, status: args[1] });
            message.channel.send(`Set ${args[0]}'s status to ${db.genreRoulette.get(args[0], `status`)}`);
        } else { return message.reply('You don\'t have the perms to use this command!'); }
	},
};