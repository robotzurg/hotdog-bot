const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../db.js');
const numReacts = ['0️', '<:1_:1077461283923820574>', '<:2_:1077461296309608489>', '<:3_:1077461311216164894>', '<:4_:1077461656893927515>', '<:5_:1077461343130628107>', 
'<:6_:1077461361312931840>', '<:7_:1077461383718899712>', '<:8_:1077461396570247169>', '<:9_:1077461408515641414>', '<:10_:1077459777967370240>'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('peaderboard')
        .setDescription('View the pea of the day leaderboard.')
        .setDMPermission(false)
        .addSubcommand(subcommand =>
            subcommand.setName('all_time')
            .setDescription('View the pea of the day leaderboard for all time.'))
        .addSubcommand(subcommand =>
            subcommand.setName('month')
            .setDescription('View the pea of the day leaderboard for the month.')),
	async execute(interaction, client) {
        // db.potd.set("activity_tracker", {});
        // db.potd.set("potd_message", false);

        // const guild = await client.guilds.fetch('680864893552951306')
        // const members = await guild.members.fetch();

        // let memberIDList = members.map(v => v.user.id);

        // for (let id of memberIDList) {
        //     db.potd.push("peaderboard_all", [id, 0]); // [ID, Pea amount]
        //     db.potd.push("peaderboard_month", [id, 0]); // [ID, Pea amount]
        //     db.potd.set("activity_tracker", 14, `${id}`);
        // }

        let timeframe = interaction.options.getSubcommand();
        (timeframe == 'all_time' ? timeframe = 'peaderboard_all' : timeframe = 'peaderboard_month');

        let peaderboard = db.potd.get(timeframe);
        peaderboard = peaderboard.sort((a, b) => {
            return b[1] - a[1];
        })

        peaderboard = peaderboard.slice(0, 10);

        let peaderboard_display = []
        let counter = 0;
        for (let i of peaderboard) {
            counter += 1;
            peaderboard_display.push(`**${counter}. <:peapega:771510795958747145>** **${i[1]}** <@${i[0]}>\n`)
        }

        let peaderboardEmbed = new EmbedBuilder()
            .setTitle((timeframe == 'peaderboard_all' ? 'Peaderboard (All Time)' : 'Peaderboard (Month)'))
            .setColor('#09a700')
            .setDescription(peaderboard_display.join('\n'))

        interaction.editReply({ embeds: [peaderboardEmbed] });
    },
};