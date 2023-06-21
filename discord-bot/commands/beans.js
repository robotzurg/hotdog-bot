const { SlashCommandBuilder } = require('discord.js');
const _ = require('lodash');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('beans')
        .setDescription('Beans...')
        .setDMPermission(false),
	async execute(interaction) {
        interaction.editReply({ files: [{ attachment: `./beans_pics/beans${_.random(1, 10)}.jpeg` }] });
    },
};
