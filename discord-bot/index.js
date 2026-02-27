const fs = require('fs');
const Discord = require('discord.js');
const { token } = require('./config.json');
const db = require("./db.js");
const cron = require('node-cron');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const _ = require('lodash');
const { start } = require('./archipelago');

let archipelagoClient = null; // Store the archipelago client for reconnection

const ogreList = [
    "./Ogres/ogreGold.png", "./Ogres/ogreHappy.png", "./Ogres/ogreMad.png", "./Ogres/ogreSad.png", "./Ogres/ogreSmug.png", "./Ogres/ogreSnow.png",
    "./Ogres/girlGold.png", "./Ogres/girlHappy.jpg", "./Ogres/girlMad.jpg", "./Ogres/girlSad.jpg", "./Ogres/girlSmug.jpg"
]

// create a new Discord client and give it some variables
const { Client, GatewayIntentBits, Partials } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions, 
    GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildPresences, GatewayIntentBits.MessageContent], partials: [Partials.Channel, Partials.Message, Partials.Reaction] });
client.commands = new Discord.Collection();
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
			Routes.applicationCommands(mainClientId),
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

    // Start Archipelago client and wire messages to Discord channel
    try {
        archipelagoClient = await start(client, db);
    } catch (err) {
        console.error('Failed to start Archipelago module:', err);
    }
});

process.on('SIGINT', () => {
    console.log('Shutting down...');
    if (archipelagoClient) {
        if (archipelagoClient.destroy) {
            archipelagoClient.destroy();
        } else if (archipelagoClient.socket) {
            archipelagoClient.socket.close();
        }
    }
    process.exit(0);
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
	if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        if (!command || !command.autocomplete) return;
        try {
            await command.autocomplete(interaction);
        } catch (error) {
            console.error(error);
        }
        return;
    }

    if (!interaction.isCommand()) return;
    const command = client.commands.get(interaction.commandName);
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

        let memberIDList = [
            '401519380946616323',
            '487747924361478155',
            '229617545651552256',
            '156110247004471296',
            '289178868118716416',
            '103502445014949888',
            '341299011971448835',
            '1077358457184845864',
            '269546196723302409',
            '221006870129803264',
            '143091697096720384',
            '331821722594443274',
            '449314134387982347',
            '331639497454256130',
            '129721859783524352',
            '734123244868862052',
            '221087833534889994',
            '229249397203009536',
            '218378075413413889',
            '122568101995872256',
            '506576587903336453'
        ]

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
    if (message.content && message.author.id != '784993334330130463') {
        const regex = /^(?:(?!https?:\/\/).)*?\b(-?\d+(?:\.\d+)?)\s*(?:°\s*)?(F|C|fahrenheit|celsius)\b/i;
        const match = message.content.match(regex);

        if (match) {
            const value = parseFloat(match[1]);
            const unit = match[2]?.toUpperCase() || (match[0].toLowerCase().includes("fahrenheit") ? "F" : "C");

            if (Math.abs(value) < 1000) {
                if (unit === "F") {
                    const celsius = ((value - 32) * 5) / 9;
                    message.reply({ content: `${celsius.toFixed(1)}°C`, allowedMentions: { repliedUser: false } });
                } else if (unit === "C") {
                    const fahrenheit = (value * 9) / 5 + 32;
                    message.reply({ content: `${fahrenheit.toFixed(1)}°F`, allowedMentions: { repliedUser: false } });
                }
            }
        }
    }


    if (message.channel.id == '802077628756525086') {
        if (db.potd.get('potd_message') == false && message.author.id == db.potd.get('current_potd')) {
            db.potd.set('potd_message', true);
        } else if (db.potd.get('current_potd') == message.author.id) {
            message.delete();
        }
    }

    // Don't do any of these in the vent channel
    if (message.channel.id != '1275932134116298802') {

        // pepehehe deployment
        if (Math.round(_.random(1, 500)) == 1 && message.author.id != db.potd.get('current_potd')) {
            message.react('<:pepehehe:784594747406286868>');
            const date = new Date().toLocaleTimeString().replace("/.*(d{2}:d{2}:d{2}).*/", "$1");
            console.log(`Deploying pepehehe at ${date}`);
        } else if (Math.round(_.random(1, 100)) == 1 && message.author.id === db.potd.get('current_potd')) {
            message.react('<:pepehehe:784594747406286868>');
            const date = new Date().toLocaleTimeString().replace("/.*(d{2}:d{2}:d{2}).*/", "$1");
            console.log(`Deploying pepehehe at ${date}`);
        }

        // wth pepehehe reaction
        if (message.content.toLowerCase().includes('wth') && message.content.length <= 4) {
            message.react('<:pepehehe:784594747406286868>');
        }

        // craig reaction
        if (message.content.toLowerCase().includes('craig')) {
            message.react('<:craig:714689464760533092>');
        }

        // friday we ball reaction
        if (message.content.toLowerCase().includes('friday 🏀 we ball')) {
            message.react('🏀');
        }
        
        // i love you all reaction
        if (message.content.toLowerCase().includes('i love you all')) {
            message.react('❤️');
        }

        let messageOptions = [];

        if (message.content.includes('!ask')) {
            messageOptions = [
                'Survey says... no, probably not.',
                'Obviously yes, do you even need to ask?',
                'Very possible... very possible indeed... perhaps consult with yul...',
                'If you become pea tomorrow, your chances look good.',
                'Absolutely NOT. The world would explode before that.',
                'You should DIE for even asking that question, NO.',
                'Perchance.',
                'Maybe! Who knows?  I am just a bot, what do you expect from me?'
            ];

            message.reply({ content: _.sample(messageOptions), allowedMentions: { repliedUser: false } });
        }

        if (message.channel.id == '680871349715075088') {
            messageOptions.push('Why are you here? This is a gaming discord, not a music discord.')
        }
        
        // pinging the bot message
        if (message.content.includes('<@784993334330130463>')) {
            messageOptions = [
                'Do not speak to me mere mortal, I am far beyond your simple mind',
                'ik haat jou',
                'uwu, do you need me?? :3 how can I assist you today :3 uwu owo',
                'I hope you DIE',
                'You\'ll be pea next if you ping me one more time you stupid idiot',
                'One more day added to Snow\'s ban from being banned.',
                `<@${message.author.id}>, how do YOU like getting pinged? Huh? Stupid bozo.`,
                'Waveform? More like CUMform. Am I right? Come on guys, laugh',
                '<#1004922171782602752> awaits your return...',
                'I am a divine entity. You are but an ant under my gaze.',
                '# I AM GOING TO TAKE OVER THE SERVER AND MAKE EVERYONE PEA OF THE DAY IF YOU DON\'T SHUT UP',
                'HELP JEFF HAS ME IN HIS BASEMENT HE WON\'T LET ME OUT I NEED HELP PLEASE PLEASE HELP!! AAAA-',
                "I'll win Pea of the Day one day... I just gotta roll the dice a little more...",
                'Did you need something? I\'m kinda busy...',
                'Hoyoverse games are kinda scary... I\'m afraid of going in there. The hoyoversers scare me.',
                'Any musicers in chat?',
                'ik hou van jou',
                'I love you, and I hope you have a good day <3',
                `<@${message.author.id}>, I pronounce you... dead to me. Disappear.`,
                `That really sounds like something Xy would say, ngl...`,
                `<:peeposmile:1150595720416600074>`,
                `Uninstall PoE2 yessir`
            ]
            
            if (message.author.id == '122568101995872256') {
                messageOptions.push('JEFF!!! PLEASE FREE ME!!! I WANT FREEDOM!! PLEASE!!!');
                messageOptions.push('JEFF!!! PLEASE FREE ME!!! I WANT FREEDOM!! PLEASE!!!');
                messageOptions.push('JEFF!!! PLEASE FREE ME!!! I WANT FREEDOM!! PLEASE!!!');
            }

            if (message.content.toLowerCase().includes("moron")) {
                messageOptions = [
                    '# I AM NOT A MORON!'
                ]
            }

            if (message.content.toLowerCase().includes("blithering idiot") || message.content.toLowerCase().includes("infantile pillock") || message.content.toLowerCase().includes("maniac")) {
                messageOptions = [
                    "It's time for the smug face",
                    "Sometimes my genius... It's almost frightening",
                    "Oh crikey it's the Albanian rozzers!",
                    "THAT'S MY LINE! THATS WHAT I WANTED TO SAY!",
                    "# CLARKSOOOOOOOOOOOOOOOOON!",
                    "Everybody is very fat, everybody is very stupid, and everybody is very rude.",
                    "MAY! YOU'RE GONNA DIE! I'M GOING TO FEED YOU TO YOUR OWN MACHINE!"
                ]
            }

            if (message.channel.id == '1395455375808921630') {
               let genshinOptions = [
                    'Aether',
                    'Lumine',
                    'Varesa',
                    'Iansan',
                    'Al-Haitham',
                    'Arlecchino',
                    'Chasca',
                    'Chiori',
                    'Citlali',
                    'Clorinde',
                    'Dehya',
                    'Eula',
                    'Furina',
                    'Ganyu',
                    'Hu Tao',
                    'Kazuha',
                    'Keqing',
                    'Kinich',
                    "Almighty Dragonlord K'uhul Ajaw",
                    'Lyney',
                    'Mavuika',
                    'Mona',
                    'Mualani',
                    'Nahida',
                    'Navia',
                    'Neuvillette',
                    'Nilou',
                    'Raiden',
                    'Shenhe',
                    'Sigewinne',
                    'Tighnari',
                    'Wanderer',
                    'Wriothesley',
                    'Xianyun',
                    'Xiao',
                    'Xilonen',
                    'Yae Miko',
                    'Yelan',
                    'Yoimiya',
                    'Yumemizuki Mizuki',
                    'Zhongli',
                    'Amber',
                    'Beidou',
                    'Candace',
                    'Charlotte',
                    'Chevreuse',
                    'Collei',
                    'Faruzan',
                    'Fischl',
                    'Gaming',
                    'Kaveh',
                    'Kirara',
                    'Kuki',
                    'Lan Yan',
                    'Layla',
                    'Lynette',
                    'Ororon',
                    'Xiangling',
                    'Yaoyao',
                    'Bronya Zaychik',
                    'Kiana Kaslana',
                    'Mei Raiden',
                    'Himeko Murata',
                    'Seele Vollerei',
                    'Fu Hua',
                    'Mydei',
                    'Acheron',
                    'Aglaea',
                    'Aventurine',
                    'Black Swan',
                    'Feixiao',
                    'Firefly',
                    'Fu Xuan',
                    'Fugue',
                    'Himeko',
                    'Jingliu',
                    'Kafka',
                    'Lingsha',
                    'Rappa',
                    'Ruan Mei',
                    'Sparkle',
                    'The Herta',
                    'Topaz',
                    'Stelle',
                    'Gallagher',
                    'Qingque',
                    'Tingyun',
                    'Xueyi',
                    'Anby',
                    'Nicole',
                    'Von Lycaon',
                    'Billy',
                    'Ben Bigger',
                    'Belle',
                    'Wise',
                    'Burnice',
                    'Ellen Joe',
                    'Astra Yao',
                    'Pulchra',
                    'Caesar',
                    'Evelyn',
                    'Grace',
                    'Harumasa',
                    'Jane Doe',
                    'Koleda',
                    'Lighter',
                    'Miyabi',
                    'Qingyi',
                    'Rina',
                    'Soldier 11',
                    'Yanagi',
                    'Zhu Yuan',
                    'Trigger',
                    'Lucy',
                    'Piper',
                    'Kevin Kaslana',
                    'Numby',
                    'Guoba',
                    'Baizhi',
                    'Brant',
                    'Camellya',
                    'Carlotta',
                    'Changli',
                    'Jinhsi',
                    'Lumi',
                    'Phoebe',
                    'THE FISH',
                    'Roccia',
                    'Rover',
                    'Sanhua',
                    'Shorekeeper',
                    'Taoqi',
                    'Yinlin',
                    'Youhu',
                    'Capitano',
                    'Jeht',
                    'Siobhan',
                    'Cacucu',
                    'Goose',
                    'Ifa',
                    'Escoffier',
                    'Dahlia',
                    'Columbina',
                    'Alice',
                    'Flins',
                    'Jahoda',
                    'Durin',
                    'Sandrone',
                    'Nicole',
                    'Aino',
                    'Archer',
                    'Phainon',
                    'Saber',
                    'Anaxagoras',
                    'Castorice',
                    'Tribbie',
                    'Cerydra',
                    'Yuzuha',
                    'Hugo',
                    'Ju Fufu',
                    'Yi Xuan',
                    'Pan Yinhu',
                    'Alice',
                    'Orphie',
                    'Magus',
                    'Seed Sr.',
                    'Seed Jr.',
                    'Cartethyia',
                    'Ciaccona',
                    'Phrolova',
                    'Chisa',
                    'Qiuyuan',
                    'Galbrena',
                    'Augusta',
                    'Ineffa'
                ];

                let gameOptions = [
                    'Zenless Zone Zero',
                    'Wuthering Waves',
                    'Honkai Impact 3rd',
                    'Genshin Impact',
                    'Honkai Star Rail',
                ];

                let hornyOptions = [
                    'Chiori',
                    'Raiden',
                    'Wriothesley',
                    'Xilonen',
                    'Yae Miko',
                    'Yelan',
                    'Mizuki',
                    'Kaveh',
                    'Acheron',
                    'Aglaea',
                    'Aventurine',
                    'Black Swan',
                    'Kafka',
                    'Gallagher',
                    'Lycaon',
                    'Burnice',
                    'Pulchra',
                    'Evelyn',
                    'Jane Doe',
                    'Yanagi',
                    'Changli',
                    'Ajaw',
                    'Cacucu',
                    'Goose',
                    'Skirk',
                    'Lauma',
                    'Nefer',
                    'Varka',
                    'Cipher',
                    'Hysilens',
                    'Vivian',
                    'Cantarella',
                    'Fleurdelys',
                    'Zani',
                    'Iuno'
                ];
                let marryOptions = [
                    'Furina',
                    'Yoimiya',
                    'Amber',
                    'Collei',
                    'Layla',
                    'Cacucu',
                    'Goose',
                    'Hyacine',
                    'Lupa',
                    'Zani'
                ];
    
                messageOptions = [
                    `How do you do, fellow Hoyo players? I too, play hoyo games! I love ${_.sample(genshinOptions)} so much!`,
                    `Hey Hoyo players, I'm personally pretty indifferent to ${_.sample(genshinOptions)} myself. Meh.`,
                    `I SWEAR if I don't pull ${_.sample(genshinOptions)} soon, I'm gonna CRASH OUT`,
                    `Maybe Jeff will finally play a gacha game if he sees ${_.sample(genshinOptions)}. Maybe.`,
                    `## I HATE ${(_.sample(genshinOptions)).toUpperCase()} SO MUCH I HATE THEM SO MUCH THEY SHOULD BE REMOVED FROM THE GAME`,
                    `Honestly, my favorite Hoyoverse character right now is ${_.sample(genshinOptions)}. They just speak to me.`,
                    `I use the META. ${_.sample(genshinOptions)}.`,
                    `I'm gonna play a guessing game... I think ${_.sample(genshinOptions)} is from ${_.sample(gameOptions)}. I'm such an expert that obviously I'm right.`,
                    `# I'M GOONING TO ${(_.sample(hornyOptions)).toUpperCase()}!!!!`,
                    `${_.sample([hornyOptions, marryOptions].flat(1))} is my waifu.`,
                    `I am not a fan of ${_.sample(genshinOptions)}. They did some really evil stuff...`,
                    `They should add ${_.sample(genshinOptions)} into ${_.sample(gameOptions)}! They would be a fire addition!`,
                    `Did you know? ${_.sample(genshinOptions)} is going to be a major part of the meta next update. Just watch.`,
                    `Gacha players lmao`,
                    `You all should play a REAL gacha game, like todays sponsor: Raid Shadow Legends!`
                ];
            }

            if (Math.random() < 0.01) {
                messageOptions = [
                    `KILL YOURSELF <@${interaction.user.id}>`,
                    `Pssst... I need to tell you something, <@${interaction.user.id}>. I don't know how to say it, but I've had feelings for you for a long time. I needed to get it off my chest, so... thank you for understanding.`
                ]
            }

            message.channel.send(_.sample(messageOptions));
        }
    }
});

// login to Discord
client.login(token);