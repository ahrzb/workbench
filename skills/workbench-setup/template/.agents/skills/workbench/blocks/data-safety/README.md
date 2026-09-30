# Block: data safety

For the AI, not the user. A tested main-process module for the Electron starter that makes the data rules in `stack.md` (Save points, "Changing how data is stored") and `fix.md` ("Data first") real code: backups, a data version number with upgrades, and a restore that never overwrites current data. Copy it; don't rewrite it from prose.

## Use it when

- The tool keeps its own data in `dataDir()` (a SQLite file, JSON, anything). Add it before the first real data exists: it costs nothing then.
- You are about to change how data is stored, or about to "go back" to an older version.
- You need a backup before touching real data (`safety.md` demands one).

Not for: tools that only read the user's files and write new ones through the Save dialog (no data folder to protect); the user's original documents (those are never copied here, never written).

## What it does

- `data\version.json` (`{"dataVersion": n}`) holds the data's format version. It is part of the data, so it travels with every backup and every copy.
- **On start** (`openData`, before any window):
  - empty or missing data folder: fresh start at the current version;
  - same version: nothing happens (data with no version file counts as version 1 and gets one);
  - older data: backup labelled `before-upgrade-v<old>`, then the migrations run **on a private copy**, then the copy is swapped in. A failing migration leaves the real data exactly as it was (tested), the backup stays, the user gets a plain message and the tool stops;
  - newer data (an older tool opened newer data, e.g. after "go back"): refuses, touches nothing, no backup, plain message;
  - unreadable version file: refuses, touches nothing.
  On any refusal the tool shows the message in a native box, exits with code 1, and writes the same message to `%LOCALAPPDATA%\WorkbenchTools\<TOOL_ID>\start-problem.txt` (beside `data`, removed on the next good start). That file is how you detect a refusal when you run the exe yourself.
- **Backups**: `%LOCALAPPDATA%\WorkbenchTools\<TOOL_ID>\backups\<yyyy-mm-dd-hhmm>[-label][.n]\` (beside `data`, never in the project). Copied to a `.tmp-` name first, then renamed. Same minute gives `.2`, `.3`. Unlabelled backups are "automatic": the newest 10 are kept, labelled ones are never deleted. The tool takes an automatic one on start, and checks hourly while it stays open, whenever the newest is older than 20 hours (`backupIfDue`).
- **Restore** (`restoreBackup`): first copies the current data to `<stamp>-before-restore`, copies the chosen backup to a scratch folder, swaps it in. A backup made by a newer data version is refused. Restoring can itself be undone by restoring the `before-restore` copy.
- **SQLite files are copied with `VACUUM INTO`**, so a backup taken while the tool has the database open is complete and consistent (rows still in the `-wal` file included; `-wal`/`-shm` are not copied). Needs `node:sqlite` (Electron 44: fine; the bundle needs the one-line Vite fix below). A damaged database that SQLite cannot read is copied raw instead: a damaged copy is still worth keeping. The copy is not in WAL mode and is defragmented; `user_version` is kept. Run `PRAGMA journal_mode = WAL` when the tool opens the file, as it should anyway.
- **Restore and upgrade replace files**, so the database must be closed then: upgrade runs before the tool opens anything; for restore, fill in `closeData()` in `main.ts` the day the tool opens a database. The tool restarts after a restore.

## Files

| Copy this | To |
|---|---|
| `src/data-safety.ts` | `tools/<name>/app/src/` |
| `src/backups-screen.ts`, `src/backups-screen.css` | `tools/<name>/app/src/` (optional Backups screen) |
| `src/data-safety-cli.mjs` | `tools/<name>/app/src/` (for you: backup / list / copy / restore from a command line) |
| `test/data-safety.test.mjs` | `tools/<name>/app/test/` |

No dependencies to add. Nothing native. Do `TOOL_ID` in `main.ts` first (the CLI reads it, and refuses `set-when-copied`).

## Edits

**`src/shared.ts`**: add the types, two channels and two `Api` members.

```ts
export interface BackupInfo {
  /** Folder name, e.g. `2026-09-30-1412-before-restore`. Pass it back to restoreBackup unchanged. */
  name: string;
  /** For display: `2026-09-30 14:12`. */
  stamp: string;
  /** null for an automatic copy. */
  label: string | null;
  automatic: boolean;
  bytes: number;
  files: number;
}
export type RestoreResult = { status: 'restored' } | { status: 'cancelled' } | { status: 'refused'; reason: string };

// in Api:
  /** The copies of the tool's data, newest first. */
  listBackups(): Promise<BackupInfo[]>;
  /** Asks the user (native dialog), sets the current data aside, goes back to that copy and restarts the tool. */
  restoreBackup(name: string): Promise<RestoreResult>;

// in CHANNELS:
  listBackups: 'backups:list',
  restoreBackup: 'backups:restore',
```

**`src/preload.ts`**: inside `api`:

```ts
  listBackups: () => ipcRenderer.invoke(CHANNELS.listBackups),
  restoreBackup: (name) => ipcRenderer.invoke(CHANNELS.restoreBackup, name),
```

**`src/main.ts`**:

```ts
// imports
import { createDataSafety } from './data-safety.ts';
import type { Migration } from './data-safety.ts';
import type { BackupInfo, OpenedText, RestoreResult, SaveResult } from './shared.ts'; // add the new types to the ONE existing shared.ts import line (other blocks add theirs to it too)

// after dataDir()
/** Raise by one whenever how the data is stored changes; add MIGRATIONS[<old version>] (see below). */
const DATA_VERSION = 1;
const MIGRATIONS: Record<number, Migration> = {};
const safety = createDataSafety({ dataDir });

/** Close anything that holds files in the data folder (a SQLite database, say) before a restore replaces it. */
async function closeData(): Promise<void> {
  // Nothing to close yet. When the tool opens a database, close it here.
}
```

Inside `registerIpc` (after the existing handlers). The page names a backup from the list; the native dialog is the confirmation, so the page cannot skip it:

```ts
  ipcMain.handle(CHANNELS.listBackups, async (event): Promise<BackupInfo[]> => {
    assertTrusted(event);
    return safety.listBackups();
  });

  ipcMain.handle(CHANNELS.restoreBackup, async (event, name: unknown): Promise<RestoreResult> => {
    assertTrusted(event);
    if (typeof name !== 'string') return { status: 'refused', reason: 'That copy does not exist.' };
    const chosen = (await safety.listBackups()).find((b) => b.name === name);
    if (!chosen) return { status: 'refused', reason: 'That copy does not exist.' };
    const win = getWindow();
    const options: Electron.MessageBoxOptions = {
      type: 'warning',
      title: 'Go back to a copy',
      message: `Go back to your data from ${chosen.stamp}?`,
      detail: 'Anything you added or changed since then will be replaced. Your data as it is now is kept as another copy first, so you can undo this. The tool restarts.',
      buttons: ['Go back to this copy', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
    };
    const answer = win ? await dialog.showMessageBox(win, options) : await dialog.showMessageBox(options);
    if (answer.response !== 0) return { status: 'cancelled' };
    await closeData();
    const restored = await safety.restoreBackup(chosen.name, { maxVersion: DATA_VERSION });
    if (!restored.ok) return { status: 'refused', reason: restored.message };
    setImmediate(() => {
      app.relaunch();
      app.quit();
    });
    return { status: 'restored' };
  });
```

Replace `app.whenReady().then(() => {` with the version below (the rest of the body stays):

```ts
app.whenReady().then(async () => {
  // Data first: before any window. On a problem nothing has been touched; say so plainly and stop.
  try {
    const opened = await safety.openData({ currentVersion: DATA_VERSION, migrations: MIGRATIONS });
    if (!opened.ok) {
      dialog.showErrorBox(`${app.getName()} did not open your data`, opened.message);
      app.exit(1);
      return;
    }
    await safety.backupIfDue().catch((e) => console.warn(`[backup] ${e instanceof Error ? e.message : String(e)}`));
    // Also while it stays open (a tool left running for weeks otherwise never copies): checked hourly,
    // a copy is made when the newest is older than 20 hours. Safe with a database open (VACUUM INTO).
    setInterval(() => void safety.backupIfDue().catch((e) => console.warn(`[backup] ${e instanceof Error ? e.message : String(e)}`)), 60 * 60 * 1000).unref();
  } catch (e) {
    dialog.showErrorBox(`${app.getName()} could not check your data`, `Nothing was changed. ${e instanceof Error ? e.message : String(e)}`);
    app.exit(1);
    return;
  }
  // ... existing: Menu, hardenSession, registerAppProtocol, registerIpc, createWindow
```

**Backups screen** (skip it if the tool has no room for one; the block works without it). `index.html`: a toolbar button and, after `</main>`, the panel: `<button id="backups-toggle" type="button">Backups</button>` and `<section id="backups" class="backups-panel" hidden></section>`. `src/renderer.ts`: `import { mountBackups } from './backups-screen.ts';` and `mountBackups(document.querySelector<HTMLButtonElement>('#backups-toggle')!, document.querySelector<HTMLElement>('#backups')!);`. It uses only `textContent`, class names and the `hidden` attribute (the CSP allows no inline style).

**`vite.main.config.mts`**: the starter already has this (check it is still there; nothing to do unless it was removed). It is needed as soon as any file in the data folder is a SQLite database: Vite would otherwise swap `node:sqlite` for an empty stub, which `copyData` detects and refuses to use, and your own `node:sqlite` code would break too:

```ts
export default defineConfig({
  build: { rollupOptions: { external: ['node:sqlite'] } },
});
```

**Test**: `npm.cmd test` picks up `test/data-safety.test.mjs` (20 tests; the three SQLite ones skip themselves if `node:sqlite` is missing in the Node running the tests).

## Migrations

`MIGRATIONS[n]` turns version `n` data into version `n + 1`. Every step from the old version up to `DATA_VERSION - 1` must exist, or the tool refuses to start (before touching anything).

```ts
const DATA_VERSION = 2;
const MIGRATIONS: Record<number, Migration> = {
  1: async (dir) => { // v1 -> v2: bills get a "paid" column
    const db = new DatabaseSync(path.join(dir, 'tool.db')); // dir, never dataDir()
    db.exec('ALTER TABLE bills ADD COLUMN paid INTEGER DEFAULT 0');
    db.close();
  },
};
```

Rules: work only inside the `dir` you're given (a private copy; the real data is swapped in only if all steps succeed); close every database and file you open; a migration you already shipped is never edited (add the next one). Needs room for a second copy of the data on the disk.

A storage change isn't done until a test proves it: build a version-`n` folder in a temp dir (with `mkdtemp`, `WORKBENCH_DATA_DIR`-style, like `test/data-safety.test.mjs`), run `openData({ currentVersion: n + 1, migrations: MIGRATIONS })` (export `MIGRATIONS` from a small `src/migrations.ts` so the test can import it without Electron), and check the old data reads correctly in the new shape. Keep that test.

## How you use it

Run from `tools/<name>/app/` (the CLI reads `TOOL_ID` and `DATA_VERSION` from `src/main.ts`, honours `WORKBENCH_DATA_DIR`):

```
..\..\..\.workbench\scripts\run.cmd node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --disable-warning=ExperimentalWarning src\data-safety-cli.mjs <status | backup <words> | list | copy | restore <name>>
```

- **Before any change that touches real data** (`safety.md`): `backup before <the change in their words>`, e.g. `backup before newest bills on top`. Say so in one line. It prints the path. "No data yet" is fine: nothing to lose. `backup` and `restore` write to `%LOCALAPPDATA%`, which Codex's sandbox doesn't allow, so Codex asks the user to approve that one command; say beforehand, in one line, why. (`copy`, `practice`, `list` and `status` need no approval.)
- **Trying out a new version** (`stack.md` "In use and trying out"; `.workbench\scripts\try.ps1` runs this for you): `practice` replaces `%TEMP%\workbench-trying-out\<TOOL_ID>\data` with a fresh, complete copy of the real data (safe while the version in use is open) and prints that path; the new build starts with `WORKBENCH_DATA_DIR` set to it. Temp, because Codex's sandbox can write there and not in `%LOCALAPPDATA%`; practice data is throwaway. It refuses while the old trying-out copy is still open. Its backups and Electron profile stay beside it in that Temp folder.
- **Changing how data is stored**: bump `DATA_VERSION`, add `MIGRATIONS[old]`, write the test above, `backup before <change>`, package, then open it with `try.ps1` (a fresh practice copy of the real data) and check the old data opened in the new shape. Only then say it's done.
- **"Go back"** (`stack.md` step 4): after rebuilding the older version, `powershell -NoProfile -ExecutionPolicy Bypass -File .workbench\scripts\try.ps1 <tool>` from the project folder, with the user's approval (a tool's window can't run inside Codex's sandbox). It runs the older build on a fresh practice copy of the current data. If it refused (newer data, or a failed upgrade; nothing was changed), the window says so and `%TEMP%\workbench-trying-out\<TOOL_ID>\start-problem.txt` holds the message; otherwise the practice folder has the data's `version.json` and you do the thing they use most. "Refused, newer data" is exactly the case `stack.md` step 4 stops on: give them the three choices.
- **Data looks wrong** (`fix.md` "Data first"): `backup before-restore` first (never skip). `list` shows the copies; compare the newest with the current data and tell them what a restore would bring back and lose. Only with their OK, and with the tool closed: `restore <name>` (it makes its own `before-restore` copy again, then replaces the data). Selective repair beats restoring everything where you can.
- The app's Backups screen does the same restore for the user, with a native confirmation.

Names: the folder name is the backup's id (`2026-09-30-1412-before-newest-bills-on-top`). Labels are lowercased to `a-z0-9-`, at most 40 characters.

## Checking a copy of the data: keep the shape

Make a copy as `<something>\data` (`copy` does): backups go to the sibling `<something>\backups`, so the check never touches the real backups folder. If you point `WORKBENCH_DATA_DIR` at a bare folder in Temp instead, its backups land in Temp's `backups`; avoid that.

## Verified (scratch copy of the starter, Node 22.23, Electron 44.4.5, Windows)

- `npm test`: 22 pass (2 starter tests + 20 here), `npm run typecheck` clean, `npm run package` builds.
- Tests: fresh start, same version, upgrade 1->3 in order on a private copy, failing migration (data byte-for-byte as before, backup present, problem file written then cleared), missing migration step, newer-data refusal, legacy data with no version file, unreadable version file, backup listing/size/file count, same-minute uniqueness, retention keeps labelled backups, restore keeps `before-restore` and can be undone, restore refuses path tricks and newer backups, `backupIfDue`, crash recovery between the two renames, real `node:sqlite` (backup while open in WAL mode with rows only in the `-wal`, restore then reopen, migration on the copy, damaged file copied raw).
- Packaged exe with `WORKBENCH_DATA_DIR` in Temp: fresh start creates `data\version.json`; legacy SQLite data (no version file) gets `version.json` and an automatic backup with all rows (proves `node:sqlite` works in the bundle); version-5 data is refused, data byte-identical, `start-problem.txt` written; no listening sockets. Driven through Windows UI Automation: the Backups screen lists the copies, the native confirmation appears, confirming restores the older content, keeps the current data as `before-restore` and restarts the tool.

Not verified: an upgrade migration running inside the packaged exe (covered by Node tests on the same code); macOS; very large data folders (backups are full copies, sync-free, done on the main process asynchronously but not throttled).
