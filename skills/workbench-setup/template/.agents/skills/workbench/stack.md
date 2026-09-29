# How tools are built here

These are your choices; never put them to the user as questions.

## Tools inside the project

Nothing is installed on the computer and nothing needs admin rights. Everything the tools need to be built lives in `.tools/` at the project root, shared by all tools (not in save points; it can always be downloaded again).

- **First time, Windows:** `powershell -NoProfile -ExecutionPolicy Bypass -File .workbench\scripts\bootstrap.ps1`. It downloads Node.js into `.tools\node` (checksum-checked) and, only when git is missing, MinGit into `.tools\git`. It is safe to run again.
- **Every command, Windows:** through the launcher, which puts `.tools` first on PATH and keeps npm's and Electron's caches in `.tools`: `.workbench\scripts\run.cmd npm.cmd ci`. Always `npm.cmd`/`npx.cmd`, never bare `npm`; never `npm -g`.
- **macOS:** same layout, done by hand: the Node tarball from nodejs.org into `.tools/node` (check `SHASUMS256.txt`), and set `PATH`, `npm_config_cache`, `npm_config_userconfig`, `electron_config_cache` to the `.tools` paths per command. Never run `/usr/bin/git` unless `xcode-select -p` succeeds (otherwise it pops an admin installer); save points then use snapshots (below).
- Tools and the finished app may write their normal files in AppData and Temp. The only thing you create outside the project folder is the desktop shortcut.
- A download is blocked (proxy, TLS error, GitHub blocked): don't work around it. Write the forwardable message for IT ([safety.md](safety.md#forwardable-messages)) and offer the HTML version meanwhile.

## Several tools, one project

Each tool lives in its own folder, `tools/<name>/`: a short name from the user's words, lowercase letters, digits and hyphens only (`supplier-bills`). Tools share the project's setup, `.tools/` and save-point history; everything else is per tool:

```
tools/<name>/
  NOTES.md      its notes (copied from starters/NOTES.md)
  CONTEXT.md    its words
  app/          its code (copied from a starter), with its own node_modules
  samples/      files the user gave you for it (never saved)
  current/      the copy they use; the desktop shortcut points here (never saved)
  sketches/     options shown at a fork (never saved)
```

- **A new tool** is a new folder, never a feature bolted onto another tool: when the need is different, the words are different, or the data is someone else's. Add it to "Tools here" in `.workbench/NOTES.md` (`<name>: what it does, in their words. Status.`).
- **Which tool are we on?** Keep `Last worked on: <name>` in `.workbench/NOTES.md` current; the startup check loads that tool's notes and words. When the user switches, read that tool's `NOTES.md` and `CONTEXT.md` first and update the line.
- Tools never share code, packages or data. Copying a piece from one tool to another is fine; a shared library is not (updating it for one would break the other).

## Save points

git, run by you; the user never sees a git command. They say "go back to before the dates change" and you do it.

- **Save with `.workbench\scripts\save.ps1 "<tool>: <their words>"`** (macOS: `sh .workbench/scripts/save.sh "..."`), one before and one after every change ("supplier-bills: before newest bills on top", "supplier-bills: newest bills on top"). It saves an explicit list of permitted files for every tool at once: `NOTES.md`, `CONTEXT.md`, named config files in `app/`, code files in `app/src/` and `app/test/`, and the workbench's own files. Documents, samples, data, backups, secrets, `.tools`, builds and `current/` are never in it, whatever any `.gitignore` says. A new kind of code file needs a line in both save scripts; never a data file type. `save.ps1 -List` shows what would be saved.
- Everything else goes through `.workbench\scripts\git.cmd`, never plain `git`: it keeps the history in `.workbench\history\` instead of `.git`, because Codex's sandbox keeps `.git` read-only and may run commands as a separate Windows user. It also uses `.tools\git` when git isn't installed. macOS: `git --git-dir=.workbench/history --work-tree=. -c safe.directory='*' ...`, only if `xcode-select -p` succeeds.
- A tool's history: `git.cmd log --format="%h %ad %s" --date=short -- tools/<name>`.
- **"Go back"** is always for one tool, and means the tool on their desktop is back and still works with their current data. Other tools are never touched.
  1. Show them what they'll get back and what goes away. Their data is never rolled back as part of this.
  2. `git.cmd restore --source=<save point> --staged --worktree -- tools/<name>`
  3. From `tools/<name>/app/`: `run.cmd npm.cmd ci`, `run.cmd npm.cmd test`, `run.cmd npm.cmd run package` (`run.cmd` is `..\..\..\.workbench\scripts\run.cmd` from there).
  4. **Check the older version against a copy of their current data** before it replaces anything: the `data-safety` block's `copy` command and its "Go back" recipe start `app/out/...exe` with `WORKBENCH_DATA_DIR` set to the copy (the starter's `dataDir()` honours it; keep that in every tool); then do the thing they use most. If it refuses the data (the data format changed after that save point), stop and say so plainly, with the choices: keep the current version and fix forward (suggested), convert the data back (only with a tested conversion, on a copy first), or go back and restore an older data backup, naming exactly what would be lost. They choose.
  5. Replace `tools/<name>/current/` as in "Ship it" (ask them to close the tool first), start it, check the thing they described, then save point "<tool>: went back to <their words>" so history never disappears, and hand back.
- **Changing how data is stored** (a new column, a renamed field, a new file layout) is its own change, done with the `data-safety` block: raise `DATA_VERSION`, add the migration and its test; the tool backs up and upgrades old data on start, and the change isn't done until the previous version's data opens correctly in the new one.
- Data backups are separate: in the tool's backups folder outside the project ([safety.md](safety.md#data)), never in save points.
- **No git at all** (macOS without the Command Line Tools): `save.sh` makes snapshots of the whole project in `.workbench/snapshots/<yyyy-mm-dd-hhmm>-<their words>/` instead. Go back = delete the tool's files that `save.sh --list` shows under `tools/<name>/`, copy the snapshot's `tools/<name>/` back, then steps 3-5 above.

## The app

Three starters in `starters/`; pick without asking:
- **`starters/electron/`** (the default): a desktop program. Anything that reads files on this computer, keeps data, exports to Excel or uses AI.
- **`starters/html/`**: one HTML file opened from disk. When programs can't run here (a download or the app is blocked, Smart App Control), or the tool is small and will be shared with a few people. No AI feature, data only in that browser. Its `README.md` says how to build and ship it.
- **`starters/web/`**: a website, when the user wants one (a portfolio, a page others open in their browser, a form colleagues fill in). React, React Router, React Query, shadcn and Tailwind, hosted on the user's own Cloudflare account, **private behind Cloudflare Access until the user chooses public** ([safety.md](safety.md#websites)). Local checks use a preview on `127.0.0.1` only, stopped as soon as you're done: the one exception to "no ports". Its `README.md` has setup, deploy, private/public and SEO.

- **Start a tool**: create `tools/<name>/`, copy `starters/NOTES.md` into it, copy the starter into `tools/<name>/app/`, and follow the starter's `README.md` (for Electron: set `TOOL_ID` once, never change it; `run.cmd npm.cmd ci`; `run.cmd npx.cmd install-electron --no`). Its `README.md` lists the security settings; keep every one of them. Record `TOOL_ID` in the tool's NOTES under Data.
- Electron + TypeScript, Forge + Vite, npm only. Electron is pinned exactly; updating it is planned work, never a side effect, and done one tool at a time.
- **No dev server.** To try a change: `npm.cmd run package` and start the packaged exe from `app/out/`. `electron-forge start` opens a local port, so it is never used.
- **No native modules**: after any dependency change, run the check in `starters/electron/README.md`. They need a compiler, which needs admin.
- The tool opens no network ports and loads nothing remote. The only network use is a feature the user agreed to, such as an AI call ([ai-features.md](ai-features.md)).
- Data: the tool keeps its own data in `dataDir()`, `%LOCALAPPDATA%\WorkbenchTools\<TOOL_ID>\data` (SQLite through `node:sqlite` when the tool owns the data, in the main process; the starter's `vite.main.config.mts` keeps `node:sqlite` out of the bundle); it reads the user's files where they are and writes new ones (spreadsheets through the `excel` block). Never write to the user's originals ([safety.md](safety.md#data)).
- Checks: a quick automated check per delivered change (`npm.cmd test`), plus using the packaged app the way the user would.

## Building blocks

Tested pieces in `blocks/`, copied into a tool's `app/` when it needs them. Use them instead of writing your own; each `README.md` says what to copy and how to wire it.

| Block | Use it when | Adds |
|---|---|---|
| `blocks/data-safety/` | The tool keeps its own data. Add it before the first real data exists. | Backups (automatic and before changes), a data version with tested upgrades, a refusal when older code meets newer data, restore that keeps a `before-restore` copy, an optional Backups screen, a command line for you (`backup`, `list`, `copy`, `restore`). No dependencies. |
| `blocks/excel/` | The tool reads or writes xlsx or csv. | Read by header name (never position), IDs kept as text, dates and numbers typed, warnings as a stop sign, csv in any common dialect; write with typed columns, frozen header, filters. ExcelJS pinned. |
| `blocks/ai-read/` | The tool reads messy documents with AI, after the user agreed ([ai-features.md](ai-features.md)). | pdf.js page rendering and text layer in the page, the locked-down `codex exec` call in main, checks on every answer, a live test on a made-up sample. Adds about 310 MB to the packaged tool. |

Blocks are for the Electron starter; the HTML and web starters say in their READMEs what they can reuse.

## Ship it on this computer

1. From `tools/<name>/app/`: `run.cmd npm.cmd run package` -> `app/out/<App>-win32-x64/`.
2. Ask the user to close the tool if it's open; check that `tools\<name>\current\<App>.exe` isn't running (never end it yourself). Then replace `tools/<name>/current/` with the new build, so the next build never touches the copy they use.
3. Desktop shortcut to `tools\<name>\current\<App>.exe` (PowerShell `WScript.Shell` -> `CreateShortcut` at `[Environment]::GetFolderPath('Desktop')`), named in their words. If that fails, tell the user where the exe is.
4. Never run `make` or an installer for this; installers are for sharing ([safety.md](safety.md#sharing-ladder)).

About 1.5 GB for the first Electron tool in a project, then about 0.4 GB more per tool (`.tools` and the download caches are shared). Removing a tool completely: close it, delete `tools/<name>/`, its shortcut, and its folder `%LOCALAPPDATA%\WorkbenchTools\<TOOL_ID>` (data and backups: ask first), take it out of "Tools here", and make a save point "removed <name>".

## Sketches

At a real fork, one static HTML file with 2-3 options side by side: greyscale, a "SKETCH - not the real app" banner, sample data from the user's work (real rows as "Whose data" in `safety.md` allows), all inline, and this in `<head>` so it loads nothing external:

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:">
```

Options differ in how the user would use the tool (layout, flow, what's automatic), one thing at a time; name each in their words; recommendation last; "none of these" is always fine. Save sketches in `tools/<name>/sketches/` and open the file for the user.
