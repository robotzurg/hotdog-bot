const db = require("../db.js");

module.exports = {
	name: 'deletereview',
    description: 'Edit a pre-existing review of your own.',
    args: true,
    usage: '<artist> | <song_name> | [admin] <user>',
    execute(message, args) {
        let userToDelete;

        if (message.member.hasPermission('ADMINISTRATOR')) {
            userToDelete = message.mentions.users.first(); 
        } else {
            userToDelete = message.author;
        }

        const rname = db.reviewDB.get(args[0], `${args[1]}.${userToDelete}.name`);
        if (rname === undefined) return message.channel.send('No review found.');

        const songObj = db.reviewDB.get(args[0], `${args[1]}`);
        delete songObj[`<@${userToDelete.id}>`];
        console.log(songObj);

        db.reviewDB.set(args[0], songObj, `${args[1]}`);

        if (songObj[`<@${userToDelete.id}>`] === undefined) {
            message.channel.send(`Deleted <@${userToDelete.id}>'s review of ${args[0]} - ${args[1]}.`);
        } else {
            message.channel.send(`Error! Could not delete! Let Jeff know about this or use \`!bugreport\` to report the bug.`);
        }

        
	},
};