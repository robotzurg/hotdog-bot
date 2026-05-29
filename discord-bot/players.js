// Archipelago player configuration.
// PLAYER_SLOTS is the authoritative list used by commands — update it when slots change.
// PLAYERS drives prefix-based helpers (getPlayerForSlot, getSlotsForPlayer).

const PLAYER_SLOTS = {
    'Aria':   ['AriaBlas', 'AriaCeleste', 'AriaFuni', 'AriaLandstalker', 'AriaOri', 'AriaPortal', 'AriaTruck'],
    'Av':     ['AvGK', 'AvSpyro', 'AvGo', 'AvBurnout', 'AvCookie', 'AvCrab', 'AvHat', 'AvLego'],
    'Ethan':  ['Ethan-Blas', 'Ethan-DKC2', 'Ethan-Funi', 'Ethan-Marble', 'Ethan-Ori', 'Ethan-Pizza', 'Ethan-PvZ', 'Ethan-Sonic', 'Ethan-Sub', 'Ethan-Ty'],
    'HDW':    ['AllBingo', 'AllClique', 'AllDRG', 'AllJigsaw', 'AllLethal', 'AllMurder', 'AllRepo'],
    'iapg':   ['iapg-ASH', 'iapg-B3', 'iapg-CT', 'iapg-FRG', 'iapg-GK', 'iapg-HK', 'iapg-Hylics', 'iapg-Tax', 'iapg-V', 'iapg-WIT'],
    'Jeff':   ['Jeff-Botw', 'Jeff-Celeste', 'Jeff-Crab', 'Jeff-Cup', 'Jeff-Funi', 'Jeff-Lies', 'Jeff-Marble', 'Jeff-Mario', 'Jeff-Mlss', 'Jeff-Quest', 'Jeff-Ty', 'JeffYacob-Ktane'],
    'Kirby':  ['Kirby64', 'KirbyLilies', 'KirbySols', 'KirbyUT', 'KirbyWW'],
    'Nate':   ['NateBloons', 'NateCeleste', 'NateCube', 'NateDoor', 'NateFE', 'NateLies', 'NateMario', 'NateMini', 'NateOri', 'NateRefunct', 'NateSols', 'NateSpire'],
    'Raveel': ['Raveel3H', 'RaveelBalatro', 'RaveelCiVI', 'RaveelGenshin', 'RaveelKartWii', 'RaveelKong', 'RaveelKong2', 'RaveelResort'],
    'Vlad':   ['vlad-blas', 'vlad-chess', 'vlad-crab', 'vlad-dd', 'vlad-elem', 'vlad-hike', 'vlad-hk', 'vlad-simp', 'vlad-sub', 'vlad-ultra', 'vlad-wit'],
    'Yacob':  ['Yacob-2077', 'Yacob-C', 'Yacob-DS3', 'Yacob-GH3', 'Yacob-LIES', 'Yacob-LOR', 'Yacob-MEGAMIX', 'Yacob-PKMN', 'Yacob-REPO', 'Yacob-STAR'],
};

const PLAYERS = [
    { name: 'Aria',   prefix: 'Aria'   },
    { name: 'Av',     prefix: 'Av'     },
    { name: 'Ethan',  prefix: 'Ethan'  },
    { name: 'HDW',    prefix: 'All'    },
    { name: 'iapg',   prefix: 'iapg'   },
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
