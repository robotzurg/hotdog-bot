module.exports = {
	name: 'cover',
	type: 'Fun',
	description: 'Get song art from the song you are listening to.',
	execute(message) {
        message.author.presence.activities.forEach((activity) => {
            if (activity.type === 'LISTENING' && activity.name === 'Spotify' && activity.assets !== null) {
                let artists = activity.state;
                if (artists.includes(';')) {
                    artists = artists.split('; ');
                    artists = artists.join(' & ');
                }
                message.channel.send(`**Art for ${artists} - ${activity.details} **https://i.scdn.co/image/${activity.assets.largeImage.slice(8)}`);
            }
        });
	},
};