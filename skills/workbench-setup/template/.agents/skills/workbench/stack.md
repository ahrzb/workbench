# How tools are built here

These are your choices; never put them to the user as questions.

## Tools inside the project

Nothing is installed on the computer and nothing needs admin rights. Everything the tool needs lives in `.tools/` (not in save points; it can always be downloaded again).

- **First time, Windows:** `powershell -NoProfile -ExecutionPolicy Bypass -File .workbench\scripts\bootstrap.ps1`. It downloads Node.js into `.tools\node` (checksum-checked) and, only when git is missing, MinGit into `.tools\git`. It is safe to run again.
- **Every command, Windows:** through the launcher, which puts `.tools` first on PATH and keeps npm's and Electron's caches in `.tools`: `.workbench\scripts\run.cmd npm.cmd ci`. Always `npm.cmd`/`npx.cmd`, never bare `npm`; never `npm -g`.
- **macOS:** same layout, done by hand: the Node tarball from nodejs.org into `.tools/node` (check `SHASUMS256.txt`), and set `PATH`, `npm_config_cache`, `npm_config_userconfig`, `electron_config_cache` to the `.tools` paths per command. Never run `/usr/bin/git` unless `xcode-select -p` succeeds (otherwise it pops an admin installer); save points then use snapshots (below).
- Tools and the finished app may write their normal files in AppData and Temp. The only thing you create outside the project folder is the desktop shortcut.
- A download is blocked (proxy, TLS error, GitHub blocked): don't work around it. Write the forwardable message for IT ([safety.md](safety.md#forwardable-messages)) and offer the HTML-only version meanwhile.

## Save points

git, run by you; the user never sees a git command. They say "go back to before the dates change" and you do it.

- **Save with `.workbench\scripts\save.ps1 "<their words>"`** (macOS: `sh .workbench/scripts/save.sh "<their words>"`), one before and one after every change ("before: newest bills on top", "newest bills on top"). It saves an explicit list of permitted files: the tool's code (named config files in `app/`, code files in `app/src/` and `app/test/`) and the workbench's own files. Documents, samples, data, backups, secrets, tools and builds are never in it, whatever any `.gitignore` says. A new kind of code file needs a line in both save scripts; never a data file type. `save.ps1 -List` shows what would be saved.
- Everything else goes through `.workbench\scripts\git.cmd`, never plain `git`: it keeps the history in `.workbench\history\` instead of `.git`, because Codex's sandbox keeps `.git` read-only and may run commands as a separate Windows user (plain `.git` would need the user's approval every time). It also uses `.tools\git` when git isn't installed. macOS: `git --git-dir=.workbench/history --work-tree=. -c safe.directory='*' ...`, only if `xcode-select -p` succeeds.
- **"Go back"** means the tool on their desktop is back and still works with their current data:
  1. Show them what they'll get back and what goes away. Their data is never rolled back as part of this.
  2. `git.cmd restore --source=<save point> --staged --worktree -- .`
  3. From `app/`: `run.cmd npm.cmd ci`, `run.cmd npm.cmd test`, `run.cmd npm.cmd run package`.
  4. **Check the older version against a copy of their current data** before it replaces anything: copy the data folder, start `app/out/...exe` with `WORKBENCH_DATA_DIR` set to the copy (the starter's `dataDir()` honours it; keep that in every tool), and do the thing they use most. If it can't read the data (the data format changed after that save point), stop and say so plainly, with the choices: keep the current version and fix forward (suggested), convert the data back (only with a tested conversion, on a copy first), or go back and restore an older data backup, naming exactly what would be lost. They choose.
  5. Replace `tool/<App>/` as in "Ship it" (ask them to close the tool first), start it, check the thing they described, then save point "went back to <their words>" so history never disappears, and hand back.
- **Changing how data is stored** (a new column, a renamed field, a new file layout) is its own change: the tool keeps a data version number, upgrades old data on start after backing it up, and the change isn't done until the previous version's data opens correctly in the new one.
- Data backups are separate: in the backup folder outside the project ([safety.md](safety.md#data)), never in save points.
- **No git at all** (macOS without the Command Line Tools): `save.sh` makes snapshots in `.workbench/snapshots/<yyyy-mm-dd-hhmm>-<their words>/` instead. Go back = delete the files `save.sh --list` shows, copy the snapshot's files back, then steps 3-5 above. The snapshot names are the save-point list.

## The app

- **Start from `starter/`** in this skill folder: copy it to `app/` in the project, set `TOOL_ID` in `app/src/main.ts` once (see its README; never change it later), then `.workbench\scripts\run.cmd npm.cmd ci` and `.workbench\scripts\run.cmd npx.cmd install-electron --no` from `app/`. Its `README.md` lists the security settings; keep every one of them.
- Electron + TypeScript, Forge + Vite, npm only. Electron is pinned exactly; updating it is planned work, never a side effect.
- **No dev server.** To try a change: `npm.cmd run package` and start the packaged exe from `app/out/`. `electron-forge start` opens a local port, so it is never used.
- **No native modules**: after any dependency change, run the check in `starter/README.md`. They need a compiler, which needs admin.
- The tool opens no network ports and loads nothing remote. The only network use is a feature the user agreed to, such as an AI call ([ai-features.md](ai-features.md)).
- Data: the tool keeps its own data in `dataDir()`, `%LOCALAPPDATA%\WorkbenchTools\<TOOL_ID>\data` (SQLite through `node:sqlite` when the tool owns the data, in the main process); it reads the user's files where they are and writes new ones (xlsx through ExcelJS, csv with plain code). Never write to the user's originals ([safety.md](safety.md#data)).
- Checks: a quick automated check per delivered change (`npm.cmd test`), plus using the packaged app the way the user would.

## Ship it on this computer

1. `.workbench\scripts\run.cmd npm.cmd run package` -> `app/out/<App>-win32-x64/`.
2. Ask the user to close the tool if it's open; check that `tool\<App>\<App>.exe` isn't running (never end it yourself). Then replace `tool/<App>/` with the new build, so the next build never touches the copy they use.
3. Desktop shortcut to `tool\<App>\<App>.exe` (PowerShell `WScript.Shell` -> `CreateShortcut` at `[Environment]::GetFolderPath('Desktop')`). If that fails, tell the user where the exe is.
4. Never run `make` or an installer for this; installers are for sharing ([safety.md](safety.md#sharing-ladder)).

About 1.5 GB per project. Removing a tool completely: delete the project folder, the shortcut, its data folder `%LOCALAPPDATA%\WorkbenchTools\<TOOL_ID>` and its backups `%LOCALAPPDATA%\Workbench\backups\<project folder name>`; ask before deleting any data.

## HTML-only version

When programs can't run at all (blocked by policy, Smart App Control) or for sharing with a few people: the same UI as one self-contained HTML file opened from disk. Import with `<input type=file>`, export with a download link, settings in `localStorage`, an "Export backup" button. Nothing to install and no warnings. Keep all OS access behind the small `window.api` in the preload so a browser version can swap it.

## Sketches

At a real fork, one static HTML file with 2-3 options side by side: greyscale, a "SKETCH - not the real app" banner, sample data from the user's work (real rows as "Whose data" in `safety.md` allows), all inline, and this in `<head>` so it loads nothing external:

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:">
```

Options differ in how the user would use the tool (layout, flow, what's automatic), one thing at a time; name each in their words; recommendation last; "none of these" is always fine. Save sketches in `.workbench/sketches/` and open the file for the user.
