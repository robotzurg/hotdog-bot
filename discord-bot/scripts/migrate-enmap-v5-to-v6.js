// One-time migration for the enmap v5 -> v6 upgrade. v6 changed its on-disk
// serialization format, so existing data written by v5 can't be read by v6's
// deserializer directly (it throws EnmapParseError). v5 stored every value as
// plain JSON.stringify(), so this reads the old rows with node:sqlite
// (bypassing enmap's own deserializer) and rewrites them through the v6 API,
// which re-serializes them in the new format.
//
// Run once, after `npm install` has updated enmap to v6, before starting the bot:
//   node scripts/migrate-enmap-v5-to-v6.js
//
// Safe to interrupt/retry: it backs up data/enmap.sqlite once and refuses to
// run again if that backup already exists, so it won't re-migrate already-v6 data.

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const dataDir = path.join(__dirname, '..', 'data');
const liveDbPath = path.join(dataDir, 'enmap.sqlite');
const backupDbPath = path.join(dataDir, 'enmap.sqlite.pre-v6-backup');

if (!fs.existsSync(liveDbPath)) {
    console.log(`No database found at ${liveDbPath}; nothing to migrate.`);
    process.exit(0);
}

if (fs.existsSync(backupDbPath)) {
    console.error(
        `${backupDbPath} already exists, which means this migration already ran.\n` +
        'Refusing to run again, since the live database is presumably already in v6 format ' +
        'and re-reading it as if it were v5 would corrupt it.\n' +
        'If you really need to re-run this, delete the backup file first.'
    );
    process.exit(1);
}

fs.copyFileSync(liveDbPath, backupDbPath);
console.log(`Backed up ${liveDbPath} -> ${backupDbPath}`);

const oldDb = new DatabaseSync(backupDbPath, { readOnly: true });
const db = require('../db.js'); // v6 Enmap instances, pointed at the live file

const tableToEnmap = { potd: db.potd, archipelago: db.archipelago, murder: db.murder };

let totalMigrated = 0;
let mismatches = 0;
for (const [table, enmap] of Object.entries(tableToEnmap)) {
    const rows = oldDb.prepare(`SELECT key, value FROM ${table}`).all();
    for (const row of rows) {
        const value = JSON.parse(row.value);
        enmap.delete(row.key); // clears the old-format row without deserializing it
        enmap.set(row.key, value);
        totalMigrated++;

        if (JSON.stringify(enmap.get(row.key)) !== JSON.stringify(value)) {
            mismatches++;
            console.error(`MISMATCH after migrating ${table}.${row.key}`);
        }
    }
    console.log(`Migrated ${rows.length} keys into ${table}`);
}

oldDb.close();

if (mismatches > 0) {
    console.error(`Done with ${mismatches} mismatch(es) out of ${totalMigrated} keys. Investigate before trusting this data.`);
    process.exit(1);
}

console.log(`Done. Migrated ${totalMigrated} keys total, verified with 0 mismatches.`);
console.log(`Keeping ${backupDbPath} as a safety net — delete it once you've confirmed the bot works correctly.`);
