const db = require("../db");

module.exports = {
	name: 'getreview',
	cooldown: 0,
    description: 'Ping!',
    args: true,
    usage: '<artist> | <song> | <user>',
	execute(message, args) {
		const rUserName = db.reviewDB.get(args[0]);

		console.log(rUserName.args[1].args[2].name);
	},
};