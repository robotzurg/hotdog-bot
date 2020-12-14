module.exports = {
	name: 'ping',
	cooldown: 0,
	description: 'Ping!',
	execute(message) {
		message.channel.send(`Pong. ${message.client.ws.ping}ms`);
	},
};