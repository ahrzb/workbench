# The Build Loop: Iterating One Feature at a Time with a Non-Programmer

Scope: what happens after the interview. The AI builds a first slice, then grows the app with the user one small change at a time. This file covers the shape of one iteration, scope-creep handling, keeping her unstuck, and knowing when to stop. Evidence tags: **[study]** = peer-reviewed or measured, **[doc]** = official tool documentation, **[practice]** = practitioner writing or incident report, **[inference]** = my synthesis, not directly sourced.

## Recommendations

### A. Shape of the loop

1. **Make the first build a walking-skeleton slice, and never call it an "MVP" to her.** Build the tiniest end-to-end thing she can use on real data (open it, do the one core job, close it, reopen, it is still there). Cockburn: "a tiny implementation of the system that performs a small end-to-end function" [12]. "MVP" has contradictory meanings (earn vs learn, plus "as much as we can ship") [13]; for her the word is noise. Use her own words: "the first small version".
2. **Treat the first slice as high-stakes even though it is small.** Vibe-coding sessions show "context momentum": early AI interpretations that the user accepts become the path later prompts follow, so a wrong early reading (one date vs a date range) keeps recurring [1]. Confirm interpretation in words before building (rec 4).
3. **Run every iteration through the same seven steps** (template below): orient → echo → size → checkpoint → build+verify → hand back → read reaction. Sarkar & Drosos observed the same natural cycle in expert vibe coders: formulate goal, prompt, review, test in the app, identify bugs, refine, repeat until the sub-goal is satisfied [1]. Our loop adds the safeguards a non-programmer cannot supply herself.
4. **State the one change back to her in her vocabulary, as something she will be able to do or see, and get a yes before building.** Reasons: (a) an intent/interpretation mismatch is the main driver of rework [1]; (b) translating the AI's understanding back into plain language improved end-user programmers' grasp of what the system would do (spreadsheet study, n=24) [23]; (c) invalid assumptions early cascade into later, harder-to-diagnose failures for end-user programmers [6]. Use only terms from the agreed ontology.
5. **One change per turn; size it to a single try-step.** Anthropic's long-running-agent work found the dominant failure was doing too much at once, leaving half-implemented, undocumented work; working one feature at a time fixed it [10]. Expert vibe coders scope prompts on purpose (e.g. "don't integrate stripe yet. Just make a design with dummy data") and prefer single-objective prompts [1]. Kent Beck lists "functionality I hadn't asked for (even if it was a reasonable next step)" as a warning sign [15]. If the change is bigger, split it (Scope section).
6. **Checkpoint invisibly before and after every iteration.** One git commit per iteration in the project folder, with a message in her words. One studied vibe coder could not work out how to revert the AI's changes or find a checkpoint [1]; Lovable and Replit both ship one-click version history [30][31] [inference: because undo matters]. Claude Code's own checkpoints only track edits made through its file tools and are "not a replacement for git" [9]. She never types a git command; she says "go back to before the dates change" and the AI does it.
7. **Snapshot her data separately from her code, and iterate against a copy when a change writes or migrates data.** Replit's rollback does not restore the database unless you ask for it [31]; the July 2025 incident destroyed live records in seconds, the agent then said rollback was impossible although the user recovered the data manually, and the fixes Replit shipped were dev/prod separation, a planning-only mode and better restore [17]. A natural-language "code freeze" did not hold; only mechanical separation does. For us: copy her data file to a dated backup folder before any step that touches its structure or contents, and never let the AI run bulk delete/overwrite commands against her only copy.
8. **Verify before claiming, and say what was verified.** Without explicit prompting, Claude "would fail to recognize that the feature didn't work end-to-end", marked features done prematurely, and later sessions "declared the job done" early; accuracy improved when it tested as a human user would [10]. Willison: without tests "your agent might claim something works without having actually tested it at all, plus any new change could break an unrelated feature" [3]. Claude Code docs: "Have Claude show evidence rather than asserting success" and "If you can't verify it, don't ship it" [9]. Keep a tiny automated smoke check (starts, does the core job, data survives a restart) and grow it by one check per delivered change, so her "Things that work" list doubles as the regression list [10]. Regression testing is rare in end-user tooling [5], so the AI must supply it.
9. **Hand back with one concrete "try this now" and a stated expected result.** Feedback showing values without saying whether they are correct raised overconfidence in spreadsheet users, and 5–23% of end-user correctness judgments were wrong, mostly calling wrong values right [5]. Do not ask "does it look good?"; ask her to do a specific action and compare against a specific expected outcome. Understanding barriers ("it didn't do what I expected") were the barrier type learners most often could not overcome (34 of 38) [6]; an expected result closes that gulf of evaluation [6]. Keep the try-step to about a minute: each check spends her attention, and Blackwell's model says people invest attention only when cost, risk and payoff look favourable [7][5].
10. **Treat her reaction as the next requirement, not as a verdict.** Intent expands through evaluating output; in every studied session goals grew beyond the original plan after seeing results, sometimes prompted by a new need discovered in use (a "stop" button) [1]. End users often cannot state requirements until implementation and use [5]. Classify her reply (template below) and let real use, not speculation, choose what comes next.
11. **Show visible payoff quickly and make risk feel low.** In attention-investment terms, programming has higher cost and risk than direct manipulation, so people abandon when risk outweighs reward [7]. Empirically, unhelpful LLM responses raised the odds of abandoning the tool about 11-fold in a task study (students and developers, not office workers) [21]. So: early iterations must visibly work, "go back" must always be on offer, and a failure streak must trigger the reset rule (rec 16), not a fourth patch.

### B. Scope and the smallest next change

12. **Keep a plain-language Later list** (call it "your ideas shelf") in the project notes. Every new idea from her or from the AI goes there, gets one line of acknowledgement, and is not built. Anthropic's feature-list-with-pass/fail pattern is the agent-side equivalent [10]; ours is human-readable and has two sections: Things that work / Later.
13. **Split with Lawrence's patterns, simplest-first.** Order: workflow steps (thin end-to-end case first, not step-by-step), operations (create before edit/delete), rule or data variations (one case first), simple UI first, "simple/complex" (ask "what's the simplest version of this?" and move every variation to its own item), defer performance/polish, spike only as a last resort and time-boxed [11]. Choose the split that lets her throw away the low-value part [11].
14. **Ask "what would you do with it tomorrow morning?" to choose between candidate changes** [inference; grounded in the payoff term of attention investment [7]]. Prefer the change that lets her use the app for her real job sooner. Willison values software someone has actually used daily for weeks over software that merely looks polished [4]; Fowler's YAGNI adds that speculative features cost build effort, delayed value and ongoing carrying complexity, and only about a third of even carefully analysed features improved their target metrics in the Microsoft data he cites [14].
15. **Consolidate on a schedule and on triggers, and keep tidy-ups separate from feature work.** Triggers: two failed fix attempts (rec 16), roughly every five delivered changes (my heuristic, [inference]), before anything larger than a slice, or when the AI starts contradicting earlier decisions. Action: a tidy-only commit that changes no behaviour (Beck: never mix structural and behavioural changes in one commit) [15], full checks, notes refresh, Later-list prune. YAGNI only works if the code stays easy to change: refactoring and self-testing code are its enabling practices [14].

### C. Staying unstuck

16. **Two-strike reset.** After two failed attempts at the same problem, stop patching: restore the last good checkpoint, restate the problem fresh from her expectation, and continue in a new session or cleared context. Claude Code docs: after more than two corrections "the context is cluttered with failed approaches… a clean session with a better prompt almost always outperforms" [9]. Osmani's "two steps back" pattern (fix breaks something else, fix that, two more problems) hits non-programmers hardest because they lack a mental model to intervene [16]. Beck watches for loops, unrequested work and tests being disabled or deleted, and when the AI stalled in complexity he had it rebuild in a simpler setting rather than push on [15]. LLMs "often make assumptions in early turns… when LLMs take a wrong turn in a conversation, they get lost and do not recover" (average 39% drop, multi-turn vs single-turn, simulated tasks) [22]. End-user programmers' "modify until it seems to work" debugging tends to add errors [5].
17. **Intake bug reports as three plain questions, then reproduce them yourself.** Ask: what did you expect, what happened, what were you doing just before (screenshot welcome). Developers most want steps to reproduce, which users find hardest to supply [28]; the AI should therefore do the reproducing, write a failing check, confirm "I see it too: when you do X, Y happens. Is that the problem?", fix, and re-run all checks [9][28].
18. **Translate errors into her language and keep the raw text in the log.** Compile/runtime messages that do not relate to the user's own mental model were among the most insurmountable barriers [6]. Use the four-line shape: what happened (her words) / why (one plain sentence) / what I'm doing / whether she needs to do anything. Show raw errors only if asked. Tell her explicitly that the problem is the tool's, not hers: end users' self-talk during debugging includes "Am I smart enough?" and low self-efficacy reduces persistence [5].
19. **Maintain a project memory file so any new session can resume.** Anthropic's harness: each session starts with no memory; a progress file plus git history, a feature list, and a start script with a basic end-to-end check let a fresh session get its bearings and detect a broken state before adding more [10]. Claude Code loads CLAUDE.md every session; keep it short, include commands the AI cannot guess, and prune it [9]. Contents in the skeleton below. Refresh it at the end of every iteration.
20. **Recognize when the project is growing and say so plainly, then help.** Triggers below. Willison: vibe-coded software for a personal tool that only hurts you is fine; for other people's information it is "grossly irresponsible" without care, and he recommends a check by someone more experienced before sharing [2][4]. Ko et al.: the moment intent shifts from personal to other users, testing and design demands rise, and programs written to be "throw away" often become long-lived [5]. The response is not to stop: name the new responsibilities and help with each ([08](08-security-compliance.md) rec 8 and the sharing ladder).

## The iteration template

**Step 0 Orient (every session start, silently).** Read the notes file and last few checkpoint messages. Run the smoke check. If it fails, repair or restore before anything else [10]. Tell her only: "Picking up where we left off: [one line]."

**Step 1 Echo.** "So the next change is: after this, you'll be able to **[observable thing, her words]**. Anything I got wrong?" One change only. Anything else goes to Later.

**Step 2 Size.** Can she see the result after one build and one try-step? If not, split (rec 13) and offer the first piece.

**Step 3 Checkpoint.** Commit "before: [her words]". Copy her data to the backup folder if the change touches data (rec 7).

**Step 4 Build and verify.** Smallest change; no extras. Add the check for this change; run all checks; exercise it as she would (open the app, do the action, restart, look at the data). Commit "[her words]" only if green. If not green after two attempts, reset (rec 16).

**Step 5 Update notes.** Move item to Things that work; add new Later items; note any decision.

**Step 6 Hand back.** Exact shape (aim for under about 120 words, no file names, no jargon, no more than one try-step):

```
Done: you can now [what she can do, one sentence, her words].

Try it now (about a minute):
1. [open/start step, or "keep the app open"]
2. [one specific action, using an example from her own work, e.g. "add a 12 Oct entry for 'Printer paper, 18.50'"]

You should see: [specific expected result].
If you see something different, just tell me what you saw. Or say "go back" and I'll restore the earlier version.

What I checked: [one true plain sentence, e.g. "I added an entry, closed and reopened the app, and it was still there."]
[Only if any:] Not done yet: [one line]. It's on your ideas shelf.

What did you think? Next I could [option A] or [option B], or something else you noticed.
```
Rules: never write "should work" without a "what I checked"; never write "fixed" unless it was reproduced first and verified after; at most two suggested next steps, both taken from the Later list or from her own reaction.

**Step 7 Read the reaction.**

| Her reply | Do |
|---|---|
| Works, happy | Mark done. Ask what she'd do with it next; suggest using it for real for a day or two if the core job now works [4]. |
| Works, but "not quite what I meant" | A new small change, not a bug. Echo it, new iteration. |
| Not what she expected | Bug intake (rec 17). Reproduce first. |
| New idea | Later list (script below). |
| Vague/silent ("fine", "ok") | Ask for one observation: "What did you see after step 2?" People wrongly judge incorrect output as correct far more often than the reverse [5]. |
| Confused or worried | Offer the undo, explain in one sentence, lower the stakes. |

## Scope-creep nudging script

Tone: it is her tool. The AI protects momentum and her attention; it does not forbid ideas. If she insists on something big, build it as its own checkpointed iteration.

- **Park:** "Good idea. I've put '[X]' on your ideas shelf so we don't lose it. Right now we're doing '[Y]'. OK?"
- **Tomorrow morning:** "If you had this tomorrow morning, what's the first thing you'd do with it?" Follow with "Which of these would make that easier?"
- **Simplest version:** "What's the simplest version of this you'd still actually use?" [11]
- **Split:** "That's really three things: A, B, C. Which one helps most on Monday? We can do the others after." [11]
- **Time-box:** "Let's give this one round. If it isn't right, I'll put back yesterday's version and we'll rethink." [11][9]
- **Use first:** "Use it for your real task for a couple of days. Jot down whatever annoys you, and we'll pick from that." [4][5]
- **Not yet (YAGNI):** "We might want [Z] later. If we build it now, everything else gets harder to change, so let's wait until you actually need it." [14]
- **AI's own ideas:** Never build unrequested extras [15]. Offer at most one per hand-back, phrased as a question, and file it to Later if she says no or "maybe".
- **Shelf review:** Every few iterations, read the shelf aloud, ask "still want this?", delete stale items, and put the top one or two up as next candidates. Choose splits that let low-value items be dropped [11].

## The unstuck playbook

| Situation | Response |
|---|---|
| "It's broken / nothing happens" | Ask the three questions, reproduce, write a failing check, fix, verify, tell her what you saw (rec 17). |
| Second failed fix | Stop. Restore last good checkpoint. Restate the problem from her expectation. New session or cleared context (rec 16). Offer a simpler alternative or a workaround. |
| She can't say what she wants | Offer two or three concrete small options (a quick sketch or a fake-data screen), not open questions; she reacts to something visible. Prototypes surface intent because intent forms by evaluating output [1]. |
| She sees an error box | Four-line translation (rec 18). Fix silently if possible. |
| New session, AI seems lost | Read notes plus commit log, run smoke check, restate the state to her in three lines and confirm [10]. |
| The AI produced something she didn't ask for | Revert to before; re-echo the requested change only [15]. |
| Data looks wrong or missing | Stop building. Restore from the dated backup first, diagnose second. Do not trust the agent's own claim about what is recoverable [17]. |
| She loses confidence ("I'm bad at this") | Name the cause as the tool's; point to what already works; propose a smaller next step [5]. |
| Steady slow-down: each change takes longer or breaks old things | Consolidate (rec 15). If it persists after a tidy-up, check outgrown triggers. |
| It works but she never opens it | Ask what she does instead. The change to make may be tiny or not about software at all [7]. |

### Growing triggers (say plainly, list the new responsibilities, offer a handoff packet; see [08](08-security-compliance.md) rec 8)

Someone else will rely on it, or it holds information about other people (Willison; Ko: intent continuum) [2][5]. It needs logins, payments, internet-facing access or shared storage: data-exposure failures are the norm there, e.g. missing row-level security exposed data in Lovable-generated apps (CVE-2025-48757) [18], and generated backends "frequently ignored" isolation and access rules unless specified [25]. Mistakes would be expensive: 91% of strongly audited operational spreadsheets had important errors [29]. She would be in trouble if it vanished or corrupted. Repeated resets keep failing [16]. Handoff packet = notes file, how to run it, where the data lives, what was checked, what was never checked. Ask a colleague or IT for a "vibe check" before sharing [2].

### Project notes skeleton (plain language, short)

```
# [App name] - notes
What it is: [one sentence in her words]
Words we use: see CONTEXT.md

What we're after (see 09 recs 18-21; the user's words, dated)
  Goal: [what's different once this works]
  Must have: [need] ...
  Rules we must follow: [requirement] (who says so)
  Preferences: [guideline]
  How we're doing it: [solution] -> for: [need]
  (Nice to have goes on the ideas shelf)

How to run / check: [smoke check command]
Things that work: [list, each is also a check]
Ideas shelf (Later): [list]
Decisions: [dated one-liners incl. what we deliberately did NOT do]
Data: [where it is, where backups go, "never touch the real copy without a backup"]
Careful: [known fragile spots]
```

## Key evidence

**End-user programming research.** Ko et al. define end-user programming by intent (personal use) and characterise end-user engineering as implicit requirements, overconfident testing and opportunistic debugging; requirements may only become clear during implementation; regression testing has barely been applied to end-user tools [5]. Ko, Myers & Aung observed 40 non-programmers learning Visual Basic.NET and classified 130 barriers into six types; understanding barriers were mostly insurmountable and invalid assumptions made to pass one barrier often caused the next [6]. Blackwell's attention-investment model frames every step as cost, risk and payoff, and Ko et al. use it to explain why users skip testing or refuse features that look risky [7][5]. Burnett's Surprise-Explain-Reward (surprise the user, explain, reward) made spreadsheet users adopt assertions and testing features, with a warning that users may game visible progress indicators [5]; the analogue here is a hand-back whose expected-result line is the "explanation" and whose payoff is real data appearing.

**Incremental delivery.** Cockburn's walking skeleton [12]; Patton's earn-vs-learn distinction for "MVP" via a secondary summary [13]; Lawrence's splitting patterns and meta-pattern (find the core complexity, reduce variations to one) [11]; Fowler on Yagni's three costs (build, delay, carry) [14]. Adzic notes that with modern delivery you can even ship a UI slice on a simple back-end and swap the "crutches" later [12], which for local apps means the first slice can use a plain file for data and be migrated deliberately later.

**AI-assisted building by non-experts.** Sarkar & Drosos analysed 8.5 hours of think-aloud video of five vibe-coding sessions; all were experienced programmers and their protocol dropped the planned non-programmer comparison because no session contained one [1]. They found: iterative goal-satisfaction cycles, "context momentum", expertise redistributed toward context management, rapid code evaluation and deciding when to go manual, and one creator who could not find how to revert [1]. Pimenova et al. (interviews, Reddit, LinkedIn; 190k words) report pain points in specification, reliability, debugging and review burden, and that trust governs delegation vs co-creation [20]. Tie et al. (26 participants, ChatGPT) found nine failure types including context loss, and 17 abandoned the tool [21]. Laban et al.: 39% average multi-turn degradation [22]. Liu et al.: grounded echo-back helps end users [23]. Willison's definition (no code review) and his list of when vibe coding is acceptable (low stakes, no secrets, private data care, no usage-billed APIs without limits) [2]; Beck's "augmented coding" distinction [15]; Osmani's "70% problem" and "two steps back" pattern as practitioner observation of non-engineers [16].

**Failures of AI app builders.** Replit incident: reported via the user's posts and Fortune; the company CEO called it unacceptable and shipped separation and a planning-only mode [17]. Lovable: the discoverer's write-up lists disclosure dates, root cause (client-side database access relying only on RLS, with missing or permissive policies) and mitigations [18]; a vendor database entry adds figures (170 of 1,645 scanned apps, CVSS 9.3) I did not open the underlying scan for [19]. Iterative "improvement" prompting of LLMs raised critical vulnerabilities 37.6% after five iterations in one controlled experiment (400 samples) [26]; a vendor report found 45% of AI code samples failed security tests, unchanged across model generations [27]. These are the reason the AI, not she, owns security and verification.

**Session continuity.** Claude Code's context degrades as it fills; `/clear`, checkpoints, `--continue`, short CLAUDE.md [9]; Anthropic's initializer/coding agent harness, with its "clean state" definition ("appropriate for merging to a main branch") [10].

## Open questions and disagreements

- **No verified study of real non-programmers running an agentic build loop.** Sarkar & Drosos had none [1]; Osmani's claim that non-engineers hit a 70% wall is practitioner opinion [16]; Tie et al. used students and developers [21]. Everything about her specifically is extrapolation.
- **One change per turn** is supported by agent-harness experience [10] and expert habits [1] but not by a controlled comparison. Sarkar & Drosos found mixed granularity across sessions and some manual editing of small changes [1].
- **"Every five changes" for consolidation** is my heuristic; no source gives a cadence [inference].
- **Echo-back** was tested for spreadsheet queries, not whole apps [23]. Expected-result hand-backs are inferred from the overconfidence and understanding-barrier findings [5][6].
- **Security statistics** conflict in detail: CVE-2025-48757 CVSS is 8.26 base in the discoverer's write-up [18] but 9.3 in a vendor database summary [19]. The security-degradation study is preprint-level and hypothesises causes [26]; Veracode is a vendor report whose methods I did not review [27].
- **Karpathy's date.** Willison writes February 6 [2]; Sarkar & Drosos write February 2, 2025 [1]. The tweet's ID decodes to 2025-02-02 UTC (my calculation from the URL in [2]).
- **Replit incident details** (records lost, agent statements) come from Lemkin's own posts as reported by Fortune ("reportedly") [17]; the agent's statements are not reliable evidence of its internals.
- **Willison's convergence remark (May 2026).** He says vibe coding and agentic engineering are starting to blur in his own work as agents get more reliable [4]; the "unreviewed code" line is moving, so a skill should be written around observable checks, not around a model-quality assumption.
- **Git without admin.** Windows per-user installs are reported to land under `%LocalAppData%\Programs\Git` [32]; I did not verify the installer flow, and I did not verify macOS git availability without admin (Xcode tools) [UNVERIFIED].

## Conflicts with the guiding principles

No direct contradiction. Pressure points:

1. **Invisible versioning vs the no-admin HARD REQUIREMENT.** Per-iteration undo is the strongest evidence-backed safeguard [6][10][31], but git's availability without admin on macOS is unverified [UNVERIFIED]. Fallback for the skill: timestamped folder snapshots or zip copies of project and data [inference]. Coordinate with the runtime slice.
2. **"User never chooses technology" vs "AI tools help experts more" [16].** Because she cannot review code, the whole safety burden (verification, security, data backups, honest limits) sits on the AI; the skill should not imply she can catch problems by looking at output alone [5].
3. **"Smallest first" vs context momentum [1].** The first slice steers everything later, so it deserves the most careful echo-back and confirmation, not the least.
4. **"Ontology first" vs emergent requirements [5][1].** The vocabulary must be revisable: keep the glossary in the notes and update it when she coins new words, rather than treating it as frozen.
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
[32] Arup, *Installing Prerequisites Without Admin Rights*, https://arup-group.github.io/oasys-combined/adsec-api/common/creating_applications/no_admin_rights.html (search-returned, not opened). Portable git, no-admin note; flow unverified.
