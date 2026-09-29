# Workbench skill: research synthesis

Research date: 2026-09-29. This file summarises eight research notes and records the decisions and tensions that cut across them. Each note has numbered recommendations, key evidence, open questions, conflicts with the guiding principles, and a list of cited sources with links. Claims marked `[UNVERIFIED]` or `[INFERENCE]` in the notes were not confirmed against a primary source.

| Area | File |
|---|---|
| 1. The interview | [01-interview.md](01-interview.md) |
| 2. Ontology / shared vocabulary | [02-ontology-vocabulary.md](02-ontology-vocabulary.md) |
| 3a. Default stack: runtime, UI, install, lockdown | [03a-default-stack-runtime.md](03a-default-stack-runtime.md) |
| 3b. Default stack: data storage (SQLite vs Excel/CSV) | [03b-data-storage.md](03b-data-storage.md) |
| 4a. Software 1.0 / 2.0: rules vs a cheap hosted model | [04a-software-2-llm-extraction.md](04a-software-2-llm-extraction.md) |
| 4b. Software 3.0: local MCP server driven by her assistant | [04b-software-3-local-mcp.md](04b-software-3-local-mcp.md) |
| 5. Design alternatives and mockups | [05-mockups-alternatives.md](05-mockups-alternatives.md) |
| 6. The build loop | [06-build-loop.md](06-build-loop.md) |
| 7. Host: ChatGPT / Codex, project setup, startup hook | [07-codex-host.md](07-codex-host.md) |
| 8. Security, compliance, forwardable messages | [08-security-compliance.md](08-security-compliance.md) |
| 9. CONTEXT.md (shared words) and how the AI asks questions | [09-context-file.md](09-context-file.md) |

## Headline recommendations per area

**1. Interview** ([01](01-interview.md))
- Run a fixed six-stage, time-boxed interview (about 15–25 min): frame → one real past episode → walk the current workaround → stakes → slice → confirm. Each stage has exit criteria. Structured elicitation beat free-form LLM chat in the three LLM-interviewer studies found (LLMREI, ReqElicitGym, OntoAgent). All three used simulated or role-played users.
- Open with "Tell me about the last time you…" (Torres; Fitzpatrick's *Mom Test*). Never ask "what features do you want?" When she names a feature, ask *when* she needed it (Shape Up's calendar case).
- Ask one question per turn. Start each turn with a neutral echo, not praise. Close by asking "What did I get wrong?" LLMs that jump to solutions early "get lost and do not recover" (Laban et al., 39% multi-turn drop), so do not build before the exit criteria are met.
- Steer small: "the one moment last week you'd most like to skip", a fixed appetite ("useful by tomorrow morning"), a visible Later list, and her real episode as the acceptance test.

**2. Vocabulary** ([02](02-ontology-vocabulary.md))
- Take the vocabulary from her story, not from a definitions exercise (Domain Storytelling, EventStorming). Her words are canonical: people choose the same word for a thing less than 20% of the time (Furnas 1987). Sort terms into Things / Actions / Rules only. Keep the mapping to software concepts in a builder-only section.
- Introduce a technical term only if it is needed now, will recur, and has no plain description of about eight words. The pattern: bridge from her word → name plus a one-line meaning → why now → an example from her data → teach-back (AHRQ; never "does that make sense?") → log it.
- Sizes (heuristics from Cowan's ~4 chunks and L2 vocabulary research; no direct study exists): 8–15 of her words at the start, 0 borrowed software words at the start and at most ~5 active, at most 1 new term per message and 3 per session. Keep a ~15–25-line glossary file with a "careful words" (false friends) list and a Retired section.

**3a. Runtime / UI / install** ([03a](03a-default-stack-runtime.md))
- **Primary: Python 3.13 managed by `uv`.** It installs per-user into the home folder, and uv fetches a per-user Python, so no admin is needed on either OS. Use stdlib-first, wheel-only dependencies. Ship each tool as a script plus a double-click launcher (`.cmd` / `.command`), not as a packaged exe.
- **Default UI: a pywebview window that renders one self-contained HTML file.** pywebview uses WebView2 on Windows and WKWebView on macOS. Python functions are exposed to the page through `js_api`, so there is no HTTP server. Three configuration rules:
  - Pass `html=` with everything inlined. A relative file path makes pywebview start a `127.0.0.1` server that shares the whole folder.
  - On Windows, force `gui="edgechromium"`, so a missing WebView2 doesn't silently fall back to IE11.
  - Keep the `js_api` class narrow.

  Because the page is HTML, the same file can serve as the feature mockup and as the browser-only fallback. If pywebview fails its smoke test, fall back to tkinter/ttk. A terminal prompt or no UI is still preferred when the task allows it.
- **Smart App Control caveat.** One-machine signature checks by the stack agent found that uv-managed CPython (53 of 55 binaries) and pywebview's pythonnet DLLs are unsigned. The conclusion that SAC in enforcement mode will block them was inferred, not tested on a SAC machine. When SAC is enforcing, use python.org's Python with tkinter or PySide6 (its wheels are Qt-signed, but it is 77–111 MB), never pywebview. Windows on ARM has no pythonnet wheel, so pywebview there is untested.
- **Fallback when Python can't run: one self-contained HTML file opened from disk.** It has no runtime, so AppLocker/WDAC, Smart App Control, PowerShell Constrained Language Mode and proxies cannot block it. Use `<input type=file>` for import and a download link for export. The File System Access API works only in Chromium browsers.
- **Rejected:** Tauri, because building needs MSVC Build Tools or Xcode CLT (admin) and its v1→v2 API churn invites hallucinated code. **Not the default:** Electron (binary download from GitHub, blocked postinstall under Bun, 8-week major releases, largest attack surface) and Bun (runner-up; 2025–26 proxy and CA bugs).
- Install from the terminal only. Terminal-fetched and locally built files carry no Mark-of-the-Web or quarantine flag, so SmartScreen and Gatekeeper don't fire. Browser downloads do trigger them.
- Run the preflight commands (execution policy scope, language mode, AppLocker test, Smart App Control state, proxy/TLS, host reachability) before installing anything. Work down the 8-tier blocked-environment ladder. Never bypass a control. The last tier is a ready-to-send message to IT.

**3b. Data** ([03b](03b-data-storage.md))
- The deciding question: "Who is the source of truth, and will a human open, edit or email this file?" If the app owns the data, use SQLite. If she owns it, it stays in her xlsx.
- v1 usually needs no database: read her file and write a new output file. Once the app has data of its own, use this pattern: read Excel → own SQLite → export xlsx.
- Never write to her original spreadsheet. Treat library warnings on load as stop signs, because openpyxl, ExcelJS and SheetJS CE all drop content on round-trip. Detect Excel locks and synced paths. Match columns by header name, never by position. Store IDs as text. Keep the database in the per-user app-data folder, never in OneDrive/iCloud-synced Documents or Desktop.
- Libraries (all install without admin and without a compiler): stdlib `sqlite3` + `openpyxl` / `python-calamine` (read) + `XlsxWriter` (write new) + stdlib `csv`. Bun side: `bun:sqlite`, SheetJS from its CDN (the npm copy is stale), ExcelJS for new files only.

**4. Software 1.0 / 2.0 / 3.0** ([04a](04a-software-2-llm-extraction.md), [04b](04b-software-3-local-mcp.md))
- Classify in order and stop at the first yes. (1) Can she state the rule completely? → code. (2) Is the input messy but the output shape fixed and the steps known? → one schema-constrained model call plus a code validator. (3) Does it need judgment across sources, with an unknown number of steps? → her assistant via a local MCP server. (3-lite) Low volume? → export a review view and she pastes it into chat.
- Rules before models, per document: embedded e-invoice XML (ZUGFeRD/Factur-X), then the PDF text layer, then regex, then a model. Send page images rather than OCR text; image input won by 11–40 points in the Fraunhofer invoice benchmark. Use provider JSON-schema modes, which guarantee shape, not values. Ship a validator with every extractor (line sums, net + tax = total, IBAN checksum, duplicates).
- Cost is not the constraint: about $0.0006–$0.007 per one-page invoice. Model churn and privacy are. Never hard-code the model name. Model calls must be an opt-in with a per-send consent screen, a send log, a spend cap, and the key stored in the OS keychain. Ask about employer policy before real data moves.
- MCP: a stdio server with tools only, pinned SDK v2, launched by absolute path or shipped as a `.mcpb` bundle for Claude Desktop. It must be read-only by default, have no outbound network, expose narrow tools (no arbitrary SQL, shell or paths), and turn writes into proposals that a human commits in the app. Treat every returned string as attacker-controlled.

**5. Mockups** ([05](05-mockups-alternatives.md))
- Show alternatives only at real structural forks. Show 2–3 options, never 1 and never more than 3. Tohidi et al. 2006: users shown a single design rated it higher and never rejected it. Dow et al. 2010: parallel prototyping gave better results, with the biggest gain for novices.
- Options differ in how she would *use* the tool (layout, flow, interaction model, density, what is automated vs manual), one named dimension at a time. Visual style is frozen. Name each option in her words. AI-generated options converge unless the dimension is forced.
- Default format: one static, greyscale, self-contained HTML sketch with her real data and a "SKETCH" banner, opened in her browser, loading nothing external. The case for "low fidelity" is weaker than folklore suggests: controlled studies found no difference in the problems found. The strong evidence is for showing *multiple alternatives*.
- Present options side by side with one-line tradeoffs. Ask her to run a real task through each. Allow mixing and "none of these". Give the recommendation last.

**6. Build loop** ([06](06-build-loop.md))
- Seven steps per iteration: orient → echo the change in her words → size it to one try-step → checkpoint → build and verify → update notes → hand back ("Done / Try it now / You should see / What I checked / Next I could…").
- Checkpoint invisibly with git plus separate dated data backups (the 2025 Replit incident). Never claim "works" without saying what was run. After two failed fixes, restore the checkpoint and restart in a clean context.
- Keep an "ideas shelf" (Later list) and split work with Lawrence's patterns. Ask "What would you do with it tomorrow morning?" Never build extras the AI thought of that she didn't ask for.
- Say plainly when the project is growing (other people rely on it, it holds other people's data, it needs logins or payments, or mistakes would be costly), then help the user carry the extra responsibility rather than stopping ([08](08-security-compliance.md) rec 8 and the sharing ladder).

## Cross-cutting findings (decisions the skill author must make)

These come from reading the eight notes side by side. None of them is visible from a single note.

1. **The AI doing the building is itself a cloud data flow.** Anything she pastes, shows or lets the agent open goes to the model provider. That includes the interview artifacts, the sample data in mockups, and files the agent reads while debugging. "Her data never leaves her machine without her knowing" is therefore met by *disclosure plus synthetic or redacted data*, not by architecture ([01](01-interview.md) Conflicts, [04a](04a-software-2-llm-extraction.md) R16). The skill needs an explicit first-session statement and a rule about which files the agent may open.
2. **The "1.0 / 2.0 / 3.0" labels are a reinterpretation of Karpathy.** In his usage 2.0 means learned neural-network weights and 3.0 means prompting LLMs in English, so "call a hosted LLM" is his 3.0 ([04a](04a-software-2-llm-extraction.md) R1). Keep the numbers internal to the skill, or rename them ("rules / one AI call / AI assistant does the legwork"), and don't cite Karpathy as their source.
3. **"Desktop app" should mean a double-click launcher, not a compiled executable.** Packaged exes are the most policy-fragile artifact: antivirus false positives on PyInstaller and Bun binaries, Smart App Control blocking unsigned code, SmartScreen or Gatekeeper prompts when the file is shared ([03a](03a-default-stack-runtime.md) Conflicts).
4. **The UI technology decides whether the mockups can be honest; resolved by choosing an HTML-rendered UI.** HTML sketches are honest only if the real app renders HTML ([05](05-mockups-alternatives.md) R10). The stack note therefore switched the default UI from tkinter to pywebview + HTML ([03a](03a-default-stack-runtime.md) "Python UI options under uv"). On the tkinter and PySide6 fallbacks, the HTML mockups are no longer honest to the final app. Mockups must then use rank 3 (a throwaway screen built with the real toolkit) or rank 4 (ASCII in chat) from [05](05-mockups-alternatives.md).
5. **The admin-free rule has three known holes:**
   - Windows 11 **Smart App Control** in enforcement mode blocks uv's unsigned Python DLLs with no per-app bypass. SAC turns itself off on enterprise-managed PCs, so this mostly hits personal PCs.
   - On macOS, **git** comes with the Xcode Command Line Tools, which ask for admin credentials. The build loop's invisible undo depends on git. The alternatives are pixi-installed git, dulwich (pure Python), or timestamped folder snapshots.
   - On a corporate laptop, a **Group Policy execution policy** or **Constrained Language Mode** stops the official PowerShell installers. A script-free path exists: `curl.exe` + `tar`.

   Each hole has a detection step and a fallback tier in [03a](03a-default-stack-runtime.md).
6. **OneDrive Known Folder Move and iCloud Desktop & Documents break local-first silently.** Saving to "Documents" may upload the file. The database and backups must go in app-data folders, and she should be told when an output folder syncs ([03b](03b-data-storage.md)).
7. **The 3.0 path sends data to the cloud by design.** MCP tool results go to her assistant's model provider. Remote-only surfaces (ChatGPT web, Microsoft 365 Copilot) would need a hosted server, and the skill must refuse to build one. The skill should detect which assistant she actually uses, minimise the fields returned, and keep the "3.0-lite" (export and paste) fallback ([04b](04b-software-3-local-mcp.md)).
8. **"Ontology first" means "before building", not "before interviewing".** The vocabulary comes out of Stage 2 of the interview. A few *safety words* (for example "stays on this computer", "backup", "sent to an AI service") must be taught early even though the rule is to avoid software terms ([01](01-interview.md), [02](02-ontology-vocabulary.md)).
9. **Consolidate the project files.** The notes propose overlapping artifacts: a glossary, a Later list / ideas shelf, a decision log, a project memory file, and an environment record. The recommended minimum is two plain-language files plus one machine file:
   - `CONTEXT.md` at the project root: the glossary, including careful words and retired terms ([09](09-context-file.md); replaces `our-words.md`).
   - `notes.md`: what it is, how to run and check it, Things that work, Ideas shelf, Decisions, where the data and backups live.
   - `env.json`: the preflight results, for the agent only.

   Pick one plain name for the Later list (the build-loop note uses "ideas shelf") and use it everywhere. Mixing "Later list", "backlog" and "parking lot" is exactly the synonym drift that [02](02-ontology-vocabulary.md) warns about.
10. **Mockups compete with the build-trap principle.** Skip them for trivial forks, show one screen per option, and time-box the step ([05](05-mockups-alternatives.md) Conflicts).

## Where evidence is thin (treat as design choices, not findings)

- No study was found of LLM interviewers, or of agentic build loops, with *real non-technical users*. Every number here is extrapolated from simulated users, students, professionals, or practitioners: 15–25 minutes, one question per turn, vocabulary sizes, "consolidate every ~5 changes".
- No 2026 head-to-head benchmark of AI code reliability across Python, TypeScript and Rust/Tauri was found. The Python default rests on install and lockdown robustness, not on a reliability advantage.
- No current independent benchmark of 2026 cheap models on invoice fields was found. The skill must calibrate on her own documents (20–30 hand-checked examples).
- Evidence for low fidelity per se is weak. Evidence for multiple alternatives is strong.
