module.exports = {
	name: 'cursed',
	description: 'Make the bot post a cursed emote...',
	execute(interaction) {
		interaction.channel.send('<:pepehehe:784594747406286868>');
		interaction.deleteReply();
	},
};