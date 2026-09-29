# Build report: Resume Parser (Python 3.13 + uv + pywebview/WebView2), built with no admin rights

Date of run: 2026-09-29, Windows 11 build 26200 x64, standard user (`IsInRole(Administrator)` = False; no UAC prompt at any point), machine `DESKTOP-QTPN3M3`.
Everything below was observed on this run unless marked **[UNVERIFIED]** or **[INFERENCE]**.
Screen scaling is 150 %, so the 1500x860 window is 2250x1290 px in `screenshot.png`.

## Verdict

**Yes, with one caveat. The app installed, tested, launched and exported as a standard user: no administrator rights, no UAC prompt, no machine-wide change, no compiler.**
Route: **uv (already on the machine, 0.11.7) -> managed CPython 3.13 -> `uv sync` of 18 wheels into `.venv` -> `uvw run --gui-script app.py`**, started by a double-click `Resume Parser.cmd`. WebView2 (evergreen runtime 153.0.4234.48) was already installed; nothing was installed with admin.

**The caveat, a strict "wheel-only" FAIL for one package: `proxy_tools`.** pywebview 6.2.1 depends on `proxy_tools 0.1.0`, which has **no wheel on PyPI, only an sdist** (3 KB, pure Python, one `__init__.py`). With `no-build = true` (uv's equivalent of `pip --only-binary :all:`) `uv lock` fails (friction 1). With the uv default, uv builds that sdist with setuptools in about 1.5 s: no compiler, no MSVC, output `py3-none-any`, but still a source build. Per the assignment I counted that as a FAIL for that package and worked around it: I built the wheel **once** (maintainer step) and vendored the 2.9 KB result in `vendor/`, pinned through `[tool.uv.sources]`. With it, every install, including a cold one with an empty cache, builds nothing. Every other package (pywebview, pythonnet, clr-loader, cffi, pypdf, XlsxWriter, ...) is a published wheel.

- Parser: **19/19 pytest tests pass** through real PDF (pypdf), DOCX (zipfile + ElementTree) and TXT extraction. The 7 Tauri cases are ported one-to-one, plus corrupt files, xlsx round trip (openpyxl), skill JSON, DTD refusal, js_api surface, and rounding.
- Independent equivalence check: I ran the **original `parser.ts` under node** (v24) against the Python port on **390 inputs** (3 sample texts, 360 seeded mutations of them, 27 hand-written edge cases). **0 mismatches** (`scripts/diff-vs-ts.py`). The regression test for the "I'm ..." line was checked to fail without its fix (name becomes `I'm Jane Doe`).
- Desktop app: launched via the `.cmd`, loaded the samples through the **real native Open dialog** (filename set with `WM_SETTEXT`, read back with `WM_GETTEXT`, compared, then OK), edited a cell, exported through the **real native Save As dialog**, re-read the `.xlsx`, closed cleanly with WM_CLOSE.
- Screenshot: `screenshot.png`.
- Packaging: **not needed**, the launcher runs the app. Optional PyInstaller one-folder build worked (28.9 MB).

## Toolchain steps (with wall-clock times and sizes)

Other build tools were running during every step (see "Contention"). All timings are **indicative only**.

| # | Step | Command | Result / time |
|---|------|---------|---------------|
| 1 | Preflight | `Get-Command`, `uv --version`, `uv python list`, elevation check | **uv 0.11.7 already installed** at `%USERPROFILE%\.local\bin` (`uv.exe` 65.2 MB, `uvw.exe`, `uvx.exe`; on the user PATH already, not by me). Latest is 0.12.20. Managed Pythons 3.12.12, 3.13.11, 3.14.0 already present in `%APPDATA%\uv\python`. No system Python (only the Microsoft Store stub), but a proto-managed 3.13.14 exists under `~/.proto`, see friction 8. C: 18 GB free. |
| 2a | uv install, route A: official script | `UV_UNMANAGED_INSTALL=<sandbox>`, `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 \| iex"` | **3.1 s.** Installed uv **0.12.20**: `uv.exe` 42.5 MB, `uvx.exe`, `uvw.exe` (349 KB each) into the sandbox folder. `UV_UNMANAGED_INSTALL` skips the PATH edit and the receipt: **user PATH unchanged (checked)**. I used it so I would not touch the machine's real uv. The default install dir is `%USERPROFILE%\.local\bin` with a user-PATH edit per the docs and the research file **[UNVERIFIED: default mode not run because uv already existed]**. |
| 2b | uv install, route B: script-free | `curl.exe -sSL -o uv.zip https://github.com/astral-sh/uv/releases/latest/download/uv-x86_64-pc-windows-msvc.zip` then `tar -xf` | **1.3 s.** 18.0 MB zip, same three exes, `uv 0.12.20` runs from that folder. **The script-free route works** (needs only `curl.exe` and `tar`, both in Windows 11). |
| 3 | Python | `uv python install 3.13` | On this machine: `Installed Python 3.13.11 in 66ms` (already there). **Cold, in an isolated dir with uv 0.12.20: 2.6 s**, downloaded 21.0 MiB, installed `cpython-3.13.15` = **60.0 MB**. Lands in `%APPDATA%\uv\python\cpython-3.13.x-windows-x86_64-none` (a `cpython-3.13-...` junction points to it) and, for explicit installs, shims in `%USERPROFILE%\.local\bin`. **Registry:** `HKCU\Software\Python\Astral` exists (PEP 514 registration written by uv's earlier installs on this machine, per-user). My cold runs set `UV_PYTHON_INSTALL_REGISTRY=0`. |
| 4 | PDF library | `scripts/eval-pdf-libs.py` on 2 PDFs | pypdf 6.19.0, pdfminer.six 20260107, pypdfium2 5.13.0 tried on the real samples. See "Why pypdf". |
| 5 | Project shape | `pyproject.toml` + `uv.lock` | See "Project vs PEP 723 script". |
| 6 | Lock, strict | `uv lock` with `no-build = true` | **FAIL**: `proxy-tools==0.1.0 has no usable wheels ... building from source is disabled`. |
| 7 | One-off wheel | `uv build --wheel -o vendor <proxy_tools sdist>` (run from `%TEMP%`, not inside the project) | 5.5 s wall (includes fetching setuptools 84.0.0 into a build env). `proxy_tools-0.1.0-py3-none-any.whl`, **2,944 bytes**, one `.py` file. No compiler ran. |
| 8 | Sync | `uv sync` | **2.2 s** (Python 3.13.11, venv creation, 8 packages downloaded, 18 installed). Warm cache: 0.7 s. |
| 9 | Tests | `uv run pytest -q` | 19 passed, 1.06-1.63 s (3.8 s wall including `uv run`). |
| 10 | Live app | `uvw run --gui-script app.py`, `Resume Parser.cmd` | See measurements. |

Licence terms accepted during this run: none by a click-through.

### Confirming nothing was built from source

- Strict mode is on in `pyproject.toml` (`[tool.uv] no-build = true`) and the sync passes: uv would have failed on any sdist-only package. It passed on **18 installed distributions: 17 from PyPI wheels and 1 vendored wheel**.
- In the cold run with an **empty** uv cache the cache had `archive-v0`, `interpreter-v4`, `sdists-v9` (2 files), `wheels-v6`, and **no `builds-v0` folder** (that is where uv puts build environments). The 2 files under `sdists-v9` are most likely bookkeeping for the local path wheel **[INFERENCE, not inspected]**.
- Wheel tags read from each `.dist-info/WHEEL`: everything is `py3-none-any` / `py2.py3-none-any`, except **cffi = `cp313-cp313-win_amd64`** (contains `_cffi_backend.pyd`) and **pythonnet 3.1.0** (a win32/win_amd64 wheel, first tag `cp310-none-win32`).
- For contrast, uv's default (sdist allowed) with an empty cache: `Building proxy-tools==0.1.0`, `setuptools.build_meta:__legacy__.build_wheel`, `Built proxy-tools==0.1.0 into proxy_tools-0.1.0-py3-none-any.whl`, whole `uv sync` **5.8 s** with a cold cache (Python already present).

### Project vs PEP 723 script

**Chosen: `pyproject.toml` + `uv.lock`, `package = false`.** Reasons:
1. The app is several modules (`parser.py` is deliberately pure so tests import it without a GUI), a tests folder and a dev group (`pytest`, `openpyxl`). PEP 723 metadata belongs to one file; with inline metadata uv also **ignores the project's dependencies** (uv docs), so tests would need their own `--with` list.
2. `uv add` / `uv remove` / `uv lock --check` work on the project directly (1 s, see measurements). For a script they work too, but the lock is a separate `app.py.lock`.
3. `package = false`: nothing about the app itself is built or installed. Without it uv would install the project as a package and need a build backend.
4. The one-file script would be nicer to hand to a non-programmer if the app were tiny. It is not.

### Why pypdf (evaluated on `resume-1-sofia-alvarez.pdf` and `scanned-example.pdf`)

| Library | Licence | Wheels | Result on the sample |
|---|---|---|---|
| **pypdf 6.19.0** | BSD-3-Clause | one pure-Python wheel, no required deps on 3.13 | `extract_text(extraction_mode="layout")` keeps the right-aligned dates as a wide gap (`Brightside Foods      Mar 2021 - Present`). I normalise 3+ spaces to 2 and drop blank lines. The parser depends on that gap. Default mode loses it (`Brightside Foods Mar 2021 - Present`). Scanned PDF: empty string, no error. Chosen. |
| pdfminer.six 20260107 | MIT | pure Python, but pulls `cryptography` and `charset-normalizer` (binary wheels) | default `extract_text` puts each text box on its own paragraph (`Marketing Coordinator, Brightside Foods\n\nMar 2021 - Present`): the date is on a separate line, so the years logic would see different lines. Rebuilding lines from `LTChar` positions would work but is more code. Scanned PDF: `'\x0c'`. |
| pypdfium2 5.13.0 | BSD-3-Clause / Apache-2.0 (+ PDFium's own licences) | binary wheel with `pdfium.dll` | best fidelity in general, but text comes back with single spaces (`Brightside Foods Mar 2021 - Present`, gap lost) and it adds another unsigned native DLL to the Smart App Control list. |

Trade-off accepted: pypdf is slow on big files (pure Python): about 1.9 s for the first call including import, a few ms afterwards on the 1-page sample **[not benchmarked on large PDFs]**.

### Telemetry

- **pywebview:** I grepped the installed package (`webview/*.py`, `platforms/*.py`) for `urllib`, `requests`, `urlopen`, `socket`, `telemetry`, `analytics`, `check_update`, `pypi.org`: no telemetry and no update check exists. The only network code is its optional local HTTP server (bottle), which is never started for `html=`, and a port probe in the Qt backend (not used).
- **uv:** I found no telemetry switch and no statement in the docs I could reach, so I changed nothing **[UNVERIFIED that uv sends none]**.
- **WebView2 runtime (Microsoft's, not our code):** it opens **outbound HTTPS connections by itself** (details in the network check). I passed `--disable-background-networking --disable-component-update --disable-sync --metrics-recording-only --disable-domain-reliability` through `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`. The flags did reach the browser process command line (merged with pywebview's own `--disable-features=ElasticOverscroll`), and **the two outbound connections stayed**. I could not disable it, and I did not set any Edge policy in the registry. Not disabled.
- Storage: `private_mode=True` (pywebview default). The WebView2 user-data folder is `%TEMP%\tmpXXXX\EBWebView`, deleted at exit; no `%APPDATA%\pywebview` folder was created.

### Contention while timing

`Get-Process node,electron,java,msbuild` at my checkpoints showed: `node` x3 to x8, `electron` x4 (the Electron build's test runs), `java` x2, `MSBuild` x1 (twice). **Every time here is indicative only.** Concurrent UI automation from another agent may also have touched my window once (friction 4).

## Measurements

Compose and Tauri columns are copied from `examples/resume-parser-compose/BUILD-REPORT.md` (its Tauri column).

| Measurement | Python (this run) | Compose | Tauri | How measured |
|---|---|---|---|---|
| Cold first run | **13.7 s** through `Resume Parser.cmd`: empty uv cache, empty uv Python dir, no `.venv`, uv 0.12.20 (Python 3.13.15 download 21 MB + `uv sync` + first window). Plus **1.3 s (curl+tar) to 3.1 s (installer)** for uv itself. Stepwise: `python install` 2.6 s + `uv sync` 1.7 s + first `import` of everything 3.6 s (bytecode compile). | 73.8 s (skeleton build) + 127 s JDK download + 9.6 s extract | 148.0 s (`tauri build --debug`, cold `target/`) | `scripts/cold-e2e.ps1`, `scripts/cold-steps.ps1` (isolated `UV_CACHE_DIR`, `UV_PYTHON_INSTALL_DIR`, `UV_PYTHON_PREFERENCE=only-managed`). Fast home connection; a slow one scales the 21 MB + ~16 MB of downloads. |
| Warm start to first window | **0.99, 0.86, 0.97 s** (`uvw run --gui-script`). Through the `.cmd`: 1.15, 1.27, 1.51 s (one run 3.68 s right after the cold install, probably Defender scanning fresh files **[INFERENCE]**). Pixels of the page are there about 1 s later. | 1.6-1.9 s (dist exe), 3.2-4.0 s (`gradlew run`) | "within seconds" | `scripts/probe.ps1`: poll every 50 ms for a top-level window with our title owned by `python`/`pythonw`. |
| Later runs need network? | **No.** With a dead proxy (`HTTPS_PROXY=http://127.0.0.1:9`) and an installed `.venv`: first window in 1.51 s. | | | `scripts/cold-e2e.ps1` |
| UI change turnaround, restart | **2.20, 1.86, 1.88 s** from saving `ui.html` to the new window (includes closing the old one, 0.94-1.29 s) | 2.4-2.8 s (hot reload), 3.98 s (restart) | 73-215 ms (webview HMR) | `scripts/turnaround.ps1` (real edit, reverted afterwards) |
| UI change turnaround, live reload | **0.22, 0.22, 0.24 s** until the header pixels changed, with a **dev-only file watcher** I added (`RESUME_PARSER_DEV=1`, `window.load_html`, 0.25 s poll). The js_api was still attached afterwards (skill list loaded, buttons enabled). Page state is lost on each reload. No built-in HMR exists for an `html=` string. | | | same script, screenshot-hash polling |
| Add one dependency | **`uv add rapidfuzz` 0.93 s** (1.6 MiB wheel, not cached); 0.08 s from cache; `uv remove` 0.07 s | ≈7.4 s (PDFBox) | 35.3 s (`tauri-plugin-fs`) | `scripts/time-uv-add.ps1` (project files restored byte-for-byte afterwards) |
| Distributable after a UI-only change | **not needed** (launcher runs the source). Optional PyInstaller one-folder rebuild: 29.7 s (includes downloading pyinstaller) | 7.6 s | 13.5-15.0 s | `scripts/pyinstaller-try.ps1` |
| Tests | 19 tests, 1.06-1.63 s (3.8 s wall for `uv run pytest`) | 10 tests, 6.4 s | 7 tests | pytest |
| Memory, empty window | python **96.6 MB** WS + 6 `msedgewebview2` **327.2 MB** WS = **423.8 MB WS**, **276.5 MB private** (7 processes) | ≈240 MB WS, ≈380 MB private (1 process) | 33 MB (main process only, WebView2 children not counted) | `scripts/measure.ps1`: process tree of the python pid, `WorkingSet64`, `PrivateMemorySize64`. WS double-counts shared pages. |
| Memory, samples loaded | python 143.4 MB + webview2 335.5 MB = **478.9 MB WS**, **302.1 MB private** | 279 MB WS, 639 MB private | | same |
| Disk: Python | uv Python 3.13.11 **62.4 MB** (3.13.15: 60.0 MB) | JDK 328 MB (+205 MB zip) | Rust 2,980 MB + MSVC 3,419 MB + SDK 1,713 MB (pre-existing) | recursive size |
| Disk: packages | `.venv` **23.0 MB** (18.1 MB fresh; both include pytest and openpyxl); uv cache for this project **15.9 MB** in a fresh isolated cache | Gradle dist 163 MB + `~/.gradle/caches` 322 MB | `node_modules` 193 MB, `~/.cargo` 1,242 MB | recursive size |
| Disk: uv itself | `uv.exe` 42.5 MB (0.12.20), 65.2 MB (0.11.7 on this machine) | | | |
| Disk: app source | **0.31 MB** (no `.venv`) | | | |
| Total install for a fresh user | uv 42.5 + Python 60.0 + venv 16.2 + cache 15.9 = **≈135 MB** (WebView2 already present) | ≈490 MB without Hot Reload | | sum of the above |
| Output when packaged | PyInstaller one-folder: **28.9 MB, 143 files**, `ResumeParser.exe` 6.1 MB | 122.9 MB folder, MSI 59.3 MB | 10.73 MiB exe, NSIS 2.76 MiB | recursive size |
| Runs by double-click, no installer? | **Yes** (`Resume Parser.cmd`) once uv is installed. The PyInstaller exe also opened its window in 1.94 s (window only; the bridge was not exercised). | Yes, as a folder | A bare exe ran if WebView2 was present | |
| Machine-wide uv cache | The machine's shared uv cache is **43,079.7 MB** across all projects; not attributable to this app. | | | |
| Build-time network | `astral.sh` (installer) or `github.com` (uv zip), Python from a GitHub release **[INFERENCE: python-build-standalone via uv, host not inspected]**, `pypi.org` + `files.pythonhosted.org`. No proxy on this machine; behind a proxy or TLS inspection: **[UNVERIFIED]** | Maven, Gradle, GitHub, Adoptium... | crates.io, npm, NSIS download | |
| Runtime network | See below. **Python process: 0 sockets.** | 0 TCP, 0 UDP | CSP proof | `scripts/measure.ps1` |

### Network / socket check (app running, samples loaded)

- **The python process itself owns no TCP or UDP endpoint at all.** No `Listen` socket anywhere in the tree (python + msedgewebview2). pywebview's bottle server was not started (`html=` string, `http_server=False`).
- **msedgewebview2 (Microsoft's runtime) does open outbound connections.** Sample with samples loaded: 2 `Established` TCP connections from the WebView2 browser process to Microsoft IPv6 addresses on **port 443** (`2603:1026:c0e:874::2`; reverse DNS gave nothing), plus 2 `Bound` half-open client sockets and 1 UDP endpoint in a child process. Empty-window sample: 3 Established (2 to `2603:1026:c0e:864::2`, 1 to `2620:1ec:33:1::11`). **A bare `create_window(html='<p>hello</p>')` with no js_api shows the same 2 connections (`scripts/baseline-webview2.py`), so they come from the runtime, not from this app's code or page.** Purpose of the traffic: **[UNVERIFIED]**. Likely Edge/WebView2 component or telemetry services **[INFERENCE]**.
- **The page cannot make requests:** CSP `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'`. The js_api bridge works under it (`get_skills`, `open_resumes` results arrive), so pywebview 6.2.1 does not need `unsafe-eval` for calls. I did not test a remote fetch from inside the page **[UNVERIFIED]**.
- **Windows Firewall:** I saw no prompt and clicked nothing. Since the app listens on nothing, none is expected **[INFERENCE]**. The screenshots only capture the app window, so a prompt in another window would not show.

## Security reaction of Windows, signatures and Smart App Control

- **No SmartScreen, Defender or UAC reaction observed** for `uvw`, the venv launchers, python, or the PyInstaller exe (`Get-MpThreatDetection`: 0 new entries during the PyInstaller run). Nothing was downloaded through a browser, so **Mark-of-the-Web was not exercised [UNVERIFIED]**.
- **Smart App Control is off** (per the assignment). What SAC would do with the unsigned files below is **[UNVERIFIED]**; the research file predicts a block **[INFERENCE]**.
- Process shape: `uvw.exe` -> `.venv\Scripts\pythonw.exe` (a trampoline) -> the real `python.exe` from the uv Python dir, which owns the window. Both venv launchers are unsigned.

Census of every `.exe`/`.dll`/`.pyd` in the uv Python (3.13.11) and the project `.venv` (`scripts/sigcheck.ps1`, `Get-AuthenticodeSignature`; "signed" = status `Valid`):

| Component | Files | Signed | Unsigned | exe | dll | pyd | Signer of the signed ones |
|---|---|---|---|---|---|---|---|
| CPython 3.13 (uv / python-build-standalone) | 55 | 2 | **53** | 10 | 13 | 32 | "Microsoft Windows Software Compatibility Publisher" (the 2) |
| venv launchers (`Scripts\*.exe`: python, pythonw, pytest, bottle, ...) | 7 | 0 | **7** | 7 | 0 | 0 | |
| pythonnet (.NET bridge; 96 files are Microsoft .NET reference assemblies) | 97 | 96 | **1** (`Python.Runtime.dll`, 446 KB) | 0 | 97 | 0 | Microsoft Corporation |
| clr-loader (`ClrLoader.dll` amd64 + x86) | 2 | 0 | **2** | 0 | 2 | 0 | |
| pywebview (`webview\lib`: WebBrowserInterop x64/x86 + 5 WebView2 wrapper DLLs) | 7 | 5 | **2** (`WebBrowserInterop.x64.dll`, `.x86.dll`, 7 KB each) | 0 | 7 | 0 | Microsoft Corporation |
| cffi (`_cffi_backend.cp313-win_amd64.pyd`) | 1 | 0 | **1** | 0 | 0 | 1 | |
| pypdf, XlsxWriter, other packages | 0 | 0 | 0 | 0 | 0 | 0 | pure Python, no binaries |
| **Total** | **169** | **103** | **66** | 17 | 119 | 33 | |

What the **running** app really loads (`Process.Modules` of the python pid, 95 modules, `scripts/loaded-modules.ps1`): 62 Windows system modules are signed; **unsigned: 19 files of the uv Python** (python.exe, python313.dll, python3.DLL, 13 `.pyd`/`.dll` such as `_ctypes`, `_ssl`, `libcrypto-3-x64.dll`), **`_cffi_backend.pyd`, `ClrLoader.dll`**, plus 7 .NET NGEN native images under `C:\Windows\assembly` that report `NotSigned` (generated on this machine **[INFERENCE]**). `Python.Runtime.dll` and `WebBrowserInterop.x64.dll` are managed/mixed assemblies that do not appear in `Modules`, but pythonnet cannot work without `Python.Runtime.dll`, so they are loaded too **[INFERENCE]**. The WebView2 runtime itself (`C:\Program Files (x86)\Microsoft\EdgeWebView`) is Microsoft-signed system software and was not counted. The PyInstaller `ResumeParser.exe` is `NotSigned`.

## The app (what was built)

Path: `examples/resume-parser-python/` (about 890 lines of Python, a 267-line HTML file, 217 lines of tests)

- `resume_parser/parser.py`: **pure port of `parser.ts`**, no UI/file/network imports. Same fields (`name, email, phone, linkedin, github, otherLinks, skills, years`), same `found`/`not_found`/`uncertain` flags and notes, same headings, same 46 `DEFAULT_SKILLS`, both real-world regressions kept. Regex dialect handled explicitly: `re.ASCII` + an explicit JS-whitespace class where JS is ASCII for `\w \d \b` but Unicode for `\s`; letters as `[^\W\d_]` (no `\p{L}`); `\Z` for `$`; `floor(x + 0.5)` for `Math.round` (Python's `round` is banker's).
- `resume_parser/extract.py`: PDF via pypdf (layout mode, normalised), DOCX via `zipfile` + `xml.etree` over `word/document.xml` (DTD/entity declarations refused, 64 MB cap, nested text-box paragraphs handled once), TXT strict UTF-8 then windows-1252 (BOM removed, UTF-16 BOM handled). Fewer than 20 non-space characters gives `no text found (scanned?)`; corrupt files give `could not read file: <reason>`. Files opened `rb`, never written.
- `resume_parser/export_xlsx.py`: XlsxWriter 3.2.9. New workbook `Resumes`, bold filled wrapped header, frozen header row, autofilter, ID/file/phone as **text cells** (`@`), years numeric, "Needs checking" column (edited cells are not flagged). `strings_to_formulas=False`, so `=HYPERLINK(...)` stays text.
- `resume_parser/store.py`: `%APPDATA%\dev.example.resume-parser-python\skills.json`, atomic write (temp file + `os.replace`), corrupt file falls back to defaults, an empty list is never saved. `RESUME_PARSER_DATA_DIR` overrides the folder (tests).
- `resume_parser/api.py`: **the only bridge to JavaScript**: `open_resumes`, `export_xlsx`, `get_skills`, `save_skills`. Everything else is `_`-prefixed. A test asserts the public surface is exactly those four methods. No file read, no eval. Export refuses to write onto a resume that is in the table.
- `resume_parser/ui.html`: one self-contained page (inline CSS/JS, no remote sources, CSP meta tag). Same layout as the Compose screenshot: toolbar (Open resumes..., Export to Excel, Clear table, legend), collapsible skill list with Save & re-scan and Restore defaults, table with one row per resume and inline-editable cells (uncertain = yellow, not found = red, edited = blue), click or focus a row to show the extracted text on the right, status footer. Data is put in the DOM with `textContent`/`createElement`, never `innerHTML`.
- `app.py`: `webview.create_window(..., html=<string>, js_api=Api())`, `webview.start(gui="edgechromium", private_mode=True, debug=False, http_server=False)`. `ALLOW_FILE_URLS=False` (friction 3). Errors go to `%APPDATA%\dev.example.resume-parser-python\app.log` because `uvw`/`pythonw` have no console. Title is **"Resume Parser (Python)"**, unique on purpose (friction 4).
- `Resume Parser.cmd`: `cd` to its own folder, calls uv by **absolute path** (`%USERPROFILE%\.local\bin`, override `RESUME_PARSER_UV_DIR`). If `.venv\Scripts\pythonw.exe` is missing it runs `uv sync` **in the visible console** (first run only, needs internet, prints progress and errors), then `start "" uvw.exe run --project ... --gui-script app.py`. `uvw.exe` is uv's windowless twin (new in uv 0.9.x, present in 0.11.7), so **no console window stays open**. The double-clicked `.cmd` window itself still flashes for a fraction of a second **[not measured]**. CRLF line endings are enforced with `.gitattributes`.
- `vendor/proxy_tools-0.1.0-py3-none-any.whl` (2.9 KB), `pyproject.toml`, `uv.lock`, `.python-version` (3.13).
- `samples/`: the 3 resumes + `scanned-example.pdf`, copied from the Compose example.
- `scripts/`: PowerShell/Python used for measuring and driving (all throwaway, safe to delete). Debug hook: env var `RESUME_PARSER_DEBUG_FILES` (semicolon-separated absolute paths) replaces the Open dialog; used by one pytest, not needed in normal use. `RESUME_PARSER_DEV=1` enables the live-reload watcher.

### Single-HTML fallback check

The same `ui.html` was opened as `file://` in plain headless Edge (no `window.pywebview`, `scripts/fallback-check.ps1`). It feature-detects `window.pywebview.api` (or the `pywebviewready` event), waits 1.5 s, then switches to a **read-only preview**: yellow banner "Preview only ...", two hard-coded sample rows, Open/Export/Save disabled, cells still editable, status "Preview mode (no Python backend)." All four checks passed on the DOM dump. So the file can double as the HTML-only fallback, but **only as a preview**: the parser and the PDF/DOCX extraction are Python, so a real fallback would need a JS port of both (`parser.ts` exists, `extract` would need pdf.js and a zip reader). Not done.

### Verification performed

- `uv run pytest`: **19/19 pass**.
  - PDF sample: name `Sofía Álvarez`, `+1 (555) 010-4477`, the 2-space gap `Brightside Foods  Mar 2021 - Present`, years 8. DOCX: ALL CAPS name converted, years 14.5. TXT: years 6.
  - Missing/ambiguous, both regressions, rounding half-up, real image-only PDF and empty text, corrupt PDF/DOCX, non-Word zip, DTD refusal, TXT encodings, unsupported extension.
  - xlsx round trip with openpyxl (bold header, `A2` freeze, `A1:K5` filter, text cells, numeric years, edited cell not flagged), formula-like text stays text, skill JSON (dedupe, corrupt file, empty list), js_api exposes exactly four methods, `open_resumes` + `save_skills` through the debug hook.
- **Real app, real dialogs** (`scripts/drive.ps1`, started through `Resume Parser.cmd`):
  - Mouse click on "Open resumes...". Native dialog (title `Open`). Filename field set with `WM_SETTEXT` to the absolute path of this project's `samples` folder, read back with `WM_GETTEXT`, compared, OK by `BM_CLICK`. Then the four sample names (quoted), verified, OK. No keystrokes went to a dialog, no other folder was browsed.
  - Result: 4 rows. The 3 samples parsed correctly, `scanned-example.pdf` gave a red row `no text found (scanned?)`. The text panel showed the PDF text with the layout gaps.
  - Inline edit: clicked the Name cell in **our own window** (no dialog open) and used `SendKeys` `{END} [edited]`. The cell turned blue and the export contains `Sofía Álvarez [edited]`.
  - Export: "Export to Excel", native `Save As` dialog, filename set by `WM_SETTEXT` to `%TEMP%\resume-parser-python-out\resumes-out.xlsx`, verified, OK. File written (5,157 bytes on the launcher run, 6,586 bytes on an earlier run; I did not investigate the size difference). Re-read with openpyxl (`scripts/verify-xlsx.py`): 5 rows x 11 columns, `freeze_panes A2`, `pane state="frozen"`, all header cells bold, autofilter `A1:K5`, ID/phone cells string type, years numeric (8, 14.5, 6), edited name exported, `Needs checking` for the scanned row = `no text found (scanned?)`.
  - App stayed responsive, closed cleanly with `CloseMainWindow`. The temp export was deleted afterwards.
- Also run: uv installer and curl+tar routes, cold install in isolated dirs, dead-proxy warm start, dev live reload, `uv add`, PyInstaller build, headless-Edge fallback, signature census, loaded-module list, socket/memory census.
- **Not exercised:** a physical double-click in Explorer (I used `Start-Process` on the `.cmd`); restarting the app to see the saved skill list (only the unit test covers save then load); clicking "Save & re-scan" in the UI (its Python side is covered by a test, the JS side was not clicked); a yellow "uncertain" cell on screen (the samples produce none, only red ones); whether the Open dialog's `*.pdf;*.docx;*.txt` filter works visually; encrypted PDFs; large PDFs; the PyInstaller exe's js_api; MOTW/SmartScreen; SAC enforcement; another PC; macOS; Windows on ARM.

## Friction log

Count of attempts is "tries until it worked".

| # | What went wrong | Category | Attempts to fix |
|---|---|---|---|
| 1 | **`uv lock` with `no-build = true` fails: `proxy-tools==0.1.0 has no usable wheels`.** pywebview 6.2.1 requires `proxy_tools`, which is sdist-only on PyPI. Fix: build a 2.9 KB wheel once and vendor it (`[tool.uv.sources] proxy-tools = { path = ... }`, plus `proxy-tools==0.1.0` as a direct dependency so the source applies to pywebview's transitive requirement). Sub-attempts: `uv build ... -o` failed inside my PowerShell wrapper (`-o` ambiguous with `-OutVariable`); `uv build` inside the project failed with `Building source distributions is disabled` (the project's own `no-build`); worked from `%TEMP%`. A vendored, hand-built wheel is not something a non-programmer maintains; a pywebview release with a wheel for this tiny dependency would remove the problem. The sdist has no `LICENSE` file, licence per metadata only (MIT). | Packaging | 3 |
| 2 | **`--only-binary` is not a uv flag** (`unexpected argument '--only-binary'`). uv's equivalent is `--no-build` (env `UV_NO_BUILD`, setting `[tool.uv] no-build = true`). | uv CLI | 1 |
| 3 | **pywebview API and docs mistakes to watch (v4 vs v5/v6, `js_api`).** (a) File dialogs: current API is `window.create_file_dialog(webview.FileDialog.OPEN, ...)`; the older `webview.OPEN_DIALOG` style constants are what v4-era code uses **[UNVERIFIED: not run]**. I used the new names first and had no error. The docs text has a typo (`webview.FileDialog.OPEN.SAVE`); the real name is `FileDialog.SAVE`. (b) `webview.start(gui=...)` docs list only `cef`, `qt`, `gtk`, but `"edgechromium"` is accepted and is what the research file asks for. (c) **`js_api` exposes every public method and every public attribute that holds an object**, nested objects included, so storing `self.window` publicly would expose the whole window object to the page; I store it as `_window` (underscore = hidden) and a test asserts only four public names. (d) js_api calls run **in separate threads and are not thread-safe** (docs); the API is stateless, and `create_file_dialog` called from such a thread worked. (e) `window.pywebview.api` is not guaranteed at `onload`: wait for the `pywebviewready` event (used). (f) `evaluate_js` wraps code in `eval`, which a strict CSP blocks; I did not use it, and js_api calls worked under the CSP without `unsafe-eval`. (g) **`ALLOW_FILE_URLS` defaults to `True` in 6.2.1** (docs list `True`, the prose says disabled by default) and adds `--allow-file-access-from-files` to WebView2; I set it to `False` after seeing it in the browser command line. (h) `Window.state` and `pywebview.state` are new in 6.0 (not used). | pywebview | 0 code errors, 3 doc discrepancies |
| 4 | **Window-title collision with another build.** My first probe matched a top-level window titled `Resume Parser (local, offline)` (the Compose/Electron builds use that title) and sent it `WM_CLOSE` before I noticed the owner pid was not mine. I told `ElectronResumeParser` right away. Fixed: my title is `Resume Parser (Python)`, and my scripts only accept windows owned by `python`/`pythonw`. **Also**, one of my early runs showed the app stuck at "Choose files in the dialog..." with a `pypdf` warning in my `app.log` that my samples do not produce; that is consistent with **another agent's UI automation clicking my window at the same screen coordinates** (button positions match the Compose driver) **[INFERENCE]**. It did not recur once I ran with fewer overlaps. A pending js_api call has no cancel. | Shared desktop | 1 |
| 5 | **Launcher bug: `--project "%~dp0"` ends in `\"`,** which escapes the quote. `uvw.exe` (no console) failed **silently**, nothing appeared and my test waited 60 s. Fixed with `"%~dp0."`. Lesson: a windowless launcher hides its own errors; the mitigations are the visible first-run `uv sync`, the `app.log` file, and running `uv run` once with a console when debugging. | Launcher | 2 |
| 6 | **Save As dialog has a different control tree from Open.** Open: `ComboBoxEx32 > ComboBox > Edit`; Save As: `DUIViewWndClassName > DirectUIHWND > FloatNotifySink > ComboBox > Edit`. My first script threw `filename Edit control not found`; fixed after dumping the child windows (`scripts/dump-dialog.ps1`). Both still worked with `WM_SETTEXT`. | Test automation | 2 |
| 7 | **Shell quirks (same family as the Tauri/Compose logs).** Bash tool eats backslashes in unquoted `C:\...` arguments and mangles nested quotes for `cmd /c "\"Resume Parser.cmd\""`; PowerShell 5.1 wraps native stderr as `NativeCommandError` noise (harmless); `cmd /c` output captured through a pipe blocks until the **app** exits because the started app inherits the pipe (the job backgrounded and timed out at 60 s). Fixed by using `.ps1` files, forward slashes, and `Start-Process` without capture. | Agent shell | 3 |
| 8 | **My first "cold" run was not cold.** With an empty uv Python dir, uv 0.12.20 found a system Python 3.13.14 (`~/.proto/tools/python`) and used it instead of downloading (`uv python` default preference is "managed", but with none managed it falls back to a system one): 6.29 s and no download. Fixed by `UV_PYTHON_PREFERENCE=only-managed` for the measurement (13.7 s). On a machine with any system 3.13 the app will silently use that interpreter (probably python.org's, which is signed **[UNVERIFIED]**). | uv behaviour | 1 |
| 9 | **pywebview leaves a temp folder** when it cannot delete its private-mode user-data folder at exit: `Failed to delete user data folder: [WinError 32] ... EBWebView\lockfile` (seen once in `app.log`, when I killed the launcher tree right after a WM_CLOSE). Harmless, but `%TEMP%\tmpXXXX` folders can pile up. | pywebview | not fixed |
| 10 | **The venv's `pythonw.exe` is a trampoline** that starts the real `python.exe` from the uv Python dir; the window belongs to `python.exe`, not `pythonw.exe`. My first driver looked for `pythonw` only; fixed by matching both. No console window appeared in either case. | uv on Windows | 1 |
| 11 | **`pypdf` default extraction loses the right-aligned-date gap** that the parser depends on; layout mode keeps it but pads with many spaces and blank lines. Normalised in `extract.py` (3+ spaces to 2, blank lines dropped). The panel was first showing blank lines between sections; fixed in one round. | Extraction | 2 |
| 12 | **My `edit` operations used stale line numbers five times** (mangled `api.py`, `parser.py` header, `app.py`, the test file, `pyproject.toml`); each was fixed by re-reading or rewriting the file. Agent-process friction, not Python. | Agent tooling | 1-2 each |
| 13 | The table needs horizontal scrolling at the default window size: "Other links", "Skills" and "Years" are off-screen until you scroll (same as Compose item 17 and Tauri item 17). Not fixed. | UI | not fixed |
| 14 | **First `import` after a fresh install takes 3.6 s** (bytecode compilation of pywebview, pythonnet, pypdf...). Warm imports are fast (app window in about 1 s). | Python | not applicable |

**Read of the evidence:** the parser port needed **no rework** (19/19 on the first run, 0 mismatches against the TypeScript original). The costs were in the packaging edge (one sdist-only dependency), pywebview's docs and defaults, and a windowless launcher that hides its errors. Install and run are quick and small (cold 13.7 s, ≈135 MB), and UI edits are the fastest of the three stacks except Tauri's HMR: a restart is about 2 s and the dev-only live reload is about 0.2 s. The price is memory (≈420-480 MB working set, mostly WebView2) and 66 unsigned binaries on disk, of which about 21 are loaded at runtime.

## Packages and licences

Read from each installed `.dist-info` (`License-Expression`, `License`, classifiers). All permissive.

| Package | Version | Licence | Use |
|---|---|---|---|
| CPython (uv managed, python-build-standalone) | 3.13.11 (dev), 3.13.15 (cold run) | PSF-2.0 **[UNVERIFIED: not read from the distribution]** | runtime |
| uv | 0.11.7 (machine), 0.12.20 (sandbox) | Apache-2.0 OR MIT **[UNVERIFIED: not read]** | tool |
| pywebview | 6.2.1 | BSD-3-Clause | window + js_api bridge |
| proxy_tools (vendored wheel, built from its sdist) | 0.1.0 | MIT (metadata classifier; no LICENSE file in the sdist) | pywebview dependency |
| bottle | 0.13.4 | MIT | pywebview dependency (server never started) |
| pythonnet | 3.1.0 | MIT | .NET bridge (Windows) |
| clr-loader | 0.3.1 | **[UNVERIFIED: no licence field in the metadata]** | pythonnet dependency |
| cffi | 2.1.1 | MIT-0 | pythonnet dependency |
| pycparser | 3.0 | BSD-3-Clause | cffi dependency |
| typing_extensions | 4.16.0 | PSF-2.0 | pywebview dependency |
| pypdf | 6.19.0 | BSD-3-Clause | PDF text |
| XlsxWriter | 3.2.9 | BSD-2-Clause | .xlsx writer |
| pytest, pluggy, iniconfig, packaging, Pygments, colorama | 9.1.1, 1.6.0, 2.3.0, 26.3, 2.21.0, 0.4.6 | MIT, MIT, MIT, Apache-2.0 OR BSD-2-Clause, BSD-2-Clause, BSD | tests only |
| openpyxl (+ et_xmlfile) | 3.1.5 (+ 2.0.0) | MIT | tests only, independent xlsx reader |
| PyInstaller | pulled by `uv run --with`, not a project dependency | **[UNVERIFIED: not read]** (GPL with a bootloader exception per my memory) | optional packaging trial only |
| WebView2 Runtime (Microsoft, pre-installed) | 153.0.4234.48 | Microsoft licence, not redistributed | rendering |

Nothing here needs a commercial licence.

## How a non-programmer would run it

- **She never installs Python or builds anything.** The maintainer gives her the folder `resume-parser-python` (0.3 MB without `.venv`; zip it). One-time per-user setup of uv (1-3 s, no admin): `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"`, or the script-free `curl.exe` + `tar` route above.
- She double-clicks **`Resume Parser.cmd`**. **The very first run needs internet** (Python 3.13, about 21 MB, and about 16 MB of packages) and shows a console with progress for about 10 s. **Every later run needs no network** (tested with a dead proxy) and opens the window in about 1 s with no console. If uv is missing, the `.cmd` prints the install command and waits.
- Buttons: **Open resumes...** (pick .pdf/.docx/.txt, several at once), edit any cell, **Export to Excel** (asks where to save; a new file, the resumes are never touched).
- **Where it is fragile:** a zip downloaded through a browser or email carries Mark-of-the-Web (SmartScreen may warn on the `.cmd`) **[UNVERIFIED]**; **Smart App Control, if enforcing, would probably block unsigned `python.exe`, `_ctypes.pyd` etc. and pywebview's unsigned DLLs** **[INFERENCE]**; if the WebView2 runtime is missing, pywebview falls back to an old IE engine and this UI would not work **[UNVERIFIED, from the research file]**. Corporate proxy/TLS inspection for the first-run downloads **[UNVERIFIED]**.
- **No-uv alternative:** the PyInstaller folder (28.9 MB, `ResumeParser.exe`, unsigned) opened its window in 1.94 s; its js_api and Open/Export were **not tested**. Rebuild loop for the maintainer:

```
cd examples\resume-parser-python
uv run pytest                                     # 19 tests, about 4 s
uv run app.py                                     # run with a console (errors visible)
$env:RESUME_PARSER_DEV=1; uv run app.py           # dev: window reloads when resume_parser\ui.html is saved (~0.2 s)
uv add <package>                                  # about 1 s
uv run --with pyinstaller pyinstaller --noconfirm --onedir --windowed --name ResumeParser --add-data "resume_parser/ui.html;resume_parser" app.py
```

## Open issues

- **macOS [UNVERIFIED, docs only]:**
  - uv installs with `curl -LsSf https://astral.sh/uv/install.sh | sh` and needs no admin. Managed Python 3.13 is available for arm64 and x64.
  - pywebview uses **WKWebView** through `pyobjc-core`, `pyobjc-framework-Cocoa`, `-Quartz`, `-WebKit`, `-Security`, `-UniformTypeIdentifiers`; the research file lists these as universal2 wheels, so no compile. `gui="edgechromium"` is Windows-only (`app.py` already passes `None` elsewhere).
  - `Resume Parser.cmd` does not work on macOS; a `.command` script would be needed. The `%APPDATA%` path in `store.py` already falls back to `~/Library/Application Support/...` on macOS (written, **not run**).
  - The vendored `proxy_tools` wheel is `py3-none-any`, so it works on macOS. `pywebview`'s `create_file_dialog` behaviour (multi-select, filter string format) on macOS was not looked at. Gatekeeper/quarantine on the downloaded uv binary: **[UNVERIFIED]**.
- **Windows on ARM [UNVERIFIED, docs only]:** pythonnet has no `win_arm64` wheel and clr-loader bundles `ClrLoader.dll` only for amd64/x86 (research file). The only route is an **x64 Python under emulation**, which uv supports; `uv sync` on ARM would default to the ARM64 build, so the launcher would need `--python cpython-3.13-windows-x86_64` **[INFERENCE]**. Not run.
- **Smart App Control:** 66 of 169 binaries are unsigned; about 21 unsigned modules load at runtime. On an SAC-enforcing PC this stack probably fails, as would the Tauri and PyInstaller outputs. The signed alternative in the research file (python.org Python + tkinter or PySide6) was not built here.
- **Outbound traffic from the WebView2 runtime** (2 HTTPS connections to Microsoft) could not be disabled from app code. Whether an Edge policy could is **[UNVERIFIED]** and would be a per-user registry change I did not make.
- **pypdf on large or multi-column PDFs:** layout mode can interleave columns (same limitation as the Tauri/Compose builds), and pure Python is slow on long documents. **Encrypted PDFs:** pypdf needs `cryptography` (or another crypto package) for AES; not installed, error text `could not read file: ...` **[UNVERIFIED: no encrypted PDF tried]**. **DOCX:** only `word/document.xml` (body, tables, text boxes); headers, footers and footnotes are not read.
- **Parser limits (by design, same as Tauri/Compose):** `Surname, Given` and non-Latin names are not handled; years is empty with an `uncertain` flag when there are date ranges but no Experience heading; skill matching is literal; no OCR. Equivalence with `parser.ts` beyond the 390 tested inputs is **[UNVERIFIED]**.
- **Page size limit:** the page is passed as one string (`NavigateToString`); WebView2 documents a 2 MB limit for that call **[UNVERIFIED for this version]**. `ui.html` is 14 KB.
- **Files left on disk:** the project `.venv` (23 MB, git-ignored) and `scripts/` (throwaway helpers). The machine's `uv` (0.11.7, older than the current 0.12.20), its Python installs and its 43 GB cache were pre-existing and untouched. My sandbox uv, cold-run folders, PyInstaller trial and screenshots in `%TEMP%` were deleted. `%APPDATA%\dev.example.resume-parser-python` holds `app.log` (and no `skills.json`, because no skill list was saved through the UI).
