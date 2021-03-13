const db = require("../db.js");

module.exports = {
    name: 'addstar',
    type: 'Admin',
    description: 'Temp command',
	execute(message) {
        if (message.author.id === '122568101995872256') {
            const keyArray = db.reviewDB.keyArray();
            for (let i = 0; i < keyArray.length; i++) {
                let keyObj = db.reviewDB.get(keyArray[i]);
                let keyObjArray = Object.keys(keyObj);
                keyObjArray = keyObjArray.filter(item => item !== 'Image');

                for (let j = 0; j < keyObjArray.length; j++) {
                    let songObj = db.reviewDB.get(keyArray[i], `["${keyObjArray[j]}"]`);
                    let songObjArray = Object.keys(songObj);
                    songObjArray = songObjArray.filter(e => e !== 'EP');
                    songObjArray = songObjArray.filter(e => e !== 'Image');
                    songObjArray = songObjArray.filter(e => e !== 'Remixers');
                    songObjArray = songObjArray.filter(e => e !== 'Collab');
                    songObjArray = songObjArray.filter(e => e !== 'Vocals');
                    songObjArray = songObjArray.filter(e => e !== 'EPpos');

                    for (let k = 0; k < songObjArray.length; k++) {
                        db.reviewDB.set(keyArray[i], false, `["${keyObjArray[j]}"].["${songObjArray[k]}"].starred`);
                        break;
                    }
                break;
                }
            break;
            }

            return message.channel.send('Finished.');
        }
	},
};