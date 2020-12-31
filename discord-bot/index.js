// require the discord.js module
const fs = require('fs');
const Discord = require('discord.js');
const { prefix, token } = require('./config.json');
const db = require("./db.js");
const cron = require('node-cron');

// Set up random number function
function randomNumber(min, max) {  
    return Math.random() * (max - min) + min; 
}  

// create a new Discord client and give it some variables
const client = new Discord.Client();
client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const cooldowns = new Discord.Collection();

// Some Arrays
client.genreList = ['Brostep/Riddim', 'Future Riddim', 'Color Bass', 'Melodic Dubstep', 'Electro House', 'Midtempo/New Beat', 'Techno', 'Hardstyle', 'Happy Hardcore', 
'Other Hardcore', 'Psytrance', 'Other Trance', 'Progressive House', 'Future House', 'Big Room House', 'Bass House', 'Trap', 'Future Bass', 'Glitch Hop/Moombah', 'Dancefloor DnB',
'Liquid DnB', 'Neuro DnB', 'Other DnB', 'Indie Dance/Nu Disco', 'Synthwave', 'Garage', 'Other Chillout', 'Non-EDM'];

client.ogreList = ['./Ogres/ogreGold.png', './Ogres/ogreHappy.png', './Ogres/ogreMad.png', './Ogres/ogreSad.png', './Ogres/ogreSmug.png', './Ogres/ogreSnow.png'];

client.memberIDList = ['398369363784368128', '487747924361478155', '156110247004471296', '289178868118716416', '331821722594443274', '205726084291887104', '341299011971448835', 
'229617545651552256', '341979797129527297', '122568101995872256', '784993334330130463', '143091697096720384', '221087833534889994', '221006870129803264', '283068026960609283', 
'431134660857298955', '449314134387982347', '229249397203009536'];


// Command Collections
for (const file of commandFiles) {
	const command = require(`./commands/${file}`);

	// set a new item in the Collection
	// with the key as the command name and the value as the exported module
	client.commands.set(command.name, command);
}

// when the client is ready, run this code
// this event will only trigger one time after logging in
client.once('ready', () => {
    console.log('Ready!');
    client.user.setActivity('with hotdogs!');
    const date = new Date().toLocaleTimeString().replace("/.*(d{2}:d{2}:d{2}).*/", "$1");
    console.log(date);
});

// Change avatar at 9:00am and set pea of the day
cron.schedule('00 9 * * *', () => { 
    const ogrePick = client.ogreList[Math.floor(Math.random() * client.ogreList.length)];
    const myUserRole = client.guilds.cache.find(guild => guild.id === '680864893552951306').roles.cache.find(role => role.name === "Hotdog Water Bot");
    client.user.setAvatar(ogrePick);
    switch (ogrePick) {
        case './Ogres/ogreGold.png': myUserRole.setColor('#FFEF00'); break;
        case './Ogres/ogreHappy.png': myUserRole.setColor('#83FF39'); break;
        case './Ogres/ogreMad.png': myUserRole.setColor('#FF0000'); break;
        case './Ogres/ogreSad.png': myUserRole.setColor('#3A41F9'); break;
        case './Ogres/ogreSmug.png': myUserRole.setColor('#7E3BFF'); break;
        case './Ogres/ogreSnow.png': myUserRole.setColor('#FFFFFF'); break;
    }

    const channel = client.channels.cache.get('680864894006067263');
    channel.send('Hello everyone! I\'m here to tell you all today\'s **Pea of the Day** which is...');
}, {
    scheduled: true,
});


// Listen for messages
client.on('message', async message => {

    // Set pea of the day
    if (message.author.id === '784993334330130463' && message.content.includes('here to tell you all')) {
        const previousUser = db.potdID.get('ID');
        const chosenUser = client.memberIDList[Math.floor(Math.random() * client.memberIDList.length)];
        const myRole = client.guilds.cache.find(guild => guild.id === '680864893552951306').roles.cache.find(role => role.name === "Pea of the Day");
        message.guild.members.fetch(previousUser).then(a => a.roles.remove(myRole));
        message.guild.members.fetch(chosenUser).then(a => a.roles.add(myRole));
        message.channel.send(`<@${chosenUser}>! Congratulations!`);

        db.potdID.set('ID', chosenUser);
    }

    // NON-COMMAND CHECKS
    if (Math.round(randomNumber(1, 500)) == 1 && message.channel.name != 'serious-events' && message.author.id != db.potdID.get('ID')) {
        message.react('<:pepehehe:784594747406286868>');
        const date = new Date().toLocaleTimeString().replace("/.*(d{2}:d{2}:d{2}).*/", "$1");
        console.log(`Deploying pepehehe at ${date}`);
    } else if (Math.round(randomNumber(1, 100)) == 1 && message.channel.name != 'serious-events' && message.author.id === db.potdID.get('ID')) {
        message.react('<:pepehehe:784594747406286868>');
        const date = new Date().toLocaleTimeString().replace("/.*(d{2}:d{2}:d{2}).*/", "$1");
        console.log(`Deploying pepehehe at ${date}`);
    }

    if (message.content.toLowerCase().includes('wth') && message.content.length <= 4 && message.channel.name != 'serious-events') {
        message.react('<:pepehehe:784594747406286868>');
    }

    if (message.content.toLowerCase().includes('craig') && message.channel.name != 'serious-events') {
        message.react('<:craig:714689464760533092>');
    }

    if (message.content.toLowerCase().includes('friday 🏀 we ball') && message.channel.name != 'serious-events') {
        message.react('🏀');
    }

    if (!message.content.startsWith(prefix) || message.author.bot) return;

    let args = message.content.slice(prefix.length).trim().split(/ +/);
    let commandName = args.shift().toLowerCase();

    if (args.length > 1) {
        args = message.content.slice(prefix.length).trim().split(/ \| +/);
        const firstargs = args[0].split(/ +/);
        commandName = firstargs.shift().toLowerCase();  
        args[0] = args[0].slice(commandName.length + 1).trim(); 
    }
    

    // Genre Roulette GameStatus Stuff
    if (message.content.startsWith(`${prefix}gamestatus`)) {
        if (message.member.hasPermission('ADMINISTRATOR')) {
            const statusList = ['**Genre Roulette Game Status**'];

                db.genreRoulette.forEach((prop, key) => {
                    const statusString = `${prop.status === 'alive' ? ':white_check_mark:' : ':x:'} **${key}** *(${prop.genre})*`;
                    statusList.push(statusString);
                });
                
            (message.channel.send(statusList)).then((msg) => {
                db.genreID.set(`genreID`, msg.id);
                console.log(db.genreID.get('genreID'));
            });
        } else { return message.reply('You don\'t have the perms to use this command!'); }
    }

    module.exports.updateGenreGameData = function() {
        const genreIDmsg = db.genreID.get('genreID');
        const channeltoSearch = message.guild.channels.cache.find(ch => ch.name === 'listening-parties');
        (channeltoSearch.messages.fetch(genreIDmsg)).then((msg) => {

            const statusList = ['**Genre Roulette Game Status**'];

            db.genreRoulette.forEach((prop, key) => {
                const statusString = `${prop.status === 'alive' ? ':white_check_mark:' : ':x:'} **${key}** *(${prop.genre})*`;
                statusList.push(statusString);
            });

            msg.edit(statusList);
        });
    };

    // Friday Music Listening Stuff
    if (message.content.startsWith(`${prefix}fridaylist`)) {
        // if (message.member.hasPermission('ADMINISTRATOR')) {
            const songList = ['**Music Listening Playlist**', ' '];

                db.friList.forEach((prop) => {
                    if (prop.friday === false) {
                        const songString = `**--** ${prop.artist} - ${prop.song}`;
                        songList.push(songString);
                    } else if (prop.friday === true) {
                        const songString = `**--** :regional_indicator_f: ${prop.artist} - ${prop.song}`;
                        songList.unshift(songString); 
                    }
                });

                songList.unshift(' ');
                songList.unshift('(:regional_indicator_f: means that it is on the Friday Playlist for this week.)');
                songList.unshift('**Music Listening Playlist**');
                
            (message.channel.send(songList)).then((msg) => {
                db.friID.set(`friID`, msg.id);
                db.friList.set(`Week`, 4);
                console.log(db.friID.get('friID'));
            });
       // } else { return message.reply('You don\'t have the perms to use this command!'); }
    }

    module.exports.updateFridayListData = function() {
        const friIDmsg = db.friID.get('friID');
        const channeltoSearch = message.guild.channels.cache.find(ch => ch.name === 'friday-playlist');
        (channeltoSearch.messages.fetch(friIDmsg)).then((msg) => {

            const singleList = [];
            const epList = [];
            const lpList = [];
            const compList = [];
            const songList = [];

            db.friList.forEach((prop) => {
                if (prop.friday === false) {
                    const songString = `**--** ${prop.artist} - ${prop.song}`;

                    if (!prop.song.includes('EP') && !prop.song.includes('LP') && !prop.song.includes('comp')) {
                        singleList.push(songString);
                    } else if (prop.song.includes('EP')) {
                        epList.push(songString);
                    } else if (prop.song.includes('LP')) {
                        lpList.push(songString);
                    } else if (prop.song.includes('comp')) {
                        compList.push(songString.substring(0, songString.length - 5));
                    }
                } else if (prop.friday === true) {
                    const songString = `**--** :regional_indicator_f: **${prop.artist} - ${prop.song}**`;

                    if (!prop.song.includes('EP') && !prop.song.includes('LP') && !prop.song.includes('comp')) {
                        singleList.unshift(songString);
                    } else if (prop.song.includes('EP')) {
                        epList.unshift(songString);
                    } else if (prop.song.includes('LP')) {
                        lpList.unshift(songString);
                    } else if (prop.song.includes('comp')) {
                        compList.push(songString.substring(0, songString.length - 6) + '**');
                    }
                }
            });

            songList.unshift(compList.join('\n'));
            songList.unshift('**Compilations**');
            songList.unshift(' ');
            songList.unshift(lpList.join('\n'));
            songList.unshift('**LPs**');
            songList.unshift(' ');
            songList.unshift(epList.join('\n'));
            songList.unshift('**EPs**');
            songList.unshift(' ');
            songList.unshift(singleList.join('\n'));
            songList.unshift('**Singles**');
            songList.unshift(' ');
            songList.unshift('(:regional_indicator_f: means that it is on the Friday Playlist for this week.)');
            songList.unshift('**Music Listening Playlist**');

            msg.edit(songList);
        });
    };
    

	const command = client.commands.get(commandName) ||	client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
	if (!command) return;

    //Update the databases whenever a command is used, just to make sure we're good at most times
    module.exports.updateGenreGameData();
    module.exports.updateFridayListData();


    if (command.args && !args.length) {
        let reply = `You didn't provide any arguments, ${message.author}!`;

		if (command.usage) {
			reply += `\nThe proper usage would be: \`${command.usage}\``;
		}

		return message.channel.send(reply);	
    }

    if (!cooldowns.has(command.name)) {
        cooldowns.set(command.name, new Discord.Collection());
    }
    
    const now = Date.now();
    const timestamps = cooldowns.get(command.name);
    const cooldownAmount = (command.cooldown || 0) * 1000;
    
    if (timestamps.has(message.author.id)) {
        const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

        if (now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;
            return message.reply(`please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command.`);
        }

    }

    timestamps.set(message.author.id, now);
    setTimeout(() => timestamps.delete(message.author.id), cooldownAmount); 

    try {
        command.execute(message, args);
    } catch (error) {
        console.error(error);
        message.reply('there was an error trying to execute that command!');
    }

});


// login to Discord
client.login(token);