module.exports = {
    name: 'pog',
	description: 'Make the bot pog randomly!',
    options: [],
	execute(interaction) {
        const pogchoices = [
            '<:pogcat:731386480563454002>',
            '<:monkeypog:705919224245387275>',
            '<:GrantPog:681213278487183388>',
            '<:au5pog:746187720363212962>',
            '<:pogclose:796973676934594590>',
            '<:apogg:802041048700157953>',
            '<:MoyaiPog:809278354871681065>',
            '<:PogChamp:809279078829522984>',
        ];

        const pick = pogchoices[Math.floor(Math.random() * pogchoices.length)];
        interaction.deleteReply();
		interaction.channel.send(pick);
	},
};