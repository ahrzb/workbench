# Starter: HTML-only tool (one self-contained file)

For the AI, not the user. Copy everything in this folder into `tools/<name>/app/` and work there. The result is ONE file, `out/<Name>.html`, that the user opens by double-click from disk in Edge or Chrome. No npm dependencies, nothing to install, no program to run, so no SmartScreen / Smart App Control / policy warning.

## Pick this or Electron

Pick **this** when: programs can't run on the computer (policy, Smart App Control, blocked download); the tool is for sharing with a few people who must not get a warning or install anything; or the tool is small (read a file, compute, show, export).

Pick **Electron** (`starters/electron/`) when: the tool needs an AI feature (the page cannot call one, see limits); it owns real data (many rows, long history); it works on big files; it must read and write files without going through the browser's file picker and downloads; or it needs a library that is not one plain JS file.

If unsure and programs can run, use Electron. You can start here and port later (see "Porting").

## Limits (say them plainly when they matter to the user)

- **No AI feature from inside the page.** The CSP has `connect-src 'none'` and there is nowhere safe to keep a key. Never loosen it. A tool that needs AI is an Electron tool ([ai-features.md](../../ai-features.md)).
- **Data lives only in that browser profile** (localStorage, about 5 MB, cleared with "clear browsing data"; a different browser or another person's computer starts empty). This is why the page has **Export backup / Restore backup**. Tell the user about the backup button once, in one sentence, and keep the button visible. A tool with more data than that is an Electron tool.
- **Files:** opened through the file picker (cap 50 MB, read fully into memory); saved as downloads. The browser picks the place (usually Downloads) and renames instead of overwriting; the page can't know the final path and never writes to an original.
- No folder access, no drag-a-folder, no background work when the page is closed.
- Libraries: only files you copy into `src/` as plain ES modules (one-line relative imports, `export function|const|class`; no `export default`, no `export { }`, no CommonJS). Anything bigger (ExcelJS, PDF parsers) means Electron.
- Tested only in Edge (Chromium). Chrome shares the engine; Firefox and Safari are not tested.

## Files

| File | What it does |
|---|---|
| `index.html` | The shell. Three markers, `<!-- build:csp -->`, `<!-- build:css -->`, `<!-- build:js -->`, are replaced by the build. Its `<title>` names the tool, `out/<title>.html` and the backup files. No `<script>`, no `<style>`, no `style=""`, no `onclick=""`, no `src`/`href`: the build refuses them. |
| `src/main.mjs` | Entry. Sets `TOOL_ID` (once, never change: short name + 6 random letters, prefixes every localStorage key) and `DATA_VERSION`; builds the `api` and starts the UI. |
| `src/api.mjs` | The browser's `api`: the only code that touches the file picker, downloads and localStorage. |
| `src/ui.mjs` | The page: `startUi(api, document)`. Plain DOM, `textContent`/`.value` only, never `innerHTML`. Gets `api` as an argument. |
| `src/logic.mjs` | Pure logic: `summarize` (identical to the Electron starter's `logic.ts`), settings and data normalizing, the backup file format, file-name cleaning. Rules the tool must get right go here. |
| `src/index.css` | Greyscale styles, 16px minimum. No `@import`, no `url()` except `data:`. |
| `build.mjs` | Plain Node build: inlines JS and CSS, computes the CSP hashes, refuses anything that reaches outside the page. |
| `test/logic.test.mjs`, `test/build.test.mjs` | Logic checks; build checks (CSP hashes match the inline blocks, forbidden things are refused). |
| `package.json` | Only names two scripts (`test`, `build`). No dependencies. |

Rename the tool: `<title>` and `<h1>` in `index.html`; set `TOOL_ID` in `src/main.mjs`. The built file is `out\<title>.html`.

## Build, test, ship (from `tools/<name>/app/`)

```
..\..\..\.workbench\scripts\run.cmd node --test test/*.test.mjs
..\..\..\.workbench\scripts\run.cmd node build.mjs        # -> out\<title>.html
```

Then open `out\<title>.html` yourself and use it the way the user would (open a file, change a setting, export a backup) before handing over. A quick browser check with a scratch copy is fine; never point a browser at the user's own files.

**Ship** (same idea as "Ship it" in [stack.md](../../stack.md)):
1. Ask the user to close the page if it's open in a browser tab.
2. Copy `out\<title>.html` to `tools\<name>\current\<title>.html` (replace the old one; `current\` is what the user opens, so a build never touches it).
3. Desktop shortcut to that file (PowerShell `WScript.Shell` -> `CreateShortcut` on `[Environment]::GetFolderPath('Desktop')`, `TargetPath` = the html file). It opens in their default browser. If that fails, tell them where the file is.
4. Sharing: send the one `.html` file, or put it on a shared folder (some mail systems drop `.html` attachments). Everyone has their own data and their own backups.

## What the build guarantees

`build.mjs` writes `<meta http-equiv="Content-Security-Policy">` with: `default-src 'none'`, `script-src 'sha256-<hash of the inline script>'`, `style-src 'sha256-<hash of the inline style>'`, `img-src data:`, `connect-src 'none'`, `form-action 'none'`, `base-uri 'none'`. Never `'unsafe-inline'` or `'unsafe-eval'`. It fails (writes nothing) on: `<link>`, `<img>`, `<iframe>`, `src=`/`href=` attributes, inline `style=`/`on...=` attributes, `@import`/`url()` (except `data:`), `fetch`/`XMLHttpRequest`/`WebSocket`/`eval`/`new Function`/`import()` in JS, `</script` inside code, non-relative imports, two modules declaring the same top-level name, and syntax errors. It only warns about `http(s)://` text in the source. Do not silence a refusal by editing `build.mjs`; change the tool. If the policy has to change, that is a design decision with the user ([safety.md](../../safety.md)).

Things the policy forces in code you write: no `el.style.cssText` / `setAttribute('style', ...)` (setting `el.style.color = ...`, `el.hidden`, `el.classList` is fine); no inline event attributes (use `addEventListener`); no `innerHTML` with file text; to create a download, use `api`, never a hand-made `<a href>` in `index.html`.

## The `api` (matches the Electron starter where it can)

| Function | Electron starter | Here |
|---|---|---|
| `openTextFile()` -> `{ name, text?, error? } \| null` | native Open dialog | `<input type=file>`; the same 50 MB cap; `null` when cancelled. **Call it straight from a click handler, no `await` first** (browsers only show the picker from a click). |
| `saveTextFile(text, suggestedName)` -> `{ status: 'saved', path, bytes } \| { status: 'cancelled' } \| { status: 'refused', reason }` | Save dialog, exclusive create | Blob + `a.download`; `path` is only a description; never `cancelled`. |
| `loadSettings()` / `saveSettings(s)` | (not in the Electron starter yet) | localStorage key `<TOOL_ID>:settings`; `saveSettings` returns `false` when the browser refuses. |
| `loadData()` / `saveData(d)` | (Electron: files in `dataDir()`) | localStorage key `<TOOL_ID>:data`, same `false` on refusal. |
| `exportBackup()` / `restoreBackup()` | (Electron: backups go to `%LOCALAPPDATA%\WorkbenchTools\<TOOL_ID>\backups\<yyyy-mm-dd-hhmm>\`) | JSON file `<title>-backup-<yyyy-mm-dd-hhmm>.json` download / picked file. Restore refuses another tool's file, a damaged file and a newer `dataVersion`, and says why in one sentence. |

The example: open a text file, show lines/words/characters, keep a "wrap long lines" setting and a "recent files" list (the tool's data).

Every localStorage key starts with `TOOL_ID` because Chromium gives all `file://` pages one shared store. Never read or write a key without it. (Consequence, checked: moving or copying the html to another folder keeps the data, but any other local html file in the same browser could read it.)

**Adding a feature:** add the rule and its test in `logic.mjs`, a named function on `api` if it touches the outside, the DOM in `ui.mjs`. Anything the user's data contains goes through a `normalize...` function in `logic.mjs` on the way in, from storage and from backups alike.

**Changing how data is stored:** raise `DATA_VERSION` in `main.mjs`, put the upgrade in `normalizeData` (and settings in `normalizeSettings`) so an old backup and old localStorage both open, and add a test with an old-shaped backup. Same rule as stack.md's "Changing how data is stored". Do that before the page reads anything else; `parseBackup` already refuses backups from a newer version.

## Porting between the two

- `logic.mjs` <-> `logic.ts`: copy and add/remove types; `summarize` is identical. Only relative imports, no DOM.
- `ui.mjs` takes `api` and the document as arguments. To reuse it in the Electron renderer, add the functions it calls (`loadSettings`, `saveSettings`, `loadData`, `saveData`, and drop the two backup buttons or map them to a folder backup in `main.ts`) to `Api`/`CHANNELS` in `shared.ts`, `preload.ts` and `main.ts` (with `assertTrusted` and argument checks as usual), keep data in `dataDir()`, and rename the extension to `.ts`.
- Going the other way: an Electron tool's `api.*` becomes a function on the browser `api`; anything Electron does in `main.ts` (files by path, SQLite, AI calls) has no equivalent here: say so to the user before promising it.
- Moving data from one to the other: the html tool's backup JSON is the transfer format; write the import in the Electron tool and test it on a copy.

## Save points

`save.ps1` already keeps `app/index.html`, `app/build.mjs`, `app/package.json`, `app/README.md`, `app/src/*.mjs|css|html` and `app/test/*.mjs`. `out/` and `current/` are builds, never saved. Nothing in this starter needs a new allowlist line.

## Verified (Edge 154, headless, `file://`, Windows)

12 unit tests pass (`node --test`); `node build.mjs` writes one file of about 21 KB with no `src=`/`href=`/`http` in it. Driven with puppeteer-core in a scratch folder: page renders; open file -> "sample.txt: 2 lines, 3 words, 15 characters."; setting and recent list survive a reload; Save and Export backup produce downloads; clearing storage then Restore brings everything back; a non-backup file is refused with a sentence; cancelling the picker is harmless; the same file copied to another folder sees the same data; zero CSP violations and zero network requests other than the `file://` page itself; the policy really blocks `fetch`, an injected inline `<script>`, an inline `style=""` and string `setTimeout`; sources with CRLF line endings still get matching hashes. Not verified: real Chrome (not installed here), Firefox/Safari, a real double-click from Explorer, and the browser's own renaming of repeated downloads (headless overwrote).
