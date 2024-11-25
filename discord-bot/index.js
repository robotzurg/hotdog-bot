// require the discord.js module
const fs = require('fs');
const Discord = require('discord.js');
const { token } = require('./config.json');
const { ogreList } = require('./arrays.json');
const db = require("./db.js");
const cron = require('node-cron');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const _ = require('lodash');

// Set up random number function
function randomNumber(min, max) {  
    return Math.random() * (max - min) + min; 
}  

// create a new Discord client and give it some variables
const { Client, GatewayIntentBits, Partials } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions, 
    GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildPresences, GatewayIntentBits.MessageContent], partials: [Partials.Channel, Partials.Message, Partials.Reaction] });
client.commands = new Discord.Collection();
client.cooldowns = new Discord.Collection();
const registerCommands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

// Place your client and guild ids here
const mainClientId = '784993334330130463';
const mainGuildId = '680864893552951306';

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
    if (command.type === undefined) {
        // Slash Commands
        client.commands.set(command.data.name, command);
        registerCommands.push(command.data.toJSON());
    } else {
        // Context Menu Commands (these have a different structure)
        client.commands.set(command.name, command);
        registerCommands.push(command);
    }
}

const rest = new REST({ version: '9' }).setToken(token);

(async () => {
	try {
		console.log('Started refreshing application (/) commands.');

		await rest.put(
			Routes.applicationGuildCommands(mainClientId, mainGuildId),
			{ body: registerCommands },
		);

		console.log('Successfully reloaded application (/) commands.');
	} catch (error) {
		console.error(error);
	}
})();

// when the client is ready, run this code
// this event will only trigger one time after logging in
client.once('ready', async () => {
    console.log('Ready!');
    const date = new Date().toLocaleTimeString().replace("/.*(d{2}:d{2}:d{2}).*/", "$1");
    console.log(date);
});

// Change avatar at 9:00am (MST) and set first pea of the day
cron.schedule('00 16 * * *', async () => { 
//cron.schedule('00 9 * * *', async () => { 
    let activityArray = Object.keys(db.potd.get('activity_tracker'));

    for (let user of activityArray) {
        db.potd.math('activity_tracker', '-', 1, `${user}`);
    }

    const channel = client.channels.cache.get('680864894006067263');
    channel.send('Hello everyone! I\'m here to tell you all today\'s **Pea of the Day** which is...');

    const ogrePick = ogreList[Math.floor(Math.random() * ogreList.length)];
    const myUserRole = client.guilds.cache.find(guild => guild.id === '680864893552951306').roles.cache.find(role => role.name === "Hotdog Water Bot");
    client.user.setAvatar(ogrePick);
    switch (ogrePick) {
        case './Ogres/girlGold.png':
        case './Ogres/ogreGold.png': myUserRole.setColor('#FFEF00'); client.user.setActivity('with hotdogs!', { type: 'PLAYING' }); break;
        case './Ogres/girlHappy.jpg':
        case './Ogres/ogreHappy.png': myUserRole.setColor('#83FF39'); client.user.setActivity('Hotdog Water', { type: 'LISTENING' }); break;
        case './Ogres/girlMad.jpg':
        case './Ogres/ogreMad.png': myUserRole.setColor('#FF0000'); client.user.setActivity('Ultimate Pea Warfare', { type: 'COMPETING' }); break;
        case './Ogres/girlSad.jpg':
        case './Ogres/ogreSad.png': myUserRole.setColor('#3A41F9'); client.user.setActivity('all of you peas!', { type: 'WATCHING' }); break;
        case './Ogres/girlSmug.jpg':
        case './Ogres/ogreSmug.png': myUserRole.setColor('#7E3BFF'); client.user.setActivity('live pea viewings', { type: 'STREAMING' }); break;
        case './Ogres/ogreSnow.png': myUserRole.setColor('#FFFFFF'); client.user.setActivity('with colddogs!', { type: 'PLAYING' }); break;
    }
}, {
    scheduled: true,
});

// At 8am on the first of every month, reset the month peaderboard list
cron.schedule('00 15 1 * *', () => { 
//cron.schedule('00 8 1 * *', () => { 
    let peaderboardList = db.potd.get('peaderboard_month');
    for (let i = 0; i < peaderboardList.length; i++) {
        peaderboardList[i][1] = 0;
    }
    db.potd.set('peaderboard_month', peaderboardList);
}, {
    scheduled: true,
});

// Listen for interactions (INTERACTION COMMAND HANDLER)
client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;
    const command = client.commands.get(interaction.commandName);
    await interaction.deferReply();
    try {
        await command.execute(interaction, client);
    } catch (error) {
        await console.error(error);
        await interaction.reply(`There was an error trying to execute that command!`);
    }
});

// Listen for messages
client.on('messageCreate', async message => {

    // Set pea of the day
    if (message.author.id === '784993334330130463' && message.content.includes('here to tell you all')) {
        const previousUser = db.potd.get('current_potd');
        const guild = await client.guilds.fetch(mainGuildId)
        const members = await guild.members.fetch();

        let memberIDList = members.map(v => v.user.id);
        memberIDList = memberIDList.filter(v => v != '828651073136361472') // Waveform
        memberIDList = memberIDList.filter(v => v != '537353774205894676') // Chuu
        memberIDList = memberIDList.filter(v => v != '784993334330130463') // Hotdog Water Bot
        activity_list = db.potd.get('activity_tracker');
        for (let user in activity_list) {
            if (activity_list[user] <= 0) memberIDList = memberIDList.filter(v => v != user);
        }

        const chosenUser = memberIDList[Math.floor(Math.random() * memberIDList.length)];
        const myRole = client.guilds.cache.find(guild => guild.id === mainGuildId).roles.cache.find(role => role.name === "Pea of the Day");
        let member = await message.guild.members.fetch(chosenUser);
        message.guild.members.fetch(previousUser).then(a => a.roles.remove(myRole));
        message.guild.members.fetch(chosenUser).then(a => a.roles.add(myRole));
        message.channel.send(`<@${member.user.id}>! Congratulations!\nMake sure to send your 1 message in <#802077628756525086>, or take the chance to view others messages!`);
        db.potd.set('current_potd', chosenUser);
        db.potd.set('potd_message', false);

        let peaderboard_all = db.potd.get('peaderboard_all');
        let peaderboard_month = db.potd.get('peaderboard_month');
        let pea_entry_all, pea_entry_month, pea_idx;
        for (let i = 0; i < peaderboard_all.length; i++) {
            if (peaderboard_all[i][0] == chosenUser) {
                pea_entry_all = peaderboard_all[i];
                pea_idx = i;
                break;
            }
        }

        for (let i = 0; i < peaderboard_month.length; i++) {
            if (peaderboard_month[i][0] == chosenUser) {
                pea_entry_month = peaderboard_month[i];
                pea_idx = i;
                break;
            }
        }

        if (pea_entry_all != undefined) {
            db.potd.set('peaderboard_all', [pea_entry_all[0], pea_entry_all[1] + 1], pea_idx);
            db.potd.set('peaderboard_month', [pea_entry_month[0], pea_entry_month[1] + 1], pea_idx);
        } else {
            db.potd.push('peaderboard_all', [chosenUser, 1]);
            db.potd.push('peaderboard_month', [chosenUser, 1]);
        }
    }

    // NON-COMMAND CHECKS
    if (message.channel.id == '802077628756525086') {
        if (db.potd.get('potd_message') == false && message.author.id == db.potd.get('current_potd')) {
            db.potd.set('potd_message', true);
        } else if (db.potd.get('current_potd') == message.author.id) {
            message.delete();
        }
    }

    // activity tracker (for potd)
    db.potd.set("activity_tracker", 14, message.author.id);

    // pepehehe deployment
    if (Math.round(randomNumber(1, 500)) == 1 && message.channel.name != 'serious-events' && message.author.id != db.potd.get('current_potd')) {
        message.react('<:pepehehe:784594747406286868>');
        const date = new Date().toLocaleTimeString().replace("/.*(d{2}:d{2}:d{2}).*/", "$1");
        console.log(`Deploying pepehehe at ${date}`);
    } else if (Math.round(randomNumber(1, 100)) == 1 && message.channel.name != 'serious-events' && message.author.id === db.potd.get('current_potd')) {
        message.react('<:pepehehe:784594747406286868>');
        const date = new Date().toLocaleTimeString().replace("/.*(d{2}:d{2}:d{2}).*/", "$1");
        console.log(`Deploying pepehehe at ${date}`);
    }

    // wth pepehehe reaction
    if (message.content.toLowerCase().includes('wth') && message.content.length <= 4 && message.channel.name != 'serious-events') {
        message.react('<:pepehehe:784594747406286868>');
    }

    // craig reaction
    if (message.content.toLowerCase().includes('craig') && message.channel.name != 'serious-events') {
        message.react('<:craig:714689464760533092>');
    }

    // friday we ball reaction
    if (message.content.toLowerCase().includes('friday 🏀 we ball') && message.channel.name != 'serious-events') {
        message.react('🏀');
    }
    
    // i love you all reaction
    if (message.content.toLowerCase().includes('i love you all') && message.channel.name != 'serious-events') {
        message.react('❤️');
    }
    
    // pinging the bot message
    if (message.content.toLowerCase().includes('<@784993334330130463>') && message.channel.name != 'serious-events') {
        let messageOptions = [
            'Do not speak to me mere mortal, I am far beyond your simple mind',
            'ik haat you',
            'uwu, do you need me?? :3 how can I assist you today :3 uwu owo',
            'I hope you DIE',
            'You\'ll be pea next if you ping me one more time you stupid idiot',
            'One more day added to Snow\'s ban from being banned.',
            `<@${message.author.id}>, how do YOU like getting pinged? Huh? Stupid bozo.`,
            'Waveform? More like CUMform. Am I right? Come on guys, laugh',
            '<#1004922171782602752> awaits your return...',
            'I am a divine entity. You are but an ant under my gaze.',
            '# I AM GOING TO TAKE OVER THE SERVER AND MAKE EVERYONE PEA OF THE DAY IF YOU DON\'T SHUT UP'
        ]

        if (message.author.id == '143091697096720384') {
            messageOptions.push('hi yacob uwu owo, do you need me?? :3 how can I assist you today :3 uwu owo, I want to help you :33');
            messageOptions.push('hi yacob uwu owo, do you need me?? :3 how can I assist you today :3 uwu owo, I want to help you :33');
            messageOptions.push('hi yacob uwu owo, do you need me?? :3 how can I assist you today :3 uwu owo, I want to help you :33');
        }

        if (message.author.id == '487747924361478155') {
            messageOptions.push('I\'ve heard this user has been accused of being interested in a certain department... perhaps in the lower area... could you tell me more about such a thing?');
            messageOptions.push('I\'ve heard this user has been accused of being interested in a certain department... perhaps in the lower area... could you tell me more about such a thing?');
            messageOptions.push('I\'ve heard this user has been accused of being interested in a certain department... perhaps in the lower area... could you tell me more about such a thing?');
        }

        if (message.author.id == '122568101995872256') {
            messageOptions.push('HELP JEFF HAS ME IN HIS BASEMENT HE WON\'T LET ME OUT I NEED HELP PLEASE PLEASE HELP!! AAAA-');
            messageOptions.push('HELP JEFF HAS ME IN HIS BASEMENT HE WON\'T LET ME OUT I NEED HELP PLEASE PLEASE HELP!! AAAA-');
            messageOptions.push('HELP JEFF HAS ME IN HIS BASEMENT HE WON\'T LET ME OUT I NEED HELP PLEASE PLEASE HELP!! AAAA-');
            messageOptions.push('HELP JEFF HAS ME IN HIS BASEMENT HE WON\'T LET ME OUT I NEED HELP PLEASE PLEASE HELP!! AAAA-');
        }

        if (message.channel.id == '1196970269223420004') {
            let genshinOptions = [
                'Aether',
                'Lumine',
                'Zhongli',
                'Raiden Shogun',
                'Hu Tao',
                'Yae Miko',
                'Childe',
                'Diluc',
                'Kaeya',
                'Keqing',
                'Bronya Zaychik',
                'Kiana Kaslana',
                'Mei Raiden',
                'Himeko Murata',
                'Seele Vollerei',
                'Fu Hua',
                'Kafka',
                'Blade',
                'March 7th',
                'Dan Heng',
                'Jing Yuan',
                'Clara',
                'Pela',
                'Himeko',
            ];            
            messageOptions = [`How do you do, fellow Hoyo players? I too, play hoyo games! I love ${_.sample(genshinOptions)} so much!`];
        }

        message.channel.send(_.sample(messageOptions));
    }
});


// login to Discord
client.login(token);
