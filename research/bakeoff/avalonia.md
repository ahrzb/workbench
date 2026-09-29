# Build report: Resume Parser (Avalonia UI 12 on .NET 10, C#), built with no admin rights and no C++ compiler

Date of run: 2026-09-29, Windows 11 build 26200 x64, standard (non-elevated) user, machine `DESKTOP-QTPN3M3`.
Everything below was observed on this run unless marked **[UNVERIFIED]** or **[INFERENCE]**.
Screen scaling is 150 %, so the 1500x860 dp window is 2250x1290 px (`screenshot.png` is 2272x1346 with the window frame).
All timings are **indicative only**: other agents were building at the same time (see "Contention").

## Verdict

**Yes. Avalonia 12.1.3 on .NET 10.0.401 installed, built, tested, published and ran here with no administrator rights, no UAC prompt, no machine-wide change and no C++ compiler.**

- Route: **per-user .NET SDK 10.0.401 (LTS) via Microsoft's `dotnet-install.ps1` into `%USERPROFILE%\dev\dotnet`** (`DOTNET_ROOT`/`PATH` set per process only) + `Avalonia.Templates` 12.1.3 (`avalonia.mvvm`). No Visual Studio, Rider, MSVC or Windows SDK was used. No .NET existed system-wide (`C:\Program Files\dotnet` and the x86 folder are absent), so the per-user route was the only one.
- **No native compilation happened.** 0 mentions of `link.exe`, `cl.exe` or `ilc` in the detailed (`-v:d`) MSBuild logs of all five publish flavours; no `ILCompiler` package in the NuGet cache; NativeAOT was never used. The only native code is prebuilt: SkiaSharp, HarfBuzzSharp, ANGLE (from NuGet) and the .NET runtime.
- Parser: **13/13 xUnit tests pass** (`dotnet test`) through real PDF (PdfPig), DOCX (`System.IO.Compression` + `XmlReader`) and TXT extraction. The 7 Tauri cases are ported one to one, plus corrupt file, cp1252 fallback, multi-word skill, skill JSON round trip, unreadable skill file and an OOXML-level xlsx re-read.
- Desktop app: launched as `dotnet run`, Debug exe, and five published flavours (framework-dependent, self-contained folder, single file, single file compressed, trimmed). Samples were loaded through the **real native Open dialog** (path set with `WM_SETTEXT`, read back with `WM_GETTEXT`, then OK) and the **real native Save dialog**. The exported `.xlsx` was re-read with an independent script.
- **Runtime network: 0 TCP and 0 UDP endpoints** for the published exe with samples loaded (single-file and folder exe).
- **C#/Avalonia API mistakes caught by the compiler: 0.** The whole run had 0 build errors and 0 build warnings. Two Avalonia-specific slips of mine were not compiler errors (friction rows 2 and 3). Details and the failures that did happen are in the friction log.
- Per-user install without admin also works for end users: a **Velopack** `Setup.exe` (61 MB) installed to `%LOCALAPPDATA%` with exit 0 in 3.8 s, the installed exe launched, and the uninstaller removed everything.
- **Not tried:** a physical mouse double-click in Explorer (I used `explorer.exe <exe>`, the same ShellExecute path), macOS, Smart App Control enforcement, MOTW/SmartScreen.

## Toolchain steps (with wall-clock times)

| # | Step | Command | Result / time |
|---|------|---------|---------------|
| 1 | Preflight | `whoami`, `Get-ExecutionPolicy -List`, `Test-Path` | Not elevated. Execution policy `RemoteSigned` (LocalMachine), others Undefined. No .NET under `C:\Program Files\dotnet` or `(x86)`; no `dotnet` on `PATH`. `~\.nuget\packages` already existed with other agents' packages (React Native), so I used an **isolated NuGet cache** (`NUGET_PACKAGES=%USERPROFILE%\dev\nuget-avalonia`) to make the cold restore honest. C: had 13.2 GB free at start. |
| 2 | Version choice | `releases-index.json` from `builds.dotnet.microsoft.com` | **.NET 10.0 is the current LTS** (SDK 10.0.401, support to 2028-11-14). .NET 11 is RC ("go-live"), .NET 9 is STS ending 2026-11-10, .NET 8 LTS ends 2026-11-10. Avalonia 12 supports .NET 8+ and its docs recommend .NET 10. I picked 10.0. |
| 3 | SDK install | `curl.exe -sSL https://dot.net/v1/dotnet-install.ps1` then `powershell -File dotnet-install.ps1 -Channel 10.0 -InstallDir %USERPROFILE%\dev\dotnet -NoPath` | Script download **1 s** (76,676 bytes). The script **ran under the current policy** (`RemoteSigned`) because `curl.exe` does not add Mark-of-the-Web; a browser download would carry MOTW and `RemoteSigned` would then require a signature or `Unblock-File` **[INFERENCE, not tested]**. Download of `dotnet-sdk-10.0.401-win-x64.zip` (300,608,304 bytes) plus extract: **25.8 s**. Result **769.9 MB** on disk (`sdk` 399, `shared` runtimes 199, `packs` 161, `templates` 10). Runtimes: NETCore.App / AspNetCore.App / WindowsDesktop.App 10.0.12. |
| 4 | Script-free route | `curl.exe -I` on the zip URL the script printed | **HTTP 200**, so downloading `https://builds.dotnet.microsoft.com/dotnet/Sdk/10.0.401/dotnet-sdk-10.0.401-win-x64.zip` and `Expand-Archive` into a folder would give the same result, because that is exactly what the script does. I did **not** run a manual extract **[UNVERIFIED]**. |
| 5 | Templates | `dotnet new install Avalonia.Templates` | **1.9 s.** Installed `Avalonia.Templates` 12.1.3 (`avalonia.app`, `avalonia.mvvm`, `avalonia.xplat`, ...). |
| 6 | Template choice | `dotnet new avalonia.mvvm --output src/ResumeParser.App` | **MVVM with CommunityToolkit.Mvvm 8.4.2** (the docs' recommended first-project template). Why for an AI: `[ObservableProperty] public partial ...` removes the boilerplate; the DataGrid with compiled bindings needs row view-model objects anyway; XAML and logic stay in separate small files. File dialogs are in code-behind because `StorageProvider` belongs to the window. Plain code-behind would have meant hand-written `INotifyPropertyChanged` on every cell. |
| 7 | **First (cold) build of the skeleton** | `dotnet new` (includes restore) then `dotnet build` | New + cold restore **12.3 s** (restore itself 11.3 s), first build **7.7 s**. **Cold restore + build = 20.0 s.** SDK install (25.8 s) and template install (1.9 s) are reported separately. |
| 8 | Parser + extraction (Core) | `dotnet build src/ResumeParser.Core` with PdfPig only, then ClosedXML added | **4.0 s** (restore + compile, PdfPig), then **3.7 s** after adding ClosedXML. Both compiled on the first attempt. |
| 9 | Tests | `dotnet test` | First run 12 of 13 passed (friction 12), then **13/13**. `dotnet test` on the solution: **5.8 s** (build + run), test run itself 0.6 s. |
| 10 | App | `dotnet build src/ResumeParser.App` | Compiled on the first attempt with **0 errors, 0 warnings**. Ran first time; the first screenshot already looked like the Compose one. |
| 11 | Hot reload | `dotnet watch`, HotAvalonia 3.1.5 | See measurements. |
| 12 | Publish, five flavours | `scripts/publish.ps1` (`dotnet publish -c Release -r win-x64 ...`) | fdd **1.4-3.0 s**, self-contained **6.9 s first / 1.9-2.2 s warm**, single file **4.5-5.3 s**, single file compressed **6.7-7.4 s**, trimmed **17-21.5 s**. The first self-contained publish also pulled runtime packs; the packs are in the NuGet cache (friction 18). |
| 13 | Installer route | `dotnet tool install vpk --tool-path %USERPROFILE%\dev\vpk`, `vpk pack`, `Setup.exe --silent` | Velopack 1.2.158. Tool install 12.2 s, pack 13.8 s, see "Per-user installer (Velopack)". |

Licence terms accepted during this run: none by click-through.

### Telemetry

- **`Avalonia.BuildServices` 11.3.2** is pulled in by the `Avalonia` package. Its `.targets` runs an `AvaloniaStatsTask` before `CoreCompile`. Its README says it collects anonymous **build-time** data (project name hash, target framework, RID, Avalonia version, anonymous machine GUID, hashed machine name, IDE, OS version, CI detection) and that **`AVALONIA_TELEMETRY_OPTOUT=1`** disables it. **I set that variable in every build and publish** (`scripts/env.ps1`). I did not sniff the network at build time, so that no packet left is **[UNVERIFIED]**; I only read the package's README and targets.
- `DOTNET_CLI_TELEMETRY_OPTOUT=1`, `DOTNET_NOLOGO=1`, `DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1` also set. All per process only.
- The running app contains no telemetry code from this project, and Avalonia's README says it is build-time only. Runtime endpoints were measured: 0.

### Contention while timing

`Get-Process node,electron,python,msedgewebview2,java,dotnet,msbuild,cargo` before each timed step (recorded by `scripts/timed.ps1` and `scripts/probe.ps1`) showed typically `python` ×8 to ×13, `node` ×3 to ×8, `msedgewebview2` ×34 to ×40, `java` ×2, sometimes `electron` ×4 and `cargo` ×1-2. No other `dotnet` process was visible before my steps. Builds shared CPU and disk with them. I killed nothing except my own `ResumeParser.exe` instances (`scripts/kill-mine.ps1` filters by image path).

## Measurements

| Measurement | Avalonia (this run) | Compose (copied from its report) | Tauri (copied from its report) | How measured |
|---|---|---|---|---|
| SDK / toolchain install | **25.8 s** (.NET SDK 300.6 MB download, 769.9 MB on disk) + 1.9 s templates | JDK 127 s download + 9.6 s extract (328 MB); Gradle 163 MB | Rust/MSVC/SDK all pre-existing | Stopwatch in scripts |
| Cold first build | **20.0 s** (new + cold restore 12.3 s, first build 7.7 s), not counting SDK install | 73.8 s (skeleton, includes Gradle download) | 148.0 s (`tauri build --debug`, cold `target/`) | `scripts/timed.ps1` |
| First run from source | `dotnet run`, up to date: **3.12 s** to first window | `gradlew run`: 3.2-3.98 s | "within seconds" | `scripts/probe.ps1`: poll for the app's top-level window every 50 ms |
| UI change turnaround, **XAML, HotAvalonia 3.1.5** (community, MIT; Avalonia 12.1.3) | **0.52 s, 0.22 s, 0.21 s, 0.21 s**, same PID (state kept) | Hot Reload 1.2.0: 2.4-2.8 s | 73-215 ms (webview HMR) | `scripts/hot-probe.ps1`: rewrite the `.axaml`, poll UI Automation for the changed element name |
| UI change turnaround, **C#, `dotnet watch`** (official) | **1.07 s, 0.16 s, 0.21 s**, same PID. The 1.07 s includes JIT warm-up and my 400 ms poll granularity. | n/a | n/a | same script; an idempotent button is invoked every 400 ms until the new status text shows |
| UI change turnaround, **XAML with plain `dotnet watch`** | **Not applied.** `dotnet watch` sees the `.axaml` change and logs `No managed code changes to apply`. Avalonia's own XAML hot reload is a paid package (see Open issues). | | | `dotnet watch --verbose` log |
| UI change turnaround, restart | `dotnet run` after a one-line XAML change: **4.43 s, 4.13 s** to first window | 3.98 s | | `scripts/probe.ps1 -Mode dotnet-run` |
| Rebuild after adding one NuGet package | **3.7 s** (ClosedXML, Core), **4.0 s** (PdfPig, Core), **5.5 s** (HotAvalonia, App) | ≈7.4 s (PDFBox) | 35.3 s (`tauri-plugin-fs`, Rust) | `scripts/timed.ps1`: restore + compile |
| Clean rebuild of the app | **4.1 s** (`build --no-incremental`, packages cached) | 15.6 s (`clean createDistributable`) | | Stopwatch |
| Publish, warm, self-contained folder | **1.9-2.2 s** (incremental; first was 6.9 s) | 7.6 s (`createDistributable` after a UI change) | 13.5-15.0 s (`tauri build --debug`) | `scripts/publish.ps1` |
| Tests | **13 tests, 5.8 s** (`dotnet test`, build + run) | 10 tests, 6.4 s (`--rerun-tasks`) | 7 tests | Stopwatch |
| Time to first window, published exe, empty table | self-contained folder: **4.21 s** (first launch after publish, cold file cache), **1.85 s, 2.20 s**. Single file: **1.50, 1.91, 2.35 s**. Single file compressed: **2.24, 1.62, 1.84 s**. Trimmed: **4.4 s** (first), **1.63 s**. Via `explorer.exe <exe>`: **1.62 s**. Framework-dependent (with `DOTNET_ROOT`): **2.89 s** | dist exe 1.59-1.88 s | | `scripts/probe.ps1` |
| Memory (working set), published exe, 6 s after first window, empty | self-contained **129-131 MB WS** (private 138-139 MB); single file 131 MB; single compressed **166 MB**; trimmed 124 MB | ≈240 MB WS (private ≈380 MB) | 33 MB (main process only, WebView2 children not counted) | `Process.WorkingSet64`, `PrivateMemorySize64`. One process, no children. |
| Memory, samples loaded | self-contained **158-160 MB WS** (private 158-160 MB); trimmed 151 MB; framework-dependent 158.8 MB | 279 MB WS (private 639 MB) | | same |
| Memory after Open dialog, inline edit and export | 224-237 MB WS (native file dialogs load shell DLLs into the process) | | | `scripts/drive-dialogs.ps1` |
| Distributable output | self-contained folder **121.2 MB, 241 files**; single file **114.6 MB**; single file compressed **51.9 MB**; trimmed folder **61.1 MB, 108 files**; framework-dependent folder **44.5 MB, 54 files** (needs a .NET 10 runtime) | 122.9 MB folder | release exe 10.73 MiB | recursive size |
| Installer | Velopack `Setup.exe` **61.0 MB** (+ portable zip 53.8 MB, nupkg 53.8 MB) | MSI 59.3 MB, EXE 60.0 MB | NSIS 2.76 MiB | `Get-Item` |
| Runs by double-click with no installer? | **Yes.** The single-file exe is one file (a 3-DLL native self-extract of 18 MB goes to `%TEMP%\.net\ResumeParser\<hash>` on first run). The self-contained folder exe needs its folder. Started with `explorer.exe <exe>` (same ShellExecute path as a double-click), not a physical click. **The framework-dependent exe does not run** without `DOTNET_ROOT` or a global .NET (friction 11). | Folder, needs `app\` and `runtime\` | A bare exe ran if WebView2 was present | |
| Build folders | `bin` **800 MB** and `obj` 38.7 MB for the app (Debug `net10.0` alone is 580 MB: it copies the SkiaSharp/HarfBuzz native DLLs and PDBs for every RID, about 119 MB each for win-x86, win-x64 and win-arm64). Tests `bin` 20 MB. `publish/` total 393 MB for five flavours. | `build/` 442 MB | `src-tauri/target` 7,385 MB | recursive size, `scripts/sizes.ps1` |
| Toolchain, per user | SDK **770 MB** | JDK 328 MB + Gradle 163 MB (+1.5 GB JBR for Hot Reload) | Rust 2,980 MB + MSVC 3,419 MB + SDK 1,713 MB, all pre-existing | recursive size |
| Dependency caches | NuGet (isolated) **1,772 MB, 63 packages**. Largest: `skiasharp.nativeassets.win32` 348 MB, `.webassembly` 270 MB, `.linux` 209 MB, `microsoft.netcore.app.runtime.win-x64` 132 MB, `microsoft.windowsdesktop.app.runtime.win-x64` 132 MB, `documentformat.openxml` 109 MB, `harfbuzzsharp.nativeassets.win32` 83 MB, `pdfpig` 69 MB. Most of it is native assets for platforms this app never targets. The shared HTTP cache `%LOCALAPPDATA%\NuGet\v3-cache` is 1,008 MB but is shared with other agents. | `~/.gradle/caches` 322 MB (+1,558 MB JBR only for Hot Reload) | `node_modules` 193 MB, `~/.cargo` 1,242 MB | recursive size |
| Free disk on C: | 13.2 GB at start, 4.4 GB at the last check (other agents were also writing; not attributable to this build alone) | 28.9 GB at start | 38.5 to 28.9 GB | `Get-PSDrive` |
| Build-time network needs | `dot.net` and `builds.dotnet.microsoft.com` (SDK), `api.nuget.org` (packages, templates), Avalonia BuildServices telemetry endpoint (host not inspected, opted out). No proxy on this machine. Behind a corporate proxy or TLS inspection: **[UNVERIFIED]** | Gradle, Maven, Adoptium, Foojay, GitHub (WiX) | crates.io, npm, NSIS | |
| Runtime network | **None observed.** `Get-NetTCPConnection`/`Get-NetUDPEndpoint` for the running single-file exe and the folder exe (samples loaded): **0 TCP, 0 UDP endpoints**. No networking code in `src` (a grep for `HttpClient`, `System.Net`, `Socket`, `WebClient` finds only the generated `GlobalUsings.g.cs`, which holds the SDK's implicit `global using System.Net.Http;`). | 0 TCP, 0 UDP | CSP proof | `scripts/net-check.ps1` |

### Security reaction of Windows

- All published `ResumeParser.exe` files are **unsigned** (`NotSigned`) and have **no Mark-of-the-Web** (built locally). They ran with no SmartScreen prompt, no Defender toast and no UAC prompt: `dotnet run`, Debug exe, all five publish flavours, and the Velopack-installed exe.
- `Get-MpThreatDetection`: 0 entries (all time). Defender/Operational (40 events), CodeIntegrity/Operational (148) and Firewall (8) logs had events in the last 3 h, but none of their messages matched `ResumeParser|avalonia|libSkiaSharp|dotnet`. I cannot prove those logs are complete for a standard user. Treat this as "no reaction observed" (`scripts/security-check.ps1`).
- **Windows Firewall:** I saw no firewall prompt and clicked nothing. The app opens no sockets, so none is expected. There are 0 firewall rules named `ResumeParser`.
- **Smart App Control is off** on this machine (per the assignment). Whether unsigned `ResumeParser.exe` and the unsigned Avalonia/NuGet DLLs would load under SAC enforcement is **[UNVERIFIED]**; see the signature table.
- SmartScreen/MOTW was not exercised (nothing downloaded from a browser).

## Signature / Smart App Control exposure

`Get-AuthenticodeSignature` on every `.dll`/`.exe` in the publish folder (`scripts/signatures.ps1`). "Valid" = signed with a chain that Windows accepts.

**Self-contained folder (`publish/sc`), 237 PE files: 196 Valid, 41 unsigned.**

| Component | Files | Signed | Unsigned | Signer |
|---|---|---|---|---|
| .NET runtime, native (coreclr, clrjit, hostfxr, ...) | 12 | 12 | 0 | Microsoft / .NET |
| .NET runtime, managed BCL (`System.*`, `Microsoft.*`) | 174 | 174 | 0 | `CN=.NET` |
| Other (msquic, clretwrc) | 2 | 2 | 0 | Microsoft / .NET |
| SkiaSharp, HarfBuzzSharp, ANGLE (`libSkiaSharp.dll`, `libHarfBuzzSharp.dll`, `SkiaSharp.dll`, `HarfBuzzSharp.dll`, `av_libglesv2.dll`) | 5 | **5** | 0 | Microsoft Corporation (4), `AvaloniaUI OÜ` (ANGLE) |
| Avalonia managed assemblies (`Avalonia.*`, `MicroCom.Runtime`) | 25 | **0** | **25** | none |
| Other NuGet libraries (PdfPig, ClosedXML, DocumentFormat.OpenXml, CommunityToolkit.Mvvm, SixLabors.Fonts, ...) | 16 | 3 | **13** | .NET Foundation for OpenXml (2) and CommunityToolkit (1); PdfPig, ClosedXML and the rest unsigned |
| **Our app** (`ResumeParser.exe`, `ResumeParser.dll`, `ResumeParser.Core.dll`) | 3 | 0 | **3** | none |

- **Single-file exe:** one unsigned PE. The runtime is linked into it, so the exe itself is the only unsigned launcher; the 3 native DLLs it extracts to `%TEMP%\.net\...` are the signed ones above (Microsoft, `AvaloniaUI OÜ`). The managed assemblies inside the bundle cannot be checked individually.
- **Trimmed folder (`publish/trimmed`), 104 PE files: only 18 Valid.** The IL trimmer rewrites assemblies and **strips their signatures**: 50 of the 51 managed BCL files (plus `SkiaSharp.dll` and `HarfBuzzSharp.dll`) became unsigned. Trimming therefore makes the Smart App Control picture worse, not better.
- For comparison, I ran the same script read-only on the finished Compose distributable (`examples/resume-parser-compose/build/.../ResumeParser`): **70 PE files, 68 Valid, 2 unsigned** (the `ResumeParser.exe` launcher and `skiko-windows-x64.dll`). Jars are not PE files and are not counted, so JVM bytecode is outside this comparison. Tauri: unsigned exe (per its report).
- **[INFERENCE, not tested under SAC]:** the unsigned pieces that could matter are the launcher exe, `ResumeParser.dll`, and 38 unsigned third-party managed DLLs. Managed DLLs are loaded by the runtime rather than by `LoadLibrary` of a native image, and whether SAC/Code Integrity blocks unsigned managed assemblies that are loaded through the (signed) .NET runtime is not something I could test with SAC off. The Compose JVM build has the same shape (unsigned launcher + one unsigned native DLL).

## The app (what was built)

Path: `examples/resume-parser-avalonia/`

```
ResumeParser.slnx
src/ResumeParser.Core/    Parser.cs Extract.cs XlsxExport.cs SkillStore.cs   (no Avalonia reference)
src/ResumeParser.App/     App.axaml(.cs) Program.cs Views/MainWindow.axaml(.cs) ViewModels/{Main,Row,Cell}ViewModel.cs
tests/ResumeParser.Tests/ ParserTests.cs ExportAndStoreTests.cs
samples/                  3 synthetic resumes (same as Tauri/Compose) + scanned-example.pdf (image only)
scripts/                  install, env, timing, probes, dialog driver, xlsx verifier, publish, signatures, sizes (all throwaway helpers)
screenshot.png            2272x1346, samples loaded, published single-file exe
```

- `Parser.cs`: **pure C# port of `parser.ts`**, class `Parser` in `ResumeParser.Core`, no Avalonia/IO/network. Same fields, same found/not found/uncertain flags and notes, same heuristics, same 46 `DefaultSkills`, both real-world regressions kept. JS to .NET dialect handled up front: `\d`, `\w`, `\b` written as ASCII classes and lookarounds (`.NET`'s are Unicode-aware), `$` as `\z`, JS `Math.round` half-up, `String(number)` formatting, a hand-rolled URL host/path split instead of `System.Uri`, skills escaped word by word.
- `Extract.cs`:
  - PDF: **PdfPig 0.1.16** (managed, Apache-2.0). I use `page.Letters` and rebuild lines myself (group by baseline, two spaces for a wide gap) so right-aligned dates keep the same layout gap as the Tauri build. Evaluated against the Compose choice (PDFBox): PdfPig gave the two-space gap and the accent names on the first run, needs no native code and has no dependencies beyond BCL polyfills. I did not compare it with other .NET PDF libraries (PDFsharp, iText) **[UNVERIFIED]**.
  - DOCX: `ZipArchive` + `XmlReader` over `word/document.xml`, `DtdProcessing.Prohibit`, no resolver, 64 MB cap, no library.
  - TXT: strict UTF-8, falling back to windows-1252 (via `CodePagesEncodingProvider`), BOM removed.
  - Fewer than 20 non-space characters gives `no text found (scanned?)`.
- `XlsxExport.cs`: **ClosedXML 0.105.1** (MIT). New workbook, bold + filled + wrapped header, frozen header row, autofilter, ID and phone as text cells (`@` format), years numeric, a "Needs checking" column.
- `SkillStore.cs`: `%APPDATA%\dev.example.resume-parser-avalonia\skills.json` (`Environment.SpecialFolder.ApplicationData`), source-generated `System.Text.Json` (needed for trimming, friction 10). `RESUME_PARSER_DATA_DIR` overrides the folder (tests, `drive-skills.ps1`).
- UI (`MainWindow.axaml`): one screen, Fluent theme (light, accent `#2563EB`), **`Avalonia.Controls.DataGrid` 12.1.2 (MIT)** with a template column per field (a `TextBox` on a tinted `Border`), uncertain = yellow, not found = red, edited by you = blue, a red row with the reason for unreadable files, tooltip with the flag note, row selection follows cell focus and shows the raw text on the right, collapsible skill list with "Save & re-scan" and "Restore defaults", Open / Export / Clear buttons, status footer. Compiled bindings everywhere (`x:DataType`). Export refuses to write onto one of the opened resume paths.
- File dialogs: **`StorageProvider.OpenFilePickerAsync` / `SaveFilePickerAsync`** (`FilePickerFileType` with `*.pdf;*.docx;*.txt`). On Windows this is the native Vista-style common item dialog. I did not look at the dialog to confirm the type filter works because I replaced the filename field with `WM_SETTEXT` **[UNVERIFIED]**.
- Debug hook: environment variable `RESUME_PARSER_DEBUG_FILES` (semicolon-separated absolute paths) loads files at start-up. Not needed for normal use.

### Verification performed

- `dotnet test`: **13/13 pass.**
  - PDF sample asserts the two-space gap `Brightside Foods  Mar 2021 - Present`, the name `Sofía Álvarez`, `+1 (555) 010-4477`, years = 8. DOCX asserts the ALL-CAPS name conversion and years = 14.5. TXT asserts years = 6.
  - Edited skill list, missing/ambiguous data, both regressions, image-only PDF (the real `scanned-example.pdf`) and empty text, corrupt PDF/DOCX/unsupported type, cp1252 fallback, xlsx round trip (zip + XML level, not through ClosedXML), skill JSON round trip and an unreadable skill file.
  - I did not check that the two regression tests fail without their fix, and I did not fuzz the port against `parser.ts` on other inputs, so equivalence beyond these cases is **[UNVERIFIED]**.
- **Real app, real dialogs** (`scripts/drive-dialogs.ps1`; Debug exe, trimmed exe):
  - Buttons of the app were invoked through UI Automation. The native Open dialog appeared. The filename field was set with `WM_SETTEXT` to the absolute path of this project's `samples` folder, read back with `WM_GETTEXT`, compared, then OK (`BM_CLICK`). After the dialog navigated into `samples\`, the field was set to the four sample names (quoted), verified, then OK. No keystrokes were sent to any dialog and nothing else was browsed.
  - Result: 4 rows; the 3 real samples parsed correctly; `scanned-example.pdf` gave a red row `no text found (scanned?)`. The raw-text panel showed the PDF text with the layout gaps.
  - Inline edit: UI Automation `ValuePattern.SetValue` on the Name cell of row 1 (`Sofía Álvarez (edited)`), no `SendKeys`.
  - Row selection: `SetFocus` on the Name cell of row 3 switched the raw-text panel from `resume-1-sofia-alvarez.pdf` to `resume-3-priya-raman.txt` (`scripts/drive-rowclick.ps1`). A physical mouse click on a row was not tried.
  - Save: native Save dialog, filename set to `%TEMP%\...\resumes-out.xlsx`, verified, OK. **7,447 bytes**, identical for the Debug and the trimmed exe. The app stayed responsive and closed cleanly with `WM_CLOSE`.
  - **Independent re-read** (`scripts/verify-xlsx.ps1`, unzip + parse OOXML, no ClosedXML): 5 rows (header + 4), `pane ySplit=1 state=frozenSplit`, all 11 header cells bold, ID and phone cells shared-string type with the `@` format, years cells numeric (8, 14.5, 6), edited name exported, autofilter `A1:K5`. (The console shows the accents mangled because of the OEM code page. The file itself is UTF-8 XML **[INFERENCE]**.)
- **Skill list round trip on the trimmed exe** (`scripts/drive-skills.ps1`): expanded the panel, replaced 46 skills with 3, "Save & re-scan" → header `Skill list (3)`, status `Skill list saved (3 skills)...`, `skills.json` written, **app restarted → header still `Skill list (3)`**. This persistence-across-restart check was not done in the Compose build.
- Source files were read only. The export path guard also refuses to write onto them.

### Per-user installer (Velopack)

- `dotnet tool install vpk --tool-path %USERPROFILE%\dev\vpk` (Velopack CLI 1.2.158, MIT): 12.2 s, no admin. It needs `DOTNET_ROLL_FORWARD=Major` here because only the .NET 10 runtime exists.
- **`vpk pack` refuses an app that never calls `VelopackApp.Build().Run()`** (`Unable to verify VelopackApp is called`). I did the try on a **scratch copy in `%TEMP%`** with the `Velopack` NuGet package and that one line, so the real app is unchanged. Pack: 13.8 s → `ResumeParserAvalonia-win-Setup.exe` **61.0 MB**, `-Portable.zip` 53.8 MB, `-full.nupkg` 53.8 MB. No signing (vpk warns that 239 files are unsigned). vpk defaulted to the x86 architecture and warned; harmless for the test.
- The Setup manifest is `requestedExecutionLevel level="asInvoker"`. `Setup.exe --silent` as a non-elevated user: **exit 0, 3.8 s**, installed **179.4 MB** to `%LOCALAPPDATA%\ResumeParserAvalonia` (`current\`, `packages\`, `Update.exe`, `Resume Parser.exe`), created a Start-Menu shortcut and HKCU uninstall entries; no HKLM entry. The installed `current\ResumeParser.exe` showed its window after 1.94 s. `Update.exe --uninstall --silent`: exit 0; folder, shortcut and registry entries were gone a few seconds later. The scratch copy was deleted.
- Contrast with Compose: its per-user MSI showed an unexplained HKLM uninstall entry; Velopack showed none.

## Friction log

"Attempts" = tries until it worked. Avalonia/C#/.NET-specific rows first.

| # | What went wrong | Category | Attempts to fix |
|---|---|---|---|
| 1 | **No compiler errors and no warnings in the whole run.** After reading the docs first (install, first project, and the full Avalonia 12 breaking-changes page), the parser port, extractor, exporter, view-models, XAML (DataGrid, template columns, `Classes.x="{Binding}"`, compiled bindings, style selectors) and the `StorageProvider` code-behind all compiled on the first `dotnet build`. **I read docs first; I have no data on an unprimed run.** | API | 0 |
| 2 | **Avalonia 11-ism that still compiles:** I wrote the `GotFocus` handler as `(object?, RoutedEventArgs)`. In Avalonia 12 the event args are `FocusChangedEventArgs`; the compiler accepts my handler only because of delegate contravariance. It worked. | Avalonia 12 API change | 0 (left) |
| 3 | **WPF-ism written and removed before the first build:** in the first XAML draft I bound the footer `Foreground` to a bool through a converter with a nonsense `ConverterParameter`. I replaced it with `Classes.error="{Binding StatusIsError}"` and a `TextBlock.error` style (Avalonia style classes). The compiler never saw it, so it is not counted as a compile error. | WPF-ism / XAML | 1 |
| 4 | **The official `avalonia.mvvm` template ships paid tooling.** It references `AvaloniaUI.DiagnosticsSupport` 2.2.3 (Debug only) and calls `.WithDeveloperTools()`. In Avalonia 12 the free `Avalonia.Diagnostics` package is **removed**; DevTools are part of Avalonia Plus (the package's nuspec has no licence element and I did not read its terms **[UNVERIFIED]**). The template also has a `ViewLocator` marked `[RequiresUnreferencedCode]`, which is hostile to trimming. I removed all three from my project. | Licence / template | 1 |
| 5 | **Build-time telemetry in the `Avalonia` package** (`Avalonia.BuildServices`), see Telemetry. Opt-out is an environment variable, not a csproj property. | Telemetry | 0 |
| 6 | **XAML hot reload:** `dotnet watch` does **not** apply `.axaml` edits (`No managed code changes to apply`). Avalonia's official hot reload (`AvaloniaUI.DiagnosticsSupport.HotReload`) needs a paid licence key. The free community **HotAvalonia 3.1.5** worked with Avalonia 12.1.3 out of the box (0.2-0.5 s). | Hot reload | 0 |
| 7 | **HotAvalonia's README says it is not shipped in Release, but `HotAvalonia.Core.dll` appeared in the Release publish folder** (README snippet has `Publish="True"`). Fixed by conditioning both package references on `'$(Configuration)' == 'Debug'`. | Packaging | 1 |
| 8 | **SkiaSharp/HarfBuzzSharp ship 100 MB of native `.pdb` files** (`libSkiaSharp.pdb` 80 MB, `libHarfBuzzSharp.pdb` 20 MB) that land in every publish folder (221.6 MB instead of 121.2 MB). Fixed with a small MSBuild target `DropNativePdbs` that removes them from `ResolvedFileToPublish`. | Packaging / size | 1 |
| 9 | **Trimming breaks reflection-based `System.Text.Json`.** `PublishTrimmed` published without an error (8 IL2026 warnings), the trimmed app started and loaded samples, but "Save & re-scan" showed `Reflection-based serialization has been disabled for this application`. Found by driving the real app, not by the build. Fixed with a source-generated `JsonSerializerContext`. 2 IL2104 warnings remain (the `Avalonia.Controls.DataGrid` assembly is not trim-safe). After the fix the trimmed exe passed the dialog run, the xlsx check and the skill round trip. Only a few paths were exercised, so "trimming is safe" is **[UNVERIFIED]**. | Trimming | 1 |
| 10 | **Trimming strips Authenticode signatures** from the framework assemblies (18 of 104 PE files Valid instead of 196 of 237). See the signature section. | Signing | 0 |
| 11 | **Framework-dependent exe does not start on a machine with only a per-user SDK.** The apphost looks in the registry / `C:\Program Files\dotnet` and shows a message box (window title `ResumeParser.exe`) unless `DOTNET_ROOT` is set. My first dialog-driver run failed with "no app window" because of it, and I first suspected my own script (3 tries to diagnose). Self-contained/single-file exes do not have the problem. | Deployment | 1 (set `DOTNET_ROOT` for dev runs; ship self-contained) |
| 12 | **My xlsx test expected `state="frozen"`; ClosedXML writes `frozenSplit`.** Both freeze the pane in Excel. Test fixed, not the code. The only failing test in the run. | Test expectation | 1 |
| 13 | **Parser port needed no fix.** 12 of 13 tests passed first time; the 13th was row 12. Two things I caught by reading before the first run: `Regex.Escape(" ")` gives `\ ` so my skill-regex whitespace replacement would have produced `\\s+` (rewritten: escape word by word, and a test for it); JS `Math.round` rounds halves up but `Math.Round` uses banker's rounding. | Port | 0 |
| 14 | **PdfPig API compiled first time**, and its `Letters` gave the same two-space layout gap as the Tauri build. | Library | 0 |
| 15 | **NuGet cache polluted by other agents.** `~\.nuget\packages` already held React Native packages, so I used `NUGET_PACKAGES=%USERPROFILE%\dev\nuget-avalonia`. Result: 1.77 GB / 63 packages, mostly native assets for Linux, macOS and WebAssembly, plus three runtime packs (`microsoft.netcore.app.runtime.win-x64`, `microsoft.windowsdesktop.app.runtime.win-x64`, an ASP.NET one) that a self-contained publish restored although this app uses none of the desktop/web frameworks. | Disk | 0 |
| 16 | **Debug `bin` is 580 MB** because the `net10.0` output copies native assets and PDBs for every RID. Free space fell to 4.4 GB during the session (shared with other agents). | Disk | 0 |
| 17 | **Selected DataGrid row is a solid accent blue by default.** I overrode `DataGridRowSelected*BackgroundBrush`/`*Opacity` resource keys (written from memory of the Fluent theme, no docs) to get the pale Compose look. It worked; I did not test every state (hover, unfocused). | Styling | 1 |
| 18 | **Native file dialog automation:** the Open dialog had `ComboBoxEx32 > ComboBox > Edit`, the Save dialog has `FloatNotifySink > ComboBox > Edit` (both Vista-style common item dialogs). My finder needed a second attempt. Twice the coordinate click on the app's Open button hit another window and no dialog appeared; switched to UI Automation `InvokePattern` (goes straight to the app's own button, so it also cannot click into another agent's window). | Test automation | 2 |
| 19 | **My `edit` operations used guessed line numbers three times** and clobbered a line in `Parser.cs`, a region of `MainWindow.axaml` and `hot-probe.ps1`. Each was fixed by re-reading (or rewriting the file). The edit tool refused three more edits whose ranges I had not displayed. Agent-process friction, not Avalonia. Same pattern as Compose row 11. | Agent tooling | 1 each |
| 20 | **Shell quirks (same as Compose/Tauri).** The Bash tool expands `$env:...` inside inline `powershell -Command`; bash eats backslashes in unquoted paths (use forward slashes); `Select-Object`/`Select-String` do not exist in the Bash tool; PowerShell 5.1 reads BOM-less `.ps1` as ANSI, so `…` and `í` in a script broke UI Automation name matching (use `[char]0x2026`); short options `-c/-r/-o` passed through my `timed.ps1` wrapper are "ambiguous parameter" errors (use `--configuration` etc.); a `(` inside a quoted string inside `$( )` breaks the PS parser. Everything moved into `.ps1` files. | Agent shell | 1-2 each |
| 21 | **Table needs horizontal scrolling** at the default 1500x860 dp window ("Other links", "Matching skills", "Years exp." are off-screen until you scroll), same as Compose and Tauri. Not fixed. | UI | not fixed |
| 22 | **A focused cell shows white** (Fluent `TextBox` focus background beats my transparent one), so the yellow/red/blue tint of the cell you are editing is hidden until you leave it. Cosmetic, not fixed. | UI | not fixed |

**Read of the evidence:** with the docs read up front, the Avalonia 12 UI and the C# port cost **no compiler-detected API rework** (row 1), like Compose's zero. The rework was elsewhere: packaging (native PDBs, HotAvalonia leakage, DOTNET_ROOT for the apphost), **trimming (a silent runtime breakage that only the app run revealed)**, and paid-tier surprises (DevTools, official hot reload, template defaults). The loop is fast once the SDK is there: builds 2.4-5.5 s, C#/XAML hot reload 0.2-0.5 s, publish 2-7 s (17-21 s trimmed). The first-time cost is smaller than Compose's (SDK 300 MB download, 26 s) but the on-disk footprint of the NuGet cache (1.8 GB) is large.

## Packages and licences

Licence expressions were read from the `.nuspec` files in the NuGet cache unless marked.

| Package | Version | Licence | Use |
|---|---|---|---|
| .NET SDK / runtime | 10.0.401 / 10.0.12 | MIT (the .NET runtime, per Microsoft) **[UNVERIFIED: not read]** | toolchain and shipped runtime |
| Avalonia, Avalonia.Desktop, Avalonia.Skia, Avalonia.Win32, Avalonia.Themes.Fluent, Avalonia.Fonts.Inter, Avalonia.HarfBuzz | 12.1.3 | **MIT** | UI |
| **Avalonia.Controls.DataGrid** | 12.1.2 | **MIT** | the table (free grid) |
| Avalonia.Controls.TreeDataGrid | 12.3.1 | **not used**: its nuspec depends on `AvaloniaUI.Licensing` (Accelerate, commercial) | (avoid) |
| Avalonia.BuildServices | 11.3.2 | not read | build-time telemetry, opt out with `AVALONIA_TELEMETRY_OPTOUT=1` |
| AvaloniaUI.DiagnosticsSupport | 2.2.3 | nuspec has no licence element; DevTools belong to Avalonia Plus per the docs **[UNVERIFIED]** | **removed** from the template |
| AvaloniaUI.DiagnosticsSupport.HotReload | n/a | paid (Avalonia Plus) per the docs | **not used** |
| SkiaSharp, SkiaSharp.NativeAssets.Win32 | 3.119.4 | MIT | rendering (prebuilt `libSkiaSharp.dll`) |
| HarfBuzzSharp, HarfBuzzSharp.NativeAssets.Win32 | 8.3.1.3 | MIT | text shaping (prebuilt `libHarfBuzzSharp.dll`) |
| Avalonia.Angle.Windows.Natives | 2.1.27548.20260419 | `LICENSE` file, ANGLE project copyright header (BSD-style **[INFERENCE]**) | `av_libglesv2.dll` |
| MicroCom.Runtime | 0.11.6 | MIT | Avalonia dependency |
| CommunityToolkit.Mvvm | 8.4.2 | MIT | MVVM source generators |
| **PdfPig** (`UglyToad.PdfPig`) | 0.1.16 | **Apache-2.0** | PDF text, fully managed |
| **ClosedXML** | 0.105.1 | **MIT** | xlsx writer |
| ClosedXML.Parser, ExcelNumberFormat, RBush.Signed | 2.0.0, 1.1.0, 4.0.0 | MIT | ClosedXML dependencies |
| DocumentFormat.OpenXml (+ .Framework) | 3.1.1 | MIT (read at 3.5.1; 3.1.1 is what NuGet resolved) | ClosedXML dependency |
| **SixLabors.Fonts** | 1.0.0 | **Apache-2.0** (nuspec). ClosedXML allows `[1.0.0, 3.0.0)`; NuGet picked the lowest, 1.0.0. Newer major versions of the SixLabors libraries moved to the "Six Labors Split License" (free for open source, commercial licence otherwise), so **do not bump this transitive package** without checking **[UNVERIFIED: I did not read the newer licence]**. | ClosedXML dependency |
| Microsoft.Extensions.*, System.IO.Packaging, Microsoft.IO.RecyclableMemoryStream | 8.0.x, 8.0.1, 3.0.1 | MIT | transitive |
| HotAvalonia (+ Core, Extensions, Fody), Avalonia.Markup.Xaml.Loader | 3.1.5, 12.1.3 | **MIT** (HotAvalonia's `LICENSE.md` is MIT; Fody MIT) | **Debug only** XAML hot reload |
| Velopack (vpk) | 1.2.158 | MIT | installer try only (scratch copy) |
| xUnit (`xunit`, `xunit.runner.visualstudio`), Microsoft.NET.Test.Sdk | 2.9.3, 4.0.0, 18.10.1 | Apache-2.0, Apache-2.0, MIT | tests only |

Nothing shipped in the app needs a commercial licence. The paid parts are DevTools, official hot reload, TreeDataGrid and (per the docs' placement, **[UNVERIFIED]**) `NativeWebView`. EPPlus (Polyform, non-commercial) was **not** used.

## How a non-programmer would run it

- **She never builds it.** The maintainer gives her one of:
  - `publish\single-compressed\ResumeParser.exe` (**52 MB**, one file). She saves it anywhere she can write and double-clicks it. It starts in about 1.6-2.2 s. On first run it unpacks 3 native DLLs (18 MB) into `%TEMP%\.net\ResumeParser\`. No .NET install is needed.
  - or a zip of `publish\sc\` (**121 MB**, folder with `ResumeParser.exe`).
  - or a per-user installer (Velopack `Setup.exe`, 61 MB) that adds a Start-Menu entry and an uninstaller. The Velopack try needs one line of code and one package in the app (`VelopackApp.Build().Run()`), so it is not yet in the shipped app.
- **Where it is fragile:** files that arrive by browser download or email carry Mark-of-the-Web, so SmartScreen may warn. Smart App Control, if enforcing, may block the unsigned exe and the unsigned Avalonia/NuGet DLLs. Both **[UNVERIFIED]**. Nothing is signed. The single-file exe self-extracts into `%TEMP%`, which a locked-down machine could block **[UNVERIFIED]**. The **framework-dependent** exe (45 MB) does not run without a .NET 10 runtime.
- **Rebuild loop for the maintainer** (per-user SDK, nothing else):

```
cd examples\resume-parser-avalonia
powershell -NoProfile -File scripts\install-dotnet.ps1   # once, ~26 s (runs under the default RemoteSigned policy)
. scripts\env.ps1                                        # DOTNET_ROOT, PATH, telemetry opt-outs, isolated NuGet cache (this shell only)
dotnet test                                           # 13 tests, ~6 s
dotnet run --project src\ResumeParser.App             # launch from source, ~3-4 s
dotnet watch run --project src\ResumeParser.App       # C# hot reload ~0.2 s; XAML hot reload via HotAvalonia (Debug) ~0.2-0.5 s
scripts\publish.ps1 -Flavour single-compressed        # -> publish\single-compressed\ResumeParser.exe (52 MB)
scripts\publish.ps1 -Flavour sc                       # folder, 121 MB
```

## Open issues

- **macOS needs [UNVERIFIED, docs and inference only, nothing run]:**
  - The .NET SDK can be installed per user with `dotnet-install.sh` (into `~/.dotnet`), no `sudo`; `dotnet new install Avalonia.Templates` also installs into the user profile (the Avalonia docs say it needs no elevation).
  - `dotnet publish -r osx-arm64 --self-contained` gives a folder of files, not a `.app`. A `.app` bundle (Info.plist, icon, folder layout) has to be assembled by a script or a community tool, and a bundle can only be tested on a Mac. Cross-building from Windows is not tested.
  - Distribution to other Macs needs an Apple Developer ID signature and notarisation, otherwise Gatekeeper blocks the app. This is the same as for the Compose build.
  - `StorageProvider` uses the native `NSOpenPanel`/`NSSavePanel`; multi-select and the filter were not tested. `Environment.SpecialFolder.ApplicationData` on macOS may resolve to `~/.config` rather than `~/Library/Application Support` **[UNVERIFIED]**; `SkillStore` would need a check.
- **Can the UI render HTML? Not natively.** Avalonia draws its own controls with Skia; there is no HTML/CSS layout control in the free toolkit. Rich text is possible (`SelectableTextBlock` with `Inlines`, `TextBlock` with runs). Embedding a real browser is `NativeWebView` (`Avalonia.Controls.WebView` 12.0.1: WebView2 on Windows, WKWebView on macOS, WebKitGTK/WPE on Linux). Its nuspec says MIT but its docs live under "Accelerate components", so whether it is free for commercial use is **[UNVERIFIED]**; I did not install or run it. An HTML mockup of an Avalonia screen is therefore a design reference only; the final look has to be rebuilt in XAML and will not match pixel for pixel (fonts: this build uses bundled Inter, not the OS font).
- **Hot reload cost model:** free: `dotnet watch` for C# (0.2 s), HotAvalonia for XAML (Debug only, community, MIT, worked on 12.1.3 but is a third-party IL/reflection patcher **[INFERENCE: could break with a future Avalonia release]**). Paid: official Avalonia hot reload and DevTools.
- **Memory:** ≈130 MB working set empty and ≈160 MB with samples, one process, no children. About half of Compose's ≈240/279 MB; 4x Tauri's main process, but Tauri's figure excluded the WebView2 children, so the two are not directly comparable.
- **Startup:** ≈1.2-2.4 s to first window warm, 4.2-4.4 s on the first launch after publishing (cold file cache and probably Defender scanning of new files **[INFERENCE]**). Similar to Compose's 1.6-1.9 s. Not measured the same way as Tauri.
- **Size:** 52 MB (single file compressed) to 121 MB (folder); Compose 123 MB; Tauri 10.7 MiB. The compressed single-file exe costs about +35 MB of working set (166 vs 131 MB) because the bundle is decompressed into memory.
- **Signing/SAC/MOTW/SmartScreen** not exercised. The launcher, `ResumeParser.dll` and 38 third-party managed DLLs are unsigned; trimming additionally strips the signatures of the .NET assemblies.
- **Parser limits (by design, deterministic; same as Tauri and Compose):** multi-column PDFs can interleave columns; `Surname, Given` and non-Latin names are not handled; years of experience is empty with an `uncertain` flag when there are date ranges but no Experience heading; skill matching is literal; no OCR. The PDF line rebuild was tested on three synthetic layouts only. Equivalence with `parser.ts` beyond the tested cases is **[UNVERIFIED]**.
- **Not tested:** the wildcard type filter in the Open dialog (see above), a PDF with a font that is not embedded, encrypted PDFs (PdfPig raises, we show `could not read file: ...`), a physical click on a table row, right-to-left text, high-DPI mixed-monitor setups.
- **Avalonia-specific unknowns:** `Avalonia.Controls.DataGrid` is not trim-safe (IL2104), and virtualisation with hundreds of rows was not tried (4 rows only). The 46-skill regex list is rebuilt on every parse (fine at this size).
- **Files left on disk:** `%USERPROFILE%\dev\dotnet` (770 MB SDK), `%USERPROFILE%\dev\nuget-avalonia` (1.77 GB isolated NuGet cache, safe to delete, the next restore re-downloads it in about 15-20 s), `%USERPROFILE%\dev\vpk` (Velopack CLI), `%USERPROFILE%\dev\dotnet-install.ps1`, `%TEMP%\.net\ResumeParser` (single-file extraction). In the project: `publish\single-compressed` (52 MB, git-ignored). I deleted `bin/`, `obj/` and the other publish folders, the scratch Velopack copy, temporary exports and screenshots after the measurements above. The `dotnet` build servers (MSBuild node, VBCSCompiler) started by my builds were shut down with `dotnet build-server shutdown`.
