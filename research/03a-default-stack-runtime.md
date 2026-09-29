# Default Stack and Runtime (no-admin, Windows + macOS)

Scope: the technologies the skill picks, without asking the user, for small personal tools that need no server, under the hard rule that nothing needs administrator/root rights and nothing is installed on the computer. Research date 2026-09-29.

**Decision (2026-09-29): Electron + TypeScript is the default, and one self-contained HTML file is the fallback.** This replaces the first draft's Python + uv + pywebview. The choice came from building the same app (a local resume parser) in four admin-free stacks and trying three more that turned out to need admin; the reports are in [`bakeoff/`](bakeoff/) [B].

Tags: `[UNVERIFIED]` means I could not confirm it from a page I opened. `[INFERENCE]` is my reasoning from cited facts. `[LOCAL]` is measured on the bake-off machine: Windows 11 26200 x64, standard user, Smart App Control off. macOS was not tested at all.

## Recommendations

**Stack choice**

1. **Default: Electron (TypeScript) with Electron Forge + Vite, on Node 24 LTS unpacked inside the project, installed with npm.**
   - *Why.* The UI is HTML, so the mockups the user approves are made of the same material as the app ([05](05-mockups-alternatives.md)), and the same UI code becomes the no-install fallback (rec 2). One language covers the UI, the model calls ([04a](04a-software-2-llm-extraction.md)) and the MCP server ([04b](04b-software-3-local-mcp.md)).
   - *Bake-off evidence [B].* No admin and no C++ compiler at any step. UI edits showed up in 26–93 ms. The packaged app starts in 0.4–0.9 s. After one fix (rec 15) it made 0 network connections. The agent made zero Electron API mistakes when it read the current docs first. Its code-review score (25/35) tied for best.
   - *Costs.*
     - Size: a 370 MB app folder, 320–400 MB RAM across 4 processes [B], and about 700 MB of `node_modules` per project (673 MB in the bake-off [B], 699 MB in the in-project run [LOCAL]).
     - Security is the author's job [18]: every tool starts from the hardened starter template (rec 14), never a fresh scaffold.
     - Churn: a new major every 8 weeks, and only the latest 3 are supported [16].
2. **Fallback: one HTML file with inline JS/CSS, opened from disk.** It needs no runtime, no download and no executable, so AppLocker, WDAC, Smart App Control, Constrained Language Mode and proxies cannot stop it. `file://` counts as a secure context [49].
   - Chromium-only APIs: `showOpenFilePicker`/`showSaveFilePicker` exist only in Chrome/Edge 86+ [49]. So the base design is `<input type=file>` for import, `<a download>` for export and `localStorage`/IndexedDB for settings, with File System Access as an extra.
   - **It reuses the Electron UI.** The starter keeps every OS call behind one small preload API (`window.api.*`). A browser build swaps in a shim that implements the same functions with the calls above, and a single-file Vite build inlines everything (the PDF worker as a blob). The Electron build report estimates the result at about 3–4 MB for the resume parser. This was not built [UNVERIFIED] [B].
3. **Last resort: Office-native automation, or a short request to IT** (tiers 8–9 of the blocked-environment procedure). Do not fight the policy.
4. **Rejected, with the deciding reason** (details in "Bake-off summary"):
   - Needs admin to build: Tauri, Flutter, React Native for Windows (MSVC Build Tools / Xcode CLT / Developer Mode).
   - Violates local-first: Python + pywebview. WebView2 made outbound connections to Microsoft that no setting stopped. Neutralinojs and Wails use the same system webview [INFERENCE].
   - No HTML rendering: Compose Multiplatform and Avalonia. Mockups would need separate sketches, and the fallback would be a rewrite.

**Install mechanics**

5. **Node: the official zip (Windows) or tarball (macOS), unpacked into the project's own `.tools/node` folder. Never the MSI, `.pkg` or nvm-windows.** Nothing is installed on the computer; all tooling lives inside the project folder.
   - Files: `nodejs.org/dist/v24.x/` publishes `node-v24.21.0-win-x64.zip`, `-win-arm64.zip`, `-darwin-arm64.tar.gz` and `-darwin-x64.tar.gz`, with `SHASUMS256.txt` [2].
   - How: fetch with `curl.exe` into `.tools\`, compare the SHA-256 with `SHASUMS256.txt`, then `tar -xf … -C .tools\node --strip-components=1` (macOS: `tar -xzf`, into `.tools/node`). No `.ps1` file and no installer are involved, so execution policy does not matter. The exact commands are in "Install and smoke test" and were run as written [LOCAL]: the hash matched and `node -v` printed v24.21.0.
   - **Every cache and config file stays in `.tools/` too:**
     - npm cache: `.tools\npm-cache`, set with `npm_config_cache`. npm reads any `npm_config_*` variable as a setting [31].
     - npm user config: `.tools\npmrc`, set with `NPM_CONFIG_USERCONFIG` [31]. This is also where proxy and `cafile` lines go (recs 17–18), and it keeps the user's own `~/.npmrc` out of the build. npm's global config then resolves to `.tools\node\etc\npmrc` [LOCAL].
     - Electron download cache: `.tools\electron-cache`, set with `electron_config_cache` (rec 9).
     - Verified [LOCAL]: with these variables set, `npm config get cache` and `get userconfig` printed the `.tools` paths.
   - **Put Node on PATH per process, with a launcher.** `.workbench\scripts\run.cmd` (shipped in the skill's template and kept in version control, unlike the recreated `.tools\`) sets `PATH` and the three variables above to the `.tools\` paths, then runs its arguments (`.workbench\scripts\run.cmd npm.cmd ci`). It is a plain batch file, so execution policy does not apply. Don't edit the user PATH: `setx` truncates long values, and the .NET route is blocked under CLM [11] [INFERENCE]. Never use `npm -g`: nothing global is wanted.
   - **What is still accepted outside the project:** Node, npm, Electron and the built app may write ordinary per-user files in AppData and Temp (for example Electron's default user-data folder for the app). That is fine. The rule is: no installed software, no programs and no caches kept outside the project, and the desktop shortcut (rec 12) is the only change elsewhere.
   - What needs admin: users report that the MSI does [3][4]; I found no nodejs.org page stating it [UNVERIFIED]. The nvm-windows README says it "runs in an Admin shell" [5]. fnm needed Developer Mode for symlinks on Windows [6]. Volta has no official no-admin installer [7].
   - Version: Node 24 "Krypton" is in LTS until **2028-04-30** (Maintenance from 2026-10-20). Node 26 becomes LTS on 2026-10-28 [1]. Electron 44 embeds Node 24.21.0 [17], so the tooling and the app use the same line.
   - Signing: the official `node.exe` is Authenticode-signed by the OpenJS Foundation [LOCAL].
6. **On Windows, always call `npm.cmd` / `npx.cmd`, never a bare `npm`.**
   - Since Node 22/24 the zip also ships unsigned `npm.ps1`/`npx.ps1`. Under Windows' default `Restricted` policy, or `AllSigned`, PowerShell picks the `.ps1` and fails; `npm.cmd` works [8][9].
   - `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` needs no admin, but it changes a user setting and a Group Policy can override it [10]. Prefer `npm.cmd`.
7. **npm only.**
   - Forge supports npm, yarn and pnpm, not Bun. Its "Package manager bun is unsupported" message comes from the deprecated `NODE_INSTALLER` variable [25].
   - pnpm needs `node-linker=hoisted` [25]. That's one more thing to get wrong, for no benefit at this scale.
8. **Start every project from the skill's own starter, not `create-electron-app`.**
   - The released Forge 7.11.2 `vite-typescript` template pins TypeScript ~4.5.4, Vite ^5 and ESLint 8 [27]. The bake-off agent had to hand-upgrade it [B].
   - The starter is the bake-off app reduced to a skeleton, with exact pins:
     - `electron` pinned exactly. Minor updates of the major can wait for a planned update (rec 13).
     - A committed `package-lock.json`.
     - `"overrides": { "@electron/rebuild": "^4.2.0" }`. Forge 7.11.2 pulls `@electron/rebuild` 3.7.x, which depends on `git+ssh://git@github.com/electron/node-gyp.git` [29][LOCAL lockfile]. Rebuild 4.2 uses node-gyp from the npm registry [29].
   - **Verified [LOCAL]:** both installs below finished with no `git` on PATH and a fresh npm cache:
     - The original lockfile: `npm ci` took 16 s, so npm fetched the GitHub dependency without a git binary.
     - The override: `npm install` 27 s, `npm test` passed, `npm run package` 7 s, and the packaged app opened its window.
   - The override removes the `github.com` code dependency from the install. Only the Electron binary still comes from GitHub (rec 9).
   - Forge 8 (currently alpha) modernises the templates and drops "experimental" from the Vite plugin [24][27]. Re-evaluate once it is stable.
9. **Fetch the Electron binary explicitly at install time: `.workbench\scripts\run.cmd npx.cmd install-electron --no`.**
   - Since Electron 42, `npm install` no longer downloads the binary. It comes lazily on first run [12][14]. Running it explicitly makes a blocked download fail during setup, not later when the user tries to open the app.
   - The binary is a zip from `github.com/electron/electron/releases`, which redirects to `release-assets.githubusercontent.com` [LOCAL]. It is checked against `checksums.json` inside the npm package (a hash check, not a signature) [13][15].
   - Cache: `.tools\electron-cache`, set with `electron_config_cache` [12][13]. Electron's default is a folder shared by all projects (`%LOCALAPPDATA%\electron\Cache` on Windows, `~/Library/Caches/electron` on macOS) [12]; the skill does not use it. Each project therefore keeps its own copy, 158 MB [LOCAL]. The unpacked binary also sits in `node_modules/electron/dist` [13].
   - Mirror: `ELECTRON_MIRROR` + `ELECTRON_CUSTOM_DIR` [12]. `ELECTRON_SKIP_BINARY_DOWNLOAD` was removed in 42 [14].
10. **No native Node modules, ever.**
    - Anything without a prebuilt binary compiles with node-gyp, which needs the VS C++ Build Tools on Windows or the Xcode CLT on macOS [32]; both need admin [52][51-CLT]. Prebuilt downloads also come from GitHub [INFERENCE].
    - Check after every dependency change:
      - `package-lock.json` entries with `"hasInstallScript": true` other than `fsevents` [33];
      - any `binding.gyp` under `node_modules` [33];
      - `*.node` files outside the known prebuilt packages `@rolldown/binding-*`, `lightningcss-*` and `@electron-internal/extract-zip`. Those ship compiled inside the npm package and need no compiler, so they are fine. A new `*.node` from a package that also has an install script or a `binding.gyp` means it compiles or downloads a binary.
    - The starter allows exactly one install-script package: `fsevents` (optional, macOS only). It dropped Squirrel (`maker-squirrel`, `electron-squirrel-startup`), so `electron-winstaller` is gone too [starter README].
    - SQLite without a native module is covered in [03b](03b-data-storage.md).
11. **Install by terminal, never by browser.**
    - Files fetched with `curl.exe`/`Invoke-WebRequest` or macOS `curl` get no Mark-of-the-Web or quarantine flag [9][44]. SmartScreen fires only on files that have Mark-of-the-Web [47], and Gatekeeper checks only quarantined files [44]. Everything the agent builds on the user's machine is local too.
    - A browser-downloaded installer triggers exactly the prompts that break the no-admin rule. On macOS 15+ that is the "Open Anyway" flow, reportedly with an admin password [46].
    - Exception: a terminal inside a GUI app that opts into quarantine can tag files [45]. Preflight with `xattr -l`.
12. **Ship by building on the user's machine. Keep the packaged app inside the project, and add a desktop shortcut. No installer.**
    - `.workbench\scripts\run.cmd npm.cmd run package` gives `out/<App>-win32-x64/`, which runs from the folder with no Node at runtime [B]. Run it right there: the shortcut points at `out\<App>-win32-x64\<App>.exe` (macOS: the `.app` in `out/`, [INFERENCE]). The app is not copied into any per-user program folder, `~/Applications` or the Start menu.
    - If the user keeps using the app while the AI builds a change, first copy the folder to `<project>/tool/<App>/` and point the shortcut there, so the next package step does not replace a running program [INFERENCE]. This costs about another 390 MB.
    - **The desktop shortcut is the only thing outside the project.** Create it with PowerShell's `WScript.Shell` `CreateShortcut`, at `[Environment]::GetFolderPath('Desktop')` (may be OneDrive-redirected). Tested [LOCAL] in a scratch folder only, not on the real Desktop: the `.lnk` was written and read back with the right target. Under Constrained Language Mode COM objects are limited to a short allow-list [11], so this may fail there [INFERENCE]. Then use Electron's `shell.writeShortcutLink` [UNVERIFIED: not tested], or skip the shortcut and tell the user to open the `.exe` in the project folder. Deleting the project folder and that one shortcut removes everything.
    - Skip `make`: the Squirrel installer is 147 MiB and installs a 501 MB copy [B]. It leaves `Update.exe` behind after uninstall [28][B], and Group Policy can block it from `%LocalAppData%` [28]. The starter no longer includes the Squirrel maker. Use it only for sharing, and sharing is an IT conversation (signing).
    - **Disk budget, measured [LOCAL]:** a project with no shared caches took 72 s for the whole in-project run (`npm ci`, `install-electron`, tests, packaging) and about **1.45 GB**:
      - Node `.tools/node` 107 MB
      - npm cache 90 MB
      - Electron cache 158 MB
      - `node_modules` 699 MB
      - packaged `out` 388 MB
    - Ten tools are about 14.5 GB. Delete `out/make` and old packaged folders. Preflight requires ≥ 3 GB free on the project's drive. `.tools`, `node_modules` and `out` can all be rebuilt, so keep them out of anything shared and out of the save points [INFERENCE; see [07](07-codex-host.md) and [08](08-security-compliance.md)].
13. **Updating Electron is planned work, not an automatic step.**
    - Each major is supported for about 24 weeks (3 majors × 8 weeks). Electron 44's end of life is 2027-03-02 [16].
    - The app parses untrusted files (PDFs) in Chromium, so a stale Electron is a real, if small, risk [INFERENCE].
    - Rule: when the user asks for a change and the pinned major is out of support, the first step is "update the engine". It gets its own save point, a test run and a network check.

**The starter template's security settings (all measured in the bake-off [B])**

14. **Hardened by default; the agent adds features but never loosens these.** Mapped to Electron's 20-item checklist [18]:
    - **Isolation:** `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, `webSecurity` on, no `allowRunningInsecureContent`.
    - **Preload:** a preload that exposes only named functions (four in the resume parser). Never `ipcRenderer`, `fs` or a generic `invoke`.
    - **IPC checks:** every handler checks that `event.senderFrame.url` belongs to the app and validates its arguments (types, sizes).
    - **Loading and navigation:**
      - The page loads from a custom `app://` protocol, not `file://`, with the CSP sent as a response header: `default-src 'none'; script-src 'self'; …`, no `unsafe-inline` or `unsafe-eval`.
      - Navigation and `window.open` are denied, and so are all permission requests.
      - DevTools are off in the packaged app, and debug environment hooks are ignored when `app.isPackaged`.
    - **Files:** the page never sends a path. The main process reads only paths returned by the Open dialog and writes only the path confirmed in the Save dialog.
      - Add what the bake-off review found missing in all four builds: create exports with exclusive create (`fs.open(path, 'wx')`, after the Save dialog's own replace prompt), refuse any file that is one of the opened inputs, and cap input sizes [B].
    - **Where parsing runs:** untrusted files (PDF, DOCX) are parsed in the sandboxed renderer, which has no Node access, never in the main process [B].
    - **Fuses:**
      - Forge's six: `RunAsNode` off, cookie encryption on, `NODE_OPTIONS` off, `--inspect` off, embedded ASAR integrity on, only-load-from-ASAR on [19][39].
      - Plus `GrantFileProtocolExtraPrivileges` off.
      - Fuses and ASAR integrity resist tampering only when the app is code-signed [19][20]. For an unsigned personal app they are hardening defaults, not protection [INFERENCE].
15. **"Offline" is enforced in the app and proven with a socket check, not assumed.**
    - **Spellcheck.** By default Electron downloads Hunspell dictionaries from a Google CDN on Windows and Linux; macOS uses the OS spellchecker [21]. The bake-off app did this on first launch of a fresh profile, invisible to `session.webRequest`.
      - `session.setSpellCheckerEnabled(false)` stopped it [B]. The docs don't promise that [UNVERIFIED].
      - Setting `spellcheck: false` in `webPreferences` alone did not stop it in issue #22995 [22]. So the starter does both, and also points `setSpellCheckerDictionaryDownloadURL` at an unreachable local URL [21][22].
    - **Other background requests.** `webRequest` doesn't see requests made by the browser process [23]. No Electron doc lists Chromium's other background requests [UNVERIFIED].
    - **So every build loop ends with a network check.** Launch the packaged app on a fresh profile, load sample data, and count the TCP/UDP endpoints owned by its process tree (commands in "Preflight"). The expected count is 0.
16. **A packaged app ignores `NODE_EXTRA_CA_CERTS`,** because the `nodeOptions` fuse also gates it [19]. This matters only if the app itself makes HTTPS calls ([04a](04a-software-2-llm-extraction.md)). How it should trust a corporate root is decided there.

**Corporate networks and policy**

17. **TLS inspection (build time).**
    - Set `NODE_USE_SYSTEM_CA=1` (Node ≥ 24.6). Node then trusts the Windows certificate store (machine and user roots, including Group Policy ones) or the macOS System/login keychains [30]. That covers npm and Electron's binary download, which uses Node's `fetch` [15][INFERENCE for npm].
    - If that fails: the corporate root as PEM via `NODE_EXTRA_CA_CERTS`, plus npm `cafile` [30][31].
    - Never `strict-ssl=false` or `NODE_TLS_REJECT_UNAUTHORIZED=0`.
18. **Proxy (build time):**
    - npm honours `HTTP(S)_PROXY` [31].
    - Electron's binary download uses a proxy only with `ELECTRON_GET_USE_PROXY=1`, and then reads `HTTP(S)_PROXY`/`NO_PROXY` (`@electron/get` 5). The docs still describe the old `GLOBAL_AGENT_*` variables [12][15].
    - Forge 7.11.2's packager still bundles `@electron/get` 3.x, which uses `GLOBAL_AGENT_HTTPS_PROXY` [29]. **Set both schemes** behind a proxy [INFERENCE from dependency metadata].
19. **Hosts the standard path needs:** `nodejs.org`, `registry.npmjs.org`, `github.com` and `release-assets.githubusercontent.com` (Electron binary) [2][12][LOCAL]. With the rec 8 override, GitHub serves only the Electron binary.
20. **Execution policy and CLM: detect, don't fight.** The standard path doesn't depend on PowerShell scripts (recs 5–6). Never `Set-ExecutionPolicy -Scope LocalMachine` [9][10].
21. **Never bypass security controls.** Do not:
    - copy binaries into "allowed" folders to dodge AppLocker [48];
    - disable Smart App Control or antivirus;
    - use a public binary mirror on a work laptop;
    - turn off TLS checks.

    Report the block and move to the next fallback tier.

**Windows Smart App Control (SAC)**

22. **The Electron binary is unsigned. That is the main open risk on personal Windows 11 PCs.**
    - **Signatures [LOCAL].** In the official `electron-v44.4.5-win32-x64.zip`, 5 of 7 PE files are `NotSigned`: `electron.exe` (234.6 MB, renamed to the app's exe), `ffmpeg.dll`, `dxcompiler.dll`, `vk_swiftshader.dll` and `vulkan-1.dll`. The two Microsoft DLLs are signed. For comparison, pywebview had 66 of 169 unsigned [B].
    - **How SAC decides.** In enforcement mode SAC blocks unsigned code unless cloud reputation vouches for it. It checks every loaded module, has no per-app bypass, and turns itself off on enterprise-managed or Developer-Mode PCs [34][35][36].
    - **Field report (#52481, Electron 43, SAC enforcing) [37]:**
      - What was blocked: Electron's unsigned native zip extractor, during install.
      - What was not: `electron.exe` itself.
      - The verdict changed within an hour, because it depends on reputation.
      - Electron 43/44 now load that extractor lazily [37]. The starter's Forge 7.11.2 packager uses a pure-JS extractor [29].
    - **Rule.** Preflight reads the SAC state. If SAC is enforcing, run the smoke test (install, package, launch) before building anything for the user. A block (Code Integrity event 3033/3077) goes to tier 7 (HTML).

**macOS (not tested; docs only)**

23. **The same design should work per-user on macOS, but only as untested inference.**
    - **Node and Electron.** The tarball goes into the project's `.tools/node`, the same layout as on Windows [2]. Electron 44 needs macOS 13+ [14].
    - **Signing on Apple Silicon.** arm64 code must carry at least an ad-hoc signature [40]. Official Electron builds are ad-hoc signed. When no `osxSign` is configured, Forge's fuses plugin and `@electron/packager` re-sign ad-hoc with `/usr/bin/codesign` after patching [39].
      - Whether `codesign` ships with base macOS or needs the CLT has only third-party evidence (base macOS) [43] [UNVERIFIED]. This is the single most important thing to test on a Mac.
    - **Running it.** A locally built app has no quarantine flag, so it should open without Gatekeeper prompts [42][44] [INFERENCE; Apple doesn't state it].
    - **Sharing it.** Handing the app to someone else needs a paid Developer ID and notarization with Xcode tools [38][41]. That is out of scope.

**Git (for the build loop's invisible undo; revisited in [06](06-build-loop.md))**

24. **Git without admin — tiers. Save points live in `.workbench\history`, not `.git`.**
    - **Why not `.git`:** Codex's Windows sandbox keeps `.git` read-only and runs commands as a separate user (CodexSandboxOffline). That caused "dubious ownership" and permission errors [LOCAL, tested 2026-09-29 with `codex exec -s workspace-write`].
    - **How:** the AI never runs `git init` or a bare `git`. It calls `.workbench\scripts\git.cmd` (from the skill's template), which runs git with `--git-dir=.workbench\history --work-tree=<project> -c safe.directory=*`, so the history sits in a folder the sandbox can write.
    - **Which git binary:**
      1. `git.cmd` prefers `.tools\git\cmd\git.exe` if it exists; otherwise it uses `git` from PATH. If `git` already works, that is enough.
      2. **Windows:** MinGit (`MinGit-<ver>-64-bit.zip`) or PortableGit (`-y -gm2 -InstallPath=<project>\.tools\git`) from the Git for Windows release page. Both unpack without admin [51-GfW][51-MinGit][51-Zip], so they go into `.tools\git`, and `bootstrap.ps1` downloads MinGit there only when git is missing. MinGit has no bash/Perl, which is enough for add/commit/restore [51-MinGit].
      3. **macOS:** Apple's git comes only with the Xcode CLT, and installing those asks for admin [51-gitscm][51-CLT]. Never run `git --version` blindly, because the `/usr/bin/git` stub can pop the CLT installer dialog: check `xcode-select -p` first.
      4. **No git binary:** **isomorphic-git** (pure JS, npm-installable) now fits the stack natively [51-iso]. The earlier draft's dulwich was the Python equivalent.
      5. If everything else fails: timestamped folder snapshots.

## Bake-off summary

All builds implemented the same spec: open PDF/DOCX/TXT resumes, parse them deterministically with found / not-found / uncertain flags, edit them in a table, and export a new `.xlsx`, with no network. Each ran on the same machine with the same model (Claude Sonnet 5.5). Every build read the current docs first. Timings are indicative, because builds ran in parallel. Blind code reviews used a 7-dimension rubric. Reports: [`bakeoff/`](bakeoff/) [B].

| | **Electron** | Compose (Kotlin) | Avalonia (C#) | Python + pywebview |
|---|---|---|---|---|
| Agent time / model cost | 45 min / $5.79 | 30 min / $5.42 | 39 min / $13.47 | 38 min / $7.98 |
| Tool calls (failed) | 150 (17) | 147 (15) | 246 (16) | 175 (8) |
| Code review (out of 35) | 25 | 23 | 24 | 25 |
| UI change visible | 26–93 ms (HMR) | 2.4–2.8 s | 0.2 s (community tool; official one is paid) | ~2 s |
| Startup, packaged | 0.4–0.9 s | 1.6–1.9 s | 1.6–2.2 s | 0.9–1.0 s |
| RAM, data loaded | 320–400 MB | 250–280 MB | 130–160 MB | 424–479 MB |
| Shipped size | 370 MB folder | 123 MB folder | 52 MB single exe | ~135 MB |
| Unsigned binaries | 5 of 7 | not counted | 41 of 237 | 66 of 169 |
| Network at runtime | 0 (after spellcheck fix) | 0 | 0 | 2–3 HTTPS connections to Microsoft (WebView2), not stoppable |
| Renders HTML | yes | no | no | yes |

- **Code quality was effectively a tie.** All four had the same bugs: the export guard compared path strings and truncated existing files; adding a column touched 4–5 files; no input-size limits; UI state untested. The language didn't change the quality. The starter template (rec 14) fixes these once.
- **Dropped without finishing, because building needs admin:**
  - **Tauri:** MSVC Build Tools / Xcode CLT [53]. It built here only because MSVC was already installed. Build folder 7.4 GB.
  - **Flutter:** Windows builds need the Visual Studio C++ workload.
  - **React Native for Windows:** VS Build Tools and Developer Mode. pdf.js also failed on Hermes.
- **Not built:**
  - Neutralinojs and Wails use the system webview, the same WebView2 that phoned home for pywebview [INFERENCE]; Wails would also need the macOS CLT for cgo [UNVERIFIED].
  - Swift/SwiftUI is parked until a cross-platform SwiftUI works on Windows.
- **Why Electron over the lighter native options:** the skill's core loop is mockup → small change → try it. An HTML UI serves all three, and it is the only admin-free, network-clean option that does. Size and RAM matter little for one person's tool on their own PC [INFERENCE].

## Environment preflight checklist

Run before installing anything. Read-only, no admin. Save the results in `env.json` for reuse.

**Windows (PowerShell)**
```powershell
$PSVersionTable.PSVersion
Get-ExecutionPolicy -List                        # MachinePolicy/UserPolicy set => GPO-controlled [9]
$ExecutionContext.SessionState.LanguageMode      # ConstrainedLanguage => AppLocker/WDAC active [11]
whoami /groups | findstr /i "S-1-5-32-544 S-1-16-12288"   # admin group / elevated?
# Can an exe run from the project folder? (AppLocker path rules; run this from the project folder, because that is where everything will run) [48]
Copy-Item $env:WINDIR\System32\whoami.exe .\pf-test.exe; & .\pf-test.exe; Remove-Item .\pf-test.exe
# Smart App Control: Settings > Privacy & security > Windows Security > App & browser control [35]
Get-WinEvent -LogName 'Microsoft-Windows-CodeIntegrity/Operational' -MaxEvents 20 -EA SilentlyContinue | ? Id -in 3033,3077
# Proxy / TLS
Get-ChildItem Env: | ? Name -match 'PROXY|SSL_CERT|NODE_EXTRA|NODE_USE|ELECTRON|GLOBAL_AGENT'
Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' | Select ProxyEnable,ProxyServer,AutoConfigURL
# Reachability (any HTTP status = reachable; a curl error = blocked)
foreach($u in 'https://nodejs.org/dist/index.json','https://registry.npmjs.org/electron','https://github.com/electron/electron/releases','https://release-assets.githubusercontent.com/'){ curl.exe -sS -o NUL -w "$u %{http_code}`n" -I $u }
# Tools, disk, synced folders
Get-Command node,npm.cmd,git -EA SilentlyContinue; (Get-PSDrive (Get-Location).Drive.Name).Free/1GB     # need >= 3 GB on the project's drive
[Environment]::GetFolderPath('Desktop'); [Environment]::GetFolderPath('MyDocuments')   # under OneDrive? see 03b
```

**Install and smoke test (Windows)**
```powershell
# the template's .workbench\scripts\bootstrap.ps1 does the download part below (Node into .tools\node and, only if git is missing, MinGit into .tools\git); these are its steps
# run from the project folder; everything lands in .tools\ and nothing is installed
$p = (Get-Location).Path; $t = "$p\.tools"; $v = 'v24.21.0'; $n = "node-$v-win-x64"
New-Item -ItemType Directory -Force "$t\node", "$t\npm-cache", "$t\electron-cache" | Out-Null
New-Item -ItemType File -Force "$t\npmrc" | Out-Null
curl.exe -fL -o "$t\$n.zip" "https://nodejs.org/dist/$v/$n.zip"
curl.exe -fL -o "$t\SHASUMS256.txt" "https://nodejs.org/dist/$v/SHASUMS256.txt"
$want = ((Select-String -Path "$t\SHASUMS256.txt" -Pattern "  $n.zip$").Line -split '\s+')[0]
if ((Get-FileHash "$t\$n.zip" -Algorithm SHA256).Hash.ToLower() -ne $want) { throw "Node zip hash mismatch" }
tar -xf "$t\$n.zip" -C "$t\node" --strip-components=1
Remove-Item "$t\$n.zip", "$t\SHASUMS256.txt"
# the launcher .workbench\scripts\run.cmd ships with the template (it is not created here): PATH and caches for one command at a time, never system-wide
.workbench\scripts\run.cmd node -v; .workbench\scripts\run.cmd npm.cmd -v
# in the project (a copy of the starter):
.workbench\scripts\run.cmd npm.cmd ci; .workbench\scripts\run.cmd npx.cmd install-electron --no; .workbench\scripts\run.cmd npm.cmd test; .workbench\scripts\run.cmd npm.cmd run package
# launch out\<App>-win32-x64\<App>.exe, load samples, then the network check:
$ids = (Get-CimInstance Win32_Process | ? { $_.ExecutablePath -like '*\<App>-win32-x64\*' }).ProcessId
Get-NetTCPConnection -OwningProcess $ids -EA SilentlyContinue; Get-NetUDPEndpoint -OwningProcess $ids -EA SilentlyContinue   # expect nothing
```
A Code Integrity error or "blocked by group policy" at any step means tier 6. A TLS, proxy or GitHub error means tiers 2–4.

**macOS (zsh; untested)**
```bash
uname -m; sw_vers -productVersion                 # Electron 44 needs 13+ [14]
id -Gn | tr ' ' '\n' | grep -qx admin && echo admin || echo standard-user
spctl --status; ls -l /usr/bin/codesign           # codesign needed for ad-hoc re-signing (rec 23)
xcode-select -p 2>/dev/null || echo "no CLT (do not run git --version)"
env | grep -iE 'proxy|ssl_cert|node_extra|node_use|electron'; scutil --proxy | head -20
for u in https://nodejs.org/dist/index.json https://registry.npmjs.org/electron https://github.com/electron/electron/releases https://release-assets.githubusercontent.com/; do curl -sSI -o /dev/null -w "$u %{http_code}\n" "$u"; done
cp /bin/echo ./pf-test && ./pf-test ok; rm -f ./pf-test   # can binaries in the project folder run? (run from the project folder)
# install: curl the darwin tarball + SHASUMS256.txt into .tools/, shasum -a 256, tar -xzf into .tools/node (--strip-components=1); a launcher sets PATH, npm_config_cache, NPM_CONFIG_USERCONFIG and electron_config_cache, as on Windows
# after packaging: xattr -l out/*/*.app; codesign -dv out/*/*.app; lsof -nP -i -a -p <pid>   # expect no network
```

## Blocked-environment decision procedure

Work top to bottom and stop at the first tier whose smoke test passes. Tell the user in one plain sentence which tier you are on and why.

1. **Standard path:** the install and smoke test above.
2. **TLS error** (`UNABLE_TO_GET_ISSUER_CERT_LOCALLY`, `SELF_SIGNED_CERT_IN_CHAIN`): set `NODE_USE_SYSTEM_CA=1`. If that fails, ask IT for the root as PEM and set `NODE_EXTRA_CA_CERTS` plus npm `cafile` [30][31].
3. **Proxy:** set `HTTPS_PROXY`/`HTTP_PROXY`/`NO_PROXY`, `ELECTRON_GET_USE_PROXY=1` and `GLOBAL_AGENT_HTTPS_PROXY` (rec 18).
4. **Registry or GitHub blocked:**
   - npm: IT's registry mirror via npm `registry`.
   - Electron: IT's mirror via `ELECTRON_MIRROR`, or IT provides the release zip and it is placed in the project's `.tools\electron-cache` [12][13]. The zip is still checked against `checksums.json` [13].
   - Never a public third-party mirror on a work laptop.
5. **`npm` fails with an execution-policy error:** use `npm.cmd` (rec 6).
6. **Executables in the project folder (usually inside the user profile) are blocked** (the whoami copy test fails, or "blocked by group policy" [28][48]), **or SAC blocks `electron.exe`/`node.exe`** (event 3033/3077) [34]: do not route around it. Go to tier 7.
7. **HTML-only tier.** Build the same UI as one HTML file (rec 2). Keep data in `localStorage`/IndexedDB, or in files the user imports and exports. Serve nothing.
   - Storage caveat: tell the user browser storage can be cleared, and give them an "Export backup" button [INFERENCE].
   - Browser caveat: file-write-back needs Edge/Chrome [49]. In Safari it is download/import only.
8. **Office-native tier (Windows/M365).**
   - *Formulas / tables / Power Query:* no policy dependency beyond Excel [UNVERIFIED].
   - *VBA:* macros in internet-marked files are blocked, but locally created workbooks are not [50]. The user pastes the code themselves.
   - *Office Scripts:* needs a business licence and OneDrive, and the tenant can disable it [50].
   - *Power Automate Desktop:* the MSI needs admin; the Store build does not [50].
9. **Ask IT.** Generate this message and edit the bracketed parts:

   > Hi IT — I'm building a small local tool for [task] with an AI assistant. It needs (1) permission to run programs from one folder in my user profile, [full folder path]: Node.js (signed by the OpenJS Foundation), unpacked into its `.tools\node` subfolder, and an Electron app built there on this laptop; (2) outbound HTTPS to `nodejs.org`, `registry.npmjs.org`, `github.com` and `release-assets.githubusercontent.com`, or our internal npm/Electron mirrors; (3) if TLS inspection is used, the company root CA as a `.pem` file. Nothing is installed on the laptop; the only thing outside that folder is a desktop shortcut. No admin rights, no services, and no data leaves the laptop. If this isn't possible, I'll build it in Excel instead.

## Key evidence

- **Per-user Node.**
  - Official zips and tarballs with checksums [2]. Node 24 LTS dates [1].
  - The MSI, nvm-windows and fnm admin needs come from issues and READMEs [3][4][5][6][7].
  - npm `.ps1` execution-policy failures [8], with policy semantics from Microsoft [9][10].
- **Electron install.**
  - The lazy binary download (PR #49328, breaking change in 42) and the `install-electron` bin [12][13][14].
  - `@electron/get` 5 proxy change [15].
  - Release cadence and the 44.x Chromium/Node versions [16][17].
- **Forge.**
  - The Vite plugin is still "experimental" in 7.11.2 [24]. Supported package managers [25]. `rs` restarts the main process from a terminal only [26]. Stale template [27]. Squirrel's behaviour and its Group Policy block [28].
  - `@electron/rebuild` 3.7 depends on git [29]. The override was tested [LOCAL].
- **Security.** Checklist [18], fuses [19], ASAR integrity (Windows ≥ 30, macOS ≥ 16, header hash only, needs `onlyLoadAppFromAsar`) [20], spellchecker downloads [21][22], `webRequest` blind spot [23].
- **Native modules** need node-gyp and a compiler [32]; how to detect them [33]. Admin for compilers [52][51-CLT].
- **SAC.** Microsoft FAQ [34][35], module-level evaluation [36], Electron field report [37]. Local signature census [LOCAL].
- **macOS.** Ad-hoc signing requirement [40], packager and fuses re-signing [39], notarization needs [38][41], Gatekeeper scope [42][44].
- **Bake-off.** Seven stacks tried and four finished; numbers and reviews in [B].

## Open questions and disagreements

- **SAC and unsigned `electron.exe`.** Not tested with SAC enforcing. The one field report saw `electron.exe` allowed and a native extractor blocked, and the verdict changed over time [37]. Whether a renamed, locally built `electron.exe` keeps Electron's reputation is unknown [UNVERIFIED].
- **macOS end to end.** Nothing was run on a Mac. The key unknown is whether `/usr/bin/codesign` works without the CLT [43]. Next: `create → package → open`, a network check, and a `git` probe on a standard-user Mac.
- **Whether `setSpellCheckerEnabled(false)` alone is enough** everywhere is undocumented [21][22]. The network check in every build loop is the safeguard.
- **Other Chromium background traffic** (component updater, variations, Safe Browsing) is not catalogued by Electron [UNVERIFIED]. The bake-off saw none after the spellcheck fix, over three fresh-profile runs of 10 s each [B]. Longer runs were not measured.
- **Forge 7 vs 8.** The starter pins 7.11.2 plus the rebuild override. Forge 8 (alpha) fixes the templates and drops "experimental" from the Vite plugin [24][27]. Move when it is stable.
- **HTML fallback from the Electron UI** is designed but not built [B].
- **Disk footprint across many tools.** At about 1.45 GB each (Node, npm cache and Electron cache are per project by design), ten tools use about 14.5 GB. Deleting `.tools/npm-cache` and `.tools/electron-cache` after a successful build would save about 250 MB per project, but the next install or package step would download again [INFERENCE, untested]. npm workspaces with a shared `node_modules` could cut more, but would tie the tools together [INFERENCE, untested].
- **How the packaged app trusts a corporate CA** for model calls (rec 16) belongs to [04a](04a-software-2-llm-extraction.md).
- **Git on macOS** without the CLT remains unsolved. isomorphic-git is the in-stack candidate [51-iso].

## Conflicts with the guiding principles

- **"Bias toward desktop apps."** Holds: a packaged Electron folder built locally has no Mark-of-the-Web, so SmartScreen and Gatekeeper don't fire. But the exe is unsigned, and SAC-enforcing PCs may block it (rec 22). Sharing the app with anyone else means signing, which means IT.
- **"Local-first; data never leaves without the user knowing."** A stock Electron app broke this silently (the spellcheck download), and so did WebView2 in the Python build. The rule is only as good as the network check at the end of every build loop (rec 15).
- **"Hard requirement: no admin."** Holds on Windows (measured). On macOS it depends on `codesign` without the CLT (unverified), and git needs the CLT.
- **"Smallest useful thing."** Each Electron tool carries a 370 MB runtime and about 1.45 GB of tools and project files. That doesn't change what the user experiences, but it costs disk, and the disk ran out during the bake-off. The skill must budget and clean up (rec 12).
- **"AI picks; the user never chooses tech."** Holds. The user may still have to forward the IT message (tier 9); keep it short and non-technical.

## Sources

[B] Bake-off build reports and reviews, 2026-09-29: [`bakeoff/electron.md`](bakeoff/electron.md), [`bakeoff/compose.md`](bakeoff/compose.md), [`bakeoff/avalonia.md`](bakeoff/avalonia.md), [`bakeoff/python.md`](bakeoff/python.md), [`bakeoff/tauri.md`](bakeoff/tauri.md), [`bakeoff/react-native.md`](bakeoff/react-native.md). Measured on one Windows 11 machine; timings indicative.
[LOCAL] Measurements on the same machine, 2026-09-29:
- `Get-AuthenticodeSignature` on the Electron 44.4.5 win32-x64 dist and packaged folder, and on `node.exe`;
- `curl -I` on the Electron release URL (302 to `release-assets.githubusercontent.com`);
- `npm ci` and an override `npm install` with no git on PATH and a fresh cache, followed by test, package and launch;
- the bake-off `package-lock.json` (`git+ssh` node-gyp and `hasInstallScript` entries).
- the in-project run: `npm ci`, `install-electron`, tests and packaging from `.tools\` with nothing installed, 72 s and about 1.45 GB (Node 107 MB, npm cache 90 MB, Electron cache 158 MB, `node_modules` 699 MB, `out` 388 MB). These figures come from the project's own test run; for this note I re-ran only the Node download, hash check, unpack, launcher and `npm config get` paths, plus a `.lnk` creation in a scratch folder, and deleted the scratch folders afterwards.
- `git` inside Codex's Windows sandbox (`codex exec -s workspace-write`, 2026-09-29): `.git` read-only, commands run as a separate user (CodexSandboxOffline), "dubious ownership" and permission errors. Result supplied by the main agent's test; I did not repeat it. The starter's install-script and prebuilt-`*.node` baseline comes from its README (`skills/workbench-setup/template/.agents/skills/workbench/starter/README.md`).

[1] Node.js Release schedule, https://raw.githubusercontent.com/nodejs/Release/main/schedule.json — v24 LTS dates, v26 LTS date.
[2] Node.js dist, https://nodejs.org/dist/index.json and https://nodejs.org/dist/latest-v24.x/ — zip/tarball files, SHASUMS256, zip contents (`npm.ps1`).
[3] nodejs/node #47601, https://github.com/nodejs/node/issues/47601 — MSI needs admin, zip works (user report).
[4] Node-RED, Running on Windows, https://nodered.org/docs/getting-started/windows — Node install requires admin (third-party).
[5] nvm-windows README, https://raw.githubusercontent.com/coreybutler/nvm-windows/master/README.md — "runs in an Admin shell".
[6] Schniz/fnm #424, https://github.com/Schniz/fnm/issues/424 — symlink admin / Developer Mode.
[7] Volta v2.0.0 release, https://github.com/volta-cli/volta/releases/tag/v2.0.0, and #1549, https://github.com/volta-cli/volta/issues/1549 — no official no-admin installer.
[8] nodejs/node #62427, https://github.com/nodejs/node/issues/62427; #60075, https://github.com/nodejs/node/issues/60075; npm/cli #7280, https://github.com/npm/cli/issues/7280 — unsigned `npm.ps1` fails under policy; `npm.cmd` works.
[9] Microsoft Learn, about_Execution_Policies (2026-08-31), https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_execution_policies?view=powershell-5.1 — Restricted default, GPO precedence, `curl.exe`/`iwr` add no MOTW.
[10] Microsoft Learn, Set-ExecutionPolicy (2026-08-31), https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.security/set-executionpolicy?view=powershell-5.1 — CurrentUser scope without admin.
[11] Microsoft Learn, about_Language_Modes, https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_language_modes?view=powershell-7.5 — CLM under AppLocker/WDAC.
[12] Electron, Advanced Installation Instructions, https://www.electronjs.org/docs/latest/tutorial/installation — lazy first-run download, mirror, cache (default shared location and the `electron_config_cache` override), proxy.
[13] Electron npm package source, https://raw.githubusercontent.com/electron/electron/main/npm/install.js (and `index.js`, `package.json`) — `install-electron` bin, `checksums.json`, `electron_config_cache`, `ELECTRON_OVERRIDE_DIST_PATH`.
[14] Electron PR #49328, https://github.com/electron/electron/pull/49328; PR #50406, https://github.com/electron/electron/pull/50406; Breaking Changes, https://raw.githubusercontent.com/electron/electron/main/docs/breaking-changes.md — no postinstall from 42; skip variable removed; 44 needs macOS 13+.
[15] @electron/get README, source and releases, https://github.com/electron/get (v5.0.0, 2026-04-22) — native `fetch`, `ELECTRON_GET_USE_PROXY` + `HTTP(S)_PROXY`, `GLOBAL_AGENT_*` dropped, cache paths.
[16] Electron release schedule, https://releases.electronjs.org/schedule, and timelines, https://raw.githubusercontent.com/electron/electron/main/docs/tutorial/electron-timelines.md — 8-week cadence, 3 supported majors, 44 EOL 2027-03-02.
[17] Electron v44.4.5 release, https://github.com/electron/electron/releases/tag/v44.4.5 — Chromium 152.0.7977.130, Node 24.21.0.
[18] Electron, Security, https://raw.githubusercontent.com/electron/electron/main/docs/tutorial/security.md — 20-item checklist.
[19] Electron, Fuses, https://raw.githubusercontent.com/electron/electron/main/docs/tutorial/fuses.md — fuse list; `nodeOptions` also gates `NODE_EXTRA_CA_CERTS`; tamper resistance needs signing.
[20] Electron, ASAR Integrity, https://raw.githubusercontent.com/electron/electron/main/docs/tutorial/asar-integrity.md — platforms, header-hash check, pair with `onlyLoadAppFromAsar`.
[21] Electron, Spellchecker, https://raw.githubusercontent.com/electron/electron/main/docs/tutorial/spellchecker.md, and Session API, https://raw.githubusercontent.com/electron/electron/main/docs/api/session.md — Hunspell from Google CDN on Windows/Linux; `setSpellCheckerDictionaryDownloadURL`.
[22] electron/electron #22995, https://github.com/electron/electron/issues/22995, and #27403, https://github.com/electron/electron/issues/27403 — download despite `spellcheck: false`; dead-URL workaround.
[23] electron/electron PR #53183 (open), https://github.com/electron/electron/pull/53183 — browser-process loads bypass the hooks `webRequest` relies on.
[24] Electron Forge plugin-vite README, v7.11.2 vs main, https://github.com/electron/forge/tree/v7.11.2/packages/plugin/vite and PR #4382, https://github.com/electron/forge/pull/4382 — "experimental" in 7.x; graduated on `next`.
[25] Electron Forge package-manager source and docs, https://github.com/electron/forge (`packages/utils/core-utils/src/package-manager.ts`, `docs/index.md`) — npm/yarn/pnpm only; `NODE_INSTALLER` deprecated; pnpm `node-linker=hoisted`.
[26] Electron Forge `start.ts` (v7.11.2), https://raw.githubusercontent.com/electron/forge/v7.11.2/packages/api/core/src/api/start.ts — `rs` read from stdin.
[27] `@electron-forge/template-vite-typescript` 7.11.2, https://unpkg.com/@electron-forge/template-vite-typescript@7.11.2/tmpl/package.json — TypeScript ~4.5.4, Vite ^5.
[28] Electron Forge Squirrel.Windows maker, https://raw.githubusercontent.com/electron/forge/main/docs/config/makers/squirrel.windows.md; Squirrel.Windows README and FAQ, https://github.com/Squirrel/Squirrel.Windows — per-user, no UAC; leftover folder; GPO block on `%LocalAppData%`.
[29] npm registry metadata: https://registry.npmjs.org/@electron%2Frebuild (3.7.2 git dependency; 4.2.0 uses `node-gyp ^12`), https://registry.npmjs.org/@electron-forge%2Fcore/7.11.2, https://registry.npmjs.org/@electron%2Fpackager — packager 18 uses `@electron/get` 3 and JS `extract-zip`.
[30] Node.js CLI docs (v24), https://raw.githubusercontent.com/nodejs/node/v24.x/doc/api/cli.md — `--use-system-ca` (23.8), `NODE_USE_SYSTEM_CA` (24.6), `NODE_EXTRA_CA_CERTS`, `NODE_USE_ENV_PROXY`.
[31] npm config, https://docs.npmjs.com/cli/v11/using-npm/config — `cafile`, `strict-ssl`, `proxy`, `https-proxy`, `ignore-scripts`; `npm_config_*` environment variables; `--userconfig` / `NPM_CONFIG_USERCONFIG`.
[32] Electron, Native Node Modules, https://raw.githubusercontent.com/electron/electron/main/docs/tutorial/using-native-node-modules.md; node-gyp README, https://github.com/nodejs/node-gyp — VS C++ Build Tools / Xcode CLT required.
[33] npm docs, package.json `gypfile` and package-lock `hasInstallScript`, https://github.com/npm/cli/tree/latest/docs/lib/content/configuring-npm — detecting native builds.
[34] Microsoft Support, Smart App Control FAQ (2026-08-17), https://support.microsoft.com/en-us/windows/security/threat-malware-protection/smart-app-control-frequently-asked-questions — unsigned blocked unless reputation; no per-app bypass; off on enterprise/dev devices.
[35] Microsoft Learn, Smart App Control overview, https://learn.microsoft.com/en-us/windows/apps/develop/smart-app-control/overview — evaluation vs enforcement; where to check.
[36] E. Lawrence, Smart App Control, 2026-04-28, https://textslashplain.com/2026/04/28/smart-app-control/ — all loaded modules evaluated.
[37] electron/electron #52481 (closed 2026-08-23), https://github.com/electron/electron/issues/52481, and PR #52748, https://github.com/electron/electron/pull/52748 — SAC blocked the extractor `.node`, not `electron.exe`; lazy-load fix.
[38] Electron, Code Signing, https://raw.githubusercontent.com/electron/electron/main/docs/tutorial/code-signing.md — signing/notarization are the developer's job; Apple Developer Program fee.
[39] @electron/packager source (`src/mac.ts`, `src/win32.ts`), https://github.com/electron/packager; @electron/fuses README, https://github.com/electron/fuses; Forge FusesPlugin (v7.11.2) — ad-hoc re-sign on arm64 without `osxSign`; Forge's six fuses; order rename → resedit → sign.
[40] Eclectic Light, "Apple silicon Macs will require signed code", 2020-08-22, https://eclecticlight.co/2020/08/22/apple-silicon-macs-will-require-signed-code/ — quotes Apple's release note that ad-hoc signatures suffice (secondary).
[41] @electron/osx-sign, https://github.com/electron/osx-sign; @electron/notarize, https://github.com/electron/notarize; Apple, Notarizing macOS software, https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution — Xcode and Developer ID needed.
[42] Apple Platform Security, Gatekeeper and runtime protection, https://support.apple.com/guide/security/gatekeeper-and-runtime-protection-sec5599b66df/web — checks apply to downloaded software.
[43] avibe-bot/avibe #2254, https://github.com/avibe-bot/avibe/issues/2254 — `/usr/bin/codesign` works without the CLT (third-party, unverified).
[44] Palo Alto Unit 42, Gatekeeper Bypass, 2024, https://unit42.paloaltonetworks.com/gatekeeper-bypass-macos/ — CLI downloads aren't quarantined; Gatekeeper checks quarantined files.
[45] pnpm/pnpm #11056, https://github.com/pnpm/pnpm/issues/11056 — quarantine inherited from a GUI parent process.
[46] Apple Developer News, Runtime protection in macOS Sequoia, 2024-08-06, https://developer.apple.com/news/?id=saqachfa; AppleInsider, https://appleinsider.com/inside/macos-sequoia/tips/whats-changed-in-runtime-protection-for-macos-sequoia — "Open Anyway" flow, admin password (secondary).
[47] Microsoft Support, SmartScreen and MOTW, https://support.microsoft.com/en-US/servicing/os/windows/docs/2025/10/smartscreen-deprecation-in-internet-explorer-and-ie-mode-in-windows-11; E. Lawrence, Downloads and the Mark-of-the-Web, https://textslashplain.com/2016/04/04/downloads-and-the-mark-of-the-web/ — SmartScreen scans MOTW files; local files have none.
[48] Microsoft Learn, Understanding AppLocker default rules, https://learn.microsoft.com/en-us/windows/security/application-security/application-control/app-control-for-business/applocker/understanding-applocker-default-rules — default rules block user-profile programs; user-writable allowed subfolders are a policy hole.
[49] MDN, showOpenFilePicker, https://developer.mozilla.org/en-US/docs/Web/API/Window/showOpenFilePicker; Chrome for Developers, File System Access, https://developer.chrome.com/docs/capabilities/web-apis/file-system-access; MDN, Secure Contexts, https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts — Chromium-only pickers; `file://` secure.
[50] Microsoft Learn: Macros from the internet are blocked, https://learn.microsoft.com/en-us/microsoft-365-apps/security/internet-macros-blocked; Office Scripts limits, https://learn.microsoft.com/en-us/office/dev/scripts/testing/platform-limits; Power Automate desktop prerequisites, https://learn.microsoft.com/en-us/power-automate/desktop-flows/requirements.
[51-GfW] Git for Windows v2.55.0.windows.5, https://github.com/git-for-windows/git/releases/tag/v2.55.0.windows.5 — MinGit/PortableGit assets.
[51-MinGit] Git for Windows, MinGit, https://gitforwindows.org/mingit — minimal non-interactive build.
[51-Zip] Git for Windows, Zip archives, https://gitforwindows.org/zip-archives-extracting-the-released-archives.html — headless PortableGit extraction.
[51-gitscm] Git, Install for macOS, https://git-scm.com/install/mac — CLT/Homebrew/MacPorts.
[51-CLT] Apple Community, https://discussions.apple.com/thread/5992024, and Jamf, https://community.jamf.com/t5/jamf-pro/xcode-running-as-a-non-admin/m-p/211456 — CLT install asks for admin (old, secondary).
[51-iso] isomorphic-git, https://isomorphic-git.org/ — pure-JS git.
[52] Microsoft Q&A, Install application without admin account, https://learn.microsoft.com/en-us/answers/questions/559499/install-application-without-admin-account — Visual Studio needs admin.
[53] Tauri, Prerequisites, https://v2.tauri.app/start/prerequisites/ — MSVC Build Tools, WebView2, Xcode/CLT, Rust.
