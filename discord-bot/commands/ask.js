

const { SlashCommandBuilder } = require('discord.js');
const _ = require('lodash');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ask')
        .setDescription('Ask hotdog bot a question...')
        .setDMPermission(false),
	async execute(interaction) {
        const messageOptions = [
            'Survey says... no, probably not.',
            'Obviously yes, do you even need to ask?',
            'Very possible... very possible indeed... perhaps consult with yul...',
            'If you become pea tomorrow, your chances look good.',
            'Absolutely NOT. The world would explode before that.',
            'You should DIE for even asking that question, NO.',
            'Perchance.',
            'Maybe! Who knows?  I am just a bot, what do you expect from me?'
        ];

        interaction.reply(_.sample(messageOptions));
    },
};
