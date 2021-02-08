const db = require("../db.js");

module.exports = {
	name: 'deletesong',
    aliases: ['deletesong', 'deletes'],
	type: 'Admin',
    description: 'Deletes a song from the database. [ADMIN/BOT OWNER ONLY]',
    args: true,
    usage: '<artist> | <song>',
	execute(message, args) {
        //Auto-adjustment to caps for each word
        args[0] = args[0].split(' ');
        args[0] = args[0].map(a => a.charAt(0).toUpperCase() + a.slice(1));
        args[0] = args[0].join(' ');

        args[1] = args[1].split(' ');
        args[1] = args[1].map(a => a.charAt(0).toUpperCase() + a.slice(1));
        args[1] = args[1].join(' ');

		if (message.member.hasPermission('ADMINISTRATOR') || message.author.id === '122568101995872256') {
            const artistObj = db.reviewDB.get(args[0]);
            if (artistObj === undefined) return message.channel.send('Artist not found.');
            delete artistObj[args[1]];
            db.reviewDB.set(args[0], artistObj);

			message.channel.send(`${args[0]} - ${args[1]} deleted from the database.`);
		} else { return message.reply('You don\'t have the perms to use this command!'); }
	},
};