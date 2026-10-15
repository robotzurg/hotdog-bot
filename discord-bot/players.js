// Archipelago player configuration.
// PLAYER_SLOTS is the authoritative list used by commands — update it when slots change.
// PLAYERS drives prefix-based helpers (getPlayerForSlot, getSlotsForPlayer).

const PLAYER_SLOTS = {
    'Av':     ['AvFlipwitch', 'AvFuni', 'AvGenshin', 'AvHat', 'AvOri'],
    'Ethan':  ['Ethan-HK', 'Ethan-Mania', 'Ethan-Piku', 'Ethan-SMO', 'Ethan-TP'],
    'HDW':    ['AllBingo', 'AllRepo'],
    'iapg':   ['iapg-silk', 'iapg-smo', 'iapg-ugc'],
    'Jeff':   ['Jeff-HEX', 'Jeff-RM', 'Jeff-SJ', 'Jeff-SMO', 'Jeff-UCG'],
    'Nate':   ['NateCeleste', 'NateDoom', 'NateHat', 'NateTunic'],
    'Vlad':   ['vlad-dice', 'vlad-frog', 'vlad-gta'],
    'Xypod':  ['Xypod-CT', 'Xypod-DRG', 'Xypod-TN'],
    'Yacob':  ['Yacob-BP', 'Yacob-FW', 'Yacob-LOR', 'Yacob-MIKU', 'Yacob-NW'],
};

const PLAYERS = [
    { name: 'Av',     prefix: 'Av'     },
    { name: 'Ethan',  prefix: 'Ethan'  },
    { name: 'HDW',    prefix: 'All'    },
    { name: 'iapg',   prefix: 'iapg'   },
    { name: 'Jeff',   prefix: 'Jeff'   },
    { name: 'Nate',   prefix: 'Nate'   },
    { name: 'Vlad',   prefix: 'vlad'   },
    { name: 'Xypod',  prefix: 'Xypod'  },
    { name: 'Yacob',  prefix: 'Yacob'  },
];

const PLAYER_NAMES = PLAYERS.map(p => p.name);

function getPlayerForSlot(slotName) {
    return PLAYERS.find(p => slotName.toLowerCase().startsWith(p.prefix.toLowerCase())) ?? null;
}

function getSlotsForPlayer(playerName, slotNames) {
    const player = PLAYERS.find(p => p.name.toLowerCase() === playerName.toLowerCase());
    if (!player) return [];
    return slotNames.filter(s => s.toLowerCase().startsWith(player.prefix.toLowerCase()));
}

module.exports = { PLAYER_SLOTS, PLAYERS, PLAYER_NAMES, getPlayerForSlot, getSlotsForPlayer };
