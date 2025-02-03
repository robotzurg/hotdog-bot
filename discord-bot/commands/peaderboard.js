const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../db.js');

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
	async execute(interaction) {

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

        interaction.reply({ embeds: [peaderboardEmbed] });
    },
};