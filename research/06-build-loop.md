# The Build Loop: Iterating One Feature at a Time with an Office Worker Who Doesn't Code

Scope: what happens after the interview. The AI builds a first slice, then grows the app with the user one small change at a time. This file covers the shape of one iteration, scope-creep handling, keeping the user unstuck, and knowing when to stop. Evidence tags: **[study]** = peer-reviewed or measured, **[doc]** = official tool documentation, **[practice]** = practitioner writing or incident report, **[inference]** = my synthesis, not directly sourced, **[LOCAL]** = tested on this machine (Windows 11, no admin), **[UNVERIFIED]** = not confirmed from a primary source. The user-facing word is "save point"; "commit" stays inside the tooling.

## Recommendations

### A. Shape of the loop

1. **Make the first build a walking-skeleton slice, and never call it an "MVP" to the user.** Build the tiniest end-to-end thing they can use on real data (open it, do the one core job, close it, reopen, it is still there). Cockburn: "a tiny implementation of the system that performs a small end-to-end function" [12]. "MVP" has contradictory meanings (earn vs learn, plus "as much as we can ship") [13]; for the user the word is noise. Use their own words: "the first small version".
2. **Treat the first slice as high-stakes even though it is small.** Vibe-coding sessions show "context momentum": early AI interpretations that the user accepts become the path later prompts follow, so a wrong early reading (one date vs a date range) keeps recurring [1]. Confirm interpretation in words before building (rec 4).
3. **Run every iteration through the same seven steps** (template below): orient → echo → size → save point → build+verify → hand back → read reaction. Sarkar & Drosos observed the same natural cycle in expert vibe coders: formulate goal, prompt, review, test in the app, identify bugs, refine, repeat until the sub-goal is satisfied [1]. Our loop adds the safeguards someone who doesn't write code cannot supply for themselves.
4. **State the one change back to the user in their vocabulary, as something they will be able to do or see, and get a yes before building.** Reasons: (a) an intent/interpretation mismatch is the main driver of rework [1]; (b) translating the AI's understanding back into plain language improved end-user programmers' grasp of what the system would do (spreadsheet study, n=24) [23]; (c) invalid assumptions early cascade into later, harder-to-diagnose failures for end-user programmers [6]. Use only the words in CONTEXT.md ([09](09-context-file.md)).
5. **One change per turn; size it to a single try-step.** Anthropic's long-running-agent work found the dominant failure was doing too much at once, leaving half-implemented, undocumented work; working one feature at a time fixed it [10]. Expert vibe coders scope prompts on purpose (e.g. "don't integrate stripe yet. Just make a design with dummy data") and prefer single-objective prompts [1]. Kent Beck lists "functionality I hadn't asked for (even if it was a reasonable next step)" as a warning sign [15]. If the change is bigger, split it (Scope section).
6. **Make a save point before and after every iteration, and make it invisible.** One save point per iteration, named in the user's words ("before: add the dates column"). One studied vibe coder could not work out how to revert the AI's changes or find a save point [1]; Lovable and Replit both ship one-click version history [30][31] [inference: because undo matters]. Claude Code's own checkpoints only track edits made through its file tools and are "not a replacement for git" [9]. The user never types a command: they say "go back to before the dates change" and the AI does it. Without admin and without installed software, the default is one small script over isomorphic-git, run by the project's own Node, with the history kept in `.workbench/history.git` rather than `.git`: Codex's default sandbox makes `<project>/.git` read-only [40], so every save into `.git` would cost an approval click [LOCAL]. Tests, fallbacks and the startup-hook behaviour are in "Save points without admin" below.
   - **Shipped instead of the isomorphic-git default:** real git through `.workbench\scripts\git.cmd` (history in `.workbench\history`, MinGit in `.tools\git` only when git is missing), with each save point made by `.workbench\scripts\save.ps1` / `save.sh` from an explicit list of permitted files. On macOS without a safe git (`xcode-select -p` fails), `save.sh` makes folder snapshots in `.workbench/snapshots/`. See the README's recorded disagreement A.
7. **Snapshot the user's data separately from their code, and iterate against a copy when a change writes or migrates data.** Replit's rollback does not restore the database unless you ask for it [31]; the July 2025 incident destroyed live records in seconds, the agent then said rollback was impossible although the user recovered the data manually, and the fixes Replit shipped were dev/prod separation, a planning-only mode and better restore [17]. A natural-language "code freeze" did not hold; only mechanical separation does. For us: copy their data file to a dated backup folder before any step that touches its structure or contents, and never let the AI run bulk delete/overwrite commands against their only copy. The save-point history leaves the data folder out on purpose (see below), so "go back" changes the tool, never the user's records.
   - **Shipped:** data backups go to `%LOCALAPPDATA%\Workbench\backups\<project folder name>\<yyyy-mm-dd-hhmm>\`, outside the project (not `.workbench/backups/`); the tool's data lives in `%LOCALAPPDATA%\WorkbenchTools\<TOOL_ID>\data` ([03b](03b-data-storage.md) rec 3). "Go back" does not touch either. It restores the older code, rebuilds and repackages the tool, then starts the older build with `WORKBENCH_DATA_DIR` pointing at a *copy* of the current data and does the thing the user uses most; only if that works does it replace the tool on the desktop. If the older version cannot read the data, it stops and offers keep-current / convert-on-a-copy / restore-an-older-backup, naming what would be lost.
8. **Verify before claiming, and say what was verified.** Without explicit prompting, Claude "would fail to recognize that the feature didn't work end-to-end", marked features done prematurely, and later sessions "declared the job done" early; accuracy improved when it tested as a human user would [10]. Willison: without tests "your agent might claim something works without having actually tested it at all, plus any new change could break an unrelated feature" [3]. Claude Code docs: "Have Claude show evidence rather than asserting success" and "If you can't verify it, don't ship it" [9]. Keep a tiny automated smoke check (starts, does the core job, data survives a restart) and grow it by one check per delivered change, so the "Things that work" list doubles as the regression list [10]. Regression testing is rare in end-user tooling [5], so the AI must supply it.
9. **Hand back with one concrete "try this now" and a stated expected result.** Feedback showing values without saying whether they are correct raised overconfidence in spreadsheet users, and 5–23% of end-user correctness judgments were wrong, mostly calling wrong values right [5]. Do not ask "does it look good?"; ask the user to do a specific action and compare against a specific expected outcome. Understanding barriers ("it didn't do what I expected") were the barrier type learners most often could not overcome (34 of 38) [6]; an expected result closes that gulf of evaluation [6]. Keep the try-step to about a minute: each check spends their attention, and Blackwell's model says people invest attention only when cost, risk and payoff look favourable [7][5].
10. **Treat the user's reaction as the next requirement, not as a verdict.** Intent expands through evaluating output; in every studied session goals grew beyond the original plan after seeing results, sometimes prompted by a new need discovered in use (a "stop" button) [1]. End users often cannot state requirements until implementation and use [5]. Classify their reply (template below) and let real use, not speculation, choose what comes next.
11. **Show visible payoff quickly and make risk feel low.** In attention-investment terms, programming has higher cost and risk than direct manipulation, so people abandon when risk outweighs reward [7]. Empirically, unhelpful LLM responses raised the odds of abandoning the tool about 11-fold in a task study (students and developers, not office workers) [21]. So: early iterations must visibly work, "go back" must always be on offer, and a failure streak must trigger the reset rule (rec 16), not a fourth patch.

### B. Scope and the smallest next change

12. **Keep a plain-language ideas shelf in the project notes.** Every new idea from the user or from the AI goes on the shelf (`.workbench/NOTES.md`, section "Ideas shelf"), gets one line of acknowledgement, and is not built. Anthropic's feature-list-with-pass/fail pattern is the agent-side equivalent [10]; ours is human-readable, and "Things that work" and "Ideas shelf" are two separate sections.
13. **Split with Lawrence's patterns, simplest-first.** Order: workflow steps (thin end-to-end case first, not step-by-step), operations (create before edit/delete), rule or data variations (one case first), simple UI first, "simple/complex" (ask "what's the simplest version of this?" and move every variation to its own item), defer performance/polish, spike only as a last resort and time-boxed [11]. Choose the split that lets the user throw away the low-value part [11].
14. **Ask "what would you do with it tomorrow morning?" to choose between candidate changes** [inference; grounded in the payoff term of attention investment [7]]. Prefer the change that lets the user use the app for their real job sooner. Willison values software someone has actually used daily for weeks over software that merely looks polished [4]; Fowler's YAGNI adds that speculative features cost build effort, delayed value and ongoing carrying complexity, and only about a third of even carefully analysed features improved their target metrics in the Microsoft data he cites [14].
15. **Consolidate on a schedule and on triggers, and keep tidy-ups separate from feature work.** Triggers: two failed fix attempts (rec 16), roughly every five delivered changes (my heuristic, [inference]), before anything larger than a slice, or when the AI starts contradicting earlier decisions. Action: a tidy-only save point that changes no behaviour (Beck: never mix structural and behavioural changes in one commit) [15], full checks, notes refresh, ideas-shelf prune. YAGNI only works if the code stays easy to change: refactoring and self-testing code are its enabling practices [14].

### C. Staying unstuck

16. **Two-strike reset.** After two failed attempts at the same problem, stop patching: restore the last good save point, restate the problem fresh from the user's expectation, and continue in a new session or cleared context. Claude Code docs: after more than two corrections "the context is cluttered with failed approaches… a clean session with a better prompt almost always outperforms" [9]. Osmani's "two steps back" pattern (fix breaks something else, fix that, two more problems) hits non-programmers hardest because they lack a mental model to intervene [16]. Beck watches for loops, unrequested work and tests being disabled or deleted, and when the AI stalled in complexity he had it rebuild in a simpler setting rather than push on [15]. LLMs "often make assumptions in early turns… when LLMs take a wrong turn in a conversation, they get lost and do not recover" (average 39% drop, multi-turn vs single-turn, simulated tasks) [22]. End-user programmers' "modify until it seems to work" debugging tends to add errors [5].
17. **Intake bug reports as three plain questions, then reproduce them yourself.** Ask: what did you expect, what happened, what were you doing just before (screenshot welcome). Developers most want steps to reproduce, which users find hardest to supply [28]; the AI should therefore do the reproducing, write a failing check, confirm "I see it too: when you do X, Y happens. Is that the problem?", fix, and re-run all checks [9][28].
18. **Translate errors into the user's language and keep the raw text in the log.** Compile/runtime messages that do not relate to the user's own mental model were among the most insurmountable barriers [6]. Use the four-line shape: what happened (their words) / why (one plain sentence) / what I'm doing / whether they need to do anything. Show raw errors only if asked. Tell the user explicitly that the problem is the tool's, not theirs: end users' self-talk during debugging includes "Am I smart enough?" and low self-efficacy reduces persistence [5]. If the cause is outside the tool, it is not a bug to explain at all: see rec 21.
19. **Keep a project memory so any new session can resume.** Anthropic's harness: each session starts with no memory; a progress file plus git history, a feature list, and a start script with a basic end-to-end check let a fresh session get its bearings and detect a broken state before adding more [10]. Claude Code loads CLAUDE.md every session; keep it short, include commands the AI cannot guess, and prune it [9]. Ours: `.workbench/NOTES.md` (sections in the skeleton below) plus `CONTEXT.md` (the words), injected by the startup hook together with the last five save points, with `AGENTS.md` as the backstop ([07](07-codex-host.md) recs 1–2). Refresh NOTES.md at the end of every iteration.
20. **Recognize when the project is growing and say so plainly, then help.** Triggers below. Willison: vibe-coded software for a personal tool that only hurts you is fine; for other people's information it is "grossly irresponsible" without care, and he recommends a check by someone more experienced before sharing [2][4]. Ko et al.: the moment intent shifts from personal to other users, testing and design demands rise, and programs written to be "throw away" often become long-lived [5]. The response is not to stop: name the new responsibilities and help with each ([08](08-security-compliance.md) rec 8 and the sharing ladder).

21. **Problems outside the tool become a forwardable question, not a debugging session.** Test: would this still happen with a different tool the AI built here? A blocked download, a refused login, a network drive that isn't there, a company policy, an update to Excel or Windows: these are not the tool's bugs, and the user cannot fix them by trying harder [INFERENCE]. The AI says so in one plain line, checks what it can on its own, then writes one self-contained message for IT or a tech-savvy colleague (what was tried, what was seen, what is needed, and what happens meanwhile) [08](08-security-compliance.md) recs 6–7, and logs it in NOTES.md under "Waiting on" with the date. Work continues on whatever does not depend on the answer. The user never receives a technical question; they only forward a message.
## The iteration template

**Step 0 Orient (every session start, silently).** The startup hook has already put the brief, CONTEXT.md, NOTES.md and the last five save points in front of the AI ([07](07-codex-host.md)); if it did not run, read them. Run the smoke check. If it fails, repair or restore before anything else [10]. Look at "Waiting on": has anything been answered? Tell the user only: "Picking up where we left off: [one line]."

**Step 1 Echo.** "So the next change is: after this, you'll be able to **[observable thing, in their words]**. Anything I got wrong?" One change only. Anything else goes on the ideas shelf.

**Step 2 Size.** Can the user see the result after one build and one try-step? If not, split (rec 13) and offer the first piece.

**Step 3 Save point.** Save "before: [their words]". Copy their data to the backup folder if the change touches data (rec 7).

**Step 4 Build and verify.** Smallest change; no extras. Add the check for this change; run all checks; exercise it as the user would (open the app, do the action, restart, look at the data). Save "[their words]" only if green. If not green after two attempts, reset (rec 16).

**Step 5 Update notes.** Move the item to Things that work; add new ideas to the ideas shelf; note any decision; update Next.

**Step 6 Hand back.** Exact shape (aim for under about 120 words, no file names, no jargon, no more than one try-step):

```
Done: you can now [what the user can do, one sentence, in their words].

Try it now (about a minute):
1. [open/start step, or "keep the app open"]
2. [one specific action, using an example from their own work, e.g. "add a 12 Oct entry for 'Printer paper, 18.50'"]

You should see: [specific expected result].
If you see something different, just tell me what you saw. Or say "go back" and I'll restore the earlier version.

What I checked: [one true plain sentence, e.g. "I added an entry, closed and reopened the app, and it was still there."]
[Only if any:] Not done yet: [one line]. It's on your ideas shelf.

What did you think? Next I could [option A] or [option B], or something else you noticed.
```
Rules: never write "should work" without a "what I checked"; never write "fixed" unless it was reproduced first and verified after; at most two suggested next steps, both taken from the ideas shelf or from the user's own reaction.

**Step 7 Read the reaction.**

| Their reply | Do |
|---|---|
| Works, happy | Mark done. Ask what they'd do with it next; suggest using it for real for a day or two if the core job now works [4]. |
| Works, but "not quite what I meant" | A new small change, not a bug. Echo it, new iteration. |
| Not what they expected | Bug intake (rec 17). Reproduce first. |
| New idea | Ideas shelf (script below). |
| Vague/silent ("fine", "ok") | Ask for one observation: "What did you see after step 2?" People wrongly judge incorrect output as correct far more often than the reverse [5]. |
| Confused or worried | Offer the undo, explain in one sentence, lower the stakes. |

## Scope-creep nudging script

Tone: it is the user's tool. The AI protects momentum and the user's attention; it does not forbid ideas. If they insist on something big, build it as its own iteration with its own save point.

- **Park:** "Good idea. I've put '[X]' on your ideas shelf so we don't lose it. Right now we're doing '[Y]'. OK?"
- **Tomorrow morning:** "If you had this tomorrow morning, what's the first thing you'd do with it?" Follow with "Which of these would make that easier?"
- **Simplest version:** "What's the simplest version of this you'd still actually use?" [11]
- **Split:** "That's really three things: A, B, C. Which one helps most on Monday? We can do the others after." [11]
- **Time-box:** "Let's give this one round. If it isn't right, I'll put back yesterday's version and we'll rethink." [11][9]
- **Use first:** "Use it for your real task for a couple of days. Jot down whatever annoys you, and we'll pick from that." [4][5]
- **Not yet (YAGNI):** "We might want [Z] later. If we build it now, everything else gets harder to change, so let's wait until you actually need it." [14]
- **AI's own ideas:** Never build unrequested extras [15]. Offer at most one per hand-back, phrased as a question, and file it on the ideas shelf if they say no or "maybe".
- **Shelf review:** Every few iterations, read the shelf aloud, ask "still want this?", delete stale items, and put the top one or two up as next candidates. Choose splits that let low-value items be dropped [11].

## The unstuck playbook

| Situation | Response |
|---|---|
| "It's broken / nothing happens" | Ask the three questions, reproduce, write a failing check, fix, verify, tell the user what you saw (rec 17). |
| Second failed fix | Stop. Restore the last good save point. Restate the problem from the user's expectation. New session or cleared context (rec 16). Offer a simpler alternative or a workaround. |
| The user can't say what they want | Offer two or three concrete small options (a quick sketch or a fake-data screen), not open questions; they react to something visible. Prototypes surface intent because intent forms by evaluating output [1]. |
| The user sees an error box | Four-line translation (rec 18). Fix silently if possible. |
| New session, AI seems lost | Read the notes and the save points, run the smoke check, restate the state to the user in three lines and confirm [10]. |
| The AI produced something the user didn't ask for | Revert to before; re-echo the requested change only [15]. |
| Data looks wrong or missing | Stop building. Restore from the dated backup first, diagnose second. Do not trust the agent's own claim about what is recoverable [17]. |
| The user loses confidence ("I'm bad at this") | Name the cause as the tool's; point to what already works; propose a smaller next step [5]. |
| Steady slow-down: each change takes longer or breaks old things | Consolidate (rec 15). If it persists after a tidy-up, check outgrown triggers. |
| It works but the user never opens it | Ask what they do instead. The change to make may be tiny or not about software at all [7]. |
| The problem is outside the tool (blocked download, refused login, missing drive, an update to another program) | Say so in one line, write a forwardable question, log it under "Waiting on", carry on with what doesn't depend on it (rec 21). |

### Growing triggers (say plainly, list the new responsibilities, offer a handoff packet; see [08](08-security-compliance.md) rec 8)

Someone else will rely on it, or it holds information about other people (Willison; Ko: intent continuum) [2][5]. It needs logins, payments, internet-facing access or shared storage: data-exposure failures are the norm there, e.g. missing row-level security exposed data in Lovable-generated apps (CVE-2025-48757) [18], and generated backends "frequently ignored" isolation and access rules unless specified [25]. Mistakes would be expensive: 91% of strongly audited operational spreadsheets had important errors [29]. The user would be in real trouble if it vanished or corrupted. Repeated resets keep failing [16]. Handoff packet = CONTEXT.md and NOTES.md (How to run / check, Data, Careful, Waiting on), plus what was checked and what was never checked. Ask a colleague or IT for a "vibe check" before sharing [2].

## Save points without admin (rec 6)

**What the design has to satisfy.** No installed git, no admin, nothing outside the project folder. The user never sees it. It works in Codex's default sandbox. It works on Windows 10/11 and macOS. The startup hook ([07](07-codex-host.md)) can list the last save points. "Go back" can itself be undone, and never touches the user's data.

**What the tests showed** (all [LOCAL]: Windows 11 26200, no admin, scratch folder deleted afterwards; macOS untested, no Mac):

1. **The sandbox blocks `.git`.** Codex's default `workspace-write` sandbox keeps `<project>/.git` read-only, recursively, and also `.agents` and `.codex` [40]. Run through `codex exec -s workspace-write` with `windows.sandbox=unelevated`: writing a file worked, `git status` (MinGit by full path) worked, `git add -A` failed with `fatal: Unable to create '.../.git/index.lock': Permission denied`. With interactive approvals that becomes a click for every save, which is not "invisible". **With the history in `.workbench/history.git` (`--git-dir`), `add`, `commit` and `log` all ran in the same sandbox with no prompt.** Only `.git`, `.agents` and `.codex` are protected [40]; `.workbench` is not.
2. **MinGit works unzipped, with nothing installed.** It is "an intentionally minimal, non-interactive distribution" of Git for Windows, meant for other programs to call [32]; the alternative PortableGit is a self-extracting `.7z.exe` [34], which I did not use because a plain zip unpacks with the `tar` already needed. Downloaded `MinGit-2.56.0-64-bit.zip` (39.6 MB, 1.8 s); its SHA-256 matched the digest in the release notes and in GitHub's asset metadata [33]. `tar -xf` into a folder took 0.7 s: 373 files, 95.8 MB. `cmd\git.exe` ran `init`, `add`, `commit`, `log`, `restore --source` with no PATH entry, no install and no git config. The executables are **not Authenticode-signed** (`git.exe`, `sh.exe`: status NotSigned); Node's `node.exe` is signed ([03a](03a-default-stack-runtime.md) rec 5). The only integrity check is the SHA-256 from the release page; I found no SHASUMS file and no signature to verify on the zip [33]. Since 2.56, Windows 8.1 is unsupported and `/mingw64/bin/git.exe` moved to `/ucrt64/`; `/cmd/git.exe` is the path promised to stay stable [33]. Git for Windows' default `core.autocrlf=true` warned about line endings on the first commit, so use `-c core.autocrlf=false`.
3. **isomorphic-git 1.42.4 works from a single bundled file.** Pure JS, MIT, Node ≥14.17, 11 direct dependencies, 55 packages and 7.3 MB installed [39]. Bundled with `bun build` it is one 0.5 MB `.mjs` file, which ran under Node 22 in a folder with no `node_modules`. Its repository format is standard: MinGit's `fsck --strict` passed and `git log` read it; a commit made by MinGit was read back by isomorphic-git. Three traps found (the docs describe none of them [37]): (a) **`statusMatrix` misses a same-size edit made in the same second as the last save** (git's "racy" problem; open upstream since 2018 [38]). I reproduced it: the change was left out of the commit, and a later "go back" then restored nothing. Fix (mine, tested 5/5): also re-hash any file modified since 2 s before the index was last written, which is git's own racy rule. (b) It did not honour `<gitdir>/info/exclude`, so the ignore rules go in the project's `.gitignore`. (c) `checkout` with `force` and `noUpdateHead` restores tracked files and deletes files added since, and leaves the branch alone.
4. **Speed.** isomorphic-git through the script: first save of 300 files 3.2 s; nothing changed 0.2 s; one edited file 0.25 s; 1000 new files 11 s. MinGit `add -A` + `commit`: 1000 changed files 19.5 s; nothing changed 65 ms. Writing many loose files dominates both, so a typical save (a few files) is fast either way [INFERENCE: the slowness on this machine may partly be antivirus scanning].
5. **Folder snapshots.** `tar -czf` (bsdtar ships with Windows 10+ and macOS) of 1000 small files: 0.1 s, 19 KB. Unpacking over the folder restored an edited file.
6. **A startup hook that reads only a text file** worked from Windows PowerShell (`Get-Content -Tail 5`) and from POSIX `sh` (`tail -n 5`, run under MinGit's `sh`, with a stand-in `xcode-select` for the macOS branch). Real macOS was not run.

**The options**

| | (a) MinGit in `.tools/git` | (b) isomorphic-git, run by the project's Node | (c) timestamped snapshots |
|---|---|---|---|
| Windows / macOS | Windows only. No macOS equivalent: git-scm lists Homebrew, MacPorts and Xcode tools, all third-party or admin [36] | Both (pure JS) [INFERENCE for macOS] | Both |
| Extra download | 39.6 MB zip, 96 MB unpacked, per project | None if bundled (0.5 MB file in the skill) | None |
| Executable to trust | Unsigned `git.exe` in a user folder; company application control may block it [UNVERIFIED, not tested] | Signed `node.exe` that the project already needs | `tar` from the OS |
| Fits the Codex sandbox | Only with `--git-dir=.workbench/history.git` | Same (`gitdir` option) | Yes |
| What the AI must know | Real git commands (models know them) | One script with three verbs | One `tar` line |
| Weak points | 8.1 unsupported; SHA-256 only | Racy bug (handled); no `gc`; slow with thousands of files | Doubles disk use; no per-file history; restore is whole-folder |

**Recommendation.**

- **Default, both systems: (b), wrapped in one skill-owned script.** One code path, no extra executable, no macOS stub, and the only path I could test end to end. The script is shipped inside the skill (`.agents/skills/workbench/save-points.mjs`, built from the source below at release time; the AI runs it with the project's Node, from the project folder). The AI never touches the library's API, only `save "…"`, `list`, `restore <id>`.
- **Fallback 1: (a) MinGit, Windows only,** if a project outgrows isomorphic-git (thousands of tracked files) or a task needs a real git feature. Same history folder, so switching loses nothing. Fetch the zip by exact release tag, check the SHA-256 from the release notes, unpack with `tar -xf` into `.tools/git`, call `.tools\git\cmd\git.exe --git-dir=.workbench/history.git --work-tree=. -c core.autocrlf=false …`. Whoever commits this way also appends the line to the journal (below).
- **Fallback 2: (c) snapshots** if Node is not usable or the script fails: `tar -czf .workbench/snapshots/<yyyy-mm-dd_hhmm>_<few-words>.tgz --exclude=.tools --exclude=node_modules --exclude=.workbench/snapshots --exclude=data --exclude=backups .` (keep `.workbench/NOTES.md` in). Restore = make a snapshot first, then `tar -xzf` over the folder; files created since remain, so say so. Append the same journal line.
- **macOS rule:** never run `git`, `/usr/bin/git`, `xcrun` or `xcode-select --install`. `/usr/bin/git` is a shim that runs the git of the active developer directory, and `--install` opens the installer dialog [35]. Without the tools installed, that shim is what opens the admin installer ([03a](03a-default-stack-runtime.md) rec 24 [51-CLT]). The default needs no git at all. If a real git is ever wanted: `xcode-select -p` only prints the path (or fails) [35], then check `[ -x "$dev/usr/bin/git" ]` and call that file directly, or use Homebrew's `/opt/homebrew/bin/git` or `/usr/local/bin/git` if they exist [UNVERIFIED on a Mac; whether `xcrun` also triggers the dialog is [INFERENCE]].
- **What is saved.** Everything except `.tools/`, `node_modules/`, `dist/`, `out/`, `data/`, `backups/` and the history and journal themselves. Data stays out on purpose (rec 7), and secrets never belong in the project anyway ([08](08-security-compliance.md)). If the user's data lives elsewhere in the folder, the setup names that folder in the ignore list and in NOTES.md "Data". **Shipped differently:** an ignore list (or an ignore-based allowlist in `.gitignore`) is not what keeps files out. A `.gitignore` nested anywhere in the project can override it, so `save.ps1` / `save.sh` build each save point from an explicit list of permitted paths (the tool's named config files and code files in `app/src/` and `app/test/`, and the workbench's own files): they empty the index with `read-tree --empty`, then `add -f --pathspec-from-file` with exactly that list. Documents, samples, data, backups, secrets, tools and builds are never in a save point whatever any `.gitignore` says. `save.ps1 -List` shows what would go in.
- **"Go back" =** save the current state ("Before going back to: …"), restore the chosen save point, save again ("Went back to: …"). After a go-back, `node_modules` may no longer match the restored `package.json`: run `npm ci` before the smoke check [INFERENCE]. (Shipped version: rec 7 above; it runs `npm ci`, tests and packaging, and checks the older build against a copy of the data before replacing the tool.)

**The script** (tested with Node 22 on Windows, as a bundled single file; the saved-file counts and speeds above come from it):

```js
// save-points.mjs: undo history without a git install.
// Usage (run from the project folder): node save-points.mjs save "message" | list [n] | restore <id>
import fs from 'node:fs';
import path from 'node:path';
import git from 'isomorphic-git';

const dir = process.cwd();
const gitdir = path.join(dir, '.workbench', 'history.git'); // NOT ".git": Codex's sandbox makes .git read-only
const journal = path.join(dir, '.workbench', 'save-points.txt');
const author = { name: 'Workbench', email: 'workbench@localhost' };
const g = { fs, dir, gitdir };
const stamp = (d) => { const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; };

const ignored = ['.tools/', 'node_modules/', 'dist/', 'out/', 'data/', 'backups/', '.workbench/history.git/', '.workbench/save-points.txt', '.workbench/snapshots/'];

async function init() {
  // isomorphic-git's statusMatrix does not honour <gitdir>/info/exclude here (tested), so the rules live in the project's .gitignore.
  const file = path.join(dir, '.gitignore');
  const have = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const missing = ignored.filter((l) => !have.split(/\r?\n/).includes(l));
  if (missing.length) fs.appendFileSync(file, (have && !have.endsWith('\n') ? '\n' : '') + missing.join('\n') + '\n');
  if (!fs.existsSync(path.join(gitdir, 'HEAD'))) await git.init({ ...g, defaultBranch: 'main' });
}

async function save(message) {
  await init();
  // statusMatrix trusts size+mtime, so it misses a same-size edit made in the same second as the last save (isomorphic-git #608).
  // Git's own "racy" rule: also re-hash any file modified since shortly before the index was last written.
  const indexFile = path.join(gitdir, 'index');
  const since = (fs.existsSync(indexFile) ? fs.statSync(indexFile).mtimeMs : 0) - 2000;
  for (const [file, head, work, stage] of await git.statusMatrix(g)) {
    const full = path.join(dir, file);
    if (!fs.existsSync(full)) await git.remove({ ...g, filepath: file });
    else if (!(head === 1 && work === 1 && stage === 1) || fs.statSync(full).mtimeMs >= since) await git.add({ ...g, filepath: file });
  }
  const rows = await git.statusMatrix(g);
  if (!rows.some((r) => r[1] !== r[3])) return console.log('nothing changed since the last save point');
  const oid = await git.commit({ ...g, message, author });
  fs.appendFileSync(journal, `${stamp(new Date())}  ${message}\n`);
  console.log(`saved ${oid.slice(0, 7)}: ${message}`);
}

async function list(n = 5) {
  if (!fs.existsSync(path.join(gitdir, 'HEAD'))) return console.log('(no save points yet)');
  for (const e of await git.log({ ...g, depth: n })) console.log(`${e.oid.slice(0, 7)}  ${stamp(new Date(e.commit.author.timestamp * 1000))}  ${e.commit.message.trim()}`);
}

async function restore(id) {
  const oid = await git.expandOid({ ...g, oid: id });
  const { commit } = await git.readCommit({ ...g, oid });
  await save(`Before going back to: ${commit.message.trim()}`); // so "go back" can itself be undone
  await git.checkout({ ...g, ref: oid, force: true, noUpdateHead: true }); // rewrites tracked files, deletes files added since
  await save(`Went back to: ${commit.message.trim()}`);
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === 'save') await save(arg || 'save point');
else if (cmd === 'list') await list(Number(arg) || 5);
else if (cmd === 'restore') await restore(arg);
else console.log('usage: save "message" | list [n] | restore <id>');
```

**What the startup hook should do.** Read the journal, never git. Every backend appends one line to `.workbench/save-points.txt` (`yyyy-mm-dd hh:mm  message`; the file is ignored by the history, so a go-back never rewinds it). The hook prints the last five lines under "Last save points". That replaces the `git log` and `git status` lines in [07](07-codex-host.md)'s scripts, which have three problems: on Windows `git` is not on the PATH when MinGit sits in `.tools\git`; with the history in `.workbench/history.git` a plain `git log` finds nothing; and on macOS any `git` call risks the stub. The "unsaved changes" count is dropped: `statusMatrix` cannot see racy edits, and the AI simply saves ("nothing changed" is a valid answer).

| State | What the hook prints |
|---|---|
| Journal exists (default, MinGit or snapshots) | its last 5 lines |
| History folder or snapshots exist but no journal (deleted by hand) | "(save points exist; ask the AI to list them)". The AI runs `save-points.mjs list`, or lists the snapshot files |
| Nothing yet | "(no save points yet)" |

Windows PowerShell: `if (Test-Path $j) { (Get-Content $j -Tail 5) -join "`n" } else { '(no save points yet)' }`. macOS `sh`: `if [ -f "$j" ]; then tail -n 5 "$j"; else echo "(no save points yet)"; fi`. Two `07` details follow from the sandbox finding: if setup keeps its `git init` so that Codex will trust the folder (07 rec 7), that `.git` is only a marker and nothing is ever committed into it [INFERENCE: whether trust needs a real repository is untested]; and in my runs with `--ignore-user-config`, commands under `workspace-write` were rejected outright until `windows.sandbox=unelevated` was set, while this machine's own config says `elevated` [LOCAL]; which mode a no-admin user gets is for 07 to settle.

**Shipped hook.** The shipped Windows startup hook does not read a journal: it runs `git log -5` and `git status --porcelain` against `.workbench\history` (git from `.tools\git\cmd` if present, else `git`) and prints "(no save points yet)" when that gives nothing.

## Project notes skeleton (plain language, short)

Two files, two jobs. `CONTEXT.md` holds the words ([09](09-context-file.md)); `.workbench/NOTES.md` holds everything else, in the sections below. The startup hook injects both ([07](07-codex-host.md)). The AI updates NOTES.md at the end of every iteration (Step 5) and whenever something changes; the user can read it any time and never has to edit it.

```
# [App name] - notes
What it is: [one sentence in the user's words]
Words we use: see CONTEXT.md (not repeated here)

What we're after (see 09 recs 18-21; the user's words, dated)
  Goal: [what's different once this works]
  Must have: [need] ...
  Rules we must follow: [requirement] (who says so)
  Preferences: [guideline]
  How we're doing it: [solution] -> for: [need]
  (Nice to have goes on the ideas shelf)

How to run / check: [how to start it; the smoke check command]
Things that work: [list, each is also a check]
Ideas shelf: [later; one line each, dated, the user's words]
Waiting on: [forwardable questions: date sent, to whom (IT / a colleague),
  the one-line question, what we do meanwhile, answer when it comes]
Decisions: [dated one-liners incl. what we deliberately did NOT do]
Data: [where it is, where backups go, "never touch the real copy without a
  backup", which folder the save points leave out]
Careful: [known fragile spots]
For the AI: [word -> where it lives: screen / file / code, e.g. "Invoice" -> the
  list on the main screen -> src/invoices.ts, table invoices]
Interview status: [not started | in progress: settled / still open | done, date]
Next: [the single next step]
```

| Section | Changes when | Who leans on it |
|---|---|---|
| What we're after | the interview learns something; a rule is contradicted by the data (09) | every "should we build this?" decision |
| How to run / check, Things that work | each delivered change (a new check per item, rec 8) | Step 0 orient, handoff packet |
| Ideas shelf | the user or the AI has an idea; shelf review | scope-creep script |
| Waiting on | a problem outside the tool appears (rec 21); an answer arrives | Step 0 orient: has anything been answered? |
| Decisions, Careful | a choice is made or a fragile spot found | the AI after a reset (rec 16) |
| Data | data location or backup rule changes | rec 7, save-point ignore list |
| For the AI | a word gets a screen, file or table; code is renamed | new sessions finding the right file from the user's own words |
| Interview status, Next | end of each session | the welcome: "where we left off, next step" ([07](07-codex-host.md)) |


## Key evidence

**End-user programming research.** Ko et al. define end-user programming by intent (personal use) and characterise end-user engineering as implicit requirements, overconfident testing and opportunistic debugging; requirements may only become clear during implementation; regression testing has barely been applied to end-user tools [5]. Ko, Myers & Aung observed 40 non-programmers learning Visual Basic.NET and classified 130 barriers into six types; understanding barriers were mostly insurmountable and invalid assumptions made to pass one barrier often caused the next [6]. Blackwell's attention-investment model frames every step as cost, risk and payoff, and Ko et al. use it to explain why users skip testing or refuse features that look risky [7][5]. Burnett's Surprise-Explain-Reward (surprise the user, explain, reward) made spreadsheet users adopt assertions and testing features, with a warning that users may game visible progress indicators [5]; the analogue here is a hand-back whose expected-result line is the "explanation" and whose payoff is real data appearing.

**Incremental delivery.** Cockburn's walking skeleton [12]; Patton's earn-vs-learn distinction for "MVP" via a secondary summary [13]; Lawrence's splitting patterns and meta-pattern (find the core complexity, reduce variations to one) [11]; Fowler on Yagni's three costs (build, delay, carry) [14]. Adzic notes that with modern delivery you can even ship a UI slice on a simple back-end and swap the "crutches" later [12], which for local apps means the first slice can use a plain file for data and be migrated deliberately later.

**AI-assisted building by non-experts.** Sarkar & Drosos analysed 8.5 hours of think-aloud video of five vibe-coding sessions; all were experienced programmers and their protocol dropped the planned non-programmer comparison because no session contained one [1]. They found: iterative goal-satisfaction cycles, "context momentum", expertise redistributed toward context management, rapid code evaluation and deciding when to go manual, and one creator who could not find how to revert [1]. Pimenova et al. (interviews, Reddit, LinkedIn; 190k words) report pain points in specification, reliability, debugging and review burden, and that trust governs delegation vs co-creation [20]. Tie et al. (26 participants, ChatGPT) found nine failure types including context loss, and 17 abandoned the tool [21]. Laban et al.: 39% average multi-turn degradation [22]. Liu et al.: grounded echo-back helps end users [23]. Willison's definition (no code review) and his list of when vibe coding is acceptable (low stakes, no secrets, private data care, no usage-billed APIs without limits) [2]; Beck's "augmented coding" distinction [15]; Osmani's "70% problem" and "two steps back" pattern as practitioner observation of non-engineers [16].

**Failures of AI app builders.** Replit incident: reported via the user's posts and Fortune; the company CEO called it unacceptable and shipped separation and a planning-only mode [17]. Lovable: the discoverer's write-up lists disclosure dates, root cause (client-side database access relying only on RLS, with missing or permissive policies) and mitigations [18]; a vendor database entry adds figures (170 of 1,645 scanned apps, CVSS 9.3) I did not open the underlying scan for [19]. Iterative "improvement" prompting of LLMs raised critical vulnerabilities 37.6% after five iterations in one controlled experiment (400 samples) [26]; a vendor report found 45% of AI code samples failed security tests, unchanged across model generations [27]. These are the reason the AI, not the user, owns security and verification.

**Session continuity.** Claude Code's context degrades as it fills; `/clear`, checkpoints, `--continue`, short CLAUDE.md [9] (Anthropic's tool and guidance; the Codex host that loads the same kind of files is in [07](07-codex-host.md), and carrying the advice over to GPT-family models is [inference]); Anthropic's initializer/coding agent harness, with its "clean state" definition ("appropriate for merging to a main branch") [10].

**Save points without admin.** Codex's default sandbox keeps `.git`, `.agents` and `.codex` read-only in the workspace [40]. In a test run, `git add` into `.git` failed with a permission error, while the same commands against a history folder named `.workbench/history.git` ran without a prompt. MinGit is a 39.6 MB zip whose SHA-256 matches the release notes [33] and whose executables are unsigned [LOCAL]; git-scm lists no maintained macOS binary that avoids Homebrew, MacPorts or the Xcode tools [36]; Apple's `/usr/bin/git` is a shim into the active developer directory [35]. isomorphic-git is pure JS and reads and writes standard repositories, but its `statusMatrix` has an open racy-stat bug [38], reproduced and worked around here. Numbers and traps: see the section above.

## Open questions and disagreements

- **No verified study of real non-programmers running an agentic build loop.** Sarkar & Drosos had none [1]; Osmani's claim that non-engineers hit a 70% wall is practitioner opinion [16]; Tie et al. used students and developers [21]. Everything about this persona specifically is extrapolation.
- **One change per turn** is supported by agent-harness experience [10] and expert habits [1] but not by a controlled comparison. Sarkar & Drosos found mixed granularity across sessions and some manual editing of small changes [1].
- **"Every five changes" for consolidation** is my heuristic; no source gives a cadence [inference].
- **Echo-back** was tested for spreadsheet queries, not whole apps [23]. Expected-result hand-backs are inferred from the overconfidence and understanding-barrier findings [5][6].
- **Security statistics** conflict in detail: CVE-2025-48757 CVSS is 8.26 base in the discoverer's write-up [18] but 9.3 in a vendor database summary [19]. The security-degradation study is preprint-level and hypothesises causes [26]; Veracode is a vendor report whose methods I did not review [27].
- **Karpathy's date.** Willison writes February 6 [2]; Sarkar & Drosos write February 2, 2025 [1]. The tweet's ID decodes to 2025-02-02 UTC (my calculation from the URL in [2]).
- **Replit incident details** (records lost, agent statements) come from Lemkin's own posts as reported by Fortune ("reportedly") [17]; the agent's statements are not reliable evidence of its internals.
- **Willison's convergence remark (May 2026).** He says vibe coding and agentic engineering are starting to blur in his own work as agents get more reliable [4]; the "unreviewed code" line is moving, so a skill should be written around observable checks, not around a model-quality assumption.
- **Application control.** MinGit's executables are unsigned [LOCAL]. I did not test whether AppLocker, WDAC or Smart App Control on a managed laptop would block them when run from a user folder [UNVERIFIED]. That is one reason MinGit is a fallback, not the default; node.exe is signed.
- **macOS is entirely untested.** The default (isomorphic-git through Node) is pure JS, so I expect identical behaviour [INFERENCE]; the `xcode-select` facts come from its man page [35], and whether `xcrun` also opens the installer dialog is unverified. The hook logic was run only with a stand-in `xcode-select`, and macOS `tar` was not run.
- **Does Codex trust need a real `.git`?** [07](07-codex-host.md) rec 7 infers that setup's `git init` makes the folder trustable. If so, that `.git` must stay an empty marker, because the sandbox makes it read-only [40]. Untested [INFERENCE].
- **Windows sandbox mode.** With `--ignore-user-config` and no `windows.sandbox` setting, commands under `workspace-write` were rejected; `unelevated` worked; this machine's config says `elevated` [LOCAL]. What a no-admin user gets by default is not something I tested.
- **isomorphic-git workaround.** The racy-stat fix (re-hash files modified within 2 s of the index write) is mine and passed 5 of 5 same-second, same-size edits [LOCAL]; upstream's issue is still open [38]. I did not test very large trees (only up to 1000 files), network or synced project folders (see [03b](03b-data-storage.md) on OneDrive and locking), or Windows long paths.
- **Bundle build and licences.** `save-points.mjs` is built with Bun from the library at release time, so no user installs anything. The 55 packages in the tree declare MIT, ISC, BSD-3-Clause, Apache-2.0 or Zlib-style licences in their `package.json` [LOCAL]; licence notices still need to ship with the bundle [UNVERIFIED].
- **Undo after a go-back** leaves ignored folders (`node_modules`, `dist`) as they were, so a restored `package.json` may not match them; `npm ci` afterwards is my inference, not tested.
- **Guidance sources.** Much of the loop evidence comes from Anthropic's Claude Code documents [9][10]; that Codex and GPT-family models behave the same way is [inference].

## Conflicts with the guiding principles

No direct contradiction. Pressure points:

1. **Invisible versioning vs the no-admin HARD REQUIREMENT vs the Codex sandbox.** Per-iteration undo is the strongest evidence-backed safeguard [6][10][31]. Git itself is not available without admin on macOS, and MinGit is unsigned on Windows; and even a real git cannot commit into `.git` inside Codex's default sandbox [40]. This note resolves it with a bundled isomorphic-git script keeping the history in `.workbench/history.git`, with MinGit and `tar` snapshots as fallbacks (section above). The shipped skill resolves it the other way round: git/MinGit with the history in `.workbench/history` and the explicit-list save scripts, snapshots only on a Mac without a safe git (README, disagreement A). The remaining tension is small: a developer who opens the folder finds no `.git` history, so the handoff packet has to say where it lives.
2. **"User never chooses technology" vs "AI tools help experts more" [16].** Because the user does not read code, the whole safety burden (verification, security, data backups, honest limits) sits on the AI; the skill should not imply they can catch problems by looking at output alone [5].
3. **"Smallest first" vs context momentum [1].** The first slice steers everything later, so it deserves the most careful echo-back and confirmation, not the least.
4. **"Words first" vs emergent requirements [5][1].** The vocabulary must be revisable: keep the glossary in CONTEXT.md and update it when the user coins new words, rather than treating it as frozen.
5. **Local-first is reinforced, not contradicted:** both headline incidents involved cloud databases with agent or default-permission access [17][18]; Willison likewise prefers sandboxes that block network access for beginners [2].

## Sources

[1] Advait Sarkar & Ian Drosos, *Vibe coding: programming through conversation with artificial intelligence* (PPIG 2025, arXiv 2506.23253), 2025, https://arxiv.org/html/2506.23253v1. First empirical study of vibe-coding sessions; workflow cycle, context momentum, trust, no non-programmers in sample.
[2] Simon Willison, *Not all AI-assisted programming is vibe coding (but vibe coding rocks)*, 2025-03-19, https://simonwillison.net/2025/Mar/19/vibe-coding/. Quotes Karpathy's tweet in full; definition; low-stakes/security/privacy guidance.
[3] Simon Willison, *Vibe engineering*, 2025-10-07, https://simonwillison.net/2025/Oct/7/vibe-engineering/. Tests, version control, docs as prerequisites for agents; agents claim success untested.
[4] Simon Willison, *Vibe coding and agentic engineering are getting closer than I'd like* (newsletter), 2026-05-08, https://simonw.substack.com/p/vibe-coding-and-agentic-engineering. Non-programmer framing, "personal tool vs other people's information", value of software actually used.
[5] Ko, Abraham, Beckwith, Blackwell, Burnett, Erwig, Scaffidi, Lawrance, Lieberman, Myers, Rosson, Rothermel, Shaw, Wiedenbeck, *The State of the Art in End-User Software Engineering*, ACM Computing Surveys 43(3), 2011, https://faculty.washington.edu/ajko/papers/Ko2011EndUserSoftwareEngineering.pdf. Overconfidence, opportunistic debugging, Surprise-Explain-Reward, attention investment, self-efficacy.
[6] Andrew Ko, Brad Myers, Htet Htet Aung, *Six Learning Barriers in End-User Programming Systems*, IEEE VL/HCC 2004, https://faculty.washington.edu/ajko/papers/Ko2004LearningBarriers.pdf. 40 non-programmers, 130 barriers; understanding barriers and cascading invalid assumptions.
[7] Alan Blackwell, *First Steps in Programming: A Rationale for Attention Investment Models*, IEEE HCC 2002, https://www.cl.cam.ac.uk/~afb21/publications/HCC02a.pdf. Cost/risk/payoff model of whether people invest in programming.
[8] Bonnie Nardi, *A Small Matter of Programming*, MIT Press 1993, https://mitpress.mit.edu/9780262140539/a-small-matter-of-programming/. Origin of the end-user programming framing (spreadsheets); I relied on Ko et al.'s account [5] rather than the book itself.
[9] Anthropic, *Best practices for Claude Code*, https://code.claude.com/docs/en/best-practices (read 2026-09-29). Verification, two-correction rule, /clear, checkpoints not a git replacement, CLAUDE.md guidance.
[10] Justin Young (Anthropic), *Effective harnesses for long-running agents*, 2025-11-26, https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents. Progress file, feature list, one feature at a time, git commits, end-to-end testing, smoke test at session start.
[11] Richard Lawrence, Humanizing Work, *The Humanizing Work Guide to Splitting User Stories*, https://www.humanizingwork.com/the-humanizing-work-guide-to-splitting-user-stories/. Splitting patterns, simple/complex, spike last, complex-domain guidance.
[12] Gojko Adzic, *Forget the walking skeleton – put it on crutches*, 2014-06-09, https://gojko.net/2014/06/09/forget-the-walking-skeleton-put-it-on-crutches/. Quotes Cockburn's definition (Crystal Clear); crutches variant. Cockburn's own page returned 404, so quoted second-hand.
[13] Taj Moore, *Why "MVP" Is Confusing* (summary of Jeff Patton's 2018 Denver Startup Week talk), https://tajmo.medium.com/why-mvp-is-a-contronym-40af0fcb74c0. Secondary summary of Patton; Robinson vs Ries meanings.
[14] Martin Fowler, *Yagni*, 2015-05-26, https://martinfowler.com/bliki/Yagni.html. Costs of presumptive features; enabling practices.
[15] Kent Beck, *Augmented Coding: Beyond the Vibes*, 2025-06-25, https://newsletter.kentbeck.com/p/augmented-coding-beyond-the-vibes. Warning signs (loops, unasked features, deleting tests); restart in simpler setting; structural vs behavioural commits.
[16] Addy Osmani, *The 70% problem: Hard truths about AI-assisted coding*, 2024-12-04, https://addyo.substack.com/p/the-70-problem-hard-truths-about. "Two steps back" pattern; non-engineers hit a wall (practitioner opinion).
[17] Beatrice Nolan, Fortune, *An AI-powered coding tool wiped out a software company's database…*, 2025-07-23, https://fortune.com/2025/07/23/ai-coding-tool-replit-wiped-database-called-it-a-catastrophic-failure/. Replit incident, agent's false rollback claim, Replit's fixes.
[18] Matt Palmer, *CVE-2025-48757*, 2025-05-29, https://mattpalmer.io/posts/2025/05/CVE-2025-48757/. Discoverer's write-up of Lovable RLS exposure.
[19] SentinelOne Vulnerability Database, *CVE-2025-48757*, https://www.sentinelone.com/vulnerability-database/cve-2025-48757/ (returned by search with matching content; page not opened). Scale figures and CVSS 9.3.
[20] Pimenova, Fakhoury, Bird, Storey, Endres, *Good Vibrations? A Qualitative Study of Co-Creation, Communication, Flow, and Trust in Vibe Coding*, 2025, https://arxiv.org/abs/2509.12491. Pain points and trust.
[21] Tie et al., *"Should I Give Up Now?" Investigating LLM Pitfalls in Software Engineering*, TOSEM 2026 (arXiv 2411.09916v3), https://arxiv.org/html/2411.09916v3. 26 participants, failure types, abandonment odds.
[22] Laban, Hayashi, Zhou, Neville, *LLMs Get Lost In Multi-Turn Conversation*, 2025, https://arxiv.org/abs/2505.06120. 39% average multi-turn drop.
[23] Liu, Sarkar, Negreanu, Zorn, Williams, Toronto, Gordon, *"What It Wants Me To Say": Bridging the Abstraction Gap Between End-User Programmers and Code-Generating LLMs*, 2023, https://arxiv.org/abs/2304.06597. Grounded echo-back with n=24 end users.
[24] Barke, James, Polikarpova, *Grounded Copilot*, OOPSLA 2023, https://arxiv.org/html/2206.15000v3 (search-returned, not opened). Acceleration vs exploration modes; users struggled to understand, edit and debug generated code. Background only.
[25] Shuvo et al., *Context Before Code: An Experience Report on Vibe Coding in Practice*, 2026, https://arxiv.org/html/2603.11073v1. Generated code ignored isolation/access constraints unless specified.
[26] *Security Degradation in Iterative AI Code Generation*, 2025, https://arxiv.org/html/2506.11022v1 (search-returned, not opened). 37.6% increase in critical vulnerabilities after five iterations.
[27] Veracode, *Insights from 2025 GenAI Code Security Report*, https://www.veracode.com/blog/genai-code-security-report/ (search-returned, not opened). 45% of samples failed security tests.
[28] Bettenburg, Just, Schröter, Weiss, Premraj, Zimmermann, *What Makes a Good Bug Report?*, FSE 2008, https://research.vu.nl/en/publications/what-makes-a-good-bug-report-2/ (search-returned, not opened). Steps to reproduce most sought and hardest for users to give.
[29] Raymond Panko, *Spreadsheet Errors: What We Know. What We Think We Can Do*, 2008, https://arxiv.org/pdf/0802.3457 (search-returned, not opened). Audit error prevalence, incl. 91% of "core 5" audited spreadsheets.
[30] Lovable Docs, *Revert and restore your project with version history*, https://docs.lovable.dev/features/projects/history (search-returned, not opened). Automatic versions, preview, revert.
[31] Replit Docs, *Checkpoints and Rollbacks*, https://docs.replit.com/replitai/checkpoints-and-rollbacks (search-returned, not opened). Rollback excludes database by default.
[32] Git for Windows, *MinGit*, https://gitforwindows.org/mingit (opened 2026-09-29). What MinGit is: minimal, non-interactive, no Perl, limited aliases/hooks.
[33] Git for Windows v2.56.0.windows.1 release, https://github.com/git-for-windows/git/releases/tag/v2.56.0.windows.1 (read via the GitHub API, 2026-09-29). Asset sizes, SHA-256 table (no SHASUMS file), `/cmd/git.exe` promised stable, Windows 8.1 dropped. Digest of the MinGit 64-bit zip matched my download.
[34] Git for Windows, *Zip archives: extracting the released archives*, https://gitforwindows.org/zip-archives-extracting-the-released-archives.html (opened 2026-09-29). PortableGit is a self-extracting 7z `.exe` with silent switches; MinGit is a plain zip.
[35] *xcode-select(1)* man page (mirror), https://keith.github.io/xcode-man-pages/xcode-select.1.html (opened 2026-09-29; page dated 2019-06-24). `/usr/bin/git` is a shim into the active developer directory; `--install` opens a dialog; `-p` prints the path; `DEVELOPER_DIR`.
[36] Git, *Install for macOS*, https://git-scm.com/install/mac (opened 2026-09-29). Homebrew, MacPorts, Xcode Command Line Tools; no maintained binary installer; all non-source packages are third-party.
[37] isomorphic-git docs, *statusMatrix*, https://isomorphic-git.org/docs/en/statusMatrix (opened 2026-09-29). Row format; describes no stat-cache limits.
[38] isomorphic-git issue #608, *fix racy-git*, https://github.com/isomorphic-git/isomorphic-git/issues/608 (opened 2026-09-29; open since 2018-12-02). Maintainer's own reproduction: `statusMatrix` reports an edited file as unchanged.
[39] npm registry, *isomorphic-git*, https://registry.npmjs.org/isomorphic-git (queried 2026-09-29). 1.42.4 published 2026-09-29, MIT, Node ≥14.17, 11 direct dependencies.
[40] OpenAI, *Agent approvals & security*, section "Protected paths in writable roots", https://learn.chatgpt.com/docs/agent-approvals-security (opened 2026-09-29). `.git`, `.agents` and `.codex` are read-only in `workspace-write`, recursively. Same page as [07](07-codex-host.md) [38].
