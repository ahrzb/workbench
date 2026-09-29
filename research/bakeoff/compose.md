# Build report: Resume Parser (Compose Multiplatform for Desktop, Kotlin/JVM), built with no admin rights

Date of run: 2026-09-29, Windows 11 build 26200 x64, standard (non-elevated) user, machine `DESKTOP-QTPN3M3`.
Everything below was observed on this run unless marked **[UNVERIFIED]** or **[INFERENCE]**.
Screen scaling on this machine is 150 %, so the 1500x860 dp window is 2250x1290 px in `screenshot.png`.

## Verdict

**Yes. Compose Multiplatform for Desktop built and ran here with no administrator rights, no UAC prompt and no machine-wide change.**
Route: **a per-user Temurin 21 JDK from a zip (extracted to `%USERPROFILE%\dev\`) + the Gradle wrapper (Gradle 9.8.0 into `~/.gradle`) + Kotlin 2.4.20 + Compose Multiplatform 1.12.1.** No IntelliJ/Android Studio was used or needed. I found none under `C:\Program Files\{JetBrains,Android,Java,Eclipse Adoptium}`.

Unlike the Tauri run, **this stack needed nothing that had been installed with admin.** It did not use MSVC, the Windows SDK or WebView2. Everything came from the network into the user profile. Compose draws with Skia (Skiko, a native DLL that is unpacked from a jar).

- Parser: **10/10 tests pass** through real PDF (PDFBox), DOCX (zip + StAX) and TXT extraction, plus an independent xlsx re-read with Apache POI. The 7 Tauri cases are ported one-to-one (3 samples, edited skills, missing/ambiguous, regressions, scanned).
- Desktop app: built, launched three ways (`gradlew run`, the `createDistributable` exe, an installed per-user MSI), stayed up, responded, was closed cleanly with WM_CLOSE.
- Samples loaded through the **real native Open dialog** (filename set with `WM_SETTEXT` and read back before OK) and the **real native Save dialog**. The exported `.xlsx` was re-read (see "Verification performed").
- Screenshot: `screenshot.png`.
- Packaging: `createDistributable` gives a folder with a bundled runtime that runs without an installer. `packageMsi` and `packageExe` also built with no admin (WiX 3.11 is downloaded automatically). The default MSI is per-machine (`ALLUSERS=1`, needs elevation to install). With `perUserInstall = true` it installed and uninstalled non-elevated with exit 0.

## Toolchain steps (with wall-clock times)

Other build tools were visibly running during every step (see "Contention" below). All timings are **indicative only**.

| # | Step | Command | Result / time |
|---|------|---------|---------------|
| 1 | Preflight | `whoami`, env, `Get-Command`, disk | Not elevated. No `~/.gradle`, no `~/dev`. `JAVA_HOME` was already set machine-wide to an unrelated `confit-jdk` 21.0.12.1 under `%LOCALAPPDATA%\Programs`; I did not use or change it. C: had 28.9 GB free. |
| 2 | JDK | `scripts/install-jdk.ps1`: `Invoke-WebRequest https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jdk/hotspot/normal/eclipse` then `Expand-Archive` to `%USERPROFILE%\dev` | **127.2 s download** (205,073,461 bytes), **9.6 s extract**. Result: `jdk-21.0.12.1+1`, 327.9 MB. The zip is still in `~\dev\temurin21.zip`. `JAVA_HOME`/`PATH` are set per process only (`scripts/env.ps1`). Temurin 21 is a LTS. JDK 17+ is needed for packaging and Compose Hot Reload wants 21 or earlier. |
| 3 | Gradle wrapper | No `gradle` on the machine, so I fetched `gradle-wrapper.jar` (from `gradle/gradle` tag v9.8.0) and `gradlew`/`gradlew.bat` (from JetBrains' desktop template) with `curl`, and wrote `gradle-wrapper.properties` for 9.8.0 | 1 s. |
| 4 | Versions | Checked kotlinlang.org compatibility and Hot Reload pages, GitHub release page for Compose 1.12.1, and Maven metadata | Compose Multiplatform **1.12.1** (2026-09-22), Kotlin **2.4.20** (the 2.5.0 line is Beta), Gradle **9.8.0**, PDFBox **3.0.8**, fastexcel **0.20.2**, kotlinx-serialization-json **1.11.0**, POI **5.5.1** (test only). The JetBrains desktop template on GitHub is stale (Gradle 8.10.2), so I did not copy it. |
| 5 | **First build** (skeleton: one `Text` in a `Window`) | `scripts/timed.ps1 cold-skeleton compileKotlin` (`gradlew compileKotlin`) | **73.8 s wall.** Includes downloading Gradle 9.8.0 (162.6 MB in `~/.gradle/wrapper/dists`), starting the daemon, resolving Kotlin/Compose plugins and Compose desktop dependencies. No UAC, no prompt. |
| 6 | Add one dependency | Add `org.apache.pdfbox:pdfbox:3.0.8` and compile the extractor that uses it | **≈7.4 s wall** (Gradle reported `BUILD SUCCESSFUL in 7s`; my wrapper printed 8.3 s for two runs, the second was 0.9 s up-to-date). Includes resolving and downloading PDFBox and recompiling. |
| 7 | Rest of the app | Added fastexcel, serialization-json, test deps; wrote parser, extraction, UI | First `gradlew test`: 17.8 s (one test failed because of my wrong expectation, see friction 9). Second run: 7.9 s, 10/10 pass. |
| 8 | Compose Hot Reload | `gradlew hotRunAsync` | First attempt failed: `Failed to find suitable JetBrains Runtime 21 installation on your system`. After adding the Foojay resolver plugin to `settings.gradle.kts`: **47.6 s**, which includes downloading a JetBrains Runtime with JCEF into `~/.gradle/jdks`: 976 MB extracted **plus** the 582 MB `.tar.gz` that Gradle leaves behind, 1,558 MB total. |
| 9 | Folder distributable | `gradlew createDistributable` | **17.5 s** the first time. It also auto-downloaded **WiX 3.11 binaries** (`github.com/wixtoolset/wix3/releases/.../wix311-binaries.zip`) because MSI/EXE targets are configured, and built a jlinked runtime image. Output: `build/compose/binaries/main/app/ResumeParser/`. |
| 10 | Installers | `gradlew packageMsi`, `gradlew packageExe` | **21.3 s** and **21.8 s**. Both succeeded with no admin and no WiX install (WiX was unzipped by Gradle into `build/compose/tmp`). MSI 59.3 MB, EXE 60.0 MB. |

Licence terms accepted during this run: none by a click-through. Temurin is GPLv2 with the Classpath Exception; WiX 3.11 is MS-RL (tool only); the JBR is GPLv2+CPE (dev only, for Hot Reload).

### Telemetry

I found nothing to disable. Gradle build scans/Develocity are opt-in and were not used. The Kotlin Gradle plugin and Compose Gradle plugin have no telemetry setting that I know of **[UNVERIFIED: from memory, I did not read a docs page that states it]**. I changed no telemetry setting. Build-time network contact is listed in the measurements.

### Contention while timing

`Get-Process` before each timed step showed: `java` ×2 to ×4 (other agents' JVMs plus my Gradle daemon), `MSBuild` ×2–3 (another agent's build), and `node` ×3 to ×13 (another agent, likely React Native/Metro). No `cargo`, `dart` or `flutter` process was visible at my checkpoints. Builds shared the CPU and disk with them. **Every time in this report is indicative.**

## Measurements

| Measurement | Compose (this run) | Tauri (copied from its report) | How measured |
|---|---|---|---|
| Cold first build | **73.8 s** (skeleton, `compileKotlin`, includes Gradle download + dependency resolve). Plus **127 s** for the JDK download and 9.6 s extract, which Tauri did not need. | 148.0 s (`tauri build --debug`, cold `target/`) | Stopwatch in `scripts/timed.ps1`. |
| First run of the app after that | `gradlew run`: **3.2 s, 3.96 s, 3.98 s** to first window (daemon warm, compile up-to-date or ~1 s) | "window up within seconds" | `scripts/probe.ps1`: poll for a top-level window with the app title every 50 ms from process start. |
| UI change turnaround, Compose Hot Reload (bundled, **Hot Reload 1.2.0**, on JetBrains Runtime 21.0.11) | **2.8 s, 2.4 s, 2.7 s** from edit to `gradlew reload` finishing. The changed text appeared in the running window (screenshot `Resume Parser HOT`). | 73–215 ms (webview HMR) | Edit `App.kt`, then time `gradlew reload` (`scripts/timed.ps1`). This includes starting the Gradle client, an incremental compile in the warm daemon, and the reload. **I did not measure inside the IDE plugin, which watches files itself and may be faster [UNVERIFIED].** The app kept its state (window position and size) across reloads. |
| UI change turnaround, restart | `gradlew run` after a one-line UI change: **3.98 s** to first window (one sample) | | `scripts/probe.ps1`. |
| Rebuild after adding one dependency | **≈7.4 s** (PDFBox) | 35.3 s (`tauri-plugin-fs`, Rust) | See toolchain step 6. |
| Full distributable after a UI-only change | **7.6 s** (`createDistributable`) | 13.5–15.0 s (`tauri build --debug`) | Stopwatch, warm daemon. |
| Clean rebuild of the distributable | **15.6 s** (`clean createDistributable`, dependencies cached) | | Stopwatch. |
| `gradlew test` (10 tests) | 6.4 s with `--rerun-tasks`, warm daemon | 7 tests | Stopwatch. |
| Time to first window, distributable exe, empty table | **1.88 s, 1.64 s, 1.59 s** | | `scripts/probe.ps1` |
| Memory, dist exe, 6 s after first window, empty table | working set **≈240 MB**, private **≈380 MB** (three runs: 241.3/241.1/239.9 MB WS) | 33 MB (main process only, WebView2 children not counted) | `Process.WorkingSet64`, `PrivateMemorySize64`. One JVM process, no children. |
| Memory, dist exe, samples loaded | working set **279 MB**, private **639 MB** | | same |
| Memory, `gradlew run` (JDK 21 Temurin) | 242–277 MB WS | | same |
| Memory, Hot Reload run (JetBrains Runtime) | 313 MB WS at start, 398 MB after reloads | | same |
| Distributable output | **122.9 MB folder** (`runtime` 74.0 MB, `app` 48.4 MB of jars + `skiko-windows-x64.dll`, launcher `ResumeParser.exe` 0.52 MB) | Release exe 10.73 MiB | recursive size |
| Installers | MSI **59.3 MB**, EXE **60.0 MB** | NSIS 2.76 MiB | `Get-Item` |
| Runs by double-click with no installer? | **Yes, as a folder.** `ResumeParser.exe` needs its `app\` and `runtime\` folders beside it (copy the whole folder). I started it with `Start-Process`, not with a physical double-click. A lone exe copy was not tried. | A bare exe ran if WebView2 was present | |
| Build folder | `build/` **442 MB** (dist 123, msi 59, exe 60, `compose/tmp` 97 with WiX and runtime-image temp) | `src-tauri/target` 7,385 MB | recursive size |
| Toolchain, per user | JDK **328 MB** (+205 MB zip left on disk), Gradle distribution **163 MB** | Rust 2,980 MB + MSVC 3,419 MB + SDK 1,713 MB, all pre-existing | recursive size |
| Dependency caches | `~/.gradle/caches` **322 MB**; project `.gradle` 1.1 MB. `~/.gradle/jdks` **1,558 MB**, only because of Hot Reload (JBR with JCEF). Without Hot Reload the whole `~/.gradle` would be ≈490 MB. `~/.gradle` total 2,077 MB. | `node_modules` 193 MB, `~/.cargo` 1,242 MB | recursive size |
| Free disk on C: | 28.9 GB at start | 38.5 → 28.9 GB | `Get-PSDrive` (start only; not re-measured at the end) |
| Build-time network needs | `services.gradle.org`, `plugins.gradle.org`, Maven Central, `dl.google.com`/Google Maven (declared in `repositories`), `api.adoptium.net` (JDK), Foojay + a JetBrains host (JBR download; exact host not inspected **[UNVERIFIED]**), `github.com` (WiX). No proxy on this machine. Behind a corporate proxy or TLS inspection: **[UNVERIFIED]**. | crates.io, npm, NSIS download | |
| Runtime network | **None observed.** `Get-NetTCPConnection`/`Get-NetUDPEndpoint` for the running dist exe (samples loaded): **0 TCP, 0 UDP endpoints**. No networking code in `src/main` (grep for `java.net`, `http`, `socket`). The Hot Reload dev run does open local orchestration sockets **[INFERENCE, not inspected]**. | CSP proof | `scripts/net-check.ps1` |

### Security reaction of Windows

- The built `ResumeParser.exe` is **unsigned** (`Get-AuthenticodeSignature` → `NotSigned`). It has **no Mark-of-the-Web** (built locally). It ran with no SmartScreen prompt, no Defender toast, no UAC prompt: `gradlew run`, dist exe, installed exe.
- `Get-MpThreatDetection`: 0 entries. The Defender/Operational, CodeIntegrity/Operational and Firewall logs had events since 2 h before, but none of their messages matched `ResumeParser|resume-parser|java|skiko|jbr`. No "Windows Security Alert" or SmartScreen window was open when I checked (`scripts/security-check.ps1`). I cannot prove the logs are complete for a standard user. Treat this as "no reaction observed".
- **Windows Firewall:** I saw no firewall prompt and clicked nothing. The machine has 12 firewall rules whose display name contains `java`, `ResumeParser` or `OpenJDK`. I cannot attribute them (other agents also run JVMs), so I make no claim about them.
- **Smart App Control is off** on this machine (per the assignment). Whether the unsigned launcher exe would run under SAC enforcement is **[UNVERIFIED]**; the Tauri report guessed it would be blocked **[INFERENCE]**, and the same reasoning applies here.
- SmartScreen/MOTW was not exercised (nothing downloaded from a browser).
- **MSI:** `ProductName=ResumeParser`, `Manufacturer=Unknown`. During the per-user MSI install I saw an `HKLM\...\Uninstall` entry with `DisplayName=ResumeParser` appear (script `scripts/msi-per-user-test.ps1`), although the process was not elevated and exit code was 0. It was gone after the uninstall (`scripts/reg-check.ps1`). I have **no explanation** for the HKLM entry (`HKCU` showed none). **[UNVERIFIED]**

## The app (what was built)

Path: `examples/resume-parser-compose/`

- `src/main/kotlin/resumeparser/parser/Parser.kt`: **pure Kotlin port of `parser.ts`**, package `resumeparser.parser`, no Compose/AWT/IO imports (only `java.time` and regex). Same fields, same `found`/`not_found`/`uncertain` flags and notes, same heuristics, same `DEFAULT_SKILLS` (46), both real-world regressions kept.
- `.../extract/Extract.kt`:
  - PDF: **Apache PDFBox 3.0.8**. I subclass `PDFTextStripper` only to collect glyph positions, then rebuild lines myself (group by baseline, 2 spaces for a wide gap) so right-aligned dates keep the same layout gap that the Tauri build produced.
  - DOCX: `java.util.zip` + StAX over `word/document.xml`, DTD and external entities disabled, 64 MB cap, no library. Paragraphs are joined with one newline (mammoth used a blank line between paragraphs).
  - TXT: strict UTF-8, fallback windows-1252, BOM removed.
  - Fewer than 20 non-space characters gives `no text found (scanned?)`.
- `.../export/XlsxExport.kt`: **fastexcel 0.20.2**. New workbook, bold + filled + wrapped header, frozen header row, auto-filter over the data, ID and phone as string cells with the `@` format, years numeric, a "Needs checking" column.
- `.../storage/SkillStore.kt`: `%APPDATA%\dev.example.resume-parser-compose\skills.json` (kotlinx-serialization-json). `RESUME_PARSER_DATA_DIR` overrides the folder for tests. **Persistence across an app restart was tested only by the unit test (save, load), not by restarting the app.**
- `.../ui/`: `App.kt` (one screen), `AppState.kt`, `Dialogs.kt`. Material 2 (`org.jetbrains.compose.material`) buttons and `BasicTextField` cells. Inline-editable table (uncertain = yellow, not found = red, edited by you = blue), click or focus a row to show the raw text on the right, collapsible skill list with Save & re-scan and Restore defaults, Open / Export / Clear buttons, status footer. Tooltips via `TooltipArea` show the flag note. Export refuses to write onto one of the opened resume paths.
- **File dialogs: `java.awt.FileDialog`.** Why: it is the native Windows Open/Save dialog with multi-select, needs no dependency, and is what the Compose docs use. Caveat: Windows ignores `FilenameFilter`; I set `file = "*.pdf;*.docx;*.txt"`, which acts as a filter pattern on Windows. **I did not look at the dialog to confirm the filter works [UNVERIFIED]** because I replaced the field with `WM_SETTEXT`. `JFileChooser` would give a Swing look; a library such as FileKit was not tried.
- Debug hook: environment variable `RESUME_PARSER_DEBUG_FILES` (semicolon-separated absolute paths) loads files at start-up. Not needed for normal use.
- `samples/`: the 3 synthetic resumes copied from Tauri (sha256 prefixes match the reference copy) plus `scanned-example.pdf`. The Tauri samples folder did not contain a scanned example, so I generated one with `scripts/make-scanned-pdf.ps1`: a 1-page hand-built PDF with only an image and no text operators or fonts.
- `scripts/`: PowerShell used for install, timing, probing, dialog driving and verification. All are throwaway helpers.

### Verification performed

- `gradlew test`: **10/10 pass** (PDF, DOCX, TXT samples; edited skill list; missing/ambiguous; the two real-world regressions; empty text and the real image-only PDF; corrupt PDF/DOCX give a readable error; xlsx round trip with POI; skill JSON round trip).
  - The PDF test asserts the 2-space layout gap `Brightside Foods  Mar 2021 - Present`, the accent name `Sofía Álvarez`, `+1 (555) 010-4477`, years = 8. The DOCX test asserts the ALL-CAPS name conversion and years = 14.5. The TXT test asserts years = 6.
  - I did not check that the two regression tests fail without their fix (same gap as in the Tauri report). I did not fuzz the port against `parser.ts` on other inputs, so equivalence beyond these cases is **[UNVERIFIED]**.
- **Real app, real dialogs** (`scripts/drive-dialogs.ps1`, dist exe):
  - Mouse click on "Open resumes…". The native dialog appeared. The filename field was set with `WM_SETTEXT` to the absolute path of this project's `samples` folder, read back with `WM_GETTEXT`, compared, then OK was pressed with `BM_CLICK`. After the dialog navigated into `samples\`, the field was set to the four sample names (quoted), verified, then OK. No keystroke automation was sent to any file dialog and nothing else was browsed.
  - Result: 4 rows. The 3 real samples parsed correctly; `scanned-example.pdf` gave a red row `no text found (scanned?)`. The raw text panel showed the PDF text with the layout gaps.
  - Inline edit: I clicked a Name cell in my own app window, then used `SendKeys` `{END} (edited)` right after `SetForegroundWindow` + a click on the cell. The cell turned blue with `Sofía Álvarez edited` (the parentheses were swallowed by SendKeys syntax, my script's fault). No dialog was open at that moment.
  - Save: click on "Export to Excel", native Save dialog, filename set by `WM_SETTEXT` to `%TEMP%\resume-parser-compose-out\resumes-out.xlsx`, verified, OK. File written: **4,870 bytes**. The app stayed responsive, then closed cleanly with WM_CLOSE.
  - **Re-read** with an independent script (`scripts/verify-xlsx.ps1`: unzip + parse the OOXML, no Java): 5 rows (header + 4), `pane ySplit=1 state=frozen`, header cells all bold, ID and phone cells string type with the `@` format, years cells numeric (8, 14.5, 6), the edited name exported, autoFilter `A1:K5`.
  - Sample files: read only; the export path guard also refuses to write onto them.
- `createDistributable` exe: launched, samples loaded (PDF and DOCX extraction work in the jlinked runtime, so `java.xml` and the other modules were present), no network endpoints.
- Per-user MSI (`perUserInstall = true`): `msiexec /i ... /qn` non-elevated → exit 0 in 3.1 s, installed to `%LOCALAPPDATA%\ResumeParser` (122.9 MB), installed exe launched with its window and closed; `msiexec /x` → exit 0, folder removed. The default (per-machine) MSI was **not** installed: its `ALLUSERS=1` means it needs elevation (**[INFERENCE]**, I read the property but did not run it).
- Not exercised: a physical double-click in Explorer, another PC, macOS, Smart App Control enforcement, MOTW.

## Friction log

Count of attempts is "tries until it worked". Compose-specific rows first.

| # | What went wrong | Category | Attempts to fix |
|---|---|---|---|
| 1 | **No Compose API mistakes in the app code.** After reading current docs, all Compose code (window, `FileDialog` from a Compose click handler, `BasicTextField`, `TooltipArea` with `@OptIn(ExperimentalFoundationApi)`, scrollbars, coroutines) and the Kotlin port compiled on the first `gradlew test` run that included the UI, once I had fixed one composable-scope error that was my own edit mistake in `Main.kt` (row 11). The whole UI compiled without a Compose error. **I read docs first; I have no data on an unprimed run.** | Compose API | 0 |
| 2 | **Parser port needed no fix.** 7 ported cases plus 3 extra tests: the only failure in the whole run was my wrong expectation about the autofilter range (row 9). Regex dialect differences (JS `$`, `/iu`, `\s`, `\b`) were handled up front: `\z` for end anchors, `RegexOption.IGNORE_CASE` (Kotlin adds Unicode case folding), `Regex.escape` for skills, hand-rolled URL host/path split instead of `java.net.URI`. | Port | 0 |
| 3 | **Deprecation warning:** `compose.material` accessor is deprecated ("Specify dependency directly"). Replaced by `org.jetbrains.compose.material:material:<compose.version>`. `compose.desktop.currentOs` gave no warning. | Compose Gradle plugin | 1 |
| 4 | **`extra["compose.version"]` in `build.gradle.kts` failed** (`Cannot get property 'compose.version' on extra properties extension`). It works in `settings.gradle.kts` `pluginManagement`. Fixed with `property("compose.version")`. | Gradle Kotlin DSL | 1 |
| 5 | **Compose Hot Reload does not run out of the box on a plain JDK.** `hotRunAsync` failed with `Failed to find suitable JetBrains Runtime 21 installation on your system`. The docs say to add the Foojay resolver plugin `version "1.2.0"`, but the plugin portal's `maven-metadata.xml` lists `1.0.0` as latest/release; I used `1.0.0` and it worked. **Cost: a 1.5 GB per-user JBR+JCEF download.** | Hot Reload | 2 |
| 6 | **No `gradle` on the machine, so no `gradle wrapper`.** I hand-assembled the wrapper: jar from the Gradle repo tag, `gradlew`/`gradlew.bat` from the JetBrains template (my first guessed URL for `gradlew.bat` returned 404). The JetBrains template itself pins Gradle 8.10.2, which is stale. | Bootstrap | 2 |
| 7 | **`createDistributable` downloads WiX 3.11 from GitHub** whenever MSI/EXE targets are configured, even if you only want the folder. It worked without admin, but it is a hidden build-time network dependency. | Packaging | 0 |
| 8 | **Default MSI is per-machine** (`ALLUSERS=1`). Needs `windows { perUserInstall = true }` for a no-admin install. Unexplained HKLM uninstall entry during the per-user install (see Security). | Packaging | 1 |
| 9 | My own test expected the autofilter range `A1:K1`; fastexcel writes `A1:K<lastRow>` (`A1:K4`), which is what Excel expects. Test fixed, not the code. | Test expectation | 1 |
| 10 | Java-style ternary (`a ? b : c`) written in Kotlin. | Agent slip | 1 |
| 11 | **My `edit` operations used wrong line numbers about six times** (dropped a closing brace in `build.gradle.kts`, clobbered a line in `XlsxExport.kt`, mangled `Main.kt`, `timed.ps1` and `probe.ps1`, and two edits were refused for stale tags). Each was fixed by re-reading. Agent-process friction, not Compose. Same pattern as Tauri item 11. | Agent tooling | 1–2 each |
| 12 | **Shell quirks (same as Tauri item 3).** The Bash tool expands `$...` inside inline `powershell -Command`, and treats some `$(...)`/backticks as syntax errors. Moved everything into `.ps1` files. PowerShell 5.1 also wraps native stderr as `System.Management.Automation.RemoteException` noise; fixed by running Gradle through `cmd /c "... 2>&1"`. | Agent shell | 2 |
| 13 | **Screenshot came out cropped**: my PowerShell process was not DPI-aware on a 150 % display, so `GetWindowRect` and `CopyFromScreen` used the wrong scale. Fixed with `SetProcessDPIAware()`. | Test automation | 1 |
| 14 | **Material 2 buttons render with 1.25 sp letter spacing** by default, which looked different from the Tauri buttons. Fixed with a tiny `ButtonText` helper. | UI | 1 |
| 15 | **File-dialog automation went as planned** because the privacy rule was in the brief: `WM_SETTEXT` + `WM_GETTEXT` check + `BM_CLICK`, one attempt for the whole Open → edit → Save flow. AWT's `FileDialog` on Windows exposes the classic `#32770` dialog with `ComboBoxEx32 > ComboBox > Edit`, so this is easy. No owner file was opened. The initial folder shown by the dialog was never browsed or clicked. | Test automation | 0 (after writing the script) |
| 16 | Gradle prints `Deprecated Gradle features were used in this build, making it incompatible with Gradle 10` on every build. I did not chase it (source not identified). | Gradle | not fixed |
| 17 | The table needs horizontal scrolling at the default 1500x860 dp window: "Skills" and "Years" are off-screen until you scroll (same as Tauri item 17). Not fixed. | UI | not fixed |

**Read of the evidence:** with docs read up front, the Compose UI and the Kotlin port cost almost no rework. The rework was build-system plumbing (wrapper bootstrap, Hot Reload's JBR requirement, the `extra` property, MSI scope), plus my own editing and shell mistakes. Build and run loops are fast once the daemon is warm (2–8 s), but the first setup is a large download: 205 MB JDK, 163 MB Gradle, and 1.5 GB more if you want Hot Reload.

## Packages and licences

| Package | Version | Licence | Use |
|---|---|---|---|
| Kotlin (JVM, Gradle plugin, compose compiler plugin) | 2.4.20 | Apache-2.0 | language/compiler |
| Compose Multiplatform (`org.jetbrains.compose`, runtime/ui/foundation/material) | 1.12.1 | Apache-2.0 | UI |
| Skiko (Skia bindings, native DLL) | 0.150.1 | Apache-2.0 | rendering (pulled in by Compose) |
| Compose Hot Reload | 1.2.0 (bundled with the Compose plugin) | Apache-2.0 | dev only |
| Apache PDFBox | 3.0.8 | Apache-2.0 (per the Apache project) | PDF text |
| fastexcel (`org.dhatim:fastexcel`) + opczip | 0.20.2 + 1.2.0 | **Apache-2.0** (read from `fastexcel-parent-0.20.2.pom`; I had guessed MIT before checking) | xlsx writer |
| kotlinx-serialization-json | 1.11.0 | Apache-2.0 **[UNVERIFIED: not read from the POM]** | `skills.json` |
| Apache POI (`poi-ooxml`) | 5.5.1 | Apache-2.0 (from its POM) | **test only**, independent xlsx reader |
| JUnit 5 via `kotlin("test")` | from Gradle | EPL-2.0 **[UNVERIFIED: not read]** | tests only |
| Eclipse Temurin JDK 21 (also the base of the bundled runtime) | 21.0.12.1+1 | GPLv2 + Classpath Exception | toolchain and shipped runtime |
| JetBrains Runtime 21 (JBR with JCEF) | 21.0.11 b1163.116 | GPLv2 + Classpath Exception **[UNVERIFIED: not read]** | Hot Reload only |
| WiX Toolset | 3.11 | MS-RL **[UNVERIFIED: not read]** | MSI/EXE packaging tool only |
| Gradle | 9.8.0 | Apache-2.0 **[UNVERIFIED: not read]** | build |

Nothing here needs a commercial licence. Material 3 for Compose Multiplatform is still alpha (`1.12.0-alpha03` in the 1.12.1 release notes), which is why I used Material 2.

## How a non-programmer would run it

- **She never builds it.** The maintainer hands her the folder `build/compose/binaries/main/app/ResumeParser/` (123 MB; zip it), or the per-user MSI. She unzips it anywhere she can write and double-clicks **`ResumeParser.exe`**. The exe needs the `app` and `runtime` folders next to it. No Java install is needed. It starts in about 1.6–1.9 s.
- To install with a Start-menu entry and no admin, the maintainer builds the MSI with `perUserInstall = true` (already set in `build.gradle.kts`): `build/compose/binaries/main/msi/ResumeParser-1.0.0.msi` (59 MB). Installed non-elevated with `msiexec /i ... /qn` on this machine. Double-clicking the MSI in Explorer (with its UI) was not tried.
- **Where it is fragile:** files that arrive by browser download or email carry Mark-of-the-Web, so SmartScreen may warn; Smart App Control, if enforcing, may block unsigned code. Both **[UNVERIFIED]**. The MSI shows "Unknown" as manufacturer. Nothing is signed.
- **Rebuild loop for the maintainer:** put a JDK 21 on `PATH` (or `scripts/env.ps1`), then:

```
cd examples\resume-parser-compose
.\gradlew.bat test                    # parser + extraction + export tests
.\gradlew.bat run                     # launch from source (about 3-4 s after the first run)
.\gradlew.bat hotRunAsync             # run with Compose Hot Reload (downloads a JBR once)
.\gradlew.bat reload                  # after editing UI code, apply it to the running app (about 2.5 s)
.\gradlew.bat createDistributable     # folder with bundled runtime
.\gradlew.bat packageMsi              # per-user MSI (WiX is downloaded automatically)
```

## Open issues

- **macOS needs [UNVERIFIED, docs only]:**
  - The Compose compatibility page lists macOS 13 arm64 as the minimum for Compose Multiplatform 1.12.1.
  - Packaging uses `jpackage`, which needs JDK 17+ and runs on macOS only (no cross-building a `.app`/`.dmg` from Windows).
  - The `.dmg` target needs Xcode command-line tools; distributing to other Macs needs an Apple Developer ID signature and notarisation, otherwise Gatekeeper blocks the app.
  - `java.awt.FileDialog` is a native dialog on macOS too, but its multi-select and filter behaviour were not tested. The `%APPDATA%` path in `SkillStore` falls back to `~/.local/share` on other platforms, which is not the macOS convention (`~/Library/Application Support`). I did not change it.
- **Can the UI render HTML? No, not natively.** Compose Desktop draws its own widgets with Skia; there is no WebView in the toolkit. Rich text is possible with `AnnotatedString`, and an HTML-to-`AnnotatedString` converter may exist in newer Compose versions but I did not check or use it **[UNVERIFIED]**. Embedding a real browser means JCEF (for example through KCEF) or JavaFX WebView inside a `SwingPanel`, which adds roughly 100 MB or more and was not tried. So an HTML mockup of a Compose screen is only a design reference. The final look has to be rebuilt in Compose, and it will not match pixel for pixel (fonts come from the OS via Skia). Compose Hot Reload 1.2.0 also has an experimental MCP server with screenshot and semantic-tree tools (documented for Compose 1.12.0+); I did not try it.
- **Hot Reload cost:** the JBR+JCEF download is 1.5 GB per user and Gradle keeps the 582 MB `.tar.gz` after extracting. `gradlew reload` takes ~2.5 s in a terminal; the sub-second experience the JetBrains docs imply needs the IntelliJ Kotlin Multiplatform plugin, which I did not install **[UNVERIFIED]**.
- **Memory:** ≈240 MB working set (≈380 MB private) for an empty window, one JVM process. This is 7x the Tauri main process number, but Tauri's figure excluded the WebView2 children, so the two are not directly comparable.
- **Startup:** ≈1.6–1.9 s to first window vs "within seconds" for Tauri. Not measured the same way.
- **Signing/SAC/MOTW/SmartScreen** not exercised. The launcher exe and MSI are unsigned.
- **Parser limits (by design, deterministic; same as Tauri):** multi-column PDFs can interleave columns; `Surname, Given` and non-Latin names are not handled; years of experience is empty with an `uncertain` flag when there are date ranges but no Experience heading; skill matching is literal; no OCR. The PDF line rebuild is a port of the pdf.js one and was tested on three synthetic layouts only. Equivalence with `parser.ts` beyond the tested cases is **[UNVERIFIED]**.
- **Not tested:** the wildcard filter in the Open dialog (see above), restarting the app to see the saved skill list, a PDF with a standard non-embedded font other than the sample's, encrypted PDFs (PDFBox raises an error that we show as "could not read file: ...").
- **Deprecated-feature warning** in every Gradle build (item 16).
- **A Gradle daemon (9.8.0) from this run may still be running**; it exits by itself after an idle period. I did not run `gradlew --stop` because other agents may share `~/.gradle`.
- **Files left on disk:** `%USERPROFILE%\dev\jdk-21.0.12.1+1` and `temurin21.zip` (205 MB, safe to delete), `~/.gradle` (2.1 GB, of which 1.56 GB is JBR from Hot Reload), `build/` (442 MB, git-ignored). The per-user MSI was uninstalled. The temporary export and screenshots in `%TEMP%` were deleted. No `skills.json` was ever written to `%APPDATA%` by this run.
