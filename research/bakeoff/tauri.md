# Build report: Resume Parser (Tauri 2 + TypeScript), built with no admin rights

Date of run: 2026-09-29, Windows 11 build 26200 x64, standard (non-elevated) user, machine `DESKTOP-QTPN3M3`.
Everything below was observed on this run unless marked **[UNVERIFIED]** or **[INFERENCE]**.

## Verdict

**Yes. Tauri 2 built and ran here with no administrator rights and no UAC prompt.** The route that worked is **route 1: the Rust toolchain and MSVC Build Tools that were already on the machine, plus per-user JS tooling.** I did not install any toolchain, so routes 2 (portable-msvc) and 3 (GNU/llvm-mingw) were never needed and were **not tried**.

Important caveat for the "no admin" claim. The machine already had the parts that normally need admin:

- Visual Studio Build Tools 2022 17.14.41, with the C++ toolset MSVC 14.44.35207 and Windows SDK 10.0.26100.0. `vswhere` shows it was installed on 2026-06-14 by `winget` (`campaignId: winget`). That install needed admin, and I did not do it.
- The Rust toolchains (`stable` 1.98.1 and `1.96.0`) were already present in `~/.rustup`, per-user.
- The machine-wide WebView2 Runtime 153.0.4234.48 was already present.

So this run proves: **given MSVC Build Tools + WebView2 already present, everything else (Rust crates, Tauri CLI, build, per-user NSIS installer, run) needs no admin.** It does **not** prove that a machine with no MSVC can get one without admin. That is **[UNVERIFIED]**: I did not try `portable-msvc`.

Other results:

- Parser test: 7/7 pass. It covers the 3 samples through real pdf.js, mammoth and TextDecoder extraction.
- The built `.exe` was launched, driven end to end (native Open dialog → parse → native Save dialog → real `.xlsx`), and closed cleanly.
- Screenshot: `screenshot.png`.
- One incident during testing you should know about is under "Friction log", item 14.

## Toolchain steps (with wall-clock times)

| # | Step | Command | Result / time |
|---|------|---------|---------------|
| 1 | Preflight | PowerShell script: `whoami /groups`, `Get-ExecutionPolicy -List`, `$ExecutionContext.SessionState.LanguageMode`, `Get-Command`, `vswhere -all -format json`, registry read for WebView2 | 1.2 s. Not elevated (Administrators group is "deny only", integrity Medium). `MachinePolicy`/`UserPolicy` Undefined, `LocalMachine` RemoteSigned. Language mode FullLanguage. AppLocker effective policy is empty. Smart App Control policy state `VerifiedAndReputablePolicyState = 0` (off). |
| 2 | Versions | `rustc -vV`, `rustup show` | rustc/cargo 1.98.1, rustup 1.29.1, host `x86_64-pc-windows-msvc`. Targets installed: msvc, gnu, gnullvm, wasm32. |
| 3 | JS runtime | `node -v`, `bun -v` | Node 24.21.0 (via `proto` shim), Bun 1.4.2 (WinGet link). The `npm` shim is broken: `proto::commands::run::missing_tool ... npm latest`. **I used Bun for install and scripts, and Node 24 to run the parser test.** Nothing was installed. |
| 4 | JS deps | `bun add @tauri-apps/api @tauri-apps/plugin-dialog @tauri-apps/plugin-fs pdfjs-dist mammoth exceljs` then `bun add -d @tauri-apps/cli vite typescript @types/node` | 15.7 s. Resolved: `@tauri-apps/cli` 2.12.0, `api` 2.12.0, `plugin-dialog` 2.8.0, `plugin-fs` 2.6.0, `pdfjs-dist` 6.3.289, `mammoth` 1.13.0, `exceljs` 4.4.0, `vite` 8.3.1, `typescript` 7.0.2. |
| 5 | `tauri info` | `bun run tauri info` | 18 s. All ✔: WebView2 153.0.4234.48, MSVC (VS Build Tools 2022), rustc, cargo, rustup. |
| 6 | Icons | `scripts/make-icon.ps1` (System.Drawing) then `bun run tauri icon src-tauri/app-icon.png` | 2.7 s. I deleted the generated android/ios icon folders. |
| 7 | **First build** | `bun run tauri build --debug` (skeleton app: window + dialog plugin, 0.7 kB JS) | **148.0 s** (02:42:13 → 02:44:41). Output: debug exe 13,555,712 bytes (12.9 MiB) and NSIS installer 2,540,581 bytes (2.4 MiB). `src-tauri/target` was 3,077 MB after this build. No UAC, no prompts. |
| 8 | Tauri's own tool download | during step 7 | `%LOCALAPPDATA%\tauri\NSIS` (7 MB) appeared. Tauri fetches NSIS itself at first bundle. The source URL was not inspected **[UNVERIFIED]**; it needs network access at that moment. Installed per-user, no admin. |

Wall clock from my first preflight command (02:39:46) to a first working exe (02:44:41): **about 5 minutes**. That includes writing the skeleton files.

Licence terms: none accepted this run, because no Microsoft toolchain package was downloaded or extracted. (If route 2 is ever used, the Visual Studio Build Tools licence and the Windows SDK licence must be accepted, and that acceptance should be recorded here.)

**Not run, so not observed:** the `portable-msvc` route (route 2), the GNU/llvm-mingw route (route 3), and `rustup-init` per-user install. The GNU target is already installed via rustup on this machine. I did not test whether Tauri builds against it.

## Measurements

| Measurement | Value | How measured |
|---|---|---|
| Time to first successful build (skeleton, `tauri build --debug`) | **148.0 s** | Stopwatch inside a PowerShell wrapper, cold `target/`. |
| Hot reload in `tauri dev`, frontend-only change | **215 ms** (first edit), **73 ms** (second edit) from file write to the changed text in the real Tauri window's DOM | I attached to the WebView2 window over CDP (`--remote-debugging-port` via `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`), wrote `src/main.ts`, and polled the DOM every 25 ms. Includes up to ~25 ms polling error. |
| `tauri dev` start (Rust already compiled) | app window up within seconds; `Finished dev profile in 0.49 s` | tauri-dev log. |
| Incremental Rust rebuild after adding one plugin (`tauri-plugin-fs` in `Cargo.toml` + `lib.rs`) | **35.3 s** (`cargo build`, debug) | Stopwatch. Compiles the new crates and relinks. |
| Full `tauri build --debug` with the full app, first time after adding the plugin and all frontend code | **25.0 s** | Stopwatch. |
| Full `tauri build --debug` after a frontend-only change (parser fix, CSS, HTML) | **13.5–15.0 s** (three runs: 13.6, 15.0, 13.5) | Stopwatch. Includes `tsc`, `vite build`, relink, NSIS. |
| Release build, cold for the release profile (`tauri build`) | **≈125 s** | Wall time of the background job; the precise stopwatch line was lost to a pipe error in my wrapper. Approximate. |
| Debug exe | 14.91 MiB (`target/debug/resume-parser-tauri.exe`). All sizes in this report are binary units (1 MB = 1,048,576 bytes) unless a value is in bytes or says "MB" for folder totals from the same script. | `Get-Item`. |
| Debug NSIS installer | 3.45 MB | |
| **Release exe** | **10.73 MB** | |
| **Release NSIS installer** | **2.76 MB** | |
| `src-tauri/target` | 7,385 MB total: debug/deps 2,710 MB, debug/incremental 1,402 MB, release 1,535 MB (the rest is bundle output and other debug files) | Recursive size. It was 3,077 MB after the first build alone. It grew from repeated `tauri dev`/`build` runs, so the debug total is inflated by incremental caches. |
| `node_modules` | 193 MB | |
| `~/.cargo` | 1,242 MB (was 1,013 MB before my build, so +229 MB of crates) | |
| `~/.rustup` | 2,980 MB (pre-existing, unchanged) | |
| MSVC Build Tools 2022 | 3,419 MB (pre-existing, installed by admin in June) | |
| Windows SDK 10 | 1,713 MB (pre-existing) | |
| `%LOCALAPPDATA%\tauri` (NSIS tooling) | 7 MB | |
| Bun global cache | 2,348 MB (shared with everything else on the machine, not attributable to this project) | |
| JS bundle | `index-*.js` 1,687 kB (483 kB gzip): app + pdf.js main + mammoth + ExcelJS; `pdf.worker.min-*.mjs` 1,265 kB; CSS 3 kB | `vite build` output. |
| Process memory 8 s after launch (debug exe, empty table) | 33 MB working set for the main process | `Process.WorkingSet64`. The WebView2 child processes are not included. |
| Free disk on C: | 38.5 GB at start → 28.9 GB after everything | |
| Build-time network needs | crates.io (Rust crates), the npm registry, and Tauri's NSIS download | No proxy on this machine. Behind a corporate proxy or TLS inspection this is **[UNVERIFIED]**. |

### Security reaction of Windows

- The built exe is **unsigned** (`Get-AuthenticodeSignature` → `NotSigned`). It has **no Mark-of-the-Web** (built locally). It ran with no SmartScreen prompt, no Defender toast and no UAC prompt, for the debug exe, the release exe and the installed exe.
- `Get-MpThreatDetection` returned nothing, and the Defender/Operational and CodeIntegrity/Operational logs had no events since launch. I could read both logs without error, but I cannot prove they were complete for a standard user. Treat this as "no reaction observed", not as proof.
- **Smart App Control is off on this machine** (policy state 0). **Whether an unsigned Tauri exe would run under SAC enforcement is [UNVERIFIED] and, per `research/03a`, likely blocked [INFERENCE].** This result does not generalise to SAC-enforced machines.
- SmartScreen was not exercised. It only fires for files with Mark-of-the-Web (a browser download or an emailed exe). Copying the exe or installer to another PC via email or a browser download would trigger it **[UNVERIFIED for this app]**.
- **Windows Firewall prompt:** during the session a "Do you want to allow public and private networks to access this app? **Node.js JavaScript Runtime**" dialog appeared on the desktop. I did **not** click Allow and did not interact with it. I could not attribute it to a specific action. It may come from the browser-automation tooling I used or from another Node process on the machine. The Vite dev server binds to `localhost` only, so it should not trigger this. I did not test that separately.

## The app (what was built)

Path: `examples/resume-parser-tauri/`

- `src/parser.ts`: pure parser, no Tauri, DOM or network imports. It returns email, phone, LinkedIn, GitHub, other links, name, skills, years of experience and section-heading presence. **Every field carries a flag** (`found` / `not_found` / `uncertain`) and a note.
- `src/extract.ts`: PDF via `pdfjs-dist` (line reconstruction from text items, with layout-gap handling), DOCX via `mammoth`, TXT via `TextDecoder`. A file with almost no text returns `no text found (scanned?)`. Libraries are injected, so the same code runs in node tests and in the app.
- `src/libs.ts`: browser wiring; the pdf.js worker is bundled locally with `?url`.
- `src/platform.ts`: the only module that touches Tauri plugins. It falls back to `<input type=file>`, a download link and `localStorage` in a plain browser (used to check the UI under `vite`).
- `src/exportXlsx.ts`: builds a NEW workbook with ExcelJS. The sheet has a bold, filled, frozen header row and an auto-filter. ID and phone are string cells with the `@` (Text) format. Years is a numeric cell. A "Needs checking" column lists the flagged fields (edited cells are not flagged).
- `src/main.ts` + `src/style.css`: one screen. Inline-editable table (uncertain = yellow, not found = red, edited by you = blue). Clicking or focusing a row shows the raw extracted text side by side. A collapsible, persistent skill list. Buttons: Open resumes…, Export to Excel, Clear table.
- Skill list persistence: `$APPDATA/dev.example.resume-parser/skills.json`. I observed that a saved list survived an app restart.
- `src-tauri/`: template plus two plugin registrations, `tauri_plugin_dialog::init()` and `tauri_plugin_fs::init()`. **No custom Rust commands.**
- `samples/`: 3 synthetic resumes with fake people, generated by `scripts/make-samples.mjs` (the PDF is hand-written PDF 1.4 with no library, the DOCX is built with jszip).
  - PDF "Sofía Álvarez": accents, a header row with `|` separators, right-aligned dates.
  - DOCX "DANIEL OKAFOR": ALL-CAPS name, `+234` phone, `·` separators, `03/2012` date format.
  - TXT "Priya Raman": contact line before the name, labelled fields, explicit "6+ years".

Why ExcelJS and not SheetJS: I chose ExcelJS because it writes cell styles (bold header) in the free build. My understanding is that the free SheetJS community edition cannot write styles, but I did not verify that this run **[UNVERIFIED]**. ExcelJS 4.4.0 comes from npm. Its last release is old, which is worth watching.

### Verification performed

- `bun run test`: **7/7 pass.**
  - PDF sample: name, email, phone, LinkedIn, GitHub, skills, years = 8. The "2014 - 2018" education range is not counted and is not mistaken for a phone number. The 2-space layout gap is asserted.
  - DOCX sample: ALL-CAPS name converted, `+234` phone, years = 14.5.
  - TXT sample: contact line before the name, years = 6 from the stated text.
  - Plus tests for skill-list edits (`MySQL` ≠ `SQL`, `JavaScript` ≠ `Java`, `C++`/`C#`/`.NET`), flagging of ambiguous or missing data, the scanned/empty-file message, and two regressions found on real-world PDFs (see friction items 12–13). I did not check that the regression test fails without the fix. I saw both bugs live in the app instead.
- UI under plain `vite` in Edge: 3 samples load, the table is correct, editing marks a cell blue, export downloads a real `.xlsx`.
- **In the real built exe** (Edge WebView2, driven over CDP + Win32 messages to the native dialogs):
  - **Open:** native Open dialog with three files selected → 3 rows parsed correctly.
  - **Scanned:** a text-less PDF gave a red row "no text found (scanned?)".
  - **Save:** native Save dialog → `resumes-out.xlsx` (7,369 bytes) written.
  - **Re-read:** re-reading that file with ExcelJS showed sheet `Resumes`, 4 rows, frozen header (`ySplit 1`), bold header, ID and phone cells of string type with `@` format, years numeric (8, 14.5, 6).
  - **Sources untouched:** the sample files were only read.
  - **Console:** no console errors.
- **Offline / CSP proof (release exe):** the response header of `http://tauri.localhost/` contains the CSP I configured (`connect-src 'self' ipc: http://ipc.localhost`, `default-src 'self'`, `object-src 'none'`, …; Tauri appended two sha256 hashes for its own injected scripts). `fetch('https://example.com/')` from the page → `Failed to fetch` (blocked). Performance resource entries show only the origins `http://tauri.localhost` and `http://ipc.localhost`, with no CDN.
- **Scope proof:** from the page I invoked `plugin:fs|read_text_file` and `plugin:fs|read_file` on `C:/Windows/win.ini` → `forbidden path ... not allowed on the scope`. `plugin:fs|read_dir` → `fs.read_dir not allowed`. The permitted `$APPDATA/skills.json` read succeeded. (My `write_file` probe returned `missing file path`, which is a malformed-request error and not scope evidence, so I do not claim it.)
- **Installer (release NSIS, `/S`, non-elevated):** exit 0 in 1.5 s. It installed to `%LOCALAPPDATA%\Resume Parser` (per-user, `HKCU` uninstall key, no `HKLM` entry, no UAC) and created a Start-menu shortcut and a Desktop shortcut. The installed exe launched, stayed up and closed cleanly. `uninstall.exe /S` exit 0 in 1.2 s removed the folder, both shortcuts and the registry key. The WebView2 profile folder `%LOCALAPPDATA%\dev.example.resume-parser` was left behind. I deleted it, and the AppData settings folder, at the end of the run.

## Friction log

Count of attempts is "tries until it worked". The Tauri-specific rows are what matters for the AI-productivity question.

| # | What went wrong | Category | Attempts to fix |
|---|---|---|---|
| 1 | **No Tauri v1-vs-v2 API mistakes were made.** I read the v2 dialog/fs docs and plugin source first and wrote `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-fs`, `isTauri` from `@tauri-apps/api/core`, `tauri.conf.json` v2 layout (`identifier`, `build.frontendDist`, `app.security.csp`, `bundle.windows.nsis.installMode`), and capabilities. Nothing v1 was produced. **This is with docs read first; I have no data on an unprimed run.** | Tauri v1/v2 | 0 |
| 2 | **No capability/permission error occurred.** The narrowest set worked first time because the dialog plugin adds each picked file to the fs runtime scope (verified by reading `tauri-plugin-dialog-2.8.0/src/commands.rs`: `fs_scope.allow_file(&path)` after `open`/`save`, and observed). The docs page for fs doesn't say this clearly. Without reading the source I'd have expected to need a broad scope. | Capabilities | 0 |
| 3 | Bash tool is not real bash: `${env:ProgramFiles(x86)}` inside an inline `powershell -Command` failed to parse. Then inline PowerShell variables such as `$t` were expanded by the outer shell. | Agent shell | 2, then switched to `.ps1` script files |
| 4 | `npm` shim from `proto` is broken (`missing_tool npm latest`). `tauri info` also reported npm 11.19.0, so a different npm exists elsewhere. | Environment | 1 (used Bun) |
| 5 | `node --test test/` fails on Node 24 (tries to load `test` as a module). | Node | 1 (explicit file) |
| 6 | **pdf.js v6 API drift.** `doc.destroy is not a function` (must call `loadingTask.destroy()`). `isEvalSupported` no longer exists in `DocumentInitParameters`, and TypeScript 7 flagged it. | pdf.js | 2 |
| 7 | **mammoth API differs by build.** The Node build wants `{buffer}` and threw "Could not find file in options" on `{arrayBuffer}`. The browser build takes `{arrayBuffer}`. Fixed by testing with `mammoth/mammoth.browser.js`, the same bundle the app ships, which also runs in Node. | mammoth | 1 |
| 8 | **pdf.js worker bundling: no problem.** `import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"` made Vite emit the worker as a local asset. It loaded from `tauri.localhost` under the strict CSP (`worker-src 'self' blob:`). | pdf.js worker | 0 |
| 9 | **pdf.js hides layout gaps.** For a big gap (right-aligned dates) pdf.js emits one wide `" "` item, so my gap logic joined the columns with a single space. Found by looking at the extracted text in the UI. Fixed by treating wide whitespace items as a 2-space layout gap, and locked with a test assertion. | pdf.js | 1 |
| 10 | Node prints `Warning: UnknownErrorException: Ensure that the standardFontDataUrl API parameter is provided.` for PDFs that use non-embedded standard fonts. Text extraction still works. The app console showed no such warning. Not fixed. Widths for those fonts may be approximate **[UNVERIFIED]**. | pdf.js | not fixed |
| 11 | My own `edit` operations used wrong line numbers 4 times (clobbered a block twice, produced a syntax error twice). Each was fixed by re-reading. This is agent-process friction, not Tauri. | Agent tooling | 2 to 3 each |
| 12 | **Real-world parser bug 1:** the name heuristic accepted a prose line `I'm <Full Name>`. Fixed by rejecting contraction tokens (`I'm`, `Don't`). Found on real PDFs, not on the synthetic samples. | Parser | 1 |
| 13 | **Real-world parser bug 2:** a phone written as `(+49) 151 …` was captured as `+49) 151 …` (stray bracket). Fixed by allowing an optional `(` before the `+`. | Parser | 1 |
| 14 | **UI automation of the native file dialogs took about six attempts and had a side effect I caused.** (a) `browser.open` with the default managed browser timed out at 30 s and the relay never connected; I used Edge via `app.path`. (b) UI Automation exposes almost nothing inside the modern Open dialog, and Tauri's dialogs show up as children of the "Tauri Window" element. (c) My first UIA script invoked the wrong element (a folder in the list) and navigated the dialog into a random folder. (d) A `SendKeys` attempt sent keystrokes to the foreground window without first confirming the dialog had focus. (e) Because of (c)/(d) and several stacked stale dialogs, **two PDF résumés belonging to the machine's owner were opened by the app, read into memory and shown as two extra table rows.** Nothing was written, uploaded or copied, and I did not record their contents anywhere (this report, the screenshot and the tests contain none). The rows were cleared by restarting the app. (f) What finally worked: send `WM_SETTEXT` to the dialog's Edit control (control ID 1148 for Open, 1001 for Save) and `BM_CLICK` to the button (ID 1) with Win32 messages. I would not repeat blind keystroke injection. | Test automation | ~6 |
| 15 | Stale dialogs stack up when a click is repeated while one is open, and `Cancel` via UIA did not close them. Restarting the app was the reliable reset. | Test automation | 1 |
| 16 | My timing wrapper swallowed cargo's stderr, so the build logs are not in my transcript, only the exit code and `target/` contents. The release-build stopwatch line was lost to a bad pipe (`Select-Object` in a non-PowerShell shell). | Agent tooling | not fixed (release time approximate) |
| 17 | The table needs horizontal scrolling at the default 1500×860 window: the "Matching skills" and "Years" columns are off-screen until you scroll. Cosmetic; not fixed. | UI | not fixed |

**Read of the evidence:** with docs read up front, Tauri 2's own surface (config, plugins, capabilities, CSP, build) cost zero rework. The rework came from library API drift (pdf.js 6, mammoth), real-world PDF/resume variety, and test automation of native dialogs.

## Permissions granted

`src-tauri/capabilities/default.json`, window `main` only:

| Permission | Why | Scope |
|---|---|---|
| `dialog:allow-open` | "Open resumes…" multi-select file picker | n/a. The plugin adds only the files the user picks to the fs runtime scope. |
| `dialog:allow-save` | "Export to Excel" save dialog | Same: only the path the user picks is added to the fs runtime scope. |
| `fs:allow-read-file` | read the picked resumes (bytes, for pdf.js and mammoth) | **No static scope.** Works only on paths the user picked in the dialog (proved: `C:/Windows/win.ini` denied). |
| `fs:allow-write-file` | write the exported `.xlsx` | **No static scope.** Only the path picked in the Save dialog. |
| `fs:allow-mkdir` | create the app-data folder on first save of the skill list | `$APPDATA` only (not recursive) |
| `fs:allow-read-text-file` | load the skill list | `$APPDATA/skills.json` only |
| `fs:allow-write-text-file` | save the skill list | `$APPDATA/skills.json` only |

Not granted: `fs:default`, any `**` scope, `$HOME`/`$DOCUMENT`/`$DOWNLOAD` scopes, directory listing, remove/rename/copy, `shell`, `http`, `core:default`, or the asset protocol. Nothing extra was needed at runtime, so I did not grant `core:default`.

**Residual risk (be honest about it):** the runtime scope is shared by read and write. After the user opens resumes, `fs:allow-write-file` could technically write to those same paths if application code asked it to. My code never does. The strict CSP (`script-src 'self'` plus two Tauri-injected hashes, no remote origins, no `unsafe-inline` in the production CSP) is what keeps foreign script from calling it. A stricter design would move the write into a tiny Rust command. I did not do that, because the assignment says no custom Rust unless unavoidable.

Other hardening in `tauri.conf.json`: `withGlobalTauri: false`, `object-src 'none'`, `frame-src 'none'`, `form-action 'none'`, `base-uri 'none'`. The dev-only CSP (`devCsp`) allows `unsafe-inline` and `ws://localhost:1420` for Vite HMR. It is not used in built apps.

## How a non-programmer would run it

- **The user never runs a build.** She needs the per-user installer from a release build: `src-tauri/target/release/bundle/nsis/Resume Parser_0.1.0_x64-setup.exe` (2.76 MB). Double-click it (or run it with `/S`). It installed with no UAC to `%LOCALAPPDATA%\Resume Parser` and made a Desktop and a Start-menu shortcut (observed). She then double-clicks **Resume Parser**.
- **Is packaging needed?** For someone without the toolchain, yes: you must hand her the installer or the bare exe. A bare `resume-parser-tauri.exe` (10.7 MB release) also runs by double-click if WebView2 is present. Running from `dist/` in a browser is not the same app (no native dialogs, no persistent skill file).
- **Where it is fragile:**
  - If the file reaches her by browser download or email it will carry Mark-of-the-Web, so SmartScreen may warn, and Smart App Control (if she has it enforcing) blocks unsigned code with no per-app bypass. Both **[UNVERIFIED]** here; only local-path behaviour was tested. Copying it from a USB stick or a network share by Explorer also needs testing **[UNVERIFIED]**.
  - Building it needs MSVC Build Tools (admin-installed) or the untested portable-msvc route. The agent must build on a machine where that already exists, or the plan needs an IT step.
  - WebView2 Runtime must exist. It ships with Windows 11 and current Windows 10 **[INFERENCE from the Tauri prerequisites doc; this machine has it]**.
- **Rebuild loop for the person maintaining it:** `bun install`, then `bun run tauri dev` (live reload, 73–215 ms per frontend change) or `bun run tauri build` (about 2 minutes cold, then about 15 s per frontend change).

To run the checks yourself:

```
cd examples/resume-parser-tauri
bun install
bun run make-samples      # regenerates samples/
bun run test              # parser + extraction over the 3 samples (node >= 22.18)
bun run tauri build --debug
src-tauri\target\debug\resume-parser-tauri.exe
```

## Open issues

- **Windows without MSVC** remains untested. The `portable-msvc` route and the GNU route were never tried, so there is no evidence for a clean admin-free machine. **[UNVERIFIED]**
- **Smart App Control enforcement and MOTW/SmartScreen** were not exercised (SAC is off here; no MOTW on locally built files).
- **Parser limits (by design, deterministic):**
  - Multi-column PDFs can interleave columns on one line. I handle only same-baseline gaps.
  - Names in `Surname, Given` order or non-Latin scripts are not handled.
  - Years of experience is `""` with an `uncertain` flag when the resume has date ranges but no Experience heading.
  - Skill matching is literal; `Excel` will match `Excel` in prose, and it cannot tell "no Excel experience" from "Excel".
  - Scanned PDFs get no OCR, by request.
  - I tested only PDFs from three synthetic layouts plus two real ones, which I did not inspect or log. That is not a real evaluation set.
- **Residual fs-scope sharing** between read and write (see Permissions).
- **Layout:** horizontal scroll hides the last columns at the default window size.
- **pdf.js standard-font warning** in Node runs; effect on gap detection for non-embedded fonts is unverified.
- **Unattributed Node.js firewall prompt** seen during the session; I did not answer it.
- **Disk:** `src-tauri/target` is 7.4 GB after debug + release + dev builds. It is git-ignored. `cargo clean` is safe if disk is tight.
- `ExcelJS` 4.4.0 is not actively released; a future replacement is not planned here.
- The NSIS installer and exe are **unsigned**. Signing was out of scope.
