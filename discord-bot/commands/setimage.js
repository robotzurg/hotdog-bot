const db = require("../db.js");

module.exports = {
	name: 'setimage',
	description: 'Set an image for a song! You can either do a link, or just attach an attachment.',
	args: true,
	usage: '`<artist> | <song> | [op] <url>',
	execute(message, args) {
		let thumbnailImage;
		if (args.length < 2) {
			return message.channel.send('Image missing!');
		} else if (args.length === 2 && message.attachments.first() != undefined) {
			thumbnailImage = message.attachments.first().attachment;
		} else if (args.length === 3) {
			thumbnailImage = args[2];
		}

		if (args.length === 3 && message.attachments.first() != undefined) {
			return message.channel.send('Please only use a direct image link, or an attachment, not both.');
		}

		let songName;
		let rmxArtist;

		if (args[1].toLowerCase().includes('remix')) {
            songName = args[1].substring(0, args[1].length - 7).split(' (')[0];
            rmxArtist = args[1].substring(0, args[1].length - 7).split(' (')[1];
        } else {
            songName = args[1];
            rmxArtist = false;
		}
		
		const artistName = args[0].split(' & ');

		if (rmxArtist === false) {
            const image = db.reviewDB.get(artistName[0], `${songName}.Image`);
			if (image === undefined) return message.channel.send('No song found.');

			db.reviewDB.set(artistName[0], thumbnailImage, `${songName}.Image`);
			return message.channel.send(`Image for ${args[0]} - ${args[1]} changed.`);
        } else {
            const image = db.reviewDB.get(artistName[0], `${songName}.Remixers.${rmxArtist}.Image`);
			if (image === undefined) return message.channel.send('No song found.');

			db.reviewDB.set(artistName[0], thumbnailImage, `${songName}.Remixers.${rmxArtist}.Image`);
			return message.channel.send(`Image for ${args[0]} - ${args[1]} changed.`);
        }
	},
};