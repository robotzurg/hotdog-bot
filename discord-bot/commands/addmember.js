const db = require("../db.js");

module.exports = {
	name: 'addmember',
    description: 'Adds a member to the genre roulette game! [Admin Only]',
    args: true,
    usage: '<user>',
	execute(message, args) {
        if (message.member.hasPermission('ADMINISTRATOR')) {
            const genrePick = message.client.genreList[Math.floor(Math.random() * message.client.genreList.length)];
            const userObj = {
                genre: genrePick,
                status: 'alive',
            };
            db.genreRoulette.set(`${args}`, userObj);
            message.channel.send(`${args}'s genre has been set to ${db.genreRoulette.get(args, `genre`)}.`);
            message.channel.send(`${args}'s status has been set to ${db.genreRoulette.get(args, `status`)}.`);
         } else { return message.reply('You don\'t have the perms to use this command!'); }
	},
};