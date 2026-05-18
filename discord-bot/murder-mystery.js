const db = require('./db.js');
const {
    PERSONS,
    HINT_TEMPLATES,
    HINT_CATEGORIES,
    PLAYER_DISCORD_IDS,
    LOCATION_POOL,
    WEAPON_POOL,
    investigationLocationId,
    shareLocationId,
} = require('./murdermystery-ap-info.js');

const HINTS_PATH = require.resolve('./murdermystery-hints.json');
let HINTS = require('./murdermystery-hints.json');

// Reload the hints file from disk, bypassing the require cache. Called by
// startGame so edits to murdermystery-hints.json take effect without a bot
// restart.
function reloadHints() {
    delete require.cache[HINTS_PATH];
    HINTS = require('./murdermystery-hints.json');
    return HINTS;
}

// ---------------------------------------------------------------------------
// Tunables
// ---------------------------------------------------------------------------
const CONCLUDE_THRESHOLD_PCT = 0.75; // fraction of all investigation+share items
                                     // that must be received before /conclude opens
const MAX_WRONG_CONCLUSIONS = 2;     // wrong guesses before murderer wins
const MURDERER_SHARE_WIN_COUNT = 3;  // important hints shared *to* murderer to win

// ---------------------------------------------------------------------------
// State shape
//
// murdermystery-hints.json is the single source of truth for setup data:
//   {
//     "solution": { "murderer", "location", "weapon" },
//     "hints": { "<player>": { "<template>": { "text", "important" } } }
//   }
// /mm-start reloads this file, validates it, and snapshots solution +
// important flags into the DB so mid-game edits to the JSON can't change
// the case.
//
// db.murder keys:
//   "game_active":                bool
//   "murderer":                   "Jeff"   (one of PERSONS)
//   "location":                   "The Library"
//   "weapon":                     "Rope"
//   "wrong_conclusions":          0
//   "winner":                     null | "detectives" | "murderer-share" | "murderer-wrong"
//   "share_checks_sent":          0        (next Share location index to consume)
//   "shared_to_murderer_count":   0        (important shares delivered to murderer)
//   "important_flags":            { "<player>::<template>": true }
//        - snapshot of important flags from the JSON file. These are the
//        truthful, solution-bearing hints. Used both as the murderer's
//        share-win-condition material AND as the gate on /conclude (all
//        of them must be received from the multiworld before a conclusion
//        can be submitted).
//   "player_<name>":              {
//        investigated: { "<template>": true, ... },
//        shares_used:  0,
//        shared_to_me: [ { from, sourcePlayer, template, text, important } ]
//   }
// ---------------------------------------------------------------------------

function playerKey(name) { return `player_${name}`; }

function defaultPlayerState() {
    return {
        investigated: {},
        shares_used: 0,
        shared_to_me: [],
    };
}

function getPlayerState(name) {
    return db.murder.get(playerKey(name)) ?? defaultPlayerState();
}

function setPlayerState(name, state) {
    db.murder.set(playerKey(name), state);
}

function resolveDiscordUser(discordId) {
    for (const [player, id] of Object.entries(PLAYER_DISCORD_IDS)) {
        if (id && id === discordId) return player;
    }
    return null;
}

function isGameActive() {
    return db.murder.get('game_active') === true;
}

function getSolution() {
    return {
        murderer: db.murder.get('murderer'),
        location: db.murder.get('location'),
        weapon:   db.murder.get('weapon'),
    };
}

function getWinner() {
    return db.murder.get('winner');
}

function getWrongConclusions() {
    return db.murder.get('wrong_conclusions') ?? 0;
}

function getSharedToMurdererCount() {
    return db.murder.get('shared_to_murderer_count') ?? 0;
}

// Validate the loaded hints file. Returns an array of human-readable errors;
// empty array means it's good to go.
function validateHints(h) {
    const errors = [];
    if (!h || typeof h !== 'object') return ['hints file is not an object'];

    const sol = h.solution;
    if (!sol || typeof sol !== 'object') {
        errors.push('missing `solution` object');
    } else {
        if (!PERSONS.includes(sol.murderer))            errors.push(`solution.murderer "${sol.murderer}" is not in PERSONS`);
        if (!LOCATION_POOL.includes(sol.location))      errors.push(`solution.location "${sol.location}" is not in LOCATION_POOL`);
        if (!WEAPON_POOL.includes(sol.weapon))          errors.push(`solution.weapon "${sol.weapon}" is not in WEAPON_POOL`);
    }

    const hints = h.hints;
    if (!hints || typeof hints !== 'object') {
        errors.push('missing `hints` object');
    } else {
        for (const p of PERSONS) {
            if (!hints[p]) { errors.push(`hints.${p} is missing`); continue; }
            for (const t of HINT_TEMPLATES) {
                const entry = hints[p][t];
                if (!entry)                          errors.push(`hints.${p}["${t}"] is missing`);
                else if (typeof entry.text !== 'string') errors.push(`hints.${p}["${t}"].text is not a string`);
            }
        }
    }
    return errors;
}

function startGame() {
    reloadHints();
    const errors = validateHints(HINTS);
    if (errors.length) {
        const e = new Error(`murdermystery-hints.json failed validation:\n- ${errors.join('\n- ')}`);
        e.validationErrors = errors;
        throw e;
    }

    const { murderer, location, weapon } = HINTS.solution;

    // Snapshot the important flags so a mid-game JSON edit can't change the
    // case under us.
    const importantFlags = {};
    for (const p of PERSONS) {
        for (const t of HINT_TEMPLATES) {
            if (HINTS.hints[p][t].important === true) importantFlags[`${p}::${t}`] = true;
        }
    }

    for (const key of db.murder.keys()) db.murder.delete(key);

    db.murder.set('game_active', true);
    db.murder.set('murderer', murderer);
    db.murder.set('location', location);
    db.murder.set('weapon', weapon);
    db.murder.set('wrong_conclusions', 0);
    db.murder.set('winner', null);
    db.murder.set('share_checks_sent', 0);
    db.murder.set('shared_to_murderer_count', 0);
    db.murder.set('important_flags', importantFlags);
    for (const p of PERSONS) setPlayerState(p, defaultPlayerState());

    return { murderer, location, weapon, importantCount: Object.keys(importantFlags).length };
}

function isImportant(player, template) {
    const flags = db.murder.get('important_flags') ?? {};
    return flags[`${player}::${template}`] === true;
}

function getHintText(player, template) {
    return HINTS?.hints?.[player]?.[template]?.text
        ?? `[missing placeholder for ${player} / ${template}]`;
}

// ---------------------------------------------------------------------------
// Archipelago helpers - one-shot connections as HDWMurder
// ---------------------------------------------------------------------------

async function mmConnect() {
    const port = db.archipelago.get('server_port');
    const slot = db.archipelago.get('slot');
    const game = db.archipelago.get('game');
    if (!port) throw new Error('Archipelago server_port is not configured.');
    if (!slot) throw new Error('Archipelago slot is not configured.');
    const { Client } = await import('archipelago.js');
    const client = new Client();
    await client.login(`archipelago.gg:${port}`, slot, game);
    return client;
}

async function readReceivedItems() {
    const client = await mmConnect();
    // Give the server a moment to flush the received-items batch.
    await new Promise(r => setTimeout(r, 4000));
    const received = [...client.items.received];
    try { client.socket.disconnect(); } catch (_) {}
    return received;
}

async function sendChecks(locationIds) {
    if (!locationIds || locationIds.length === 0) return;
    const client = await mmConnect();
    await new Promise(r => setTimeout(r, 1500));
    client.check(...locationIds);
    // Allow the packet to flush before disconnect.
    await new Promise(r => setTimeout(r, 1500));
    try { client.socket.disconnect(); } catch (_) {}
}

// ---------------------------------------------------------------------------
// Per-player clue board built from AP receipts + DB investigated state
// ---------------------------------------------------------------------------

// Group received items into useful counts.
function summarizeReceived(received) {
    const investigationsForPlayer = {};   // player -> Set<template>
    const shareCountsForPlayer = {};      // player -> int
    let redHerrings = 0;

    for (const p of PERSONS) {
        investigationsForPlayer[p] = new Set();
        shareCountsForPlayer[p] = 0;
    }

    for (const item of received) {
        const name = item?.name;
        if (!name) continue;
        if (name === 'Red Herring') { redHerrings++; continue; }

        const m = name.match(/^(.+?) - (.+)$/);
        if (!m) continue;
        const [, prefix, person] = m;
        if (!PERSONS.includes(person)) continue;

        if (prefix === 'Progressive Share') {
            shareCountsForPlayer[person]++;
        } else if (HINT_TEMPLATES.includes(prefix)) {
            investigationsForPlayer[person].add(prefix);
        }
    }

    return { investigationsForPlayer, shareCountsForPlayer, redHerrings };
}

function buildClueBoard(player, received) {
    const { investigationsForPlayer, shareCountsForPlayer } = summarizeReceived(received);
    const state = getPlayerState(player);

    const clues = HINT_TEMPLATES.map(template => {
        const receivedThis = investigationsForPlayer[player].has(template);
        const investigated = state.investigated[template] === true;
        let status;
        if (!receivedThis)       status = 'LOCKED';
        else if (!investigated)  status = 'AVAILABLE';
        else                     status = 'INVESTIGATED';
        return {
            template,
            category: HINT_CATEGORIES[template],
            status,
            text: investigated ? getHintText(player, template) : null,
        };
    });

    const sharesReceived = shareCountsForPlayer[player];
    const sharesAvailable = Math.max(0, sharesReceived - state.shares_used);

    return {
        clues,
        sharesReceived,
        sharesUsed: state.shares_used,
        sharesAvailable,
        sharedToMe: state.shared_to_me,
    };
}

// ---------------------------------------------------------------------------
// Mutators that AP-send checks need to know about
// ---------------------------------------------------------------------------

// Records an investigation as revealed and returns the AP location id to send.
function markInvestigated(player, template) {
    const state = getPlayerState(player);
    state.investigated[template] = true;
    setPlayerState(player, state);
    return investigationLocationId(template, player);
}

// Adds a shared hint to the target's board, consumes a share charge from the
// caller, and returns the AP location id for the caller's next Share check.
//
// `caller`     - { player, discordId } - who pays the Progressive Share charge
// `hint`       - { sourcePlayer, template } - whose clue this originally is
// `targetPlayer` - receiving player
//
// Returns { locationId, important } on success or { locationId: null, reason }
// if the caller has used both of their share locations.
function recordShare({ caller, hint, targetPlayer, sharesReceived }) {
    const callerState = getPlayerState(caller.player);

    // Each player has 2 Share locations in the world. They can't share more
    // times than they've received Progressive Share items either.
    if (callerState.shares_used >= 2)        return { locationId: null, reason: 'out-of-share-locations' };
    if (callerState.shares_used >= sharesReceived) return { locationId: null, reason: 'no-share-charges' };

    const text = getHintText(hint.sourcePlayer, hint.template);
    const important = isImportant(hint.sourcePlayer, hint.template);

    const tgtState = getPlayerState(targetPlayer);
    tgtState.shared_to_me.push({
        from: caller.player,
        fromDiscordId: caller.discordId,
        sourcePlayer: hint.sourcePlayer,
        template: hint.template,
        text,
        important,
    });
    setPlayerState(targetPlayer, tgtState);

    callerState.shares_used = callerState.shares_used + 1;
    setPlayerState(caller.player, callerState);

    if (important && targetPlayer === db.murder.get('murderer')) {
        const next = (db.murder.get('shared_to_murderer_count') ?? 0) + 1;
        db.murder.set('shared_to_murderer_count', next);
        if (next >= MURDERER_SHARE_WIN_COUNT && !db.murder.get('winner')) {
            db.murder.set('winner', 'murderer-share');
        }
    }

    const locationId = shareLocationId(callerState.shares_used, caller.player);
    db.murder.set('share_checks_sent', (db.murder.get('share_checks_sent') ?? 0) + 1);
    return { locationId, important };
}

// ---------------------------------------------------------------------------
// /conclude support
// ---------------------------------------------------------------------------

function concludeProgress(received) {
    // Investigation items are 54 (6 templates * 9 players). Share items 18.
    // We track two gates: (a) overall % of items received, and (b) whether
    // every important-flagged hint has been received (so the case is solvable).
    let count = 0;
    const receivedInvestigations = new Set();
    for (const item of received) {
        const name = item?.name;
        if (!name) continue;
        const m = name.match(/^(.+?) - (.+)$/);
        if (!m) continue;
        const [, prefix, person] = m;
        if (HINT_TEMPLATES.includes(prefix) || prefix === 'Progressive Share') count++;
        if (HINT_TEMPLATES.includes(prefix)) receivedInvestigations.add(`${person}::${prefix}`);
    }
    const total = 54 + 18;

    const flags = db.murder.get('important_flags') ?? {};
    const importantKeys = Object.keys(flags).filter(k => flags[k]);
    const importantReceived = importantKeys.filter(k => receivedInvestigations.has(k)).length;
    const importantTotal = importantKeys.length;

    return {
        received: count,
        total,
        pct: count / total,
        importantReceived,
        importantTotal,
        importantComplete: importantTotal > 0 && importantReceived === importantTotal,
    };
}

function concludeAvailable(received) {
    const p = concludeProgress(received);
    return p.pct >= CONCLUDE_THRESHOLD_PCT && p.importantComplete;
}

function submitConclusion({ location, weapon, murderer }) {
    const solution = getSolution();
    const correct = solution.location === location
                 && solution.weapon === weapon
                 && solution.murderer === murderer;

    if (correct) {
        if (!db.murder.get('winner')) db.murder.set('winner', 'detectives');
        return { correct: true, winner: 'detectives', solution };
    }

    const wrong = (db.murder.get('wrong_conclusions') ?? 0) + 1;
    db.murder.set('wrong_conclusions', wrong);

    if (wrong > MAX_WRONG_CONCLUSIONS && !db.murder.get('winner')) {
        db.murder.set('winner', 'murderer-wrong');
        return { correct: false, winner: 'murderer-wrong', wrong, solution };
    }
    return { correct: false, wrong, remaining: MAX_WRONG_CONCLUSIONS - wrong + 1, solution: null };
}

module.exports = {
    // tunables
    CONCLUDE_THRESHOLD_PCT,
    MAX_WRONG_CONCLUSIONS,
    MURDERER_SHARE_WIN_COUNT,

    // game lifecycle
    isGameActive,
    startGame,
    getSolution,
    getWinner,
    getWrongConclusions,
    getSharedToMurdererCount,

    // user mapping
    resolveDiscordUser,
    getPlayerState,

    // AP
    readReceivedItems,
    sendChecks,

    // hints
    getHintText,
    isImportant,
    validateHints,
    reloadHints,

    // boards
    summarizeReceived,
    buildClueBoard,

    // mutators
    markInvestigated,
    recordShare,

    // conclusion
    concludeProgress,
    concludeAvailable,
    submitConclusion,
};
