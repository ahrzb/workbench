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

- **Always through `.workbench\scripts\git.cmd`** (Windows), never plain `git`. It keeps the history in `.workbench\history\` instead of `.git`, because Codex's sandbox keeps `.git` read-only and may run commands as a separate Windows user; with plain `.git` every save point would need the user's approval. It also sets the identity and uses `.tools\git` when git isn't installed. macOS: `git --git-dir=.workbench/history --work-tree=. -c safe.directory='*' -c user.name=Workbench -c user.email=workbench@localhost ...`.
- **What a save point holds:** only what the project's `.gitignore` allows, which is an allowlist: the tool's code (named config files in `app/`, code files in `app/src/` and `app/test/`) and the workbench's own files. Documents, samples, data, backups, secrets, tools and builds are never in it. New code folders or file types in `app/` need a line in `.gitignore`; never a data file type.
- One save point before and one after every change: `git.cmd add -A`, then `git.cmd commit -qm "<their words>"` ("before: newest bills on top", "newest bills on top").
- **"Go back"** means the tool on their desktop is back, not just the code:
  1. Show them what they'll get back and what goes away; their data is not part of it (data questions go through [fix.md](fix.md#data-first)).
  2. `git.cmd restore --source=<save point> --staged --worktree -- .`
  3. From `app/`: `run.cmd npm.cmd ci`, `run.cmd npm.cmd test`, `run.cmd npm.cmd run package`.
  4. Replace `tool/<App>/` as in "Ship it" (ask them to close the tool first).
  5. Start it and check the thing they described, then save point "went back to <their words>" so history never disappears, and hand back.
- Data backups are separate: `.workbench/backups/`, dated copies, never in save points.
- No git at all (macOS without the Command Line Tools): copy the allowlisted files to `.workbench/snapshots/<yyyy-mm-dd-hhmm>-<their words>/` instead, and list those as save points.

## The app

- **Start from `starter/`** in this skill folder: copy it to `app/` in the project, then `.workbench\scripts\run.cmd npm.cmd ci` and `.workbench\scripts\run.cmd npx.cmd install-electron --no` from `app/`. Its `README.md` lists the security settings; keep every one of them.
- Electron + TypeScript, Forge + Vite, npm only. Electron is pinned exactly; updating it is planned work, never a side effect.
- **No dev server.** To try a change: `npm.cmd run package` and start the packaged exe from `app/out/`. `electron-forge start` opens a local port, so it is never used.
- **No native modules**: after any dependency change, run the check in `starter/README.md`. They need a compiler, which needs admin.
- The tool opens no network ports and loads nothing remote. The only network use is a feature the user agreed to, such as an AI call ([ai-features.md](ai-features.md)).
- Data: the tool keeps its own data in `%LOCALAPPDATA%\<App>\data` (SQLite through `node:sqlite` when the tool owns the data, in the main process); it reads the user's files where they are and writes new ones (xlsx through ExcelJS, csv with plain code). Never write to the user's originals ([safety.md](safety.md#data)).
- Checks: a quick automated check per delivered change (`npm.cmd test`), plus using the packaged app the way the user would.

## Ship it on this computer

1. `.workbench\scripts\run.cmd npm.cmd run package` -> `app/out/<App>-win32-x64/`.
2. Ask the user to close the tool if it's open; check that `tool\<App>\<App>.exe` isn't running (never end it yourself). Then replace `tool/<App>/` with the new build, so the next build never touches the copy they use.
3. Desktop shortcut to `tool\<App>\<App>.exe` (PowerShell `WScript.Shell` -> `CreateShortcut` at `[Environment]::GetFolderPath('Desktop')`). If that fails, tell the user where the exe is.
4. Never run `make` or an installer for this; installers are for sharing ([safety.md](safety.md#sharing-ladder)).

About 1.5 GB per project. Removing a tool completely: delete the project folder, the shortcut and `%LOCALAPPDATA%\<App>`; ask before deleting the data.

## HTML-only version

When programs can't run at all (blocked by policy, Smart App Control) or for sharing with a few people: the same UI as one self-contained HTML file opened from disk. Import with `<input type=file>`, export with a download link, settings in `localStorage`, an "Export backup" button. Nothing to install and no warnings. Keep all OS access behind the small `window.api` in the preload so a browser version can swap it.

## Sketches

At a real fork, one static HTML file with 2-3 options side by side: greyscale, a "SKETCH - not the real app" banner, sample data from the user's work (real rows only if the account type allows), all inline, and this in `<head>` so it loads nothing external:

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:">
```

Options differ in how the user would use the tool (layout, flow, what's automatic), one thing at a time; name each in their words; recommendation last; "none of these" is always fine. Save sketches in `.workbench/sketches/` and open the file for the user.
