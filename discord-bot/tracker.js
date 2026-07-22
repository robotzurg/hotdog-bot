const { spawn } = require('child_process');
const readline = require('readline');
const path = require('path');
const { SLOT_EMOTES } = require('./slots.js');

const AP_ROOT = path.join(__dirname, '../Archipelago-0.6.6');
const WORKER_SCRIPT = path.join(AP_ROOT, 'tracker_worker.py');
const PYTHON_PATH = process.platform === 'win32'
    ? path.join(AP_ROOT, 'venv/Scripts/python.exe')
    : path.join(AP_ROOT, 'venv/bin/python3');

// Generous: requests are served serially by the worker, so a late request in a
// /check-logic-all batch waits behind the ones ahead of it.
const REQUEST_TIMEOUT_MS = 300000;

const hintRegex = /\((?:.+ for (.+)|Hinted Item for (.+)|Hinted)\)$/;

const trackerCache = new Map(); // slotName -> Promise<result>

let worker = null;
let nextRequestId = 1;
const pending = new Map(); // id -> { resolve, reject, timer }

function invalidateSlotCache(slotName) {
    trackerCache.delete(slotName);
}

function workerEnv() {
    const e = { ...process.env };
    delete e.DISPLAY;
    e.SDL_AUDIODRIVER = 'dummy';
    e.SDL_VIDEODRIVER = 'dummy';
    e.QT_QPA_PLATFORM = 'offscreen';
    e.MPLBACKEND = 'Agg';
    e.KIVY_WINDOW = 'mock'; // 'headless' is not a real Kivy provider; 'mock' is
    e.KIVY_NO_ENV_CONFIG = '1';
    return e;
}

// Worlds print freely during generation and it all lands on stderr. Keep the
// journal readable by default; set TRACKER_DEBUG=1 to see everything.
const DEBUG_WORKER = process.env.TRACKER_DEBUG === '1';
const interestingStderr = /ERROR|CRITICAL|Traceback|Error:|Exception/;

function logWorkerStderr(chunk) {
    for (const line of chunk.toString('utf8').split(/\r?\n/)) {
        const s = line.trim();
        if (!s) continue;
        if (DEBUG_WORKER || interestingStderr.test(s)) console.error('[tracker worker]', s);
    }
}

function startWorker() {
    const proc = spawn(PYTHON_PATH, [WORKER_SCRIPT], {
        cwd: AP_ROOT,
        env: workerEnv(),
        stdio: ['pipe', 'pipe', 'pipe'],
    });

    readline.createInterface({ input: proc.stdout }).on('line', (line) => {
        let msg;
        try {
            msg = JSON.parse(line);
        } catch {
            console.error('[tracker] unparseable worker output:', line);
            return;
        }
        if (msg.ready) {
            console.log('[tracker] worker ready');
            return;
        }
        const entry = pending.get(msg.id);
        if (!entry) return;
        pending.delete(msg.id);
        clearTimeout(entry.timer);
        if (msg.error) entry.reject(new Error(msg.error));
        else entry.resolve(msg.items);
    });

    proc.stderr.on('data', logWorkerStderr);

    const teardown = (reason) => {
        if (worker === proc) worker = null;
        for (const [id, entry] of pending) {
            clearTimeout(entry.timer);
            entry.reject(new Error(reason));
            pending.delete(id);
        }
    };

    proc.on('close', (code) => teardown(`tracker worker exited (code ${code})`));
    proc.on('error', (err) => teardown(`tracker worker failed to start: ${err.message}`));

    return proc;
}

function ensureWorker() {
    if (!worker) worker = startWorker();
    return worker;
}

function requestItems(slotName, port) {
    return new Promise((resolve, reject) => {
        let proc;
        try {
            proc = ensureWorker();
        } catch (err) {
            reject(err);
            return;
        }

        const id = nextRequestId++;
        const timer = setTimeout(() => {
            pending.delete(id);
            reject(new Error(`tracker request for ${slotName} timed out`));
        }, REQUEST_TIMEOUT_MS);

        pending.set(id, { resolve, reject, timer });
        proc.stdin.write(`${JSON.stringify({ id, slot: slotName, port })}\n`);
    });
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
    // Cache the promise, not the result, so concurrent requests for the same
    // slot share one worker round-trip instead of queueing a duplicate.
    if (trackerCache.has(slotName)) return trackerCache.get(slotName);

    const promise = requestItems(slotName, port)
        .then(rawItems => ({ slotName, ...processItems([...new Set(rawItems)], finishedGames) }))
        .catch(err => {
            console.error(`[${slotName}] tracker error:`, err.message);
            trackerCache.delete(slotName); // don't cache a failure
            return { slotName, items: [], hintedCount: 0 };
        });

    trackerCache.set(slotName, promise);
    return promise;
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

// Pay the world-import cost at boot rather than on the first command.
ensureWorker();

module.exports = { runTrackerForSlot, fetchCheckCounts, invalidateSlotCache };
