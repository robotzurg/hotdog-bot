const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('crash')
        .setDescription('Crashes the bot to trigger a restart, for use with archipelago')
        .setDMPermission(false),

    async execute(interaction) {
        await interaction.reply({ content: 'Restarting bot.' });

        // Give Discord time to send the reply before crashing
        setTimeout(() => {
            console.log('Bot crash initiated by user command');
            process.exit(1);
        }, 1000);
    },
};
