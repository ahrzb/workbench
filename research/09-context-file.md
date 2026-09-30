# CONTEXT.md and how the AI asks questions

Scope: the one file that holds the user's own words for their work, the rules that stop the AI from burying the user in questions, and how the AI sorts what the user says into goal, needs, requirements, guidelines, wants and solutions. Based on Matt Pocock's `domain-modeling` and `grilling` skills [1][2][3][4], adapted for a user who is not a developer. It replaces the `our-words.md` glossary proposed in [02](02-ontology-vocabulary.md). Research date 2026-09-29.

## The failure this prevents

The "wall of jargon": the AI asks five questions at once, each full of software words, about things the user has never had to think about ("Should invoices be stored in SQLite or as JSON? Do you want a schema for line items? How should duplicates be handled?"). The user can't answer, feels stupid, says "whatever you think", and the AI builds on guesses anyway. Every question here was either a fact the AI could have checked, a technical choice that was the AI's job, or a decision that could have waited.

## Who the user is

The AI keeps this picture in mind when deciding what to check itself and what to ask. It goes in the session brief ([07](07-codex-host.md)), so every chat starts with it.

- **Tech-savvy, uses a computer all day, but doesn't write code.** Comfortable with Excel, email, Word, PDFs, shared folders and online services. New to terminals, code, installs and developer words.
- **Builds tools for their job and just as often for themselves**: a job hunt, a club, household bills, a hobby. The topic doesn't tell which: a resume parser may be for their own job search as easily as for hiring. (Until v0.2.0 the brief described "an office worker building tools for their own work, often on a company laptop"; the user found the result paranoid, because every topic got read as company data with compliance attached. v0.2.1 records the wider persona.)
- **The expert on their own work and life.** They know what their documents look like, what's normal and what's odd, which cases are common, where the files are kept, who does what, which rules apply to them, and who to ask.
- **Judges their own risks.** Whether something is for work and whether company rules cover it is their answer to give, asked once in one line ([08](08-security-compliance.md) rec 2); the AI takes it and moves on.
- **Busy.** They want a task off their plate, not a new hobby. Short messages, few questions, visible progress.
- **On ChatGPT / Codex, without admin rights**, sometimes on a company laptop, sometimes their own.

**How they use the workbench.** They say what they want in plain words and expect the AI to get on with it: build, check, show the result. They want a working tool, not safety briefings: every warning, extra check or question they didn't ask for costs them time, so one is said only when it saves them from something they'd regret (losing data, publishing something, breaking a rule they've said applies). What the AI learns about them (what they build tools for, whether company rules generally apply, how much explaining they want) goes in a few plain lines under "About the user" in `.workbench/NOTES.md`, picked up from the conversation, never from an interview, and read before asking anything.

What they can answer faster than the AI can check: where something is, which example is typical, whether a result looks right, what a column or code means in their work, how often something happens, who owns a decision. What the AI checks better: anything about the machine, file formats, whether something runs, counts and patterns across many files.

## Recommendations

### A. The file

1. **One file per tool, `tools/<name>/CONTEXT.md`, in the user's words.** It is the shared language of that tool: what their things are called, what they do with them, and their "when … then …" rules. (v0.1.x had a single `CONTEXT.md` at the project root; since v0.2.0 one project can hold several tools, each with its own file.) The AI reads the one for the tool being worked on at the start of every chat (the startup hook injects the last-worked-on tool's file, [07](07-codex-host.md)) and before every message it sends. The user can open and edit it; it is written to be read by them. Two tools may use the same word differently ("item" on a bill and "item" in a stock list); each file holds that tool's meaning, and the AI does not carry a word from one tool's file into another.
   - Matt Pocock's skills used the same name and have since renamed it `GLOSSARY.md` [5]; we keep `CONTEXT.md` because the user asked for it and because nothing else in this project reads the other name.

2. **A glossary and nothing else.** No technical details, no decisions log, no to-do list, no spec. Matt's most-reported problem is models treating "write to the glossary" as permission to store every answer, until the file becomes a running spec of hundreds of lines [2]. Where the other things go:
   - progress, ideas shelf, "Waiting on", where data lives: the tool's `NOTES.md` (`tools/<name>/NOTES.md`; the project list is `.workbench/NOTES.md`) ([06](06-build-loop.md), [08](08-security-compliance.md));
   - how the user's words map to screens, files and code: the "For the AI" section of the tool's `NOTES.md`, never shown to the user ([02](02-ontology-vocabulary.md) rec 4).

3. **Names are settled in a short dialogue; the AI adapts to the user, never the reverse.** Picking a name in your head is hard; testing one in a sentence is easy. So:
   - **The user has a word:** use it. If the AI thinks another word is clearer, it just asks, once, with the reason: "You call these 'items'. Would 'bill lines' be clearer, since each one is a line on a bill? Either is fine." Whatever the user says, that's the word.
   - **The user has no word** (common for things they've never had to name): the AI offers one, in a sentence about their own work, and lets them try it: "I'll call the list of unpaid bills the 'to-pay list', as in 'the Acme bill is on the to-pay list'. Does that sound right, or would you say it differently?"
   - **Nothing is locked in.** If a name feels wrong later, the user says so and it changes everywhere.
   - Screens, buttons, file names and code names use the settled words. Borrowed software words pass the three-question gate in [02](02-ontology-vocabulary.md) rec 8, at most ~5 at a time.

4. **Be opinionated, as Matt's format is.** One word per thing. Other words the user sometimes uses go on an "also said" line, so the AI understands them but always answers with the main word [3]. A word that means two things goes under "Not sure yet" until it matters ([02](02-ontology-vocabulary.md) rec 23).

5. **Write it the moment a word settles, and say so in one line.** "I added 'chase up' to our words." Don't batch at the end, don't create the file before the first word exists [1][2]. Nothing in it is final: "call it X instead" renames it everywhere in one sweep (screens, files, code), and the old word goes to "Retired" so it doesn't come back.

6. **Keep it to one screen.** About 15–25 entries ([02](02-ontology-vocabulary.md) rec 13). It should shrink as often as it grows [2]: words for dropped features are retired, and software words the user never used are replaced by plain descriptions.

### B. How the AI asks (the guard against the wall of jargon)

7. **Check or ask, whichever is quicker for the user.** Technical facts (the machine, file formats, whether something works) are always the AI's job. Facts about the user's work are often quicker for the user to answer than for the AI to dig out (see "Who the user is"). Then ask, and offer to check instead: "I can go through all the bills to find the usual layout, but you probably know: is the Acme one typical?" Never ask something the user couldn't know, and never ask twice what the AI has already checked [4].

8. **Technical choices are never questions.** Storage, formats, libraries, structure, error handling: the AI picks the boring default and moves on ([08](08-security-compliance.md) rec 6). If the choice later needs someone else, it becomes a forwardable message, not a question to the user.

9. **Ask as little as possible, because everything can change.** The AI asks only when a wrong guess would be expensive: it would touch the user's real data, cost money, involve other people, or be hard to undo. This mirrors Matt's bar for writing a decision record: hard to reverse, surprising without context, a real trade-off [2]. Everything else: pick a sensible default, say it in one line ("I'll put the newest invoices at the top; easy to change"), and let the user's reaction to the working tool correct it ([06](06-build-loop.md) rec 10).

10. **A question the user can answer from their own work, today.** Allowed: what happened last time, what they'd do with a real example, which of two visible results they prefer, whether something on screen is right. Not allowed: hypotheticals they've never met ("what if two suppliers have the same name?"), anything about how the software works inside, anything needing a word not in `CONTEXT.md` or everyday language.

11. **Every question comes with the AI's recommended answer**, so "yes" or silence is always a valid reply. Matt's grilling puts each recommendation on its own line [4]; here it reads: "I'd suggest X, because Y. OK?"

12. **A dialogue of small turns, not a questionnaire.** Each AI message is short, gives one piece of useful information in plain words, and asks at most one question. Matt's grilling asks in rounds by default, but notes that people who read slowly or work in a second language do better one at a time [4], and [01](01-interview.md) found the same. For this persona, one small turn at a time, so each answer can shape the next message.

13. **Show instead of asking when possible.** A sketch, a sample result, or two results side by side ([05](05-mockups-alternatives.md), and the outcome-first comparison in [8.8] of the agenda) replace most "which do you want?" questions.

14. **"I don't know" is the AI's mistake, not the user's.** Take the default, note it under "Not sure yet" if it's about a word, and move on. Never ask the same question again in different words.

15. **Pre-send check on every message.** Every word about their work must be in `CONTEXT.md` or plain everyday language; every question must pass recs 7–12 and 16–17. If not, rewrite before sending ([02](02-ontology-vocabulary.md) rec 20).

### C. Two blind spots the AI covers for the user

16. **Separate the usual case from the case that ruins it.** People describe the usual case and rarely think about exceptions; when they do, they can't easily tell which exceptions matter. The AI sorts them for the user:
    - **One exception can ruin it** (a wrong total gets paid, a file gets overwritten, a bill is filed twice, the user trusts a result that is silently wrong): handle it now, or at least make the tool stop and flag it. Ask about it only as a concrete example: "If a bill ever came in twice, would paying it twice be a problem?"
    - **The exception can wait** (the odd supplier with a strange layout, a case that happens twice a year): build for the usual case, have the tool say plainly when it meets something it can't handle ("I couldn't read this one; please do it by hand"), and put the exception on the ideas shelf. Don't ask about it now.
    - Ask about frequency in the user's terms ("How many of last month's bills looked like this?"), not in the abstract. The deciding question is always "what happens if we get this one wrong?", not "how often does it happen?".

17. **Spot knowledge that lives only in the user's head.** Users often don't realise that something obvious to them isn't visible to a program, an AI, or even a colleague. Example: "file the bills we're still waiting for". A missing bill leaves no trace in the data; the user knows it's due because they know the supplier sends one every month, and no program or AI can see that. When a request depends on this kind of knowledge, the AI:
    - says so plainly, once, without making the user feel silly: "The tool can only see bills that have arrived. It can't know one is missing unless it knows you expect it";
    - offers the simplest way to get that knowledge out of the user's head and into the tool, with a suggested answer: "If you give me the list of suppliers who bill you every month, I can show which ones haven't sent this month's bill yet. OK?";
    - checks the same thing for its own shortcuts: anything the tool would have to guess ("the latest bill is the right one") is either written down as a rule in `CONTEXT.md` or shown to the user to confirm.

### D. Sorting what the user says: goal, needs, requirements, guidelines, wants, solutions

18. **Keep six kinds of statement apart, because people mix them up.** Users say "I need a dashboard" (a solution), "it must be in Excel" (maybe a rule, maybe a habit), "it has to email my boss" (maybe a want). Building on the wrong kind makes the tool too big, too rigid, or aimed at the wrong thing. [01](01-interview.md) already found that people describe solutions poorly and should be asked about the situation instead (Ulwick, Mom Test, Shape Up); this makes the sorting explicit. The six kinds and the test the AI applies:

    | Kind | What it is | The AI's test | Example |
    |---|---|---|---|
    | **Goal** | What's different in the user's work once this works. Usually one. | "What would be different if this worked?" | "Month-end takes one day, not three." |
    | **Need** | Without it the goal isn't met. | "If the tool did everything else but not this, would you still use it tomorrow?" Yes → it's a want. | "See which bills are still unpaid." |
    | **Requirement** | Fixed by someone or something other than the user's taste: a company rule, the law, another system, the shape of the data. | "Who says so, and what happens if we don't?" "Nobody, it's how I do it" → it's a guideline. | "The boss only reads .xlsx." "Bills arrive as scanned PDFs." |
    | **Guideline** | A preference about how. Can bend when it costs too much. | "Would it be OK if it were different, if that made it simpler?" | "Keep it looking like our sheet." |
    | **Want** | Nice to have. | Fails the need test. | "Email my boss automatically." |
    | **Solution** | One way of meeting a need. | "Is there another way to get the same thing?" Yes → find the need behind it. | "A dashboard." "Use AI to find issues in the accounts." |

19. **Be critical, including of the AI's own ideas.** The usual mix-ups, and what the AI does:
    - **A solution stated as a need:** find the need behind it, then keep the user's solution or offer a simpler one, with a reason ([8.1] of the agenda; the accounting-to-clean-sheets example).
    - **A want stated as a need:** apply the need test; if it fails, it goes on the ideas shelf, and the AI says so in one line.
    - **A habit stated as a requirement:** ask who says so. If it's a real rule ("the boss reads Excel"), the requirement is the rule ("the boss gets an .xlsx"), not the habit ("we work in Excel").
    - **No goal, only features:** ask what would be different; without a goal there is nothing to judge the features against.
    - **A "rule" the evidence contradicts.** The user says "every bill has an order number", and 3 of last month's 40 bills don't. The AI notices while looking at the samples, doesn't silently pick a side, and asks one smart question that shows the counterexamples and offers the likely answers: "You said every bill has an order number, but these 3 don't (Acme 12 Mar, …). Are they handled differently, or should the tool flag them for you?" The answer sorts it: a true rule with exceptions the tool must flag (rec 16), a guideline, or a different rule than the one stated. The user's words get corrected in `CONTEXT.md` and "What we're after". This is Matt's cross-referencing move ("your code says X, you just said Y, which is right?") [1], pointed at the user's data instead of code. The same applies in reverse: if the AI assumed a rule and the data breaks it, it says so.
    - **Requirements nobody mentions:** company rules the user forgets (who may see the data, how long it's kept, approvals) and facts about the data (scans, handwriting, several currencies). The AI checks the data itself; unknown company rules become a forwardable question ([08](08-security-compliance.md) rec 6).
    - **The AI's own mix-ups:** treating a preference as a hard rule and overbuilding for it, or treating its own solution as the user's need. Every solution the AI proposes names the need it serves.

20. **Sort silently; ask only when the kind changes what gets built.** The user never has to learn these six words. The AI asks only when the answer changes scope (need or want?) or flexibility (rule or preference?), one question at a time, with its suggested answer: "Sending it to your boss automatically: would you still use the tool without that for now? I'd suggest yes, and I'll put it on the ideas shelf."

21. **Write it down and keep the links.** In the tool's `NOTES.md` (`tools/<name>/NOTES.md`), under "What we're after" (template in [06](06-build-loop.md)), in the user's words with the date. Every solution names the need it serves, every need serves the goal, every requirement says who set it. Anything that links to nothing is questioned or moves to the ideas shelf. The list changes as the user tries the tool ([06](06-build-loop.md) rec 10): new needs get added, and a solution that doesn't serve its need gets replaced rather than patched.

## Template

```markdown
# Context: <what the user calls this work, e.g. "Supplier bills">

<One or two sentences, in the user's words: what this work is and why it matters to them.>
This is our shared list of words. If something is wrong or missing, just tell me and I'll change it.

## Things
**bill**: What a supplier sends us asking to be paid. Example: "the Acme one from 3 March".
_Also said_: invoice

## Actions
**chase up**: Contact a supplier again because a payment or reply is late. Example: emailing Acme a week after the due date.
_Also said_: nudge

## Rules
- When a bill is 7 days past due, chase up the supplier.

## Borrowed words (at most ~5)
**backup**: A copy of your files from a certain day, so we can go back if something goes wrong.

## Careful words
- "report" here means the weekly email to your manager, not anything the tool makes.

## Not sure yet
- "done" for a bill: sent, or paid? I'll ask when it matters.

## Retired
- "invoice" → "bill" (you always say bill), 2026-09-29
```

Rules for the template: definitions are one or two sentences and say what a thing *is* [3]; sections are created only when they get their first entry; headings stay in plain English, or in the user's language if they work in another one.

## What changes versus Matt Pocock's version

| | Matt Pocock (`domain-modeling`) | Here |
|---|---|---|
| Who writes the words | Developer and AI sharpen them together; the AI proposes precise terms [1] | The user's words by default. The AI may suggest a better name or offer one where the user has none, as a one-line question tested in a sentence from their work; the user's answer decides |
| Challenging vague words | Interrupts to ask which of two things you meant [1] | Only when it matters for the next step; otherwise "Not sure yet" |
| Decision records | ADRs, when a decision clears three tests [2] | None for the user; the same three tests decide whether a question is worth asking at all |
| Questions | Rounds of several, each with a recommendation [4] | A dialogue: short turns, one question at a time, each with a recommendation, only about the user's own work |
| Extra sections | Relationships, flagged ambiguities [3] | Rules, borrowed words, careful words, retired words ([02](02-ontology-vocabulary.md)) |
| Reader | Developers and agents | The user and the AI |

## Open questions

- Whether re-reading `CONTEXT.md` each turn actually stops a coding agent drifting to its own words; nothing found tests this ([02](02-ontology-vocabulary.md) evidence gaps).
- Whether code names should follow the user's words when they work in a language other than English ([02](02-ontology-vocabulary.md)).

## Sources

[1] Matt Pocock, `domain-modeling` SKILL.md, https://github.com/mattpocock/skills (read via the installed copy, 2026-09-29). Challenge against the glossary, sharpen fuzzy language, update inline, "a glossary and nothing else", ADRs sparingly.
[2] Matt Pocock, "domain-modeling" docs page, https://raw.githubusercontent.com/mattpocock/skills/main/docs/engineering/domain-modeling.md (opened 2026-09-29). Two artifacts and two bars; the glossary turning into a spec as the most-reported problem; shrink as often as grow; unreviewed glossaries become lore.
[3] Matt Pocock, `GLOSSARY-FORMAT.md`, https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/domain-modeling/GLOSSARY-FORMAT.md (opened 2026-09-29). Be opinionated, `_Avoid_` synonyms, one-to-two-sentence definitions, project-specific terms only.
[4] Matt Pocock, "grilling" docs page, https://raw.githubusercontent.com/mattpocock/skills/main/docs/productivity/grilling.md (opened 2026-09-29). Facts vs decisions, recommendation per question, rounds vs one at a time.
[5] Matt Pocock, changeset "rename-context-to-glossary", https://raw.githubusercontent.com/mattpocock/skills/main/.changeset/rename-context-to-glossary.md (opened 2026-09-29). `CONTEXT.md` renamed to `GLOSSARY.md`.
