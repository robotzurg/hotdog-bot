module.exports = {
	name: 'hello',
	description: 'world!',
	execute(message) {
		message.channel.send('world!');
	},
};