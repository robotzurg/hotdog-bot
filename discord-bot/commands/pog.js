module.exports = {
    name: 'pog',
    type: 'Fun',
	description: 'Make the bot pog randomly!',
	execute(message) {
        const pogchoices = [
            '<:paintpog:682377404638822517>',
            '<:pogcat:731386480563454002>',
            '<:nawtypog:752583395808378940>',
            '<:monkeypog:705919224245387275>',
            '<:MONKEY:699018847050530816>',
            '<:GrantPog:681213278487183388>',
            '<:au5pog:746187720363212962>',
        ];

        const pick = pogchoices[Math.floor(Math.random() * pogchoices.length)];
		message.channel.send(pick);
	},
};