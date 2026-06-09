const { spawn } = require('child_process');
const path = require('path');
const { SLOT_EMOTES } = require('./slots.js');

const noisePatterns = [
    /^Shop Upgrade total:/,
    /^Location id:/,
    /^Adding rule for/,
    /^Creating \d+/,
    /^Making /,
    /^Excluding /,
    /Pelly (Added|added)/,
    /^(Loaction|Location|Item) Count:/,
    /^(Total Filler|Filler needed):/,
    /^\[/,
    /^\d+$/,
    // Python traceback / asyncio noise
    /^Task exception was never retrieved/,
    /^future: </,
    /^Traceback \(/,
    /^File ".*\.py"/,
    /^assert /,
    /^\^+$/,
    /^AssertionError/,
    /^Exception/,
    /There is no item named 'archipelago\.json' in the archive/,
    /Invalid or missing manifest file for .+\.apworld/,
    /This apworld will stop working with Archipelago/,
    /This might be the incorrect world version for this file/,
    /^Archipelago \([\d.]+\) logging initialized/,
    /^Could not remove enough non-progression items/,
    /^Traps needed:/,
    /^TODO:/,
    /^Did not load .+\.apworld as its game .+ is already loaded/,
    /does not include a manifest file/,
    /^The plando items module is turned off/,
    /^Extra Items Needed:/,
    /^vanilla fork$/,
    / has more items than locations\. \d+ non-progression items will be removed at random/,
    /^SlotData version:/,
    /^Server APWorld Version:/,
    /^This APWorld Version:/,
    /^Getting UT slot data/,
    /^Running MRGR version/,
    /^UT compatibility mismatch detected/,
    /^P\d+ Weights:/,
    /^Generating for \d+ players?/,
    /^Hod Floor$/,
    /\(Team #\d+\) (?:tracking|viewing) .+ has joined/,
    /\(Team #\d+\) has stopped (?:tracking|viewing) the game/,
    /^Now that you are connected/,
    /you can use !help to list commands/,
    /you may have additional local commands/,
];

const hintRegex = /\((?:.+ for (.+)|Hinted Item for (.+)|Hinted)\)$/;

const trackerCache = new Map(); // slotName -> result

function invalidateSlotCache(slotName) {
    trackerCache.delete(slotName);
}

function processItems(rawItems, finishedGames = []) {
    const isFinishedHint = (v) => {
        const m = v.match(hintRegex);
        if (!m) return false;
        const player = m[1] ?? m[2];
        return player && finishedGames.includes(player);
    };
    const hintedCount = rawItems.filter(v => hintRegex.test(v) && !isFinishedHint(v)).length;
    const sorted = [...rawItems].sort((a, b) => {
        const aHinted = hintRegex.test(a) && !isFinishedHint(a);
        const bHinted = hintRegex.test(b) && !isFinishedHint(b);
        return bHinted - aHinted;
    });
    const items = sorted.map(v => {
        const hintMatch = v.match(hintRegex);
        if (!hintMatch) return `- ${v}`;
        if (isFinishedHint(v)) return `- ${v.replace(/\s*\([^)]*\)$/, '')}`;
        const player = hintMatch[1] ?? hintMatch[2];
        const emote = player ? (SLOT_EMOTES[player] ?? '') : '';
        const line = emote ? v.replace(/\)$/, ` ${emote})`) : v;
        return `- ${line}`;
    });
    return { items, hintedCount };
}

function runTrackerForSlot(slotName, port, finishedGames = []) {
    if (trackerCache.has(slotName)) {
        return Promise.resolve(trackerCache.get(slotName));
    }

    return new Promise((resolve) => {
        const launcherScript = path.join(__dirname, '../Archipelago-0.6.6/Launcher.py');
        const pythonPath = process.platform === 'win32'
            ? path.join(__dirname, '../Archipelago-0.6.6/venv/Scripts/python.exe')
            : path.join(__dirname, '../Archipelago-0.6.6/venv/bin/python3');

        const pythonProcess = spawn(pythonPath, [
            launcherScript,
            'Universal Tracker',
            '--',
            '--nogui',
            '--list',
            `archipelago://${slotName}:None@archipelago.gg:${port}`
        ], {
            env: (() => {
                const e = { ...process.env };
                delete e.DISPLAY;
                e.SDL_AUDIODRIVER = 'dummy';
                e.SDL_VIDEODRIVER = 'dummy';
                e.QT_QPA_PLATFORM = 'offscreen';
                e.MPLBACKEND = 'Agg';
                e.KIVY_WINDOW = 'headless';
                e.KIVY_NO_ENV_CONFIG = '1';
                return e;
            })()
        });

        const rawItems = [];

        pythonProcess.stdout.on('data', (data) => {
            const s = data instanceof Buffer ? data.toString('utf8') : String(data);
            if (s.toLowerCase().includes('press enter to install')) {
                pythonProcess.stdin.write('\n');
            }
            if (!s.includes('Archipelago (0.6.6)') && !s.includes('enter to exit') && !s.includes('found cached multiworld')) {
                const parts = s.split(/[\r\n]+/)
                    .map(p => p.trim())
                    .filter(p => p && !noisePatterns.some(re => re.test(p)));
                if (parts.length) rawItems.push(...parts);
            }
            if (s.toLowerCase().includes('enter to exit')) {
                try { pythonProcess.kill(); } catch (e) {}
            }
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(`[${slotName}] stderr:`, data.toString('utf8'));
        });

        pythonProcess.on('close', () => {
            const result = { slotName, ...processItems([...new Set(rawItems)], finishedGames) };
            trackerCache.set(slotName, result);
            resolve(result);
        });
        pythonProcess.on('error', (err) => {
            console.error(`[${slotName}] spawn error:`, err);
            resolve({ slotName, items: [], hintedCount: 0 });
        });
    });
}

async function fetchCheckCounts(slotName, port) {
    try {
        const { Client } = await import('archipelago.js');
        const client = new Client();
        await client.login(`wss://archipelago.gg:${port}`, slotName);
        const checked = client.room.checkedLocations.length;
        const total = client.room.allLocations.length;
        client.socket.disconnect();
        return { checked, total };
    } catch {
        return { checked: 0, total: 0 };
    }
}

module.exports = { runTrackerForSlot, fetchCheckCounts, invalidateSlotCache };
