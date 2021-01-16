const db = require("../db.js");

module.exports = {
	name: 'setimage',
	aliases: ['setimage', 'si'],
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
		let newSong = false;

		if (args[1].toLowerCase().includes('remix')) {
            songName = args[1].substring(0, args[1].length - 7).split(' (')[0];
            rmxArtist = args[1].substring(0, args[1].length - 7).split(' (')[1];
        } else {
            songName = args[1];
            rmxArtist = false;
		}

		const artistArray = args[0].split(' & ');
		if (rmxArtist != false) {
			artistArray.push(rmxArtist);
		}


		if (rmxArtist === false) {
			for (let i = 0; i < artistArray.length; i++) {
				if (!db.reviewDB.has(artistArray[i])) {
					newSong = true;
					db.reviewDB.set(artistArray[i], { 
						[songName]: { // Create the SONG DB OBJECT
							EP: false, 
							Remixers: {},
							Image: thumbnailImage,
						},
					});
				} else if (db.reviewDB.get(artistArray[i], `["${songName}"]`) === undefined) {
					newSong = true;
					console.log('Song Not Detected!');
					const artistObj = db.reviewDB.get(artistArray[i]);

					//Create the object that will be injected into the Artist object
					const newsongObj = { 
						[songName]: { 
							EP: false, 
							Remixers: {},
							Image: thumbnailImage,
						},
					};

					//Inject the newsongobject into the artistobject and then put it in the database
					Object.assign(artistObj, newsongObj);
					db.reviewDB.set(artistArray[i], artistObj);
				}
			}
		} else {
			for (let i = 0; i < artistArray.length; i++) {
				// If the artist db doesn't exist
                if (db.reviewDB.get(artistArray[i]) === undefined) {
					if (artistArray[i] === rmxArtist) {songName = args[1];} //Set the songname to the full name for the remix artist
					newSong = true;
                    console.log('Artist Not Detected!');
                    db.reviewDB.set(artistArray[i], { 
                        [songName]: artistArray[i] === rmxArtist ? { //For the remixer
                            EP: false,
                            Remixers: {},
                            Image: thumbnailImage,
                        } : { // Create the SONG DB OBJECT, for the original artist
                            EP: false, 
                            Remixers: {
                                [rmxArtist]: {
                                    Image: thumbnailImage,
                                },
                            },
                            Image: false,
                        },
                    });
				} else if (db.reviewDB.get(artistArray[i], `["${songName}"]`) === true) { //If the artist db exists, check if the song db doesn't exist
					if (artistArray[i] === rmxArtist) {songName = args[1];} //Set the songname to the full name for the remix artist
					newSong = true;
					console.log('Song Not Detected!');
					const artistObj = db.reviewDB.get(artistArray[i]);

                    //Create the object that will be injected into the Artist object
                    const newsongObj = { 
                        [songName]: artistArray[i] === rmxArtist ? { //For the remixer
                            EP: false,
                            Remixers: {},
                            Image: thumbnailImage,
                        } : { // Create the SONG DB OBJECT, for the original artist
                            EP: false, 
                            Remixers: {
                                [rmxArtist]: {
                                    Image: thumbnailImage,
                                },
                            },
                            Image: false,
                        },
                    };

                    //Inject the newsongobject into the artistobject and then put it in the database
                    Object.assign(artistObj, newsongObj);
                    db.reviewDB.set(artistArray[i], artistObj);
				}
			}
		}
		

		if (newSong === false) {
			for (let i = 0; i < artistArray.length; i++) {
				if (artistArray[i] != rmxArtist) {
					if (rmxArtist === false) {
						db.reviewDB.set(artistArray[i], thumbnailImage, `["${songName}"].Image`);
					} else {
						db.reviewDB.set(artistArray[i], thumbnailImage, `["${songName}"].Remixers.["${rmxArtist}"].Image`);
					}
				} else if (artistArray[i] === rmxArtist) {
					db.reviewDB.set(artistArray[i], thumbnailImage, `["${args[1]}"].Image`);
				}
			}
		}

		return message.channel.send(`Image for ${args[0]} - ${args[1]} changed.`);
	},
};