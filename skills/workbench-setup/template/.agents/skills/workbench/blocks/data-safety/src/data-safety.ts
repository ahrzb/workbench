// Data safety for the tool's own data folder: backups, a data version number with upgrades, and a
// restore that never overwrites current data without first setting it aside.
//
// Plain Node only (no Electron import) so it runs in `npm test`. main.ts passes in its dataDir().
// Layout, all beside each other:
//   %LOCALAPPDATA%\WorkbenchTools\<TOOL_ID>\data\      the tool's data (+ version.json, ours)
//   %LOCALAPPDATA%\WorkbenchTools\<TOOL_ID>\backups\   <yyyy-mm-dd-hhmm>[-label][.n]\
// Nothing here ever writes inside the project folder.
import { access, cp, mkdir, open, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import type { BackupInfo } from './shared.ts';

export const VERSION_FILE = 'version.json';
/** Written next to `data\` (never inside it) when the tool could not open its data; removed on a good start. */
export const PROBLEM_FILE = 'start-problem.txt';
const DEFAULT_KEEP_AUTOMATIC = 10;
const BACKUP_NAME = /^(\d{4}-\d{2}-\d{2}-\d{4})(?:-([a-z0-9][a-z0-9-]*))?(?:\.(\d+))?$/;
const SQLITE_MAGIC = 'SQLite format 3\0';

/** Turns data of version N into version N+1, working ONLY inside `dir` (a private copy of the data). */
export type Migration = (dir: string) => void | Promise<void>;

export interface DataSafetyOptions {
  /** main.ts's `dataDir` (called each time, so WORKBENCH_DATA_DIR is honoured). */
  dataDir: () => string;
  /** How many unlabelled (automatic) backups to keep. Labelled ones are never deleted. Default 10. */
  keepAutomatic?: number;
  /** Clock, for tests. */
  now?: () => Date;
}

export type OpenDataResult =
  | { ok: true; status: 'fresh' | 'current' | 'upgraded'; version: number; fromVersion: number | null; backup: string | null }
  | { ok: false; status: 'newer-data' | 'upgrade-failed' | 'unreadable'; message: string; backup?: string };

export type RestoreOutcome = { ok: true; setAside: string | null } | { ok: false; message: string };

const pad = (n: number, width = 2) => String(n).padStart(width, '0');
const exists = (p: string) => access(p).then(() => true, () => false);

function stampOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function cleanLabel(label: string): string {
  const s = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '');
  return s === '' ? 'backup' : s;
}

async function isEmptyDir(dir: string): Promise<boolean> {
  try {
    return (await readdir(dir)).length === 0;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return true;
    throw e;
  }
}

async function walkFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walkFiles(full)));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

async function looksLikeSqlite(file: string): Promise<boolean> {
  const handle = await open(file, 'r');
  try {
    const buf = Buffer.alloc(16);
    const { bytesRead } = await handle.read(buf, 0, 16, 0);
    return bytesRead === 16 && buf.toString('latin1') === SQLITE_MAGIC;
  } finally {
    await handle.close();
  }
}

/**
 * Copies a data folder. A SQLite file is copied with `VACUUM INTO`, which gives a complete, consistent
 * copy even while the tool has the database open (a plain file copy could catch it half-written, or miss
 * what is still in the -wal file). Its -wal / -shm / -journal files are then not copied. If SQLite can't
 * read a file (damaged), the raw files are copied as they are: a damaged copy is still worth keeping.
 */
export async function copyData(from: string, to: string): Promise<void> {
  await mkdir(to, { recursive: true });
  const snapshotted = new Set<string>(); // source paths replaced by a VACUUM INTO copy
  const skipped = new Set<string>(); // their -wal / -shm / -journal companions
  const dbs: string[] = [];
  for (const file of await walkFiles(from)) if (await looksLikeSqlite(file)) dbs.push(file);
  if (dbs.length > 0) {
    // Loaded only when a SQLite file exists, so a tool without a database never loads node:sqlite.
    const { DatabaseSync } = await import('node:sqlite');
    // Vite replaces a builtin it does not know with an empty stub (see README: vite.main.config.mts). Never fall back silently.
    if (typeof DatabaseSync !== 'function') throw new Error('node:sqlite is not available in this build, so the database cannot be copied safely');
    for (const file of dbs) {
      const target = path.join(to, path.relative(from, file));
      await mkdir(path.dirname(target), { recursive: true });
      try {
        const db = new DatabaseSync(file, { readOnly: true });
        try {
          db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
        } finally {
          db.close();
        }
        snapshotted.add(file);
        for (const suffix of ['-wal', '-shm', '-journal']) skipped.add(file + suffix);
      } catch {
        await rm(target, { force: true }); // half-made copy; the raw copy below replaces it
      }
    }
  }
  await cp(from, to, { recursive: true, filter: (src) => !snapshotted.has(src) && !skipped.has(src) });
}

export function createDataSafety(options: DataSafetyOptions): DataSafety {
  const now = options.now ?? (() => new Date());
  const keepAutomatic = options.keepAutomatic ?? DEFAULT_KEEP_AUTOMATIC;
  const root = () => path.dirname(path.resolve(options.dataDir()));

  /** `%LOCALAPPDATA%\WorkbenchTools\<TOOL_ID>\backups`: beside `data`, never inside the project. */
  function backupsDir(): string {
    return path.join(root(), 'backups');
  }

  // Temporary siblings of `data` are named after it so two data folders in one parent never mix.
  const scratchName = (kind: 'staging' | 'old') => `.${path.basename(path.resolve(options.dataDir()))}.${kind}-${randomBytes(4).toString('hex')}`;
  const scratchPrefix = (kind: 'staging' | 'old') => `.${path.basename(path.resolve(options.dataDir()))}.${kind}-`;

  async function readVersion(dir: string): Promise<number> {
    let text: string;
    try {
      text = await readFile(path.join(dir, VERSION_FILE), 'utf8');
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return 1; // data from before versions existed
      throw e;
    }
    const parsed: unknown = JSON.parse(text);
    const v = typeof parsed === 'object' && parsed !== null && 'dataVersion' in parsed ? parsed.dataVersion : undefined;
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 1) throw new Error('bad version number');
    return v;
  }

  async function writeVersion(dir: string, version: number): Promise<void> {
    const tmp = path.join(dir, `${VERSION_FILE}.tmp`);
    await writeFile(tmp, `${JSON.stringify({ dataVersion: version })}\n`, 'utf8');
    await rename(tmp, path.join(dir, VERSION_FILE));
  }

  /** Puts `staging` in place of `data`. Nothing is lost if it fails half way: data is renamed aside first and put back on error. */
  async function swapIn(staging: string): Promise<void> {
    const dir = path.resolve(options.dataDir());
    if (!(await exists(dir))) {
      await rename(staging, dir);
      return;
    }
    const aside = path.join(root(), scratchName('old'));
    await rename(dir, aside);
    try {
      await rename(staging, dir);
    } catch (e) {
      await rename(aside, dir);
      throw e;
    }
    await rm(aside, { recursive: true, force: true, maxRetries: 3 }).catch(() => {}); // a leftover is removed on the next start
  }

  /** Finishes or undoes what a crash left behind. Runs first in openData. */
  async function recoverInterrupted(): Promise<void> {
    const parent = root();
    let entries: string[];
    try {
      entries = await readdir(parent);
    } catch {
      return;
    }
    const old = entries.filter((n) => n.startsWith(scratchPrefix('old')));
    const dir = path.resolve(options.dataDir());
    if (!(await exists(dir)) && old.length > 0) {
      // Crashed between "data set aside" and "new data in place": put the newest one back.
      const dated = await Promise.all(old.map(async (n) => ({ n, t: (await stat(path.join(parent, n))).mtimeMs })));
      dated.sort((a, b) => b.t - a.t);
      await rename(path.join(parent, dated[0].n), dir);
      old.splice(old.indexOf(dated[0].n), 1);
    }
    for (const n of [...old, ...entries.filter((e) => e.startsWith(scratchPrefix('staging')))]) {
      await rm(path.join(parent, n), { recursive: true, force: true, maxRetries: 3 }).catch(() => {});
    }
    const tmpBackups = await readdir(backupsDir()).catch(() => [] as string[]);
    for (const n of tmpBackups.filter((e) => e.startsWith('.tmp-'))) {
      await rm(path.join(backupsDir(), n), { recursive: true, force: true, maxRetries: 3 }).catch(() => {});
    }
  }

  async function sizeAndFiles(dir: string): Promise<{ bytes: number; files: number }> {
    const files = await walkFiles(dir);
    let bytes = 0;
    for (const f of files) bytes += (await stat(f)).size;
    return { bytes, files: files.length };
  }

  /** Newest first. Only folders this block made (names like 2026-09-30-1412-before-restore). */
  async function listBackups(): Promise<BackupInfo[]> {
    let entries;
    try {
      entries = await readdir(backupsDir(), { withFileTypes: true });
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw e;
    }
    const rows: (BackupInfo & { sort: [string, number, number] })[] = [];
    for (const entry of entries) {
      const m = entry.isDirectory() ? BACKUP_NAME.exec(entry.name) : null;
      if (!m) continue;
      const full = path.join(backupsDir(), entry.name);
      const { bytes, files } = await sizeAndFiles(full);
      const stamp = m[1];
      rows.push({
        name: entry.name,
        stamp: `${stamp.slice(0, 10)} ${stamp.slice(11, 13)}:${stamp.slice(13)}`,
        label: m[2] ?? null,
        automatic: m[2] === undefined,
        bytes,
        files,
        sort: [stamp, Number(m[3] ?? 1), (await stat(full)).mtimeMs],
      });
    }
    rows.sort((a, b) => (a.sort[0] < b.sort[0] ? 1 : a.sort[0] > b.sort[0] ? -1 : b.sort[1] - a.sort[1] || b.sort[2] - a.sort[2]));
    return rows.map(({ sort: _sort, ...info }) => info);
  }

  async function prune(): Promise<void> {
    const automatic = (await listBackups()).filter((b) => b.automatic);
    for (const b of automatic.slice(keepAutomatic)) await rm(path.join(backupsDir(), b.name), { recursive: true, force: true, maxRetries: 3 });
  }

  /**
   * Copies the whole data folder to backups\<yyyy-mm-dd-hhmm>[-label]\ and returns that path, or null
   * when there is no data yet. Copies to a temporary name first and renames, so a half-made copy never
   * looks like a backup. Unlabelled backups are "automatic": only the newest `keepAutomatic` are kept.
   */
  async function backupNow(label?: string): Promise<string | null> {
    const dir = path.resolve(options.dataDir());
    if (await isEmptyDir(dir)) return null;
    const base = `${stampOf(now())}${label === undefined ? '' : `-${cleanLabel(label)}`}`;
    let name = base;
    for (let n = 2; await exists(path.join(backupsDir(), name)); n++) name = `${base}.${n}`;
    await mkdir(backupsDir(), { recursive: true });
    const tmp = path.join(backupsDir(), `.tmp-${name}-${randomBytes(3).toString('hex')}`);
    try {
      await copyData(dir, tmp);
      await rename(tmp, path.join(backupsDir(), name));
    } catch (e) {
      await rm(tmp, { recursive: true, force: true }).catch(() => {});
      throw e;
    }
    if (label === undefined) await prune();
    return path.join(backupsDir(), name);
  }

  /** An automatic backup unless the newest automatic one is younger than `hours`. Call after openData. */
  async function backupIfDue(hours = 20): Promise<string | null> {
    const newest = (await listBackups()).find((b) => b.automatic);
    if (newest) {
      const [date, time] = newest.stamp.split(' ');
      const [y, mo, d] = date.split('-').map(Number);
      const [h, mi] = time.split(':').map(Number);
      if (now().getTime() - new Date(y, mo - 1, d, h, mi).getTime() < hours * 3600 * 1000) return null;
    }
    return backupNow();
  }

  /**
   * Replaces the data with a backup. First sets the current data aside as backup "before-restore", so
   * nothing is ever overwritten. `maxVersion` = the data version this tool understands: a backup made by
   * a newer tool is refused. The tool's database handles must be closed first, and the tool restarted after.
   */
  async function restoreBackup(name: string, opts: { maxVersion?: number } = {}): Promise<RestoreOutcome> {
    if (typeof name !== 'string' || !BACKUP_NAME.test(name)) return { ok: false, message: 'That backup does not exist.' };
    const source = path.join(backupsDir(), name);
    if (!(await exists(source))) return { ok: false, message: 'That backup does not exist.' };
    let staging: string | null = null;
    try {
      const version = await readVersion(source).catch(() => {
        throw new Error('That backup has an unreadable version file, so it is not safe to use.');
      });
      if (opts.maxVersion !== undefined && version > opts.maxVersion) {
        return { ok: false, message: 'That backup was made by a newer version of this tool, which this version cannot open. Nothing was changed.' };
      }
      const setAside = await backupNow('before-restore');
      staging = path.join(root(), scratchName('staging'));
      await cp(source, staging, { recursive: true });
      await swapIn(staging);
      staging = null;
      return { ok: true, setAside };
    } catch (e) {
      if (staging) await rm(staging, { recursive: true, force: true }).catch(() => {});
      const why = e instanceof Error ? e.message : String(e);
      return { ok: false, message: `The data was not restored and is unchanged (${why}). Close anything else that may be using it and try again.` };
    }
  }

  /**
   * Call once at start, before any window and before the tool opens its own files.
   * - empty or missing data: fresh start at `currentVersion`
   * - same version: nothing to do
   * - older data: backup "before-upgrade-v<old>", run migrations[old] .. migrations[current-1] on a private
   *   COPY, then swap the copy in. If a migration fails, the real data was never touched.
   * - newer data (an older tool opened newer data, e.g. after "go back"): refuses, changes nothing.
   * migrations[n] turns version n data into version n+1 and must only touch the `dir` it is given.
   */
  async function openData(opts: { currentVersion: number; migrations: Record<number, Migration> }): Promise<OpenDataResult> {
    const { currentVersion, migrations } = opts;
    if (!Number.isInteger(currentVersion) || currentVersion < 1) throw new Error('currentVersion must be a whole number, 1 or more');
    const problemFile = path.join(root(), PROBLEM_FILE);
    const refuse = async (r: Extract<OpenDataResult, { ok: false }>): Promise<OpenDataResult> => {
      await mkdir(root(), { recursive: true }).catch(() => {});
      await writeFile(problemFile, `${r.message}\n`, 'utf8').catch(() => {});
      return r;
    };
    const good = async (r: Extract<OpenDataResult, { ok: true }>): Promise<OpenDataResult> => {
      await rm(problemFile, { force: true }).catch(() => {});
      return r;
    };

    await recoverInterrupted();
    const dir = path.resolve(options.dataDir());
    if (await isEmptyDir(dir)) {
      await mkdir(dir, { recursive: true });
      await writeVersion(dir, currentVersion);
      return good({ ok: true, status: 'fresh', version: currentVersion, fromVersion: null, backup: null });
    }

    let old: number;
    try {
      old = await readVersion(dir);
    } catch {
      return refuse({ ok: false, status: 'unreadable', message: 'The tool could not tell which version your data is, so it left it alone. Nothing was changed. Ask Codex to have a look.' });
    }
    if (old === currentVersion) {
      if (!(await exists(path.join(dir, VERSION_FILE)))) await writeVersion(dir, old); // data from before versions existed: record it
      return good({ ok: true, status: 'current', version: old, fromVersion: old, backup: null });
    }
    if (old > currentVersion) {
      return refuse({
        ok: false,
        status: 'newer-data',
        message: `This is an older version of the tool than the one that last used your data (your data is version ${old}, this tool understands up to version ${currentVersion}). To keep your data safe it was not opened and nothing was changed. Ask Codex to bring the newer version back, or to carry your data back to this one.`,
      });
    }

    const missing: number[] = [];
    for (let v = old; v < currentVersion; v++) if (typeof migrations[v] !== 'function') missing.push(v);
    if (missing.length > 0) {
      return refuse({
        ok: false,
        status: 'upgrade-failed',
        message: `This version of the tool does not know how to update data from version ${missing[0]}. Nothing was changed. Ask Codex to fix this.`,
      });
    }

    const backup = await backupNow(`before-upgrade-v${old}`);
    let staging: string | null = null;
    try {
      staging = path.join(root(), scratchName('staging'));
      await cp(dir, staging, { recursive: true });
      for (let v = old; v < currentVersion; v++) {
        await migrations[v](staging);
        await writeVersion(staging, v + 1);
      }
      await swapIn(staging);
      staging = null;
    } catch (e) {
      if (staging) await rm(staging, { recursive: true, force: true, maxRetries: 3 }).catch(() => {});
      const why = e instanceof Error ? e.message : String(e);
      return refuse({
        ok: false,
        status: 'upgrade-failed',
        message: `Your data could not be updated for this version of the tool (${why}). Nothing was changed, and a safe copy from just before is in the backups folder. Ask Codex to fix this.`,
        backup: backup ?? undefined,
      });
    }
    return good({ ok: true, status: 'upgraded', version: currentVersion, fromVersion: old, backup });
  }

  return { backupsDir, backupNow, backupIfDue, listBackups, restoreBackup, openData };
}

export interface DataSafety {
  backupsDir(): string;
  backupNow(label?: string): Promise<string | null>;
  backupIfDue(hours?: number): Promise<string | null>;
  listBackups(): Promise<BackupInfo[]>;
  restoreBackup(name: string, opts?: { maxVersion?: number }): Promise<RestoreOutcome>;
  openData(opts: { currentVersion: number; migrations: Record<number, Migration> }): Promise<OpenDataResult>;
}
