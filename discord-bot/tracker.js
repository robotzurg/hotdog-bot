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
];

const hintRegex = /\((?:.+ for (.+)|Hinted Item for (.+)|Hinted)\)$/;

function processItems(rawItems) {
    const hintedCount = rawItems.filter(v => hintRegex.test(v)).length;
    const sorted = [...rawItems].sort((a, b) => hintRegex.test(b) - hintRegex.test(a));
    const items = sorted.map(v => {
        const hintMatch = v.match(hintRegex);
        if (!hintMatch) return `- ${v}`;
        const player = hintMatch[1] ?? hintMatch[2];
        const emote = player ? (SLOT_EMOTES[player] ?? '') : '';
        const line = emote ? v.replace(/\)$/, ` ${emote})`) : v;
        return `- ${line}`;
    });
    return { items, hintedCount };
}

function runTrackerForSlot(slotName, port) {
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

        pythonProcess.on('close', () => resolve({ slotName, ...processItems(rawItems) }));
        pythonProcess.on('error', (err) => {
            console.error(`[${slotName}] spawn error:`, err);
            resolve({ slotName, items: [], hintedCount: 0 });
        });
    });
}

module.exports = { runTrackerForSlot };
