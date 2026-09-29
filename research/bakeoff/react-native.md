# Build report: Resume Parser (React Native for Windows 0.84 + TypeScript), built with no admin rights

Date of run: 2026-09-29, Windows 11 build 26200 x64, standard (non-elevated) user, machine `DESKTOP-QTPN3M3`.
Everything below was observed on this run unless marked **[UNVERIFIED]** or **[INFERENCE]**.
Timings are **indicative only**: other agents were building Flutter and Compose at the same time (each timing line below lists what else was running; typically `java` x2-3, `MSBuild` x2, `node` x3-13, sometimes `dart`).

## Verdict

**Partly. It built and ran with no admin rights and no UAC prompt, but only via a hand-driven route. It does NOT work out of the box, and one required feature (PDF text) does not work in the app.**

- **Route that worked (route 1: what was already on the machine, plus per-user downloads).** Visual Studio **Build Tools 2022** (already there, installed earlier with admin by winget), Windows SDK 10.0.26100, a **portable PowerShell 7** unzipped per user, NuGet packages restored per user, and **direct MSBuild calls** instead of `react-native run-windows`. The built `ResumeParser.exe` launched, stayed up and responded, loaded samples, and wrote a real `.xlsx`.
- **`npx react-native run-windows` cannot be used here.** The RNW 0.84 CLI finds Visual Studio with `vswhere` *without* `-products *`, so it never sees a "Build Tools" install, and it also demands VS >= 18.6 (VS 2026). Its own env override `MinimumVisualStudioVersion=17.0` does not fix that. See friction items 4-6.
- **Feature status in the running app** (Debug build, verified by re-reading the exported file with ExcelJS):
  - DOCX: works (Daniel Okafor: name, email, phone, links, skills, years 14.5 all correct).
  - TXT: works (Priya Raman, years 6).
  - **PDF: FAILS in the app.** pdf.js 6 does not initialise under Hermes here (`Cannot read property 'getDocument' of undefined`, and in LogBox a `Cannot read property 'prototype' of undefined` at pdf.mjs line 6088, the core-js `DOMException` lookup). I added polyfills (DOMException, structuredClone, ReadableStream) and Babel fixes, but the error did not change after the polyfill, and I ran out of budget before finding out why. **The same pdf.js code with the same `extract.ts` passes all tests under Node.** The scanned example also shows this error instead of "no text found (scanned?)" because the failure happens before any PDF is read.
  - Native open/save dialogs: written (IFileOpenDialog / IFileSaveDialog in C++) and compiled, but **not exercised** at run time, on purpose (privacy rule: no blind automation of file dialogs). Loading and export were driven by debug-only environment variables.
- Tests: **8/8 pass** under Node (7 ported cases through real pdf.js, DOCX and TXT extraction, plus an xlsx round-trip). Jest was not used (see Toolchain).
- Screenshot: `screenshot.png` (honest state: the two PDF rows are red error rows; window content is clipped on the right, see Open issues).

## Admin / Developer Mode findings (the key question)

| Question | Finding |
|---|---|
| Did anything need admin / UAC? | **No.** I never elevated. Everything installed per user (`%LOCALAPPDATA%\rn-tools\pwsh`, `~\.nuget\packages`, `node_modules`). |
| Does the official flow want admin? | **Yes.** `rnw-dependencies.ps1` refuses to run unless elevated (`IsElevated` check, unless `-NoPrompt`), and its installers use `winget install`, `vs_installer modify` and writes `HKLM\...\AppModelUnlock` (Developer Mode) and `HKLM\...\LongPathsEnabled`. I read the whole script and ran **only** `-NoPrompt` (check-only: `$Install` false and no prompt, so no install path is reachable). |
| Developer Mode | **Already ON before I started** (`HKLM\...\AppModelUnlock\AllowDevelopmentWithoutDevLicense = 1`, `Get-WindowsDeveloperLicense` valid; not set by me). So **I could not test "OFF"**. What I can say: the route I used builds an **unpackaged Win32 exe** and never registers any MSIX, so nothing I did depended on it **[INFERENCE, not tested with it off]**. The docs still list Developer Mode as a requirement. |
| MSIX / certificate | **None used.** The 0.84 `cpp-app` template is an unpackaged Win32 app (`AppxPackage=false`, `ConfigurationType=Application`, no manifest in the app project). A `ResumeParser.Package` MSIX project exists in the template; I never built it. No certificate was installed. |
| Windows App SDK runtime | The default (framework-dependent) exe **fail-fasts at start-up** (exit `0xC0000409`, no message) because no *DDLM* package matching the SDK's required runtime `8000.859.21.0` is registered for this user (installed DDLMs: 8000.642.119, 8000.675.1142, 8000.770.947; the framework itself `1.8` 8000.859.21 **is** present). Fixing that the official way means registering a Microsoft-signed DDLM MSIX (`Add-AppxPackage`), which I did **not** do (hard rule on MSIX). **Workaround that needs no MSIX:** `/p:WindowsAppSDKSelfContained=true` copies the runtime DLLs next to the exe. That is what the final build uses. **[INFERENCE]** the diagnosis of the missing DDLM is from package listings plus the SDK's `MddBootstrapAutoInitializer` (default `OnError_FailFast`); I did not read the HRESULT. |
| Visual Studio components | Required by the docs/script: Desktop C++, .NET desktop, **UWP** workloads, Windows 11 SDK 22621, .NET 10 SDK, VS >= 18.6. **Present here:** only Build Tools 2022 17.14 with `VC.Tools.x86.x64`, `NativeDesktop.Core`, Windows SDK **26100**. **Missing:** UWP support/VC, SDK 22621, .NET SDK (`dotnet` is not installed), NuGet component. **It built anyway** because the `UseExperimentalNuget=true` app template consumes prebuilt `Microsoft.ReactNative` NuGet packages instead of compiling the framework from source. Compiling from source needs the UWP tools (`MSB8020: build tools for v143 (Platform Toolset = 'v143') cannot be found`, on `ApplicationType=Windows Store`), which cannot be added without admin. |
| Firewall / Defender / SmartScreen | **No Firewall prompt seen.** Metro was bound to `127.0.0.1`. No Defender toast or SmartScreen prompt seen; the exe is unsigned and has no Mark-of-the-Web (built locally). I did not query Defender logs. Smart App Control is off on this machine (per the earlier Tauri report), so this does not generalise. |

## Toolchain steps (commands, times, sizes)

Docs read first: RNW 0.84 "System Requirements" and "Get Started" (microsoft.github.io/react-native-windows), `rnw-dependencies.ps1` (downloaded to `%TEMP%`, read, check-only run).

| # | Step | Command | Result / time |
|---|---|---|---|
| 1 | Preflight | `scripts/preflight.ps1` (vswhere with `-products *`, registry reads, `Get-AppxPackage`) | 1.5 s. Not elevated. Build Tools 17.14.37710 only. `dotnet`, `yarn`, `msbuild` not on PATH. `npm` (proto shim) is **broken** (`missing_tool npm latest`, same as the Tauri report). |
| 2 | RNW deps check-only | `rnw-dependencies.ps1 -NoPrompt -Verbose` | Free space OK, RAM OK, Windows OK, Dev Mode OK, long paths OK; **VS 2026 (>=18.6) FAILED, Node FAILED** (script bug: it reads the version of the `node.exe` *proto shim* as `0.0.0.0`), **Yarn FAILED, .NET SDK 10 FAILED**. |
| 3 | Node/npm | `scripts/env.ps1` puts `C:\Users\AmirHossein\AppData\Local\pi-node\current` (Node 22.23.2 + npm 10.9.8) first on PATH | Node 24.21.0 (proto shim) is used for `node --test`; npm comes from the pi-node folder because the proto npm shim is broken. RNW needs Node >= 22 (satisfied). |
| 4 | RN app template | `npx @react-native-community/cli init ResumeParser --version 0.84.0 --pm npm --skip-git-init --install-pods false` | **68.2 s** (includes `npm install`). Then removed `android/`, `ios/`, `Gemfile`. |
| 5 | Add RNW | `npm install react-native-windows@^0.84.0` failed (`ERESOLVE`: RNW 0.84.0 peer wants **react-native 0.84.1**, docs say `--version 0.84.0`); then `npm install react-native@0.84.1 react-native-windows@^0.84.0` | 2.0 s (fail), **18.3 s** (ok) |
| 6 | Portable PowerShell 7 | `scripts/get-pwsh.ps1` (PowerShell 7.6.6 win-x64 zip, GitHub release, unzipped to `%LOCALAPPDATA%\rn-tools\pwsh`) | **70 s**, 101 MB download, **245 MB** on disk. Needed because the RNW CLI 0.84 throws `Unable to find pwsh.exe` on load. |
| 7 | Windows project | `npx react-native init-windows --overwrite --no-telemetry` (template `cpp-app`, the only app template: `--list`) | **8.7 s** |
| 8 | JS libs | `npm install fflate pdfjs-dist` then `npm install -D exceljs`, later `npm install web-streams-polyfill` | 8.3 s, 2.3 s |
| 9 | NuGet restore | done by `msbuild /restore` (packages.config style) | **17-26 s** cold; NuGet cache is now **2,157 MB** (WinAppSDK 1.8.260508005, Hermes, Microsoft.ReactNative 0.84.0, boost, WebView2, ...). Needs network: nuget.org and `pkgs.dev.azure.com/ms/react-native`. |
| 10 | **Build (works)** | `scripts/msb.ps1 -Config Debug -Bundle` (direct MSBuild on `windows/ResumeParser/ResumeParser.vcxproj`) | See Measurements. Global properties I had to add: `PlatformToolset=v143`, `PlatformToolsetVersion=143`, `WindowsTargetPlatformVersion=10.0.26100.0`, `SolutionDir`, `SolutionPath`, `SolutionFileName`, `SolutionName`, `SolutionExt`, `WindowsAppSDKSelfContained=true`, `UseBundle=true`. |
| 11 | Run | `scripts/run-debug.ps1` (sets `RESUME_PARSER_DEBUG_SAMPLES` / `RESUME_PARSER_DEBUG_EXPORT`, waits, screenshots via `PrintWindow`, closes) | window `Resume Parser` up, responding, ~85 MB working set at first paint, 136-440 MB after loading. |

Telemetry disabled: `--no-telemetry` on every RNW CLI call I made (`init-windows`, `run-windows`, `autolink-windows`), `DOTNET_CLI_TELEMETRY_OPTOUT=1`, `DOTNET_NOLOGO`, npm `fund`/`audit`/`update-notifier` off. The RNW CLI has **no env-var opt-out** (I grepped its telemetry package). The CLI calls that MSBuild makes internally during a build (autolink, codegen) do not pass `--no-telemetry`; whether they send anything is **[UNVERIFIED]**. I did not see any network call except package restores.

Template choice: `cpp-app` (New Architecture, Win32 host on the Windows App SDK, C++). It is the **only** app template in RNW 0.84 (`init-windows --list` also shows `cpp-lib`). The old UWP/Paper and C# app templates are gone in 0.82+.

## Measurements

| Measurement | React Native for Windows (this run) | Tauri (reference) |
|---|---|---|
| Cold first successful native build | **70.6 s** for the build itself (restore already done; includes JS bundle + Hermes compile). **From the first MSBuild attempt to the first success: about 11 min** of wall time, over 10 attempts (each failed attempt was 1-43 s). Restore alone: 17-26 s. Others running: javax2-4, MSBuildx2, nodex3. | 148.0 s |
| UI change turnaround | **[UNVERIFIED]. Not measured.** Metro was running and the app loaded from it, and one relaunch after a JS change (the polyfill) picked the change up within one ~9 s launch, but I did not measure hot reload. | 73-215 ms |
| Native rebuild after a small C++ change | **8.0 s** (3 lines in `ResumeParser.cpp`, no JS bundle step); 28-29 s after a project-property change; **55.6 s** with the bundle step (`--reset-cache`) | n/a |
| Rebuild after adding one dependency | Adding a **pure-JS** dep (`web-streams-polyfill`): `npm install` 2.3 s + Metro picks it up. Adding a **native** dep with autolinking: **not measured** (candidate: `@dr.pogodin/react-native-fs` 2.40.3, has a `windows/` folder with New Architecture codegen). **[UNVERIFIED]** | 35.3 s |
| Full build after UI-only change (with bundle) | **62.8 s** (self-contained, Debug, bundle regenerated) | 13.5-15 s |
| Debug exe | **3.47 MB** (`windows\x64\Debug\ResumeParser.exe`) | 14.9 MiB |
| Distributable folder (Debug, self-contained) | `windows\x64` **264 MB** in total (incl. a 52 MB `.pdb`, 36 MB `hermes-icu.dll`); the earlier framework-dependent Debug folder was 144 MB. The JS bundle (`index.windows.bundle`, Hermes bytecode) is 4.96 MB. **A Release build was not made**, so there is no release size. | release exe 10.73 MiB, installer 2.76 MiB |
| Runs by double-click, no installer? | The Debug exe **runs by double-click from its folder** (unpackaged) once built self-contained. It needs the whole folder (DLLs + `Bundle\`), not the exe alone. Not tested from another folder or another PC. The framework-dependent build does **not** run here (fail-fast, see above). | bare exe yes; NSIS installer per user |
| `node_modules` | **435 MB** | 193 MB |
| NuGet cache | **2,157 MB** (all of it created by this project's restores, plus whatever was there before **[UNVERIFIED]**) | `~/.cargo` +229 MB |
| MSBuild intermediates | `windows\ResumeParser\x64` **1,109 MB** | `src-tauri/target` 7.4 GB |
| Portable PowerShell 7 | 245 MB | n/a |
| Toolchain already on the machine | VS Build Tools 3.4 GB + Windows SDK 1.7 GB (pre-existing, admin-installed) | same |
| Free disk on C: at the end | 20.3 GB (28.9 GB at start; other agents also write to it) | 38.5 -> 28.9 GB |
| Test run | `npm test`: 8 tests, about 1.5 s after warm start | 7 tests |
| Defender / SmartScreen | none seen | none seen |

## What was built

Path: `examples/resume-parser-react-native/`

- `src/parser.ts`: the **unmodified** Tauri `parser.ts` (copied byte for byte, pure TypeScript, runs in Hermes). Both regressions ("I'm ..." is not a name; `(+49)` keeps its bracket) are in the tests.
- `src/extract.ts`: TXT via `TextDecoder`; **DOCX via `fflate` + a 20-line regex reader over `word/document.xml`** (mammoth needs Node streams); **PDF via pdf.js** (same line reconstruction as Tauri); "no text found (scanned?)" for near-empty output.
- `src/pdf.ts` + `src/polyfills.ts`: lazy pdf.js loader (fake main-thread worker via `globalThis.pdfjsWorker`) and Hermes polyfills. **Not working in the app** (see Verdict).
- `src/xlsx.ts`: hand-written SpreadsheetML + `fflate` zip: bold header with fill, frozen header row, autofilter, ID and phone as `@` (Text) string cells, years numeric, "Needs checking" column. (ExcelJS is used only in tests as an independent reader.)
- `App.tsx`: one screen: Open / Export / Clear / Skill list buttons; a table (one row per resume, `TextInput` cells, uncertain = yellow, missing = red, edited = blue); clicking or focusing a row shows the raw text side by side with the parser notes; collapsible skill editor persisted as `%APPDATA%\Resume Parser\skills.json`.
- `windows/ResumeParser/ResumeNative.h`: the **one native module** (C++/WinRT, `REACT_MODULE`): `pickResumes`, `pickSavePath` (Win32 `IFileOpenDialog` / `IFileSaveDialog` on the UI thread), `readFileBase64`, `writeFileBase64`, `readSetting`/`writeSetting` (app-data folder), `getDebugConfig` (**Debug builds only**: `RESUME_PARSER_DEBUG_SAMPLES`, `RESUME_PARSER_DEBUG_EXPORT`). No network calls in the app; Debug builds fetch JS from Metro on localhost only when built without `UseBundle`.
- `windows/ResumeParser/ResumeParser.cpp`: template plus title/size, and a crash logger (`%TEMP%\resume-parser-crash.log`, written on `std::terminate`/`abort`). **It did not catch the start-up fast-fail**, because that fast-fail comes from the Windows App SDK auto-initialiser.
- `samples/`: the three Tauri samples plus `scanned-example.pdf` (image-only PDF made by `scripts/make-scanned.mjs`).
- `scripts/`: `env.ps1`, `preflight.ps1`, `get-pwsh.ps1`, `msb.ps1`, `run-debug.ps1`, `dbgview.ps1` (a minimal DebugView), `kill-mine.ps1`, `metro.ps1`, `jsbundle.ps1`, `verify-xlsx.mjs`, `time.ps1`.
- `babel.config.js`: adds `@babel/plugin-transform-class-static-block` and a small plugin that (for `pdfjs-dist` only) turns `import(x)` into a rejected promise and `import.meta` into `{url: ""}`.

### Libraries for each capability (RNW module or custom native code?)

| Capability | Maintained RNW module? | What I did / cost |
|---|---|---|
| Open dialog (multi-select) | **No.** `@react-native-documents/picker` 12.0.2 (actively maintained) has **no Windows mention**; `react-native-document-picker` 9.3.1 (last release 2024-08) mentions RNW but is the superseded package. | **Wrote C++** (about 60 lines: `IFileOpenDialog`, multi-select, filter). |
| Save dialog | No module found. | **Wrote C++** (about 30 lines). |
| Read file bytes | `@dr.pogodin/react-native-fs` 2.40.3 (MIT, pushed 2026-09-12, has `windows/` with codegen for the New Architecture) is the most plausible; `react-native-fs` 2.20.0 is old (last release 2022, has `windows` and `windows_legacy`); `react-native-blob-util` 0.25.1 mentions Windows. **I did not try any of them** **[UNVERIFIED]** whether they build on RNW 0.84. | Wrote 20 lines of C++ (`readFileBase64` / `writeFileBase64`, base64 over the bridge). |
| App-data JSON | same as above (`RoamingDirectoryPath` exists in the pogodin lib). | C++ `readSetting` / `writeSetting`. |
| PDF text | none native. Windows' `Windows.Data.Pdf` renders pages but has **no text extraction** **[INFERENCE, from memory of the API]**. | pdf.js in JS: **bundles** (after two Babel fixes) but **does not initialise under Hermes** (unresolved). A native route was not attempted. |
| DOCX | `fflate` (pure JS, MIT), works in Hermes. | 20 lines of glue. |
| xlsx | ExcelJS 4.4.0: **Metro bundles it** (1.76 MB bundle), but I **did not run it on Hermes** **[UNVERIFIED]**. SheetJS free build has no cell styles. | Wrote a 100-line writer over `fflate`; verified by re-reading the real exported file with ExcelJS. |

Cost of native code: about 260 lines of C++ in one header, first compile with no errors, but it took 5 builds to find out why the app fast-fails at start-up (see friction 11).

## Friction log

Attempts = tries until it worked. "RNW" rows are what matters for the AI-productivity question.

| # | What went wrong | Category | Attempts |
|---|---|---|---|
| 1 | `npm install react-native-windows@^0.84.0` -> `ERESOLVE`: peer `react-native@0.84.1`, docs say init with `--version 0.84.0`. | RNW docs vs package | 2 |
| 2 | `proto` `npm` shim broken (`missing_tool npm latest`); `npx` hits the shim first. Used the npm next to a Node 22 install and put it first on PATH. | Environment | 3 |
| 3 | RNW CLI 0.84 fails to load: `Unable to find pwsh.exe. It should have been made available by yarn install.` Every `react-native` command printed `'dotnet.exe' is not recognized` (harmless noise) and the RNW commands were missing from `--help`. Fixed with portable PowerShell 7. | RNW CLI | 2 |
| 4 | **`run-windows` requires VS >= 18.6.0** (VS 2026), while the docs say VS 2022. | RNW docs vs code | 1 |
| 5 | Override `MinimumVisualStudioVersion=17.0` (found in the CLI source, not the docs) still fails: `vswhere` is called **without `-products *`**, so Build Tools installs are invisible. **Gave up on `run-windows`; drive MSBuild directly.** | RNW CLI | 2 |
| 6 | Direct MSBuild needed a stack of properties it normally gets from the solution or VS: `PlatformToolsetVersion=143` (`MSB4086` at restore), `SolutionDir` / `SolutionPath` / `SolutionFileName` (`RequireSolution.targets`), `WindowsTargetPlatformVersion=10.0.26100.0` (`MSB8036`: template wants SDK 22621), `PlatformToolset=v143` (template says v145). One error at a time, 1 build each. | RNW build | 6 |
| 7 | First try built the RNW framework from source because `SolutionDir` was empty, so `UseExperimentalNuget` was ignored: `MSB8020` (needs UWP tools) and `MSB8036` (SDK 17134). Setting `SolutionDir` made it use NuGet packages. | RNW build | 1 |
| 8 | Metro: `pdf.mjs: Static class blocks are not enabled` -> add `@babel/plugin-transform-class-static-block`. | pdf.js on Metro | 1 |
| 9 | Metro: `Invalid call ... import(workerSrc)` (non-literal dynamic import). Setting `transformer.dynamicDepsInPackages` did nothing (it is already the default and does not apply to `import()`); fixed with a small Babel plugin for pdf.js only. | pdf.js on Metro | 2 |
| 10 | Hermes compiler (run by the build): `'import.meta' is currently unsupported` in pdf.js. Fixed with the same Babel plugin. A stale binary bundle from an earlier build once caused `Invalid UTF-8 continuation byte` when Metro failed silently and the build kept going (`MSB3073` warning only). | Hermes | 2 |
| 11 | **Exe exits after about 3 s with `0xC0000409`, no window, no message.** Tried: `set_terminate` handler, `SIGABRT` handler, vectored exception handler, `try/catch` around `WinMain` and around `CreatePackage`, a DebugView clone: none showed the cause. It was the Windows App SDK auto-bootstrap failing because no matching DDLM package is registered. Found by comparing `Get-AppxPackage *WinAppRuntime*` with the SDK's `WindowsAppSDK-VersionInfo.json`. `WindowsAppSDKSelfContained=true` fixed it with no MSIX. | RNW / WinAppSDK | 5 builds, ~15 min |
| 12 | pdf.js at run time: `Cannot read property 'prototype' of undefined` (core-js `DOMException` lookup, pdf.mjs:6088). Symbolication only worked after switching from the bytecode bundle to Metro dev-server mode. Added DOMException/structuredClone/ReadableStream polyfills; **the error did not change and the PDF path is still broken.** Hermes probe (headless `hermes.exe` from the NuGet cache) shows `DOMException`, `structuredClone`, `ReadableStream`, `Array.prototype.toSorted`, `Map.prototype.getOrInsertComputed`, `ArrayBuffer.prototype.transfer` are missing. | pdf.js on Hermes | 2 (not fixed) |
| 13 | Build Tools has no debugger (`cdb`, `procdump`), so a crash gives only a WER event (`ucrtbase`, `0xc0000409`). | Environment | n/a |
| 14 | My own tooling errors: inline PowerShell in the tool shell has `$` expanded by the outer shell (4 failures, then switched to `.ps1` files); non-ASCII characters in a `.ps1` broke Windows PowerShell 5.1 parsing; the edit tool was given wrong line numbers 5 times (clobbered `env.ps1`, `App.tsx` imports, `run-debug.ps1`), each fixed by re-reading. | Agent tooling | 2-3 each |
| 15 | Screenshot by screen-copy of the window rectangle captured another agent's terminal behind a small window (only terminal text). Switched to `PrintWindow` of the specific window. | Privacy / tooling | 1 |
| 16 | **API mistakes in my own code:** none found by the compiler or by TypeScript **[UNVERIFIED]**: I did not run `tsc` and did not run ESLint. The C++ module compiled at first try. | Code | 0 |

Read of the evidence: the RN-specific cost is the **Windows toolchain plumbing** (items 3-7, 11): the official path needs admin-installed VS 2026 workloads, and the "no admin" path needed about 10 builds and reading the CLI source. The JS library cost is pdf.js on Hermes (items 8-12), which is not finished.

## Packages and licences

| Package | Version | Licence | Note |
|---|---|---|---|
| react-native | 0.84.1 | MIT | |
| react-native-windows | 0.84.0 | MIT | |
| react | 19.2.3 | MIT | |
| fflate | 0.8.3 | MIT | zip / DOCX / xlsx |
| pdfjs-dist | 6.3.289 | Apache-2.0 | not working on Hermes yet |
| web-streams-polyfill | 4.3.0 | MIT | |
| exceljs (dev only) | 4.4.0 | MIT | tests only |
| PowerShell (portable) | 7.6.6 | MIT | build helper only |
| Microsoft.WindowsAppSDK (NuGet) | 1.8.260508005 | Microsoft software licence terms **[UNVERIFIED, not read]** | redistributable runtime |
| Microsoft.ReactNative / Hermes (NuGet) | 0.84.0 / 0.0.0-2605.6002-2279da22 | MIT **[UNVERIFIED, not read]** | |
| VS Build Tools 2022, Windows SDK | pre-installed | Microsoft licence, accepted by whoever installed them earlier | I accepted nothing this run |

No commercial licence is needed for anything I used.

## How a non-programmer would run it

- **Not today.** The PDF path is broken and only a Debug build was made. If it were finished, the office worker would get the **whole** `windows\x64\Release` folder (exe + DLLs + `Bundle\`; a release build is untested) and double-click `ResumeParser.exe`. She needs **no** installer if the build is self-contained, but a Debug folder is 264 MB.
- To rebuild: `npm install`, then `powershell -File scripts\msb.ps1 -Config Debug -Bundle`, then run `windows\x64\Debug\ResumeParser.exe`. That needs VS Build Tools with C++ (admin-installed), Windows SDK, Node >= 22 and a **portable PowerShell 7** (`scripts\get-pwsh.ps1`).
- To try it without dialogs: set `RESUME_PARSER_DEBUG_SAMPLES` (`;`-separated absolute paths) and `RESUME_PARSER_DEBUG_EXPORT` before launching a **Debug** build. `scripts\run-debug.ps1` does this with the samples in `samples\`.
- Checks: `npm test` (Node), `node scripts/verify-xlsx.mjs <file>`.

## Open issues

- **PDF extraction in the app is broken** (pdf.js on Hermes). Next steps to try: find out why `getBuiltIn('DOMException')` is still undefined (is `polyfills.ts` actually evaluated first? does core-js read a different global?), or run pdf.js's parsing in a native route.
- **Window/layout:** the window renders at about 1000x573 px although `Resize({1500, 860})` was requested (DPI or DIP units, unresolved), so the layout is clipped on the right in `screenshot.png`. The flex layout was not tuned.
- **Not exercised:** the native Open/Save dialogs, the persisted skill list across a restart, hot-reload latency, a Release build, a native community-module install (`@dr.pogodin/react-native-fs`), `tsc`, ESLint, ExcelJS on Hermes.
- **Docs vs reality:** RNW 0.84 docs say VS 2022 with UWP workloads; the CLI and the current `rnw-dependencies.ps1` require VS >= 18.6. The docs' `--version 0.84.0` conflicts with the RNW peer `react-native@0.84.1`.
- **Fragility:** my direct MSBuild route depends on undocumented property names and on `UseExperimentalNuget`; a template update can break it. Building needs network (npm, nuget.org, Azure DevOps feed).
- **Developer Mode** was already on, so "works with it off" is **[UNVERIFIED]**. The framework-dependent route (official) needs a matching WinAppSDK DDLM package per user; a machine without those **[INFERENCE]** would need the runtime installer.
- **macOS (docs only, [UNVERIFIED]):** `react-native-macos` latest is **0.81.9** (three minors behind RN 0.84 / RNW 0.84), per npm. The docs page says: init the app with the same RN minor (`--version 0.81.x`), run `npx react-native-macos-init`, then `npx react-native run-macos` or open `macos/<App>.xcworkspace` in Xcode. **Needs a Mac** with **full Xcode**; the page does not say so, but React Native's general setup also implies **CocoaPods** (Ruby) and Watchman **[UNVERIFIED]**. This Windows project cannot be reused for macOS; the native module (`ResumeNative.h`) would have to be rewritten in Objective-C/Swift/C++ for AppKit dialogs.
- **Can the UI render HTML?** **No.** React Native draws native views (`View`, `Text`, `TextInput`); there is no DOM and no HTML/CSS engine, and no WebView is used here. HTML mockups would not be honest for this stack.
