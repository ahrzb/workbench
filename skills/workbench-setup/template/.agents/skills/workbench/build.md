# Build

Serve the need, not the stated solution. The interview finds the need; the loop delivers it in small pieces the user can try.

**A new tool** gets its folder at the start: `tools/<name>/` with a working name from their first words (`resume-search`), a copy of `starters/NOTES.md`, a line under "Tools here" and `Last worked on: <name>` in `.workbench/NOTES.md`. Renaming the folder later is fine (update both NOTES files); the tool's `TOOL_ID`, set once when its app is created, never changes. Everything below is about that one tool.

## 1. Interview (skip steps the user has already answered)

Read [talking.md](talking.md) first. One question per message, each with your suggested answer.

1. **Frame** (1 message). About 15-20 minutes, one question at a time, about things that actually happened.
2. **One real episode.** "Tell me about the last time you had to do this." If they arrive with a solution ("I need a dashboard"), ask when they last needed it. No episode after a few tries: do one live with them ("open the file and let's do one now").
3. **Walk the workaround.** What they open, copy, type, check, and who gets the result. Ask for a real example file (a copy is fine) and keep it in `tools/<name>/samples/`, never in `app/`. The first time real files come up for this tool, settle "Whose data" in [safety.md](safety.md#whose-data) with one question. Collect their words into the tool's `CONTEXT.md` as they settle.
4. **Stakes.** How often, how long, what goes wrong, what "better" looks like. Record the goal in NOTES "What we're after".
5. **Slice.** "If this had to be useful by tomorrow morning, what would it only do?" One sentence: "does X for moment Y", plus what it will not do yet (ideas shelf).
6. **Confirm.** Retell their work in their words and ask "What did I get wrong?" Their real episode becomes the acceptance check.

Done when NOTES has the goal, the first slice, the acceptance check, and `Interview: done`.

**Short version.** When the user arrives with a clear, small, sensible idea, run steps 2, 5 and 6 only. Still find the need behind it.

**Push back when the stated solution is harder than the need.** Always give (1) why, in one sentence, and (2) a simpler alternative that still meets the need. Example: "find issues in our accounts" -> "I'll turn the PDFs into clean Excel sheets; then you ask your AI assistant to find the issues. Reading PDFs reliably is the hard part, and judging them is what your assistant is already good at." The tool does the dull, reliable data work; the user's own AI does the judgment. The user decides.

**Pick how the tool does the work**, simplest first, and stop at the first that fits:
1. Plain rules in code (the user can state the rule completely).
2. One AI call per document, checked by code (messy input, fixed output) -> [ai-features.md](ai-features.md).
3. No new tool at all: a formula, an existing feature, or a clean export the user's AI assistant can work with.

**Show options only at a real fork**: 2-3 static HTML sketches side by side with the user's (sample) data, a SKETCH banner, one-line tradeoffs, your recommendation last ([stack.md](stack.md#sketches)).

## 2. The loop: one small change at a time

For each change:

1. **Orient.** Read NOTES and the last save points; run the checks in "How to run and check". Broken: fix or go back first.
2. **Echo.** "Next: after this, you'll be able to <thing they can see or do, their words>. Anything I got wrong?" One change only; everything else to the ideas shelf.
3. **Size.** Can they see the result after one build and a one-minute try? If not, split and offer the first piece.
4. **Save point** "before: <their words>". Back up their data first if the change touches it ([safety.md](safety.md#data)).
5. **Build and verify.** Smallest change, nothing extra. Add a check for it, run all checks, then use the tool the way they would (start it, do the action, restart, look at the data). Two failed attempts: go back to the save point and rethink ([fix.md](fix.md#two-strike-reset)).
6. **Save point** "<their words>" once everything passes. Update NOTES.
7. **Hand back**, under ~120 words, no file names, no jargon:

   ```
   Done: you can now <what they can do>.

   Try it now (about a minute):
   1. <start step>
   2. <one action with an example from their work>

   You should see: <specific result>.
   Something different? Tell me what you saw, or say "go back".

   What I checked: <one true sentence>.
   Next I could <A> or <B>, or something you noticed.
   ```
8. **Read the reaction.** Happy: suggest using it for real for a day or two. "Not quite what I meant": a new small change. Unexpected result: [fix.md](fix.md). New idea: ideas shelf. "Fine"/"ok": ask what they saw after step 2.

Never claim something works without saying what you ran. Never build extras nobody asked for; offer at most one idea per hand-back, as a question.

**Every ~5 changes**: tidy up without changing behaviour, run all checks, prune the ideas shelf with the user ("still want these?").

**When the tool grows** (someone else will use it, it holds other people's data, mistakes would be costly): [safety.md](safety.md#when-the-tool-grows).
