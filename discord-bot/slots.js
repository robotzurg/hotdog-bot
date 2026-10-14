const SLOT_EMOTES = {
    // --- HDW (All) ---
    'AllBingo':         '<:bingo:1508530625496219649>',
    'AllRepo':          '<:repo:1469451338936090848>',

    // --- Av ---
    'AvFlipwitch':   '<:flipwitch:1469420881787752687>',
    'AvFuni':          '<:funi:1510054135951655112>',
    'AvGenshin':        '<:genshin:1443882704834658387>',
    'AvHat':         '<:hatintime:1423880268460326995>',
    'AvOri':         '<:oriwotw:1426636447817138397>',

    // --- Ethan ---
    'Ethan-HK':         '<:hollowknight:1423880850658955374>',
    'Ethan-Mania':      '<:sonicmania:1559961874857070715>',
    'Ethan-Piku':       '<:pikuniku:1559961873879662592>',
    'Ethan-SMO':        '<:odyssey:1559961872910913606>',
    'Ethan-TP':         '<:twilightprincess:1426636411980877985>',

    // --- iapg ---
    'iapg-silk':        '<:silksong:1559961871295979710>',
    'iapg-smo':         '<:odyssey:1559961872910913606>',
    'iapg-ugc':         '<:ucg:1559961869782093875>',

    // --- Vlad ---
    'vlad-dice':        '<:yachtdice:1469421299972702463>',
    'vlad-frog':        '<:frogmonster:1487562749067395212>',
    'vlad-gta':         '<:gta:1559961868787908779>',

    // --- Xypod ---
    'Xypod-CT':         '<:clustertruck:1443882716725645342>',
    'Xypod-DRG':        '<:drg:1426636430657982534>',
    'Xypod-TN':         '<:terranil:1559961867374428262>',

    // --- Yacob ---
    'Yacob-BP':         '<:blueprince:1559961866074193920>',
    'Yacob-FW':         '<:flipwitch:1469420881787752687>',
    'Yacob-LOR':        '<:libraryofruina:1508530697348845768>',
    'Yacob-MIKU':       '<:divamegamix:1426636473150734437>',
    'Yacob-NW':         '<:neonwhite:1559961864689946714>',
};

const SLOT_NAMES = Object.keys(SLOT_EMOTES).sort();

const FLAG_EMOTES = {
    Progression: '<:Progression:1495879488716668988>',
    Useful:      '<:Useful:1495879485407494354>',
    Trap:        '<:Trap:1495879486346887238>',
    Junk:        '<:Junk:1495879487538204804>',
};

const ITEM_GROUPS = ['Progression', 'Useful', 'Trap', 'Junk'];

// Archipelago item flag bits: 0b001 progression, 0b010 useful, 0b100 trap
function itemGroup(flags = 0) {
    if (flags & 0b0001) return 'Progression';
    if (flags & 0b0100) return 'Trap';
    if (flags & 0b0010) return 'Useful';
    return 'Junk';
}

function flagEmote(flags = 0) {
    return FLAG_EMOTES[itemGroup(flags)];
}

// Emote for an item, with the special-cased items that have their own art
function itemEmote(itemName, flags = 0) {
    if (itemName === 'Picture Frame') return '<:pictureframe:1528503736245289081>';
    return flagEmote(flags);
}

// Slot name followed by its emote, if it has one
function mapEmoji(text) {
    const emote = SLOT_EMOTES[text];
    return emote ? `${text} ${emote}` : text;
}

module.exports = { SLOT_NAMES, SLOT_EMOTES, FLAG_EMOTES, ITEM_GROUPS, itemGroup, flagEmote, itemEmote, mapEmoji };
