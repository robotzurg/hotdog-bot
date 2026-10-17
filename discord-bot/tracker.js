/**
 * Universal Tracker bridge: drives a long-lived Python worker (Archipelago-0.6.6/tracker_worker.py)
 * that reports which locations are currently in logic for a slot.
 *
 * The player YAMLs are placed by hand in Archipelago-0.6.6/Players/; UT generates the multiworld
 * from them, so nothing can be tracked until they're there. The worker caches what it generated,
 * so restart the bot after changing them.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const readline = require('readline');
const path = require('path');
const { SLOT_EMOTES, UNTRACKED_SLOTS } = require('./slots.js');

const AP_ROOT = path.join(__dirname, '../Archipelago-0.6.6');
const WORKER_SCRIPT = path.join(AP_ROOT, 'tracker_worker.py');
const PLAYERS_DIR = path.join(AP_ROOT, 'Players');
const PYTHON_PATH = process.env.TRACKER_PYTHON || (process.platform === 'win32'
    ? path.join(AP_ROOT, 'venv/Scripts/python.exe')
    : path.join(AP_ROOT, 'venv/bin/python3'));

// The worker namespaces its caches by this, as it can serve several multiworlds; the bot only has one
const WORKER_KEY = 'main';

// Generous: requests are served serially by the worker, so a late request in a
// /check-logic-all batch waits behind the ones ahead of it.
const REQUEST_TIMEOUT_MS = 300000;

const hintRegex = /\((?:.+ for (.+)|Hinted Item for (.+)|Hinted)\)$/;

const trackerCache = new Map(); // slotName -> Promise<result>

let worker = null;
let nextRequestId = 1;
const pending = new Map(); // id -> { resolve, reject, timer }

function isAvailable() {
    return fs.existsSync(PYTHON_PATH) && fs.existsSync(WORKER_SCRIPT);
}

function listYamls() {
    if (!fs.existsSync(PLAYERS_DIR)) return [];
    return fs.readdirSync(PLAYERS_DIR).filter(f => /\.ya?ml$/i.test(f)).sort();
}

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
    e.PYTHONIOENCODING = 'utf-8';
    // ModuleUpdate otherwise prompts on stdin over any version drift, which a worker can't answer
    e.SKIP_REQUIREMENTS_UPDATE = 'true';
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

// Pays the world-import cost up front rather than on the first command
function warmUp() {
    if (!isAvailable()) {
        console.log(`[tracker] Universal Tracker unavailable (no Python at ${PYTHON_PATH}); /check-logic is disabled.`);
        return;
    }
    ensureWorker();
}

function stop() {
    if (worker) worker.kill();
    // The room may have moved on by the time the worker is needed again
    trackerCache.clear();
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
        proc.stdin.write(`${JSON.stringify({
            id,
            key: WORKER_KEY,
            slot: slotName,
            address: `multiworld.gg:${port}`,
            password: null,
            yaml_dir: PLAYERS_DIR,
        })}\n`);
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

// Resolves to { slotName, items, hintedCount, error, untracked }; `error` is set (and nothing cached) if the lookup failed,
// `untracked` is set for slots UT can't track, which never reach the worker
function runTrackerForSlot(slotName, port, finishedGames = []) {
    if (UNTRACKED_SLOTS.includes(slotName)) {
        return Promise.resolve({ slotName, items: [], hintedCount: 0, error: null, untracked: true });
    }

    // Cache the promise, not the result, so concurrent requests for the same
    // slot share one worker round-trip instead of queueing a duplicate.
    if (trackerCache.has(slotName)) return trackerCache.get(slotName);

    const promise = requestItems(slotName, port)
        .then(rawItems => ({ slotName, ...processItems([...new Set(rawItems)], finishedGames), error: null }))
        .catch(err => {
            console.error(`[${slotName}] tracker error:`, err.message);
            trackerCache.delete(slotName); // don't cache a failure
            return { slotName, items: [], hintedCount: 0, error: err.message };
        });

    trackerCache.set(slotName, promise);
    return promise;
}

module.exports = {
    isAvailable,
    warmUp,
    stop,
    listYamls,
    runTrackerForSlot,
    invalidateSlotCache,
};
