const { SlashCommandBuilder } = require('discord.js');
const db = require('../db.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('restart')
        .setDescription('Crashes the bot to trigger a restart, for use with archipelago')
        .setDMPermission(false),

    async execute(interaction) {
        if (interaction.channel.id != db.archipelago.get('server_channel')) {
            interaction.reply({ content: `Bot cannot be restarted outside of Archipelago chat.` });
        }
        await interaction.reply({ content: 'Restarting bot.' });

        // Give Discord time to send the reply before crashing
        setTimeout(() => {
            console.log('Bot crash initiated by user command');
            process.exit(1);
        }, 1000);
    },
};
