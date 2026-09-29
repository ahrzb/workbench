// Run with `npm test`. Every test works in its own folder under the OS temp folder, pointed at with
// WORKBENCH_DATA_DIR, so the real %LOCALAPPDATA%\WorkbenchTools is never touched.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createDataSafety, PROBLEM_FILE, VERSION_FILE } from '../src/data-safety.ts';

let hasSqlite = true;
try {
  await import('node:sqlite');
} catch {
  hasSqlite = false;
}

/** A fresh sandbox: <tmp>/wb-ds-xxxx/{data,backups}. Returns helpers bound to it. */
async function sandbox(options = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'wb-ds-'));
  const data = path.join(root, 'data');
  const saved = process.env.WORKBENCH_DATA_DIR;
  process.env.WORKBENCH_DATA_DIR = data;
  const safety = createDataSafety({ dataDir: () => process.env.WORKBENCH_DATA_DIR, ...options });
  return {
    root,
    data,
    safety,
    async put(rel, text, base = data) {
      await mkdir(path.dirname(path.join(base, rel)), { recursive: true });
      await writeFile(path.join(base, rel), text);
    },
    async setVersion(v) {
      await mkdir(data, { recursive: true });
      await writeFile(path.join(data, VERSION_FILE), JSON.stringify({ dataVersion: v }));
    },
    async version(dir = data) {
      return JSON.parse(await readFile(path.join(dir, VERSION_FILE), 'utf8')).dataVersion;
    },
    async cleanup() {
      if (saved === undefined) delete process.env.WORKBENCH_DATA_DIR;
      else process.env.WORKBENCH_DATA_DIR = saved;
      await rm(root, { recursive: true, force: true });
    },
  };
}

/** Every file under `dir` as { relative path: text }, to compare "exactly as before". */
async function snapshot(dir) {
  const out = {};
  for (const entry of await readdir(dir, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile()) continue;
    const full = path.join(entry.parentPath, entry.name);
    out[path.relative(dir, full)] = await readFile(full, 'utf8');
  }
  return out;
}

/** A clock that starts at `start` (local time) and moves by `stepMinutes` on each call. */
function clock(start, stepMinutes) {
  let t = new Date(start).getTime();
  return () => {
    const d = new Date(t);
    t += stepMinutes * 60_000;
    return d;
  };
}

test('backupsDir is the folder called backups beside the data folder', async () => {
  const sb = await sandbox();
  try {
    assert.equal(sb.safety.backupsDir(), path.join(sb.root, 'backups'));
  } finally {
    await sb.cleanup();
  }
});

test('fresh start: a missing or empty data folder is created at the current version, with no backup', async () => {
  const sb = await sandbox();
  try {
    const first = await sb.safety.openData({ currentVersion: 3, migrations: {} });
    assert.deepEqual(first, { ok: true, status: 'fresh', version: 3, fromVersion: null, backup: null });
    assert.equal(await sb.version(), 3);
    assert.deepEqual(await sb.safety.listBackups(), []);

    // an empty folder that already exists counts as fresh too
    await rm(sb.data, { recursive: true });
    await mkdir(sb.data);
    assert.equal((await sb.safety.openData({ currentVersion: 2, migrations: {} })).status, 'fresh');
    assert.equal(await sb.version(), 2);
  } finally {
    await sb.cleanup();
  }
});

test('same version: nothing changes and nothing is backed up', async () => {
  const sb = await sandbox();
  try {
    await sb.setVersion(2);
    await sb.put('bills.txt', 'a');
    const before = await snapshot(sb.data);
    const result = await sb.safety.openData({ currentVersion: 2, migrations: {} });
    assert.equal(result.status, 'current');
    assert.deepEqual(await snapshot(sb.data), before);
    assert.deepEqual(await sb.safety.listBackups(), []);
  } finally {
    await sb.cleanup();
  }
});

test('upgrade: backs up first as before-upgrade-v<old>, runs each migration in order, writes the new version', async () => {
  const sb = await sandbox();
  try {
    await sb.setVersion(1);
    await sb.put('bills.txt', 'v1 data');
    const order = [];
    const migrations = {
      1: async (dir) => {
        order.push(1);
        assert.notEqual(path.resolve(dir), path.resolve(sb.data), 'migrations work on a private copy');
        await writeFile(path.join(dir, 'bills.txt'), `${await readFile(path.join(dir, 'bills.txt'), 'utf8')} -> v2`);
      },
      2: async (dir) => {
        order.push(2);
        await writeFile(path.join(dir, 'extra.txt'), 'new in v3');
      },
    };
    const result = await sb.safety.openData({ currentVersion: 3, migrations });
    assert.equal(result.ok, true);
    assert.equal(result.status, 'upgraded');
    assert.equal(result.fromVersion, 1);
    assert.deepEqual(order, [1, 2]);
    assert.deepEqual(await snapshot(sb.data), {
      'bills.txt': 'v1 data -> v2',
      'extra.txt': 'new in v3',
      [VERSION_FILE]: `${JSON.stringify({ dataVersion: 3 })}\n`,
    });

    const [backup] = await sb.safety.listBackups();
    assert.match(backup.name, /^\d{4}-\d{2}-\d{2}-\d{4}-before-upgrade-v1$/);
    assert.equal(result.backup, path.join(sb.safety.backupsDir(), backup.name));
    assert.equal(await readFile(path.join(result.backup, 'bills.txt'), 'utf8'), 'v1 data');
    assert.equal(await sb.version(result.backup), 1);
    // no scratch folders left beside data
    assert.deepEqual((await readdir(sb.root)).sort(), ['backups', 'data']);
  } finally {
    await sb.cleanup();
  }
});

test('failing migration: the data is exactly as before, the backup is there, the user gets a plain message', async () => {
  const sb = await sandbox();
  try {
    await sb.setVersion(1);
    await sb.put('bills.txt', 'precious');
    await sb.put('sub/notes.txt', 'more');
    const before = await snapshot(sb.data);
    const migrations = {
      1: async (dir) => {
        await writeFile(path.join(dir, 'bills.txt'), 'half converted');
        await rm(path.join(dir, 'sub'), { recursive: true });
      },
      2: () => {
        throw new Error('column missing');
      },
    };
    const result = await sb.safety.openData({ currentVersion: 3, migrations });
    assert.equal(result.ok, false);
    assert.equal(result.status, 'upgrade-failed');
    assert.match(result.message, /Nothing was changed/);
    assert.match(result.message, /column missing/);

    assert.deepEqual(await snapshot(sb.data), before);
    const backups = await sb.safety.listBackups();
    assert.equal(backups.length, 1);
    assert.equal(backups[0].label, 'before-upgrade-v1');
    assert.deepEqual(await snapshot(path.join(sb.safety.backupsDir(), backups[0].name)), before);
    assert.deepEqual((await readdir(sb.root)).sort(), ['backups', 'data', PROBLEM_FILE]);
    assert.match(await readFile(path.join(sb.root, PROBLEM_FILE), 'utf8'), /could not be updated/);

    // once the migration is fixed, the next start upgrades and clears the problem note
    const fixed = await sb.safety.openData({ currentVersion: 3, migrations: { 1: () => {}, 2: () => {} } });
    assert.equal(fixed.status, 'upgraded');
    assert.equal(await sb.version(), 3);
    assert.equal((await readdir(sb.root)).includes(PROBLEM_FILE), false);
  } finally {
    await sb.cleanup();
  }
});

test('a missing migration step refuses before touching or backing up anything', async () => {
  const sb = await sandbox();
  try {
    await sb.setVersion(1);
    await sb.put('a.txt', 'a');
    const before = await snapshot(sb.data);
    const result = await sb.safety.openData({ currentVersion: 3, migrations: { 2: () => {} } });
    assert.equal(result.ok, false);
    assert.equal(result.status, 'upgrade-failed');
    assert.deepEqual(await snapshot(sb.data), before);
    assert.deepEqual(await sb.safety.listBackups(), []);
  } finally {
    await sb.cleanup();
  }
});

test('newer data (an older tool after "go back") is refused and left completely alone', async () => {
  const sb = await sandbox();
  try {
    await sb.setVersion(5);
    await sb.put('bills.txt', 'written by a newer tool');
    const before = await snapshot(sb.data);
    let migrationRan = false;
    const result = await sb.safety.openData({ currentVersion: 2, migrations: { 1: () => (migrationRan = true) } });
    assert.equal(result.ok, false);
    assert.equal(result.status, 'newer-data');
    assert.match(result.message, /older version/);
    assert.match(result.message, /nothing was changed/);
    assert.equal(migrationRan, false);
    assert.deepEqual(await snapshot(sb.data), before);
    assert.deepEqual(await sb.safety.listBackups(), []);
    assert.match(await readFile(path.join(sb.root, PROBLEM_FILE), 'utf8'), /older version/);
  } finally {
    await sb.cleanup();
  }
});

test('data with no version file counts as version 1; an unreadable version file is refused', async () => {
  const sb = await sandbox();
  try {
    await sb.put('old.txt', 'from before versions existed');
    assert.equal((await sb.safety.openData({ currentVersion: 1, migrations: {} })).status, 'current');
    await rm(path.join(sb.data, VERSION_FILE));
    const upgraded = await sb.safety.openData({ currentVersion: 2, migrations: { 1: () => {} } });
    assert.equal(upgraded.status, 'upgraded');
    assert.equal(upgraded.fromVersion, 1);

    await writeFile(path.join(sb.data, VERSION_FILE), '{"dataVersion": "two"}');
    const before = await snapshot(sb.data);
    const result = await sb.safety.openData({ currentVersion: 2, migrations: {} });
    assert.equal(result.ok, false);
    assert.equal(result.status, 'unreadable');
    assert.deepEqual(await snapshot(sb.data), before);
  } finally {
    await sb.cleanup();
  }
});

test('backupNow copies everything, lists newest first with size and file count, and skips empty data', async () => {
  const sb = await sandbox({ now: clock('2026-03-05T09:00:00', 1) });
  try {
    assert.equal(await sb.safety.backupNow(), null, 'no data yet, nothing to back up');
    await sb.setVersion(1);
    await sb.put('a.txt', '12345');
    await sb.put('deep/b.txt', '1234567890');
    const first = await sb.safety.backupNow();
    assert.equal(path.basename(first), '2026-03-05-0900');
    await sb.put('c.txt', 'x');
    const second = await sb.safety.backupNow('Before: newest bills first!');
    assert.equal(path.basename(second), '2026-03-05-0901-before-newest-bills-first');

    const list = await sb.safety.listBackups();
    assert.deepEqual(
      list.map((b) => [b.name, b.stamp, b.label, b.automatic, b.files]),
      [
        ['2026-03-05-0901-before-newest-bills-first', '2026-03-05 09:01', 'before-newest-bills-first', false, 4],
        ['2026-03-05-0900', '2026-03-05 09:00', null, true, 3],
      ],
    );
    assert.equal(list[1].bytes, 5 + 10 + (await stat(path.join(sb.data, VERSION_FILE))).size);
    assert.equal(await readFile(path.join(first, 'deep', 'b.txt'), 'utf8'), '1234567890');
    // no half-made copy left behind
    assert.equal((await readdir(sb.safety.backupsDir())).some((n) => n.startsWith('.tmp-')), false);
  } finally {
    await sb.cleanup();
  }
});

test('two backups in the same minute get different folders and neither is lost', async () => {
  const sb = await sandbox({ now: () => new Date('2026-03-05T09:00:30') });
  try {
    await sb.setVersion(1);
    await sb.put('a.txt', 'one');
    const a = await sb.safety.backupNow();
    await sb.put('a.txt', 'two');
    const b = await sb.safety.backupNow();
    await sb.put('a.txt', 'three');
    const c = await sb.safety.backupNow();
    const l1 = await sb.safety.backupNow('same-label');
    const l2 = await sb.safety.backupNow('same-label');
    assert.deepEqual(
      [a, b, c, l1, l2].map((p) => path.basename(p)),
      ['2026-03-05-0900', '2026-03-05-0900.2', '2026-03-05-0900.3', '2026-03-05-0900-same-label', '2026-03-05-0900-same-label.2'],
    );
    assert.deepEqual(await Promise.all([a, b, c].map((p) => readFile(path.join(p, 'a.txt'), 'utf8'))), ['one', 'two', 'three']);
    // newest first within the minute: .3 before .2 before the plain one
    const auto = (await sb.safety.listBackups()).filter((x) => x.automatic).map((x) => x.name);
    assert.deepEqual(auto, ['2026-03-05-0900.3', '2026-03-05-0900.2', '2026-03-05-0900']);
  } finally {
    await sb.cleanup();
  }
});

test('retention keeps the newest N automatic backups and never deletes a labelled one', async () => {
  const sb = await sandbox({ keepAutomatic: 2, now: clock('2026-03-05T09:00:00', 1) });
  try {
    await sb.setVersion(1);
    await sb.put('a.txt', 'a');
    await sb.safety.backupNow('before-upgrade-v1'); // 09:00
    for (let i = 0; i < 4; i++) await sb.safety.backupNow(); // 09:01 .. 09:04
    await sb.safety.backupNow('before-restore'); // 09:05
    await sb.safety.backupNow(); // 09:06
    await sb.safety.backupNow(); // 09:07
    const names = (await sb.safety.listBackups()).map((b) => b.name);
    assert.deepEqual(names, [
      '2026-03-05-0907',
      '2026-03-05-0906',
      '2026-03-05-0905-before-restore',
      '2026-03-05-0900-before-upgrade-v1',
    ]);
  } finally {
    await sb.cleanup();
  }
});

test('restore first sets the current data aside as before-restore, then brings the backup back', async () => {
  const sb = await sandbox({ now: clock('2026-03-05T09:00:00', 1) });
  try {
    await sb.setVersion(1);
    await sb.put('bills.txt', 'monday');
    await sb.put('gone-later.txt', 'x');
    const backup = await sb.safety.backupNow();
    await rm(path.join(sb.data, 'gone-later.txt'));
    await sb.put('bills.txt', 'tuesday, entered after the backup');
    await sb.put('new.txt', 'added after the backup');
    const current = await snapshot(sb.data);

    const result = await sb.safety.restoreBackup(path.basename(backup));
    assert.equal(result.ok, true);
    assert.deepEqual(await snapshot(sb.data), await snapshot(backup));
    assert.equal(await readFile(path.join(sb.data, 'bills.txt'), 'utf8'), 'monday');

    assert.match(path.basename(result.setAside), /-before-restore$/);
    assert.deepEqual(await snapshot(result.setAside), current, 'what was there before the restore is fully kept');
    assert.deepEqual((await readdir(sb.root)).sort(), ['backups', 'data']);

    // and the restore itself can be undone
    const undo = await sb.safety.restoreBackup(path.basename(result.setAside));
    assert.equal(undo.ok, true);
    assert.deepEqual(await snapshot(sb.data), current);
  } finally {
    await sb.cleanup();
  }
});

test('restore refuses unknown names, path tricks, and backups from a newer version, changing nothing', async () => {
  const sb = await sandbox({ now: clock('2026-03-05T09:00:00', 1) });
  try {
    await sb.setVersion(3);
    await sb.put('a.txt', 'a');
    const newer = await sb.safety.backupNow();
    await sb.setVersion(1);
    const before = await snapshot(sb.data);
    const backupCount = (await sb.safety.listBackups()).length;

    for (const name of ['nope', '..', '../data', '2026-01-01-0000', 'C:\\Windows', '']) {
      const r = await sb.safety.restoreBackup(name);
      assert.equal(r.ok, false, name);
    }
    const tooNew = await sb.safety.restoreBackup(path.basename(newer), { maxVersion: 2 });
    assert.equal(tooNew.ok, false);
    assert.match(tooNew.message, /newer version/);
    assert.deepEqual(await snapshot(sb.data), before);
    assert.equal((await sb.safety.listBackups()).length, backupCount, 'a refused restore makes no copy either');
  } finally {
    await sb.cleanup();
  }
});

test('backupIfDue makes an automatic backup only when the newest one is old enough', async () => {
  let now = new Date('2026-03-05T09:00:00');
  const sb = await sandbox({ now: () => now });
  try {
    await sb.setVersion(1);
    await sb.put('a.txt', 'a');
    assert.ok(await sb.safety.backupIfDue(20), 'first one is due');
    now = new Date('2026-03-05T20:00:00');
    assert.equal(await sb.safety.backupIfDue(20), null, '11 hours later: not due');
    now = new Date('2026-03-06T05:30:00');
    assert.ok(await sb.safety.backupIfDue(20), '20.5 hours later: due');
    await sb.safety.backupNow('before-restore');
    now = new Date('2026-03-06T06:00:00');
    assert.equal(await sb.safety.backupIfDue(20), null, 'a labelled backup does not count, but the newest automatic one is 30 minutes old');
  } finally {
    await sb.cleanup();
  }
});

test('listBackups ignores folders it did not make', async () => {
  const sb = await sandbox({ now: () => new Date('2026-03-05T09:00:00') });
  try {
    await sb.setVersion(1);
    await sb.safety.backupNow();
    await mkdir(path.join(sb.safety.backupsDir(), 'my own folder'));
    await mkdir(path.join(sb.safety.backupsDir(), '.tmp-2026-03-05-0900-abc'));
    await writeFile(path.join(sb.safety.backupsDir(), '2026-03-05-0800'), 'a file, not a folder');
    assert.deepEqual((await sb.safety.listBackups()).map((b) => b.name), ['2026-03-05-0900']);
  } finally {
    await sb.cleanup();
  }
});

test('a crash between "data set aside" and "new data in place" is undone on the next start', async () => {
  const sb = await sandbox();
  try {
    await sb.setVersion(1);
    await sb.put('bills.txt', 'safe');
    const before = await snapshot(sb.data);
    // what swapIn leaves if the process died after the first rename
    const { rename } = await import('node:fs/promises');
    await rename(sb.data, path.join(sb.root, '.data.old-deadbeef'));
    await mkdir(path.join(sb.root, '.data.staging-cafe0000'));
    await sb.put('half.txt', 'half copied', path.join(sb.root, '.data.staging-cafe0000'));
    const result = await sb.safety.openData({ currentVersion: 1, migrations: {} });
    assert.equal(result.status, 'current');
    assert.deepEqual(await snapshot(sb.data), before);
    assert.deepEqual((await readdir(sb.root)).sort(), ['data']);
  } finally {
    await sb.cleanup();
  }
});

test('an invalid currentVersion is a programming error, not a data problem', async () => {
  const sb = await sandbox();
  try {
    await assert.rejects(sb.safety.openData({ currentVersion: 0, migrations: {} }), /whole number/);
    await assert.rejects(sb.safety.openData({ currentVersion: 1.5, migrations: {} }), /whole number/);
  } finally {
    await sb.cleanup();
  }
});

test('SQLite: a backup taken while the database is open holds every committed row', { skip: !hasSqlite }, async () => {
  const { DatabaseSync } = await import('node:sqlite');
  const sb = await sandbox();
  let db;
  try {
    await sb.setVersion(1);
    db = new DatabaseSync(path.join(sb.data, 'tool.db'));
    db.exec('PRAGMA journal_mode = WAL; PRAGMA user_version = 7; CREATE TABLE bills (id INTEGER PRIMARY KEY, name TEXT);');
    const insert = db.prepare('INSERT INTO bills (name) VALUES (?)');
    for (let i = 0; i < 50; i++) insert.run(`bill ${i}`); // still in the -wal file, not in tool.db
    assert.ok((await stat(path.join(sb.data, 'tool.db-wal'))).size > 0);

    const backup = await sb.safety.backupNow('while-open');
    assert.deepEqual((await readdir(backup)).sort(), ['tool.db', VERSION_FILE], 'one self-contained database file, no -wal/-shm');
    const copy = new DatabaseSync(path.join(backup, 'tool.db'), { readOnly: true });
    assert.equal(copy.prepare('SELECT count(*) AS n FROM bills').get().n, 50);
    assert.equal(copy.prepare('PRAGMA user_version').get().user_version, 7);
    assert.equal(copy.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    copy.close();

    // restore it (database closed first, as main.ts's closeData does), then open it again
    insert.run('bill after the backup');
    db.close();
    db = undefined;
    const restored = await sb.safety.restoreBackup(path.basename(backup));
    assert.equal(restored.ok, true);
    db = new DatabaseSync(path.join(sb.data, 'tool.db'));
    assert.equal(db.prepare('SELECT count(*) AS n FROM bills').get().n, 50);
    // the before-restore copy has the row the restore removed
    const kept = new DatabaseSync(path.join(restored.setAside, 'tool.db'), { readOnly: true });
    assert.equal(kept.prepare('SELECT count(*) AS n FROM bills').get().n, 51);
    kept.close();
  } finally {
    db?.close();
    await sb.cleanup();
  }
});

test('SQLite: migrations can open the database in the private copy; a failure leaves the real database untouched', { skip: !hasSqlite }, async () => {
  const { DatabaseSync } = await import('node:sqlite');
  const sb = await sandbox();
  try {
    await sb.setVersion(1);
    const setup = new DatabaseSync(path.join(sb.data, 'tool.db'));
    setup.exec("CREATE TABLE bills (name TEXT); INSERT INTO bills VALUES ('a'), ('b');");
    setup.close();

    const bad = await sb.safety.openData({
      currentVersion: 2,
      migrations: {
        1: (dir) => {
          const db = new DatabaseSync(path.join(dir, 'tool.db'));
          db.exec('ALTER TABLE bills ADD COLUMN paid INTEGER DEFAULT 0');
          db.close();
          throw new Error('stopped half way');
        },
      },
    });
    assert.equal(bad.ok, false);
    const check = new DatabaseSync(path.join(sb.data, 'tool.db'), { readOnly: true });
    assert.deepEqual(check.prepare('PRAGMA table_info(bills)').all().map((c) => c.name), ['name']);
    check.close();

    const good = await sb.safety.openData({
      currentVersion: 2,
      migrations: {
        1: (dir) => {
          const db = new DatabaseSync(path.join(dir, 'tool.db'));
          db.exec('ALTER TABLE bills ADD COLUMN paid INTEGER DEFAULT 0');
          db.close();
        },
      },
    });
    assert.equal(good.status, 'upgraded');
    const after = new DatabaseSync(path.join(sb.data, 'tool.db'), { readOnly: true });
    assert.deepEqual(after.prepare('SELECT name, paid FROM bills ORDER BY name').all().map((r) => [r.name, r.paid]), [['a', 0], ['b', 0]]);
    after.close();
  } finally {
    await sb.cleanup();
  }
});

test('SQLite: a damaged database file is still copied as it is', { skip: !hasSqlite }, async () => {
  const sb = await sandbox();
  try {
    await sb.setVersion(1);
    const damaged = Buffer.concat([Buffer.from('SQLite format 3\0', 'latin1'), Buffer.alloc(200, 7)]);
    await writeFile(path.join(sb.data, 'tool.db'), damaged);
    const backup = await sb.safety.backupNow('before-restore');
    assert.deepEqual(await readFile(path.join(backup, 'tool.db')), damaged);
  } finally {
    await sb.cleanup();
  }
});
