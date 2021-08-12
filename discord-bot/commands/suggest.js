const Trello = require('trello-node-api')('0b42eacc9105869df41592c003c09106', '299fc89e593775575a36b1cc7dec38084c7ebcd60dc7156241c9781a9c8f4864');

module.exports = {
    name: 'suggest',
    description: 'Suggest a feature for the bot!',
    options: [
        {
            name: 'suggestion',
            type: 'STRING',
            description: 'One sentence description of the suggestion',
            required: true,
        }, {
            name: 'description',
            type: 'STRING',
            description: 'Any further detail you may want to say about the suggestion.',
        },
    ],
	execute(interaction) {
        const sug_name = interaction.options._hoistedOptions[0].value;
        let sug_desc = '';
        if (interaction.options.length > 1) {
            sug_desc = interaction.options._hoistedOptions[1].value;
        }
        
        const data = {
            name: (interaction.user.id != '122568101995872256' ? `${interaction.member.displayName}: ${sug_name}` : `${sug_name}`),
            desc: sug_desc,
            idList: '5fdd279b8c0f807ba3822448', //REQUIRED
            idLabels: ['5fdda073f579d381c8503ada'],
        };
        Trello.card.create(data).then(function() {
            interaction.editReply('Request submitted.');
        }).catch(function(error) {
            console.log('error', error);
        });     
	},
};