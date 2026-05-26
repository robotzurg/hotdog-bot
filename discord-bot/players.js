// Archipelago player configuration — maps display names to slot name prefixes.
// Prefix matching is case-insensitive. Add a new entry whenever a new player joins.

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

module.exports = { PLAYERS, PLAYER_NAMES, getPlayerForSlot, getSlotsForPlayer };
