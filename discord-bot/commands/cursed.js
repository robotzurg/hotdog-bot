module.exports = {
	name: 'cursed',
	description: 'Make the bot post a cursed emote...',
	execute(message) {
		message.channel.send('<:pepehehe:784594747406286868>');
		message.delete();
	},
};