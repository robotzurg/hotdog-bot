// require the discord.js module
const fs = require('fs');
const Discord = require('discord.js');
const { prefix, token } = require('./config.json');
const db = require("./db.js");

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

// Listen for messages
client.on('message', async message => {

    // NON-COMMAND CHECKS
    if (Math.round(randomNumber(1, 500)) == 1 && message.channel.name != 'serious-events') {
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

    if (!message.content.startsWith(prefix) || message.author.bot) return;

    let args = message.content.slice(prefix.length).trim().split(/ +/);
	let commandName = args.shift().toLowerCase();


    if (message.content.startsWith(`${prefix}rate`) || (message.content.toLowerCase().startsWith(`${prefix}addsong`)) || (message.content.toLowerCase().startsWith(`${prefix}erateep`)) || (message.content.toLowerCase().startsWith(`${prefix}newrate`)) || (message.content.toLowerCase().startsWith(`${prefix}getreview`))) {
        args = message.content.slice(prefix.length).trim().split(/\| +/);
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
        if (message.member.hasPermission('ADMINISTRATOR')) {
            const songList = ['**Music Listening Playlist**', ' '];

                db.friList.forEach((prop) => {
                    if (prop.friday === false) {
                        const songString = `**--** ${prop.artist} - ${prop.song}`;
                        songList.push(songString);
                    } else if (prop.friday === true) {
                        const songString = `(F) **--** ${prop.artist} - ${prop.song}`;
                        songList.unshift(songString); 
                    }
                });

                songList.unshift(' ');
                songList.unshift('**Music Listening Playlist** (:regional_indicator_f: means that it is on the Friday Playlist for this week.)');
                
            (message.channel.send(songList)).then((msg) => {
                db.friID.set(`friID`, msg.id);
                console.log(db.friID.get('friID'));
            });
       } else { return message.reply('You don\'t have the perms to use this command!'); }
    }

    module.exports.updateFridayListData = function() {
        const friIDmsg = db.friID.get('friID');
        const channeltoSearch = message.guild.channels.cache.find(ch => ch.name === 'friday-playlist');
        (channeltoSearch.messages.fetch(friIDmsg)).then((msg) => {

            const songList = [];

            db.friList.forEach((prop) => {
                if (prop.friday === false) {
                    const songString = `**--** ${prop.artist} - ${prop.song}`;
                    songList.push(songString);
                } else if (prop.friday === true) {
                    const songString = `**--** ${prop.artist} - ${prop.song} :regional_indicator_f: `;
                    songList.unshift(songString); 
                }
            });

            songList.unshift(' ');
            songList.unshift('(:regional_indicator_f: means that it is on the Friday Playlist for this week.)');
            songList.unshift('**Music Listening Playlist**');

            msg.edit(songList);
        });
    };
    
    if (!client.commands.has(commandName)) return;

    const command = client.commands.get(commandName);

    //Update the databases whenever a command is used, just to make sure we're good at most times
    module.exports.updateGenreGameData();
    module.exports.updateFridayListData();


    if (command.args && !args.length) {
        let reply = `You didn't provide any arguments, ${message.author}!`;

		if (command.usage) {
			reply += `\nThe proper usage would be: \`${prefix}${command.name} ${command.usage}\``;
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