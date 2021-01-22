const db = require("../db.js");

module.exports = {
    name: 'setimage',
    type: 'Review DB',
    moreinfo: 'https://discord.com/channels/680864893552951306/794751896823922708/795553872143187968',
	aliases: ['setimage', 'setI', 'setart'],
	description: 'Set an image for a song! You can either do a link, or just attach an attachment.',
	args: true,
	usage: '`<artist> | <song> | [op] <url>',
	execute(message, args) {

		//Auto-adjustment to caps for each word
        args[0] = args[0].split(' ');
        args[0] = args[0].map(a => a.charAt(0).toUpperCase() + a.slice(1));
        args[0] = args[0].join(' ');

        args[1] = args[1].split(' ');
        args[1] = args[1].map(a => a.charAt(0).toUpperCase() + a.slice(1));
        args[1] = args[1].join(' ');

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
		let featArtists = [];
		let newSong = false;
		

		if (args[1].includes('(feat')) {

            songName = args[1].split(` (feat`);
			if (songName[1].includes(`[`)) {
                featArtists = songName[1].split('[');
                featArtists = featArtists[0].slice(2).slice(0, -2).split(' & ');
            } else {
                featArtists = songName[1].slice(2).slice(0, -1).split(' & ');
            }
            if (args[1].toLowerCase().includes('remix')) { rmxArtist = songName[1].split(' [')[1].slice(0, -7); }
            songName = songName[0];

            if (Array.isArray(featArtists)) {
                for (let i = 0; i < featArtists.length; i++) {
                    featArtists[i] = featArtists[i].split(' ');
                    featArtists[i] = featArtists[i].map(a => a.charAt(0).toUpperCase() + a.slice(1));
                    featArtists[i] = featArtists[i].join(' ');

                    artistArray.push(featArtists[i]);
                }
            } else if (featArtists != false) {
                featArtists = featArtists.split(' ');
                featArtists = featArtists.map(a => a.charAt(0).toUpperCase() + a.slice(1));
                featArtists = featArtists.join(' ');

                artistArray.push(featArtists);
            }

        } else if (args[1].includes('(ft')) {

            songName = args[1].split(` (ft`);
			if (songName[1].includes(`[`)) {
                featArtists = songName[1].split('[');
                featArtists = featArtists[0].slice(2).slice(0, -2).split(' & ');
            } else {
                featArtists = songName[1].slice(2).slice(0, -1).split(' & ');
            }
            if (args[1].toLowerCase().includes('remix')) { rmxArtist = songName[1].split(' [')[1].slice(0, -7); }
            songName = songName[0];

            if (Array.isArray(featArtists)) {
                for (let i = 0; i < featArtists.length; i++) {
                    featArtists[i] = featArtists[i].split(' ');
                    featArtists[i] = featArtists[i].map(a => a.charAt(0).toUpperCase() + a.slice(1));
                    featArtists[i] = featArtists[i].join(' ');

                    artistArray.push(featArtists[i]);
                }
            } else {
                featArtists = featArtists.split(' ');
                featArtists = featArtists.map(a => a.charAt(0).toUpperCase() + a.slice(1));
                featArtists = featArtists.join(' ');

                artistArray.push(featArtists);
            }

        }

		if (args[1].toLowerCase().includes('remix')) {
            songName = args[1].substring(0, args[1].length - 7).split(' (')[0];
            rmxArtist = args[1].substring(0, args[1].length - 7).split(' (')[1];
        } else {
            songName = args[1];
            rmxArtist = false;
		}

		let artistArray;

        if (!args[0].includes(',')) {
            artistArray = args[0].split(' & ');
        } else {
            artistArray = args[0].split(', ');
            if (artistArray[artistArray.length - 1].includes('&')) {
                let iter2 = artistArray.pop();
                iter2 = iter2.split(' & ');
                iter2 = iter2.map(a => artistArray.push(a));
                console.log(iter2);
            }
		}
		
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
							Collab: artistArray.filter(word => !featArtists.includes(word) && artistArray[i] != word),
                            Vocals: featArtists,
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
							Collab: artistArray.filter(word => !featArtists.includes(word) && artistArray[i] != word),
                            Vocals: featArtists,
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
							Collab: artistArray.filter(word => !featArtists.includes(word) && artistArray[i] != word),
                            Vocals: featArtists,
                        } : { // Create the SONG DB OBJECT, for the original artist
                            EP: false, 
                            Remixers: {
                                [rmxArtist]: {
                                    Image: thumbnailImage,
                                },
                            },
							Image: false,
							Collab: artistArray.filter(word => !featArtists.includes(word) && artistArray[i] != word),
                            Vocals: featArtists,
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
							Collab: artistArray.filter(word => !featArtists.includes(word) && artistArray[i] != word),
                            Vocals: featArtists,
                        } : { // Create the SONG DB OBJECT, for the original artist
                            EP: false, 
                            Remixers: {
                                [rmxArtist]: {
                                    Image: thumbnailImage,
                                },
                            },
							Image: false,
							Collab: artistArray.filter(word => !featArtists.includes(word) && artistArray[i] != word),
                            Vocals: featArtists,
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