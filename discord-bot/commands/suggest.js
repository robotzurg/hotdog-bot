const Trello = require('trello-node-api')('0b42eacc9105869df41592c003c09106', '299fc89e593775575a36b1cc7dec38084c7ebcd60dc7156241c9781a9c8f4864');

module.exports = {
	name: 'suggest',
    description: 'Request a feature to be added to the bot!',
    args: true,
    usage: `<feature> | <description_of_feature>`,
	execute(message, args) {
        const data = {
            name: `${message.member.displayName}: ${args[0]}`,
            desc: args[1],
            idList: '5fdd279b8c0f807ba3822448', //REQUIRED
            idLabels: ['5fdda073f579d381c8503ada'],
        };
        Trello.card.create(data).then(function() {
            message.channel.send('Request submitted.');
        }).catch(function(error) {
            console.log('error', error);
        });     
	},
};