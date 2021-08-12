const Trello = require('trello-node-api')('0b42eacc9105869df41592c003c09106', '299fc89e593775575a36b1cc7dec38084c7ebcd60dc7156241c9781a9c8f4864');

module.exports = {
    name: 'bugreport',
    description: 'Report a bug in the bot.',
    options: [
        {
            name: 'bug',
            type: 'STRING',
            description: 'One sentence description of the bug',
            required: true,
        }, {
            name: 'description',
            type: 'STRING',
            description: 'Any further detail you may want to say about the bug.',
        },
    ],
	execute(interaction) {
        const bug_name = interaction.options._hoistedOptions[0].value;
        let bug_desc = '';
        if (interaction.options.length > 1) {
            bug_desc = interaction.options._hoistedOptions[1].value;
        }
        
        const data = {
            name: (interaction.user.id != '122568101995872256' ? `${interaction.member.displayName}: ${bug_name}` : `${bug_name}`),
            desc: bug_desc,
            idList: "5fdd28493a6c8c6b6a4ac646", //REQUIRED
            idLabels: ["5fdda079280a9f065e7751d2"],
        };
        Trello.card.create(data).then(function() {
            interaction.editReply('Bug Reported.');
        }).catch(function(error) {
            console.log('error', error);
        });    
	},
};