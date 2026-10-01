# Build

Serve the need, not the stated solution. The interview finds the need; a short milestone plan, shown to the user, gets there; every milestone ends in a demo they look at before you go on.

**A new tool** gets its folder at the start: `tools/<name>/` with a working name from their first words (`resume-search`), a copy of `.agents/skills/workbench/starters/NOTES.md`, a line under "Tools here" and `Last worked on: <name>` in `.workbench/NOTES.md`. Nothing more yet: the app (a starter copied into `app/`) comes only with the "thinnest working tool" milestone, after the user has seen the result and the shape. Renaming the folder later is fine (update both NOTES files); the tool's `TOOL_ID`, set once when its app is created, never changes. Everything below is about that one tool.

## 1. Interview (skip steps the user has already answered)

Read [talking.md](talking.md) first. One question per message, each with your suggested answer.

1. **Frame** (1 message). About 15-20 minutes, one question at a time, about things that actually happened.
2. **One real episode.** "Tell me about the last time you had to do this." If they arrive with a solution ("I need a dashboard"), ask when they last needed it. No episode after a few tries: do one live with them ("open the file and let's do one now").
3. **Walk the workaround.** What they open, copy, type, check, and who gets the result. Ask for a real example file (a copy is fine) and keep it in `tools/<name>/samples/`, never in `app/`. The first time real files come up for this tool, settle "Whose data" in [safety.md](safety.md#whose-data) with one question. Collect their words into the tool's `CONTEXT.md` as they settle.
4. **Stakes.** How often, how long, what goes wrong, what "better" looks like. Record the goal in NOTES "What we're after".
5. **Slice.** "If this had to be useful by tomorrow morning, what would it only do?" One sentence: "does X for moment Y", plus what it will not do yet (ideas shelf).
6. **Confirm.** Retell what they do in their words and ask "What did I get wrong?" Their real episode becomes the acceptance check. With a sample in hand, confirm with the first look (below) instead of words alone.

Done when NOTES has the goal, the first slice, the acceptance check, `Interview: done`, and a milestone plan the user has said OK to.

**Short version.** When the user arrives with a clear, small, sensible idea, run steps 2, 5 and 6 only, then the plan. Still find the need behind it.

**Push back when the stated solution is harder than the need.** Always give (1) why, in one sentence, and (2) a simpler alternative that still meets the need. Example: "find issues in our accounts" -> "I'll turn the PDFs into clean Excel sheets; then you ask your AI assistant to find the issues. Reading PDFs reliably is the hard part, and judging them is what your assistant is already good at." The tool does the dull, reliable data work; the user's own AI does the judgment. The user decides.

**Pick how the tool does the work**, simplest first, and stop at the first that fits:
1. Plain rules in code (the user can state the rule completely).
2. One AI call per document, checked by code (messy input, fixed output) -> [ai-features.md](ai-features.md).
3. No new tool at all: a formula, an existing feature, or a clean export the user's AI assistant can work with.

## 2. Milestones and demos

The costly failure is the wrong direction: a lot of work, then "that's not what I meant". So don't be eager to build it all. Agree the shape before any app code, show something real early, and check in often. Cheap checks come first, before anything is built.

**The plan.** Right after the interview, show 3-5 milestones in their words, each ending in a demo, the cheapest and riskiest first:

1. **First look**, minutes, before any app: the result on their own samples, worked out directly (a one-off Bun script, as [stack.md](stack.md#tools-inside-the-project) says, or by hand), shown as they'd get it: the spreadsheet rows as a table in the chat, or a sample output file. "Is this what you want to end up with?" Most wrong turns show up here, while nothing is built yet. The plan (below) goes in the same message, or the very next one if the first look raised a question; "go on" after the first look means the next milestone, never "build it all".
2. **The shape**, still before any app code: how they'll use it, as a short walkthrough and, if it has a screen, a rough clickable sketch they try themselves ([stack.md](stack.md#sketches)): the screens in order, and the buttons and steps working on sample rows from their files, so they can click through the flow: what kind of thing it is (a small program, one HTML file, a website), what they click, what they get, what it deliberately won't do. Show it with the link at the top of your reply ([stack.md](stack.md#sketches), "Showing a page") and ask: "Click through it: is this how you'd use it? Anything missing or in the way?" Where their files come from and where the data goes is the data map ([data.md](data.md)): fill "Where it goes" in the tool's NOTES, then always run `.workbench\scripts\run.cmd bun .workbench\scripts\data-map.ts <tool>` and link the page it prints the same way; give its numbered sentences in the chat and ask "Is this right? Does anyone else get or see any of it?" At a real fork, 2-3 sketches side by side with the user's (sample) data, one-line tradeoffs, your recommendation last.
3. **The hard part, proven**: whatever might not work at all (their scanned PDFs, a messy layout, a rule with exceptions), run on all their samples, with an honest count of what came out right (nothing silently lost: checklist item 5 in [data.md](data.md)).
4. **Thinnest working tool**: the agreed shape with only the one action working, on their real case; nothing else is built yet. Before it: the data checklist items for this point and the exits check ([data.md](data.md)). Its screen is designed properly from the start: `tools/<name>/PRODUCT.md` and the design skill, as [design.md](design.md) says.
5. Then widen, one milestone at a time: more cases, a nicer screen, ideas from the shelf.

**Who does each milestone** ([roles.md](roles.md)): you, the guide, run the interview, the first look (a scratch script on their samples), the spec (`model.json`: model, screens, backlog) and every question, demo and "Ship it". The maker makes the sketch at the shape and builds from the thinnest working tool on. Before each step the gate must say OK: `gate.ts <tool> shape` before the shape, `build` before the maker builds, `demo` before they try it, `ship` before their copy changes.

Merge 1 and 2 for a tiny tool, and skip 3 when nothing is uncertain, but never start the app before they've seen the result and the shape.

Say it in one message: "Here's how I'd get there: 1. ... 2. ... 3. ... After each one I'll show you and wait for your OK before going on. Sound right?" Write it in the tool's NOTES under "Milestones" (`[x]` done, `[ ]` not yet, `<- now` on the current one) and start only after their OK.

**Demos, often, and a demo is the user trying it.** Every milestone ends in a demo: something they look at or try themselves in about a minute (a table in the chat, a clickable sketch, a sample output file, the trying-out copy of the tool). A sentence with counts ("all 13 checked, 9 count as spending") is a report, not a demo: show the thing itself, the rows or cases, with the tricky ones first and marked ("excluded: card payment, already counted in the card purchases"). Your own checks (tests, a hidden window, a script driving the app) are how you make sure it works; they never replace the demo. Once the tool has a screen, every milestone and every fix they'll see ends with the trying-out copy open in front of them (`try.ts`), two or three things to do in it with their own example, and two questions in one line: "Does it work the way you want, and do you like how it looks and feels?" A milestone too big for that gets split. One milestone per turn: finish it, demo it, stop and wait for their reaction. Never chain milestones without their reaction in between. Every hand-back says where they are: "Milestone 2 of 4 done: ...".

**Their copy changes only after they've tried the new one.** The version on their desktop (`current/`) is replaced only when they have used the trying-out copy and said yes to using it ("Ship it" in [stack.md](stack.md#in-use-and-trying-out)); never on your own checks, however good, and never as part of the same step as the change.

**Stop and check in now, not at the end**, when:
- the samples or data contradict what they said, or show a case the plan didn't cover;
- a choice changes what they'll see or get (the output layout, which cases are skipped, what counts as done);
- the milestone is growing (more than about two build-and-check rounds, or the next steps in the plan no longer fit);
- two attempts have failed ([fix.md](fix.md#two-strike-reset)).

Show what you have so far, say what you found in one line, ask one question with your suggestion. A rough demo now beats a polished wrong thing later.

**The plan changes in the open.** When a reaction or a finding changes the milestones, show the new list with the change marked ("new: ...", "dropped: ...") in one message, and update NOTES.

## 3. The loop: one small change at a time

A milestone is one or more small changes. For each change:

1. **Orient.** Read NOTES and the last save points; run the checks in "How to run and check". Broken: fix or go back first.
2. **Echo.** "Next (milestone <n> of <m>): after this, you'll be able to <thing they can see or do, their words>. Anything I got wrong?" One change only; everything else to the ideas shelf.
3. **Size.** Can they see the result after one build and a one-minute try? If not, split and offer the first piece. A change that moves things around on a screen or adds a screen: first a clickable sketch made from the tool's own look and pieces ([stack.md](stack.md#sketches)), their OK on it, then build.
4. **Save point** "before: <their words>". Back up their data first if the change touches it ([safety.md](safety.md#data)).
5. **Build and verify.** Smallest change, nothing extra. Add a check for it, run all checks; a changed screen also goes through the design detector ([design.md](design.md)). Package, then use the tool the way they would (start it, do the action, restart, look at the data), always as the trying-out copy that `.workbench\scripts\run.cmd bun .workbench\scripts\try.ts <tool>` opens on a practice copy of their data. It opens a window, which Codex's sandbox can't, so run it with escalated permissions and a one-line reason for the user's approval ([stack.md](stack.md#in-use-and-trying-out)). Never start the new build any other way and never link the user to it: that runs it on their real data. Two failed attempts: go back to the save point and rethink ([fix.md](fix.md#two-strike-reset)).
6. **Save point** "<their words>" once everything passes. Update NOTES, including "Built with" from what `try.ts` printed (add the section if it's missing).
7. **Hand back**, under ~120 words, no file names, no jargon:

   ```
   Milestone <n> of <m> done: you can now <what they can do>.

   Try it now (about a minute): I've opened the new version for you, in the window titled "<App> (trying out)" (if you don't see it, it's behind this one); it uses a practice copy of your data, your usual one is unchanged.
   1. <one action with a real example of theirs>
   2. <a second action, the one most likely to feel wrong>

   You should see: <specific result>.
   Does it work the way you want, and do you like how it looks and feels? Anything odd: tell me what you saw, or say "go back".

   What I checked: <one true sentence>.
   Next: milestone <n+1>, <what they'll see>. Or something you noticed?
   ```
8. **Read the reaction.** Happy: ask "Use this version from now on?"; yes -> "Ship it" ([stack.md](stack.md#in-use-and-trying-out)), then suggest using it for real for a day or two. Likes it but wants a tweak: a new small change, then demo again. "Not quite what I meant": a new small change. Unexpected result: [fix.md](fix.md). New idea: ideas shelf. "Fine"/"ok": ask what they saw after step 1. No answer yet (they haven't tried it): wait; don't ship, don't start the next milestone.

Never claim something works without saying what you ran. Never build extras nobody asked for; offer at most one idea per hand-back, as a question.

**Every ~5 changes**: tidy up without changing behaviour, run all checks, re-read the Data lines and the data map against the app ([data.md](data.md)), prune the ideas shelf with the user ("still want these?").

**When the tool grows** (someone else will use it, it holds other people's data, mistakes would be costly): [safety.md](safety.md#when-the-tool-grows).
