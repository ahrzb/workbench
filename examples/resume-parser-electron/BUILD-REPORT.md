# Build report: Resume Parser (Electron 44 + TypeScript + Vite, Electron Forge), built with no admin rights and no C++ compiler

Date of run: 2026-09-29, Windows 11 build 26200 x64, standard (non-elevated) user, machine `DESKTOP-QTPN3M3`.
Everything below was observed on this run unless marked **[UNVERIFIED]** or **[INFERENCE]**.
Screen scaling is 150 %. `screenshot.png` is a CDP page capture (`Page.captureScreenshot`) of the packaged app: it shows the page only, without the Windows title bar, at 2229x1235 px.

## Verdict

**Yes. Electron built, packaged, installed, ran and uninstalled here with no administrator rights, no UAC prompt, no machine-wide change and no C++ compiler.**

- Route: **Node 24 + Node's own npm 10.9.8 + Electron Forge 7.11.2 (Vite + TypeScript template) + Electron 44.4.5.** MSVC is installed on this machine but was never invoked: `gyp`, `cl.exe` and `msbuild` matched **0 lines** in every install log (`scripts/scaffold.log`, `scripts/npm-install-*.log`). No dependency has a native module (`rebuildConfig` is empty, no `node-gyp`).
- Parser: **11/11 tests pass** (`npm test`, 1.6 s) through real pdf.js, mammoth and TXT extraction. The 7 Tauri cases are ported one-to-one; 4 are added (corrupt/unsupported files, TXT BOM and windows-1252, xlsx round trip with ExcelJS **and** a raw-OOXML re-read, skill store).
- Packaged app (`electron-forge package`, unpacked folder): launched, responds, closed cleanly with WM_CLOSE (exit code 0).
- Samples were loaded through the **real native Open dialog** and exported through the **real native Save dialog**, with the file-name box set by `WM_SETTEXT`, read back with `WM_GETTEXT` and compared before pressing OK with `BM_CLICK`. No keystroke automation touched any dialog and nothing outside `samples/` was browsed.
- Per-user installer (Forge's Squirrel.Windows maker): installed and uninstalled non-elevated (exit 0, no UAC, manifest says `asInvoker`, `HKCU` uninstall key only, no `HKLM` key). The installed app was driven through the same real dialogs.
- **One privacy finding you should know about:** a stock Electron app on Windows makes network connections on the first launch of a fresh profile (it downloads the en-US spellcheck dictionary from Google). It is invisible to `session.webRequest`. I found it by watching sockets and turned spellcheck off. After the fix: 0 TCP and 0 UDP endpoints (see Security settings).

## Toolchain steps (with wall-clock times)

Other tools were running during every step (see "Contention"). All timings are **indicative only**.

| # | Step | Command | Result / time |
|---|------|---------|---------------|
| 1 | Preflight | `whoami`, `node -v`, `bun -v`, env, disk | Not elevated. Node 24.21.0, Bun 1.4.2. `npm` on `PATH` is the broken `proto` shim (`proto::commands::run::missing_tool`). Node's own npm is at `%LOCALAPPDATA%\pi-node\current\npm.cmd` (10.9.8); `scripts/env.cmd` puts it first on `PATH` for a process only. `%LOCALAPPDATA%\electron\Cache` did not exist. No proxy variables. |
| 2 | Versions | npm registry + electronforge.io docs | Electron **44.4.5** (MIT), Forge **7.11.2** (MIT), pdfjs-dist **6.3.289** (Apache-2.0), mammoth **1.13.0** (BSD-2-Clause), exceljs **4.4.0** (MIT), vite 8.3.1, typescript 7.0.2. |
| 3 | **Scaffold + install** | `bunx create-electron-app@latest . --template=vite-typescript` (with `NODE_INSTALLER=bun`) | **92.3 s**, exit 0. Forge printed `Package manager bun is unsupported. Falling back to npm instead`, then ran `npm install` itself. It also ran `git init` inside the folder (I deleted that nested `.git`). The template it wrote is **stale** (TypeScript 4.5.4, Vite 5, ESLint 8, `@electron/fuses ^1.8.0`, `.ts` Vite configs, preload named `preload.js`). |
| 4 | **Electron binary** | `node node_modules/electron/install.js` (with `DEBUG=@electron/get:*`) | **18.9 s.** Electron 44 has **no `postinstall`**: `npm install` finished without downloading the binary and `node_modules/electron/dist` did not exist. The binary is fetched on first `electron` run or by the `install-electron` bin. Source: `https://github.com/electron/electron/releases/download/v44.4.5/electron-v44.4.5-win32-x64.zip`. Cache: `%LOCALAPPDATA%\electron\Cache` holds the zip: **158,184,819 bytes (150.9 MiB)**, extracted to `node_modules/electron/dist`. No proxy or TLS issue, no `NODE_TLS_REJECT_UNAUTHORIZED`. |
| 5 | Trim + upgrade deps | edit `package.json`, `npm install` | **16.3 s** (added 11, removed 186, changed 4). Removed ESLint, deb/rpm makers and auto-unpack-natives; moved to Vite 8 / TypeScript 7. |
| 6 | **First package (skeleton)** | `npm run package` | **20.0 s** cold (Electron already cached). Output: `out/Resume Parser-win32-x64` 368 MB. |
| 7 | Add deps | `npm install pdfjs-dist mammoth` | **13.9 s**. |
| 8 | **Add one dependency** | `npm install exceljs` | **16.0 s** (64 packages), then `npm run package` with the export code using it: **11.2 s**. So about **27 s** from "add a dependency" to a new packaged folder. |
| 9 | Squirrel installer | `npm run make` | **82.1 s** (package, Squirrel installer, zip). |

**Time to a first packaged skeleton, cold:** 92.3 (scaffold and install) + 18.9 (Electron binary) + 16.3 (my dependency cleanup) + 20.0 (package) = **≈147 s**. Without my cleanup (if the template were current) it would be about 131 s.

Licence terms accepted during this run: none by click-through.

### Telemetry

- No telemetry setting found in Electron, Forge, Vite or pdf.js. I set `DO_NOT_TRACK=1`, `npm_config_update_notifier=false`, `npm_config_audit=false` and `npm_config_fund=false` for the build process only (`scripts/env.cmd`). Bun (used only to run the scaffolder) has none that I know of **[UNVERIFIED: not read from docs]**.
- Electron itself does not start the crash reporter unless the app calls `crashReporter.start`; this app does not. **[UNVERIFIED: from docs and memory; the socket checks below show no traffic]**.
- The one real runtime network call was the spellcheck dictionary download (below), now disabled.

### Contention while timing

`Get-Process dart,flutter,java,gradle,node,msbuild,cargo,bun` before each step showed `java` x2, `node` x3 and often `cargo` x1–2 (other agents; I saw no `dart`, `flutter` or `msbuild`). A Flutter build may have been running. **Every time in this report is indicative.**

## Measurements

| Measurement | Electron (this run) | Compose (from its report) | Tauri (from its report) | How measured |
|---|---|---|---|---|
| Cold first build | **≈147 s** to a packaged skeleton (scaffold + install 92.3, Electron download 18.9, cleanup install 16.3, package 20.0). No JDK/Rust/MSVC download. | 73.8 s (+127 s JDK download) | 148.0 s (`tauri build --debug`) | `scripts/timed.ps1` stopwatch |
| UI change turnaround: CSS (Vite HMR in the real window) | **26, 32, 31 ms**, 34, 31, 30 ms in a second run | 2.8 / 2.4 / 2.7 s (Hot Reload) | 73–215 ms | `scripts/measure-hmr.mjs`: write `src/index.css`, poll `getComputedStyle` over CDP every 20 ms in the running Electron window. Includes up to ~20 ms polling error. |
| UI change turnaround: TypeScript edit | **65–93 ms** (six samples: 76, 83, 65, 78, 86, 93), **full page reload** | | | Same script, edit `src/renderer.ts`. `renderer.ts` has no HMR boundary, so Vite logs `page reload`. State is lost. |
| Main-process change | rebuild of `main.js`: **52, 55, 129 ms**; then the app must be restarted: type `rs` in the `npm start` terminal, restart gap **151 ms and 469 ms** (old window gone → new window rendered) | 3.98 s (`gradlew run`) | Rust rebuild 35.3 s | Edit, poll `.vite/build/main.js`. `rs` was injected with `WriteConsoleInput` (`scripts/inject-rs.ps1`), `scripts/watch-restart.mjs` timed the gap. **Forge does not restart Electron on its own** (see friction 5). Two samples only. |
| Dev start (`npm start` to first rendered window) | **9.24 s** (first run, Vite deps not optimised yet), **3.56 s** (warm) | 3.2–4.0 s (`gradlew run`) | "within seconds" | `scripts/start-dev-measured.mjs`: spawn to `#open` present over CDP |
| Rebuild after adding one dependency | **≈27 s** (16.0 s `npm install exceljs` + 11.2 s `package`) | ≈7.4 s | 35.3 s | see step 8 |
| Repackage after a UI or main change | **6.3–7.0 s** (`npm run package`, three runs: 7.0, 6.5, 6.3) | 7.6 s | 13.5–15.0 s | `scripts/timed.ps1` |
| Installer build (`npm run make`) | **82.1 s** | MSI 21.3 s | NSIS included in the 13.5–15.0 s | `scripts/timed.ps1` |
| `npm test` (11 tests) | **1.6 s** | 6.4 s | 7 tests | `scripts/timed.ps1` |
| Startup to first visible window, packaged exe | **0.36, 0.37, 0.38 s** (no debug port), 0.40–0.94 s in other runs | 1.6–1.9 s | not measured | `scripts/probe.ps1`: poll `EnumWindows` for the visible window titled `Resume Parser (Electron)` owned by the pid I started, every 20 ms |
| Memory, empty table, 6 s after first window | **≈321 MB working set total, ≈207 MB private**, 4 processes (browser ≈104, renderer ≈83–95, GPU ≈88, network utility ≈47 MB WS) | 240 MB WS (one JVM) | 33 MB (main process only, WebView2 children not counted) | Sum of `WorkingSet64` / `PrivateMemorySize64` over the exe's whole process tree (`scripts/probe.ps1`). Not comparable with Tauri's number. |
| Memory, samples loaded (4 files) | **≈379–388 MB WS, ≈234–257 MB private** (three runs: 379, 383, 388 / 234, 254, 257) | 279 MB WS, 639 MB private | | `scripts/drive-packaged.ps1`, 6 s after the rows appeared |
| Memory, after export | 402–407 MB WS, 291–305 MB private | | | same |
| Unpacked build folder | **370.1 MB** (`out/Resume Parser-win32-x64`); `ResumeParserElectron.exe` **234.6 MiB** (Electron itself); `resources/app.asar` **2.8 MB** (our code and libraries) | 122.9 MB | Release exe 10.73 MiB | recursive size |
| Installer | Squirrel `Setup.exe` **147.2 MiB** (154,345,984 bytes); `.nupkg` 146.5 MiB; zip of the folder 151.6 MiB | MSI 59.3 MB, EXE 60.0 MB | NSIS 2.76 MiB | `Get-Item` |
| Installed size on disk | **501 MB** (`%LOCALAPPDATA%\ResumeParserElectron`: the app folder plus a copy of the `.nupkg` in `packages\`) | 122.9 MB | | recursive size |
| Runs by double-click with no installer? | **Yes, as a folder.** `ResumeParserElectron.exe` needs the files next to it (copy the whole folder or the zip). I started it with `Start-Process`, not a physical double-click. A lone exe copy was not tried. | Yes, as a folder | A bare exe ran if WebView2 was present | |
| `node_modules` | **673 MB** (of which the extracted Electron binary is about 250 MB) | | 193 MB | recursive size |
| Electron download cache | **150.9 MB** (`%LOCALAPPDATA%\electron\Cache`) | `~/.gradle` 2,077 MB | `~/.cargo` 1,242 MB | recursive size |
| Build output | `out/` **≈815 MB** (folder 370 + make 445); `.vite/` 2.8 MB | `build/` 442 MB | `target/` 7,385 MB | recursive size |
| JS bundle | `index-*.js` **1,680 kB** (app + pdf.js + mammoth + ExcelJS), `pdf.worker.min-*.mjs` **1,265 kB**, CSS 3.5 kB | | 1,687 kB / 1,265 kB | `.vite/renderer/main_window/assets` |
| Free disk on C: | not re-measured | 28.9 GB | 38.5 → 28.9 GB | |
| Build-time network needs | npm registry, **github.com** (Electron zip), and the Squirrel/winstaller assets that ship inside npm packages (no extra download seen). No proxy on this machine. Behind a proxy or TLS inspection: **[UNVERIFIED]**. | Gradle, Maven, Adoptium, GitHub | crates.io, npm, NSIS | |
| Runtime network | **0 TCP and 0 UDP endpoints** for all four processes on a fresh profile, sampled every 100 ms for 10 s, three runs (`scripts/net-watch.ps1`), plus three 6-s probes. With `--remote-debugging-port` the only endpoint is the debug listener `127.0.0.1:9444`. See Security settings. | 0 TCP, 0 UDP | CSP proof | |

### Security reaction of Windows

- `ResumeParserElectron.exe` and `Setup.exe` are **unsigned** (`Get-AuthenticodeSignature` → `NotSigned`). Both were built locally, so no Mark-of-the-Web. I saw no SmartScreen prompt, no Defender toast and no UAC prompt for the folder build, the installer (run non-elevated) or the installed exe. `Get-MpThreatDetection`: 0 entries. I cannot see the secure desktop, so "no UAC prompt" means: the installer's manifest is `asInvoker`, it finished by itself with exit 0 and `elevated=False`, and nothing waited for input.
- **Windows Firewall:** I saw no firewall prompt and clicked nothing. Note that before the spellcheck fix the app did make outbound connections; no prompt appeared for them (outbound is normally not prompted) **[INFERENCE]**.
- **Smart App Control is off** on this machine. Whether an unsigned Electron exe would run under SAC enforcement is **[UNVERIFIED]**; per the other reports it is likely blocked **[INFERENCE]**.
- SmartScreen/MOTW was not exercised (nothing downloaded through a browser).

## The app (what was built)

Path: `examples/resume-parser-electron/`

- `src/parser.ts`: **byte-identical copy** of `reference-from-tauri/parser.ts` (it is pure; no edits). All fields, `found` / `not_found` / `uncertain` flags and notes, 46 default skills, both real-world regressions (an "I'm ..." prose line is not a name, `(+49)` keeps its bracket).
- `src/extract.ts`: PDF via `pdfjs-dist` (line rebuild from text items, wide gap → 2 spaces), DOCX via `mammoth` (browser build, `extractRawText`), TXT via `TextDecoder` (strict UTF-8, fallback windows-1252, BOM removed). Fewer than 20 visible characters gives `no text found (scanned?)`. Corrupt or unsupported files give `could not read file: ...` or `unsupported file type`. Libraries are injected, so the same file runs in the app and in node tests. The Tauri `extract.ts` was not in the reference folder, so I wrote this one; the sample layout gap (`Brightside Foods  Mar 2021 - Present`) came out right on the first run.
- **Where extraction runs: the sandboxed renderer, not the main process.** pdf.js and mammoth parse untrusted files. In the renderer they run in a process with no Node access, so a parser bug or a hostile file cannot reach the file system. In the main process a bug would run with the user's full rights. The main process only reads the bytes of paths that came out of the Open dialog and hands them to the page. Cost: the page sees file bytes (fine, they are the user's own files) and a huge PDF ties up the UI thread, though pdf.js parses in its own worker. `Worker` is the pdf.js worker bundled locally (`?url` import).
- `src/exportXlsx.ts`: **ExcelJS 4.4.0**, new workbook in memory. Bold, filled, wrapped header; frozen header row; auto-filter over the data; ID and phone as text cells (`@` format); years as numbers; a "Needs checking" column (edited cells are trusted and not listed). The file is written by the main process after a Save dialog, so ExcelJS never touches the disk or the resumes.
- `src/skillStore.ts`: `%APPDATA%\Resume Parser\skills.json` (`app.getPath('userData')`), atomic write via temp file + rename, sanitised (list of strings, max 500 entries, max 80 characters, case-insensitive de-duplication). A damaged file falls back to the defaults.
- `src/main.ts`, `src/preload.ts`, `src/shared.ts`: main process, four-function preload, shared types and IPC channel names.
- `src/renderer.ts`, `index.html`, `src/index.css`: one screen, plain TypeScript and DOM, no framework. Inline-editable cells (uncertain = yellow, not found = red, edited by you = blue), row click or cell focus shows the raw text on the right, collapsible skill list with "Save & re-scan" and "Restore defaults", Open / Export / Clear buttons, status footer. Text from files goes into the page only through `textContent` and `input.value`, never `innerHTML`. No horizontal scrolling at the default 1500x860 window (columns are percentages; the table scrolls below 1050 px).
- `samples/`: the 3 synthetic resumes and `scanned-example.pdf`, copied from `examples/resume-parser-compose/samples/`.
- `scripts/`: throwaway PowerShell/Node helpers used for timing, CDP driving, dialog driving and checks (kept as evidence). Debug hooks in `main.ts`: `RESUME_PARSER_DEBUG_FILES` (semicolon-separated paths) and `RESUME_PARSER_DATA_DIR`. **They are ignored when `app.isPackaged`**, so the shipped exe can only load files through the native Open dialog.

### Verification performed

- `npm test`: **11/11 pass**. PDF test asserts the 2-space layout gap, `Sofía Álvarez`, `+1 (555) 010-4477`, years = 8. DOCX test asserts the ALL-CAPS conversion and years = 14.5. TXT test asserts years = 6. Scanned test uses the real image-only `scanned-example.pdf`. Corrupt PDF, corrupt DOCX, a PDF truncated to 300 bytes and a `.png` all return a readable reason and do not throw. The xlsx test writes a file, re-reads it with ExcelJS (5 rows, frozen `ySplit=1`, bold header on all 11 columns, ID `C001` string with `@`, phone string with `@`, years numbers 8 / 14.5 / 6) and then unzips the OOXML independently (`<pane ySplit="1" ... state="frozen">`, `<autoFilter ref="A1:K5">`, bold font, `numFmtId="49"`).
  - I did not check that the two regression tests fail without their fix (same gap as the other reports). Equivalence with any other port beyond these cases is **[UNVERIFIED]**; here the parser is the original file, so that risk is small.
- `npm run typecheck` (`tsc --noEmit`, TypeScript 7): clean.
- **Dev run** (`npm start`, driven over CDP): 4 rows, 3 correct, scanned row red, `require`/`process`/`ipcRenderer` all `undefined` in the page, exposed API keys `openResumes, saveXlsx, loadSkills, saveSkills`.
- **Packaged folder build, real dialogs** (`scripts/drive-packaged.ps1`): click on "Open resumes…" (a CDP mouse event inside my own window), native dialog appeared, file-name box set to the absolute path of `samples/` and read back, OK; box set to the four quoted sample names and read back, OK → 4 rows in 0.40 s. The 3 real samples parsed correctly; `scanned-example.pdf` gave a red row `no text found (scanned?)`. Inline edit turned a cell blue. Export: native Save dialog, box set to `%TEMP%\resume-parser-electron-out\resumes-out.xlsx` and read back, OK → **7,567 bytes**. The page stayed responsive. Closed with WM_CLOSE, exit 0.
- **Independent re-read** of that file (`scripts/verify-xlsx.mjs`): sheet `Resumes`, 5 rows, frozen header, all header cells bold, ID and phone cells `@` format, years numeric (8, 14.5, 6), edited name exported (`Sofía Álvarez (edited)`), `Needs checking` = `Other links (not found)`, `GitHub (not found)`, `LinkedIn (not found)`, `no text found (scanned?)`, autoFilter `A1:K5`. The resumes were only read.
- **Installer** (`scripts/install-test.ps1`, `Setup.exe` run as the standard user): the installed exe was present after 3.4 s and Setup exited 0 after 12.1 s. Installed to `%LOCALAPPDATA%\ResumeParserElectron\app-1.0.0\`. Created a Desktop shortcut and a Start-menu shortcut. `HKCU` uninstall key: 1; `HKLM`: 0. Squirrel also launched the app on its own (4 processes, which I closed). I then drove the **installed** exe through the same real dialogs: 4 rows, export 7,568 bytes, WM_CLOSE exit 0. `Update.exe --uninstall -s`: exit 0 in 1.1 s; the `HKCU` key and both shortcuts were gone. **Squirrel left `%LOCALAPPDATA%\ResumeParserElectron` behind with 4 files, 4.3 MB** (`Update.exe`, a `.dead` marker, `squirrel.exe`, `v8_context_snapshot.bin`); I removed that folder by hand.
  - The Setup.exe I installed was built **before** I turned off `GrantFileProtocolExtraPrivileges`. The unpacked folder was rebuilt and re-driven after that change; the installer was not rebuilt. **[UNVERIFIED for the final installer]**
- **Skill list persistence across a real restart** (`scripts/skills-persist.ps1`): saved `Excel, Python, Rust` in the packaged app, closed it, `skills.json` contained `[ "Excel", "Python", "Rust" ]`, relaunched and the list showed `Skill list (3)` with the same lines. I deleted the file afterwards.
- **Attack probes in the packaged window** (`scripts/security-check.mjs`): `fetch('https://example.com')` → `Failed to fetch`; `fetch('http://127.0.0.1:1/')` blocked; injected `<script src=https://…>` and `<img src=https://…>` blocked; `window.open` returned `null`; setting `location.href = 'https://example.com/'` left the page at `app://local/index.html`; an inline `style` attribute had no effect (CSP `style-src 'self'`); `saveSkills('text')` rejected in the main process; `saveXlsx('not bytes')` refused. **The `eval('1+1')` probe returned 2 but is not valid evidence:** it ran through the DevTools protocol, which bypasses the page CSP. That the CSP blocks `eval` is **[UNVERIFIED]** (no `unsafe-eval` is in the policy). `<a target=_blank>` clicked without visible effect; I did not count new windows **[UNVERIFIED beyond `setWindowOpenHandler` being deny-all]**.

## Friction log

Count of attempts is "tries until it worked".

| # | What went wrong | Category | Attempts to fix |
|---|-----------------|----------|-----------------|
| 1 | **Electron 44 does not download its binary on `npm install`** (no `postinstall`; `dist/` missing, cache empty). It downloads on first run, or with the `install-electron` bin. Found by looking, not by an error. Not the Bun `trustedDependencies` problem, because Forge fell back to npm. | Electron install | 1 |
| 2 | **`create-electron-app` template is stale and Bun is unsupported.** Forge 7.11.2 printed `Package manager bun is unsupported. Falling back to npm`. The template pins TypeScript 4.5.4, Vite 5, ESLint 8 and creates a nested `.git`. The template on Forge's `main` branch is newer (`.mts` configs, `main.cjs`), but it is not what the released CLI writes. I hand-edited `package.json`, upgraded Vite/TypeScript, dropped ESLint, deb and rpm makers. | Scaffold | 2 (first `package` failed: `Cannot find module '@electron-forge/maker-deb'` because `forge.config.ts` still imported it) |
| 3 | Vite 8 warns `Your Vite config uses features unsupported by configLoader: 'native'` for `vite.*.config.ts`. Renamed to `.mts`. Also a harmless `inlineDynamicImports option is deprecated` from the Forge plugin. | Vite | 1 |
| 4 | **REAL FINDING: the app phoned Google on first launch.** With spellcheck at its default, a fresh profile makes the browser process download `en-US-10-1.bdic`: my probe showed 2 established TCP connections on :443 and 1 UDP endpoint owned by the app. `session.webRequest.onBeforeRequest` never saw it. It was intermittent (0 endpoints on later runs because the dictionary was cached in `%APPDATA%\Resume Parser\Dictionaries`), so I only caught it because the first probe ran on a fresh profile. Fix: `session.setSpellCheckerEnabled(false)` and `setSpellCheckerLanguages([])`. Re-tested with the profile deleted: 0 endpoints, no `Dictionaries` folder. | Electron privacy | 1 (after 3 confusing probe runs) |
| 5 | **Forge does not restart Electron when the main process changes.** It rebuilds `main.js` in 50–130 ms and logs `target built src/main.ts`, then nothing happens until you type `rs` in the terminal. `rs` only works when stdin is a TTY (`interactive: process.stdin.isTTY` in `electron-forge-start.js`). My measurement script with piped stdin silently did nothing (two attempts reported "NaN"). I started `npm start` in its own console window and injected `rs` + Enter with `WriteConsoleInput` (`scripts/inject-rs.ps1`); first attempt failed with `Cannot convert value "-1073741824" to type UInt32` (my P/Invoke constant). | Forge dev loop / test automation | 4 |
| 6 | **Another agent's probe sent WM_CLOSE to my dev window** because both apps used the title `Resume Parser (local, offline)`; my dev server then exited. Changed my title to `Resume Parser (Electron)`. Also renamed my exe (`ResumeParserElectron.exe`) and the Squirrel install folder (`ResumeParserElectron`), because the default `ResumeParser.exe` and `%LOCALAPPDATA%\ResumeParser` collide with the Compose build's. I had already run `Get-Process ResumeParser | CloseMainWindow` once, which could have hit a Compose window; nothing else was running under that name when I looked afterwards. | Shared machine | 1 |
| 7 | **Windows Save dialog has a different window tree from the Open dialog.** My finder looked for `ComboBoxEx32 > ComboBox > Edit` and threw `file-name edit not found` for the Save dialog (`FloatNotifySink > ComboBox > Edit`). Nothing was typed or clicked in it; I dumped the child windows, generalised the finder to "first Edit whose parent is a ComboBox", and cancelled the leftover dialog with `BM_CLICK` on IDCANCEL. | Test automation | 2 |
| 8 | **My test had a wrong expectation** for the `Needs checking` cell of the edited-name row (`""`; the resume simply has no "other links", so it says `Other links (not found)`). Fixed the test, not the code. | Test expectation | 1 |
| 9 | Node prints `MODULE_TYPELESS_PACKAGE_JSON` when the tests import `.ts`. Adding `"type": "module"` would make Electron load the CommonJS main bundle as ESM, so I used `--disable-warning` in the test script instead. | Node | 1 |
| 10 | Node prints `UnknownErrorException: Ensure that the standardFontDataUrl API parameter is provided` for the sample PDF (non-embedded standard fonts). Text extraction is right. Not fixed (same as the Tauri report item 10). | pdf.js | not fixed |
| 11 | **No Electron API mistakes in the app code:** no `remote` module, preload path correct (`.vite/build/preload.js`, matching this template version; the newer template uses `preload.cjs`), no `nodeIntegration`, `contextBridge` used correctly, pdf.js worker loaded under the strict CSP on the first try (`worker-src 'self' blob:`). I read the current Electron security docs first; I have no data for an unprimed run. Design choice that avoided a CSP problem: serving the page from a custom `app://local` protocol (`protocol.handle`) instead of `file://`, so the CSP can be a response header and the worker has a real origin. The dev server needed a looser CSP (`style-src 'unsafe-inline'`, `ws://localhost:*`), which is why the CSP is set in `main.ts` rather than in a `<meta>` tag. | Electron API | 0 |
| 12 | **Squirrel's uninstall leaves files behind** (`Update.exe`, `.dead`, 4.3 MB) because `Update.exe` cannot delete itself while it runs. The registry key and shortcuts are removed. | Packaging | not fixed |
| 13 | **Installer is huge** (147 MiB) because it wraps the whole 370 MB folder, and the installed copy is 501 MB (Squirrel keeps a copy of the `.nupkg` in `packages\`). | Packaging | not fixed |
| 14 | Shell quirks (same as the other reports): the Bash tool is not PowerShell, inline `$env:` and `$(...)` break, and a PowerShell-written pid file is UTF-16 and made the tool fail with `stream did not contain valid UTF-8`. Everything real went into `.ps1`/`.mjs` files. `edit` once warned `Recovered from a stale file hash`; the result was correct. | Agent shell | 2–3 |

**Read of the evidence:** with the current docs read first, Electron's own surface (window, preload, IPC, dialogs, CSP, fuses) cost no rework. The rework came from the stale scaffold, the lazily downloaded binary, Forge's dev loop details, the hidden first-launch network call, and test automation on a shared machine. Build and run loops are quick (6–7 s repackage, 26–93 ms UI update, 0.37 s cold window), but the artefacts are big: 370 MB folder, 147 MiB installer.

## Security settings

All are in `src/main.ts`, `src/preload.ts`, `forge.config.ts`; each was verified by reading the code, and the items marked (probe) also by trying to break them in the packaged window (`scripts/security-check.mjs`).

| Setting | Value / evidence |
|---|---|
| `contextIsolation` | `true` |
| `sandbox` | `true` (renderer and preload sandboxed) |
| `nodeIntegration` | `false` (`typeof require/process/ipcRenderer/fs` → `undefined` in the page, probe) |
| `webSecurity`, `allowRunningInsecureContent` | `true`, `false` |
| `devTools` | only when not packaged |
| Preload API | `contextBridge.exposeInMainWorld('resumeApi', …)` with exactly four named functions: `openResumes`, `saveXlsx`, `loadSkills`, `saveSkills`. No `ipcRenderer`, no `fs`, no generic `invoke`. (probe: `Object.keys(window.resumeApi)`) |
| IPC handlers | each calls `assertTrusted`: `event.senderFrame.url` must start with `app://local/` (or the dev server URL in dev). `saveSkills` validates a list of short strings; `saveXlsx` requires non-empty bytes of at most 50 MB (probes: both rejected bad input). |
| Path validation | The page never sends a path. Main reads only paths returned by `dialog.showOpenDialog` (a `Set` records them), rejects non-`.pdf/.docx/.txt` extensions and files over 50 MB. The Save handler writes only the path the user confirmed in `showSaveDialog`, requires `.xlsx`, and **refuses any path equal to an opened resume**. The refusal branch was **not exercised** (Windows would first ask "replace file?"): **[UNVERIFIED]**. |
| CSP | Sent as a response header by the `app://` protocol handler (and by `onHeadersReceived` for the dev server): `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; worker-src 'self' blob:; connect-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'`. No remote origin. No `unsafe-inline` or `unsafe-eval` in the production policy. The header was read back from the packaged window (probe). |
| Navigation | `will-navigate` and `will-redirect` cancelled unless the URL is `app://local/…`; `setWindowOpenHandler` denies everything; `will-attach-webview` cancelled. (probe: top-level navigation to https://example.com left the page unchanged; `window.open` → `null`) |
| Permissions | `setPermissionRequestHandler` → deny all; `setPermissionCheckHandler` → false. |
| Request filter | `session.webRequest.onBeforeRequest` cancels and logs (`[blocked request]`) anything that is not `app://local`, `blob:`, `data:`, `devtools:` (or the dev server). It never logged anything in my runs. |
| Spellcheck | disabled on the session (see friction 4). Without this the app made network requests on a fresh profile. |
| `remote` module | not used and not installed (Electron ≥ 14 removed it from core). |
| Custom protocol | `app://local`, `standard` + `secure` + `supportFetchAPI`, serves only files under the renderer build folder (path traversal check with `path.normalize` and a prefix test). |
| Fuses (read back with `@electron/fuses read` from the packaged exe) | `RunAsNode` **Disabled**, `EnableCookieEncryption` Enabled, `EnableNodeOptionsEnvironmentVariable` **Disabled**, `EnableNodeCliInspectArguments` **Disabled**, `EnableEmbeddedAsarIntegrityValidation` **Enabled**, `OnlyLoadAppFromAsar` **Enabled**, `GrantFileProtocolExtraPrivileges` **Disabled** (I added this: the page is never loaded from `file://`). `LoadBrowserProcessSpecificV8Snapshot` stays Disabled. Set by `@electron-forge/plugin-fuses`; it needs no extra tooling. The unpacked folder was re-tested after the last change. |
| Network at runtime | **0 TCP and 0 UDP endpoints** for the app's process tree on a fresh profile, sampled every 100 ms for 10 s in three runs, plus three probes 6 s after start (`scripts/net-watch.ps1`, `scripts/probe.ps1`), and no `Dictionaries` folder created. Samples loaded and export: with `--remote-debugging-port` the tree owns one endpoint, the local debug listener `127.0.0.1:9444`; **the same states without the debug port were not sampled** **[UNVERIFIED]** (I needed CDP to click). |
| Residual risks | `--remote-debugging-port` and `--inspect` style switches: `EnableNodeCliInspectArguments` is off, but `--remote-debugging-port` is a Chromium switch that still worked on the packaged exe (I used it). Anyone who can start the exe with arguments already runs as that user, so this is not a remote hole, but it is not blocked either **[INFERENCE]**. The exe is unsigned; ASAR integrity protects `app.asar` against tampering only on Windows and macOS, and does not stop someone replacing the exe **[from docs, UNVERIFIED]**. Electron ships its own Chromium, so it needs updating when Chromium is patched (44.4.5 is current today). |

## Packages and licences

| Package | Version | Licence (from the npm registry unless noted) | Use |
|---|---|---|---|
| electron | 44.4.5 | MIT (Chromium and Node.js parts ship their own licences: `LICENSES.chromium.html` is in the folder) | runtime |
| @electron-forge/cli, plugin-vite, plugin-fuses, maker-squirrel, maker-zip | 7.11.2 | MIT | build, package |
| @electron/fuses | 1.8.0 (installed; 2.1.3 exists) | MIT | fuses |
| electron-squirrel-startup | 1.0.1 | Apache-2.0 | shortcut creation during Squirrel install/uninstall |
| vite | 8.3.1 | MIT | bundler, dev server |
| typescript | 7.0.2 | Apache-2.0 | type check only |
| pdfjs-dist | 6.3.289 | Apache-2.0 | PDF text (worker bundled locally) |
| mammoth | 1.13.0 | BSD-2-Clause | DOCX text |
| exceljs | 4.4.0 | MIT | xlsx writer (its last release is old; four deprecated transitive packages were reported by npm: `lodash.isequal`, `rimraf@2`, `fstream`, `uuid@8`) |
| jszip | transitive (via ExcelJS/mammoth), listed as a dev dependency for the tests | MIT or GPL-3.0 (dual) **[UNVERIFIED: from memory]** | test-only raw OOXML read |
| @types/node, @types/electron-squirrel-startup | 24.x, 1.0.x | MIT **[UNVERIFIED: not read]** | types |
| Squirrel.Windows (inside `electron-winstaller`) | not inspected | MIT **[UNVERIFIED]** | installer engine |

Nothing here needs a commercial licence. SheetJS was not used: ExcelJS writes styles in its normal build.

## How a non-programmer would run it

- **She never builds it.** The maintainer gives her either the per-user installer `out/make/squirrel.windows/x64/Resume Parser-1.0.0 Setup.exe` (147 MiB) or the zip `out/make/zip/win32/x64/Resume Parser-win32-x64-1.0.0.zip` (152 MiB, unzip anywhere, double-click `ResumeParserElectron.exe`; the folder must stay together).
- **Installer:** double-click. It ran here without UAC and installed to `%LOCALAPPDATA%\ResumeParserElectron`, created a Desktop and a Start-menu shortcut, and launched the app by itself. To remove: Windows "Apps" list (the `HKCU` uninstall entry exists) or `Update.exe --uninstall`.
- **Where it is fragile:** unsigned. A browser download or e-mail attachment carries Mark-of-the-Web, so SmartScreen may warn; Smart App Control, if enforcing, may block unsigned code. Both **[UNVERIFIED]**, nothing was signed or downloaded here. 147 MiB is big for e-mail. She needs no other runtime (Electron bundles Chromium and Node) and no admin rights.
- **Maintainer's loop:**

```
cd examples\resume-parser-electron
scripts\env.cmd                # or any shell where `npm` works (the proto shim here is broken)
npm install
npm test                       # 11 tests: parser + real extraction + xlsx + skill store
npm run typecheck
npm start                      # dev: Vite HMR (CSS ~30 ms, TS = page reload ~80 ms); main-process change: type `rs`
npm run package                # unpacked folder, ~7 s warm  -> out\Resume Parser-win32-x64
npm run make                   # Squirrel installer + zip, ~82 s -> out\make
```

The first `npm start` or `npm run package` needs the Electron binary in `%LOCALAPPDATA%\electron\Cache` (downloaded from github.com; `node node_modules/electron/install.js` fetches it explicitly).

## Open issues

- **macOS needs [UNVERIFIED, docs only; not run]:**
  - Forge packaging targets the host OS: a macOS `.app`/`.dmg`/zip has to be built on a Mac (`npm run make` there); cross-building from Windows is not supported **[UNVERIFIED]**.
  - Distributing to other Macs needs an Apple Developer ID certificate, code signing (`packagerConfig.osxSign`, `@electron/osx-sign`) and notarisation (`osxNotarize`, `@electron/notarize`, Xcode command-line tools). Without them Gatekeeper blocks the app on download.
  - The `userData` path is `~/Library/Application Support/Resume Parser`; Electron handles that. The Squirrel maker is Windows-only; macOS would use the zip/dmg makers. The native Open/Save dialogs and `dialog.showOpenDialog` filters behave natively there, but multi-select and filters were not tested. ASAR integrity and the fuses apply on macOS too, and signing must happen after the fuses are flipped.
- **Could the HTML UI double as the single-HTML-file fallback? Very likely yes, but I did not build it.** The whole UI is plain DOM in `index.html` + `renderer.ts` and reaches the outside world only through `window.resumeApi` (four functions). A browser build would need: a shim for those four functions (`<input type=file multiple>` for open, a download link for export, `localStorage` for skills, as in the Tauri build's `platform.ts`), a single-file Vite plugin, and the pdf.js worker inlined as a blob (or a `<script>`-embedded worker). Expect a ≈3–4 MB HTML file (the JS bundle alone is 1.7 MB, the worker 1.3 MB, before base64 or inlining). The CSP would have to move into a `<meta>` tag and allow `blob:` workers. **[UNVERIFIED: not tried]**
- **Size:** 370 MB folder, 147 MiB installer, 501 MB installed, ≈321 MB working set for an empty window. That is 3x the Compose folder, and about 50x the Tauri installer (which reuses the system WebView2 and has no bundled browser).
- **Forge Vite plugin is marked "experimental"** in the Forge docs (since 7.5.0); minor releases may break the config. The released `create-electron-app` template is stale (friction 2).
- **Main-process changes need a manual `rs`** in a real terminal (friction 5). Renderer TypeScript edits reload the whole page and lose table state (only CSS hot-swaps).
- **The installer was built before the last fuse change** (`GrantFileProtocolExtraPrivileges`); re-run `npm run make` to refresh it. The exe folder was rebuilt and re-tested.
- **Squirrel uninstall leaves 4.3 MB behind** and the default publisher shown is the `authors` string. Nothing is signed.
- **Not tested:** a physical double-click in Explorer; a lone exe copy; another PC; macOS/Linux; SmartScreen/MOTW; Smart App Control enforcement; the "refuse to overwrite a resume" branch; the CSP blocking `eval` (probe invalid, see above); memory of the dev run; the `.zip` maker output was built but not unpacked and run; how the app behaves behind a corporate proxy; large or encrypted PDFs (pdf.js raises an error that the app shows as `could not read file: …`).
- **Parser limits (by design, same as Tauri and Compose):** multi-column PDFs can interleave columns; `Surname, Given` and non-Latin names are not handled; years of experience is empty with an `uncertain` flag when there are date ranges but no Experience heading; skill matching is literal; no OCR. The PDF line rebuild in `extract.ts` was tested on three synthetic layouts only.
- **Files left on disk:** `node_modules` 673 MB, `out/` ≈815 MB and `.vite/` (all git-ignored, safe to delete), the Electron download cache 150.9 MB in `%LOCALAPPDATA%\electron\Cache`, and nothing else outside this folder: I deleted the installed copy, the Chromium profile in `%APPDATA%\Resume Parser` and the test exports and screenshots in `%TEMP%` at the end. A stray `ResumeParserElectron` process: none was running when I finished.
