const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('manual_potd')
        .setDescription('test')
        .setDMPermission(false),
	async execute(interaction) {
        interaction.deleteReply();
        interaction.channel.send({ content: 'Hello everyone! I\'m here to tell you all today\'s first **Pea of the Day** which is...' });
    },
};
