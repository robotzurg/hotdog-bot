// Archipelago player configuration.
// PLAYER_SLOTS is the authoritative list used by commands — update it when slots change.
// PLAYERS drives prefix-based helpers (getPlayerForSlot, getSlotsForPlayer).

const PLAYER_SLOTS = {
    'Aria':   ['AriaCeleste', 'AriaChess', 'AriaHollow', 'AriaLilies', 'AriaOri', 'AriaPizza', 'AriaTruck', 'AriaSouls'],
    'Av':     ['AvGenshin', 'AvGK', 'AvHat', 'AvNiko', 'AvTy', 'AvWitch'],
    'Ethan':  ['Ethan-Celeste', 'Ethan-DKC', 'Ethan-Duck', 'Ethan-Hylics', 'Ethan-Ori', 'Ethan-Peggle', 'Ethan-Taxi', 'Ethan-TOEM', 'Ethan-Yoku'],
    'HDW':    ['HDWClique', 'AllFactory', 'AllMinecraft', 'AllRepo'],
    'Jeff':   ['Jeff-C64', 'Jeff-COTM', 'Jeff-DUCK', 'Jeff-KH2', 'Jeff-SOL', 'Jeff-SP', 'Jeff-Stardew', 'Jeff-Truck', 'Jeff-TS', 'Jeff-UT'],
    'Kirby':  ['KirbyKSS'],
    'Nate':   ['NateGK', 'NateGo', 'NateHunie', 'NateMK', 'NateOri', 'NatePvZ', 'NateRabi', 'NateTy', 'NateWitch', 'NateXeno'],
    'Raveel': ['RaveelCeleste', 'RaveelConquest', 'RaveelOri', 'RaveelPizza', 'RaveelXY', 'RaveelZA'],
    'Vlad':   ['vlad-dd', 'vlad-fm', 'vlad-hk', 'vlad-mini', 'vlad-ref'],
    'Yacob':  ['Yacob-HK', 'Yacob-KH', 'Yacob-KH2', 'Yacob-Lies', 'Yacob-MIKU', 'Yacob-OOT', 'Yacob-SOLS', 'Yacob-SUNSHINE', 'Yacob-TP'],
};

const PLAYERS = [
    { name: 'Aria',   prefix: 'Aria'   },
    { name: 'Av',     prefix: 'Av'     },
    { name: 'Ethan',  prefix: 'Ethan'  },
    { name: 'Jeff',   prefix: 'Jeff'   },
    { name: 'Kirby',  prefix: 'Kirby'  },
    { name: 'Nate',   prefix: 'Nate'   },
    { name: 'Raveel', prefix: 'Raveel' },
    { name: 'Vlad',   prefix: 'vlad'   },
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
