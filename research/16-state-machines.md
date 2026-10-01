# Lifecycles: how a thing changes over time (state machines, life histories), and what the AI should keep and show

Scope: whether, when and how the AI should model the *life* of the things a tool handles (an invoice that is drafted, sent, part-paid, paid; a member who joins, lapses, rejoins) so that it builds what the user wants and cannot silently let a thing do what it should not. Covers Harel's statecharts, UML 2.5.1 state machines, entity life histories (SSADM), Jackson System Development, Shlaer-Mellor object lifecycles, business artifacts, XState, state-transition tables, "make impossible states impossible", status columns and Kanban boards, how to draw a lifecycle out of a non-technical user, and tests generated from a state table. It builds on [01](01-interview.md) (interview, "last Tuesday's case" as the acceptance test), [02](02-ontology-vocabulary.md) (the user's words), [09](09-context-file.md) (`CONTEXT.md`, the six kinds of statement, "the exception that ruins it"), [05](05-mockups-alternatives.md) (sketches) and [11](11-data-diagrams.md) (the data map and its numbered sentences); it does not repeat them. Research only: no skill file was changed. Research date 2026-10-01.

Tags: `[INFERENCE]` is my reasoning. `[UNVERIFIED]` means I could not confirm it in a primary source. `[snippet]` means I saw a source only as search-result text. `[LOCAL]` means I ran it on this machine (Windows 11, Bun 1.4.2, Node v24.21.0, Edge headless; scratch files deleted afterwards). `[REPO]` is a fact about this repository's skill files as read today. UML section numbers are from the OMG PDF [3], whose text I extracted.

## What a lifecycle catches

A concept earns a place only if it catches a plausible wrong turn cheaply. These are the wrong turns a lifecycle catches. The table says where the catch happens.

| Wrong turn | Example | Caught by |
|---|---|---|
| A stage nobody mentioned | The user says "paid"; the sheet also has "Part paid" | Counting the words in the user's own Status column (rec 4) |
| A word that is not a stage | "Late" is typed by hand and goes stale: one overdue row says Part paid, another says Late | Comparing the word with the dates (rec 3) |
| A move nobody mentioned | A payment bounces and the invoice must go back | Three or four past-tense questions (rec 5) |
| A move the tool allows but should not | A paid invoice gets cancelled; a sent invoice is sent twice | The "Never" list and the generated checks (recs 7, 13) |
| A button that makes no sense | "Record payment" on a cancelled invoice | Buttons built from the table (rec 10) |
| A change that quietly breaks a rule | A later edit lets a Cancelled invoice come back | The checks run on every change (recs 13-14) |

## Recommendations for the workbench

Each recommendation says what the AI does, when, what the user sees, which skill file it would change, and why. The user never sees the words state, transition, guard, lifecycle, event or statechart ([02](02-ontology-vocabulary.md) rec 4, [09](09-context-file.md) rec 15). In the text below, "stage" stands for the user's own word for it (their column header: Status, Step, Stage, "Where it is").

### A. Whether to model a lifecycle

**1. Look for a lifecycle silently, while reading the first sample. Model one only if the tool changes a thing over time.**
- *AI does.* In interview step 3 ("walk the workaround"), when a sample file arrives, scan it for: a column with few repeating words that sound like steps (Status, Stage, "Done?", Sent/Paid flags); pairs of date columns that fill in over time (Sent on, Paid on); and, in what the user says, before/after words ("once", "after", "still waiting", "not yet", "already", "chase", "reopen"). People seldom name a stage outright. In Pane et al., when an earlier event mattered, the children marked it by present tense (56%: "When PacMan eats a special dot he is able to eat the ghosts"), by the word *after* (19%) and by a state variable only 11% of the time [16] (12 non-programmer ten- and eleven-year-olds describing Pac-Man; thin for adults `[INFERENCE]`). So "once it's been paid" is how a stage will usually arrive. Then ask yourself: will the tool *change* the thing (a button that sends, pays, closes; a list filtered by stage)? If yes, model it. If the tool only reads and summarises, do not.
- *When.* Interview step 3, before "the shape" ([REPO] `build.md`).
- *User sees.* Nothing yet.
- *Files.* `build.md` (step 3), a new AI-only `life.md` modelled on `data.md` ("for you, not the user").
- *Why.* Harel separates *reactive* systems, whose behaviour is "the set of allowed sequences of input and output events", from *transformational* ones, where "an input/output relation is usually sufficient" [1]. Most workbench tools are transformational (a CSV in, a summary out). The ones that are not are exactly the ones where a wrong move costs something.

**2. Skip it when there is no life, and say nothing.** Skip when: the tool is one-shot (import, transform, export, nothing kept); the only "state" is done/not-done with no rule attached (a checkbox is a yes/no, not a lifecycle: put the one rule in `CONTEXT.md` "Rules" if there is one); the column is free text with no rule behind it (treat it as data); or the table would have fewer than three stages or three moves. Cheap test: *if the tool allowed any move at any time, would anything go wrong or look silly?* If not, there is nothing to model. `[INFERENCE]` for the thresholds. The user sees nothing, and is not asked.

**3. Separate stages that are *set* from words that are *worked out*.** Many status words are not events the user caused but facts that follow from dates and amounts: "Late" (unpaid and past due), "Expiring soon", "Needs chasing". UML calls the trigger a TimeEvent: an event "at a specific point in time", absolute or relative [3 §13.4.10]; Harel's version is `timeout(event, number)` [1 §4.2]. In a sheet these words are typed by hand and go stale.
- *AI does.* For each candidate word, check the sample: does the word agree with the dates? If rows disagree (one overdue row says Late, another does not), the word is worked out. Do not store it as a stage; show it automatically. Write it on one line under the stages ("Worked out, never set: Late = ...").
- *User sees.* One question with a suggestion (rec 5) and, later, a "LATE" tag that appears by itself.
- *Files.* `life.md`; `CONTEXT.md` (the word and its meaning).
- *Why.* It removes a whole class of stale data, and it is checkable from the user's own rows. It is also the point where the AI may otherwise build the wrong thing: a Late *button*.

### B. Finding it with the user

**4. Start from their words and their rows, and echo them with counts.** Put the sample's distinct status words in a small table with a count and one real row each, tricky rows first ([REPO] `build.md`: "show the thing itself, the rows"). A stage is a *resting situation*: something the thing can be in for days. Test with a question they can answer: "Would an invoice sit like that for a while?" If not, it is a move ("Send", "Chase"), not a stage. UML says the same: a state is "a situation ... during which some invariant condition holds", usually implied by its name [3 §14.2.3.4]. Use the user's column header as the word for "stage". Files: `build.md`, `talking.md`.

**5. Ask at most four questions, each in the past tense, each with a suggested answer, one per message.** They come from the review list in the SSADM method for entity life histories: interaction with other things, abnormal endings, *reversions* ("resumption of normal life") and events that can happen at any time [4]. Jackson's JSD starts the same way: list the actions in the order they happen in the thing's life [5] `[snippet]`.
1. *The usual way.* "Is the usual way Draft, then Sent, then Paid? I'd say yes, with Part paid in between." (Hull's "sunny day" path first [9].)
2. *Back-steps.* "Has a payment ever bounced, so a Paid invoice had to go back?" Suggest what the sample hints at.
3. *Dead ends.* "Has a cancelled invoice ever come back?" Suggest "no, you'd write a new one".
4. *Locks.* Only if the tool lets them edit: "Once it's sent, should the amount still be changeable?" Suggest no.

Ask the concrete "has it ever happened" form, never "can it ever": [09](09-context-file.md) rec 10 bars hypotheticals the user has never met, and [01](01-interview.md) rec 11 supports the past incident. An unanswered question takes the strict default: the move is refused, with a plain reason on screen (rec 12). A wrong refusal shows up the first time they click; a wrong permission can corrupt data silently `[INFERENCE]`. Pick which of 2-4 to ask by the test in [09](09-context-file.md) rec 16: "what happens if the tool allows this and it's wrong?" Files: `talking.md`.

**6. Treat a contradiction in the rows as a question, using the rule that already exists.** "Corvid 2026-013 says Paid but no payment is recorded. Was it paid in full?" This is `talking.md`'s "a rule the data contradicts" applied to stages. Files: none new.

### C. The text the AI keeps

**7. One block per thing, in the tool's `NOTES.md`, after "## Data": `## Life of a <thing>`.** Three parts and one line, in the user's words. The block is the source; code and tests are derived from it (as the data map is derived from its tables in [11](11-data-diagrams.md) rec 5).

```markdown
## Life of an invoice
Stages
| Stage | Means | Still on the to-do list | Locked once here |
|---|---|---|---|
| Draft | still being written | yes | |
| Sent | with the client, nothing paid | yes | amount, client |
| Part paid | some money in | yes | amount, client |
| Paid | all the money in | no | amount, client |
| Cancelled | dropped | no | everything |

Worked out, never set: Late = Sent or Part paid, and the due date has passed.

Moves
| # | From | What happens | To | Only if | Then |
|---|---|---|---|---|---|
| 1 | (new) | you write it | Draft | | give it the next number |
| 2 | Draft | you send it | Sent | it has a client, an amount and a due date | note the date sent |
| ... |

Never
- Cancelled -> *
- Paid -> Cancelled
```

Rules for the block:
- Rows run in the *usual order* first, exceptions after. "From" may list several stages (one row instead of three; Harel's economy of group exits [2]). `(new)` is the start. A row with a blank "Only if" always applies.
- "Only if" is one plain sentence in their words. "Then" is what must be recorded or cleared on arrival (UML's entry behaviour [3 §14.2.3.4.3]); the generated checks do not test it, ordinary unit tests do.
- "Never" lists moves the user has ruled out: it is the table's "can't happen" cells written down (Executable UML's third kind of cell [7]). Only things the user said, or the AI offered and they accepted.
- "Locked once here" comes from Cohn and Hull's point that who may change what depends on the artifact's state [9]. It is only written if the tool edits data.
- Keep to about 8 stages and 12 moves `[INFERENCE]`; the user reads the block back, and [02](02-ontology-vocabulary.md) rec 13 already limits the words they must hold. IBM's full Deal model had about 70 states and 100 attributes [9]; that is not a workbench tool.

Files: `starters/NOTES.md` (the empty block, created at its first entry as in [09](09-context-file.md) template rules), `life.md` (the format).

**8. The stage *words* also go into `CONTEXT.md`; the *moves* do not.** `CONTEXT.md` is "a glossary and nothing else" ([09](09-context-file.md) rec 2). Stage names and what they mean are glossary entries ("**Part paid**: some money is in, not all"). Put them under a "Stages" heading, created at its first entry; synonyms go on `_Also said_` ("Late": overdue). The moves are rules about behaviour, so they live in NOTES. This also settles the standing example in `talking.md`, "'done' for a bill: sent, or paid?": the "Still on the to-do list" column answers it. If the user explains *who says so* about a "Never" line ("my accountant says a sent invoice can't be changed"), that also goes under "Rules we must follow" with who set it ([09](09-context-file.md) rec 21). Files: `talking.md` (template), `starters/NOTES.md`.

**9. Independent things get separate tables; never one big product.** If the sheet has two independent status columns (Invoice status and Reminder status), write two blocks. One block with every combination grows with the product of the parts: Harel's "exponential blow-up", the reason he added orthogonal components [1][2]. `[INFERENCE]` Check in the sample which combinations really occur; combinations that never occur are a rule to confirm ("Has a reminder ever gone out for a Draft?"). Over about 8 stages, split by independence, or the tool is too big for one milestone ([REPO] `build.md` appetite).

### D. What the user sees

**10. A clickable board plus numbered sentences. Never boxes and arrows by default.**
- *AI does.* At milestone 2 ("the shape"), make a sketch ([REPO] `stack.md` "Sketches"): one column per stage, one card per real row from their sample, and buttons built from the Moves rows. A button exists only where a move exists. Where a move exists but its condition fails, the button is greyed with the reason ("needs: a client, an amount and a due date"). Where the table has no move for this stage, the button is greyed with "not from here". Worked-out words (Late) appear as tags. Under the link, the same rows as numbered plain sentences, as the data map does ([11](11-data-diagrams.md) rec 2). Start with the usual path.
- *User sees.* "Click through it; is anything missing, or in the way?" A greyed "Cancel" on a Paid card makes the "Never" list *visible*: the user reacts to a missing button, which is the cheap place to find "but I do need to cancel a paid one when I refund".
- *Files.* `stack.md` (sketches), `build.md` (milestone 2).
- *Why.* Evidence that non-experts read state diagrams is thin (see "Evidence on non-experts" below). What exists points the same way as [11](11-data-diagrams.md): untrained readers gained from text but not from a BPMN diagram (its source 23); laypeople found data-flow diagrams "too busy" and wanted simple pictures with text beside them (its source 24). A board with *their own rows* is also what they already use in a spreadsheet's status column or a Trello list. `[INFERENCE]` that it is closer to their picture than a state diagram. [LOCAL] I built the board sketch from the Moves rows (about 65 lines, one HTML file) and drove it in headless Edge under the exact sketch policy: send is greyed for the draft with no due date, cancel is greyed on Paid, every button is greyed on Cancelled, a payment moves a card to Paid, a bounce on a lone payment moves it back to Sent, three cards carry the LATE tag, and 0 policy violations.
- If IT or a colleague asks for "a proper state diagram", draw it from the same rows and say what it is called (Mermaid `stateDiagram-v2` text in a forwardable message, never in chat; [11](11-data-diagrams.md) recs 6 and 13 give the reasons).

**11. Show it once at "the shape"; after that a change is a one-line table edit.** When the user asks for something the table does not allow ("I need to cancel a paid one when I refund"), the AI edits the table first, says it in one line ("Added move 8: Paid, you refund it, Cancelled. I took 'a Paid invoice can't be cancelled' out of the Never list."), regenerates the checks, then changes the code. It never adds a bypass ("set any stage") on its own; a bypass would make the table untrue. Whether to offer one later is open (see "Open questions"). Files: `build.md` (the loop), `life.md`.

### E. How it becomes code and checks

**12. Code shape: a text-valued stage type, one `step` function, one place the buttons ask.**
- A union of the stage words (`'Draft' | 'Sent' | ...`), one function `step(stage, what, facts)` that returns the next stage or "refused", and an exhaustiveness check so a new stage that is not handled fails to compile. That is the "make illegal states unrepresentable" idea [12] and Feldman's "make impossible states impossible" [11]; in TypeScript the tool is `never` in a `default` branch [13]. Facts the rules need ("the payments cover the amount") are computed elsewhere and passed in, so the rules can be tested without the data.
- The UI asks the same function "what can I do from here?", so a button cannot exist where the rule refuses.
- The default for a refused move is *refuse and say why*. UML's default is the opposite: an event with no enabled transition "is discarded" [3 §14.2.3.9.1]. Executable UML makes the modeller choose, per stage and event, between a transition, *ignore* and *error* ("can't happen") [7]. We use three: **move**, **refuse with a reason**, and **nothing happens** (only for a harmless repeat, such as a double-click on Send).
- Stored stage text is part of the data: renaming "Part paid" is a migration, so it goes through the `data-safety` block's numbered migrations ([REPO] `data.md`, [03b](03b-data-storage.md) as summarised in the README). A record keeps the date of each move (the "Then" column), so "when was it sent?" needs no extra column `[INFERENCE]`.
- Files: `stack.md`/`blocks/` (a possible `lifecycle` block, see rec 13), `data.md` (migration line).

**13. Generate the checks from the table: every stage, every event, every yes/no combination of the facts.** This is "all transitions coverage" in the ISTQB syllabus: exercise all valid transitions *and* attempt the invalid ones, one invalid transition per test so one defect cannot mask another [14]. The same syllabus says a state table, unlike a diagram, "explicitly shows invalid transitions" as empty cells [14]. The table is the oracle; `step` is written separately by hand; the test compares the two. (If the code simply *read* the table at run time the test would be a tautology. `[INFERENCE]` Both are written by the AI, so errors can correlate; the independent check on the table side is the user's read-back at the shape.) Checks, all in `npm test` ([REPO] starters run `node --test`):
- one test per cell (stage x event x facts);
- at most one row fires for any stage, event and facts (no overlapping conditions: UML's "conflicting transitions" [3 §14.2.3.9.3], Harel's contradictions [1]);
- every stage is reachable from `(new)`;
- every "Never" line is respected by the Moves rows;
- every stage and condition named in the table is known to the code (an unknown one stops the run with the row number);
- the user's real episode, as a walk ("last Tuesday's invoice", [01](01-interview.md) rec 18);
- every status word in their real sample files is a stage, a worked-out word or is flagged, never guessed: this is checklist item 5 in `data.md` ("anything silently lost?") applied to words.

The cost is small. [LOCAL] A 113-line file, listed under "From table to checks" below, parses the NOTES block and runs 203 checks (5 stages x 5 events x 8 fact combinations, plus 3 whole-table checks) in about 0.05-0.3 s under Bun 1.4.2 and 0.9 s under Node 24, with no dependency. Four planted mistakes were all caught, each named by its cell: the code allows cancelling a Paid invoice (8 failures); the user's table edit opens Paid -> Cancelled (9 failures: 8 cells plus the Never check); a row loses its condition (8 failures, `moves 3,4 both fire`); the table names a condition the code does not know (the run stops before any test, `move 6: don't know "some payments are left"`).
Files: a tested block `blocks/lifecycle/` (the parser and generator, about 60 lines, so each tool does not reinvent them), `build.md` (loop step 5), `stack.md`.

**14. The moves check, at the three moments the exits check already runs.** Before "thinnest working tool", before every "Ship it", and before a save point for a change that touches stages: run the generated checks; they read `../../NOTES.md`, so a stale table or stale code fails the same run. `[UNVERIFIED]` that `tools/<name>/app/test/` can always reach `tools/<name>/NOTES.md` after packaging; tests are not packaged `[INFERENCE]`. A failing check is fixed by correcting the *table* if the user's rule changed, or the *code* if it did not, and says which in one line. Files: `build.md`, `data.md` pattern.

### F. What to skip

**15. Do not use the rest of the machinery.** No statechart, UML or Stately diagram for the user; no nested or parallel states, history, fork/join, entry/exit/do activities, run-to-completion events, deferred events; no XState dependency, visualiser or inspector (an extra npm package in a hardened starter for a 60-line job; the sketch policy also blocks external scripts [REPO] `stack.md`); no event bus; no separate "states" and "events" vocabulary lesson; no state-machine talk in chat; no model-based test library; no BPMN or activity charts (they follow steps, we follow the *thing*: see business artifacts below). If a tool truly needs nested or parallel parts (a thing that is both "in review" and "overdue" with separate rules), that is the signal to split it into two tables (rec 9) or to move up to a library; do not start there.

## Concepts, one by one

### Harel's statecharts and "On Visual Formalisms"
*What.* Statecharts extend state diagrams with "hierarchy, concurrency and communication" [1]; in the 1988 paper's equation, "statecharts = state diagrams + depth + orthogonality + broadcast communication" [2]. A flat state diagram has four problems: no depth, many arrows for events that apply to many states, exponential growth of states, and no concurrency [2]. States are drawn as nested blobs: the outside blob stands for "this or that, not both" (XOR) and an arrow leaving it applies to everything inside [1][2]. The 1988 paper argues for diagrams that are *topological* (inside, outside, connected), not geometric [2] `[abstract and key passages read; I did not read every section]`. The basic unit is the sentence "when event a occurs in state A, if condition C is true, the system transfers to state B" [1], which is a row of our table.
*Good at.* Big reactive systems (watches, avionics), and cutting the arrows by grouping states [1]. Time limits through `timeout(event, n)` [1 §4.2].
*Fails.* The author says overlapping states can make a spec "incomprehensible" and that formal semantics are "a quite delicate matter" [1]. Nobody has shown non-programmers reading them.
*Verdict.* **Adopt silently** four ideas: one stage at a time; group exits ("From: Draft, Sent, Part paid"); time-driven words are worked out, not set; independent parts get separate tables. **Skip** the notation.

### UML 2.5.1 state machines, at the level a coding agent needs
| UML term [3] | Meaning | In the workbench |
|---|---|---|
| State (§14.2.3.4) | A situation "during which some invariant condition holds" | A stage; the "would it sit like that for days?" test |
| Transition (§14.2.3.8) | One arc, source to target; text form `trigger [guard] / behaviour` (§14.2.4.8) | A row: From, What happens, Only if, Then |
| Guard | Boolean; the transition fires only if true | "Only if" |
| Conflicting transitions (§14.2.3.9.3) | Two enabled arcs out of one state: only one fires | Generated check: at most one row fires |
| Initial and final | Start point; a final state means the region "has completed" (§14.2.3.6) | `(new)`; stages with nothing leaving (the "Never" list) |
| Entry and exit behaviour (§14.2.3.4.3) | Run on entering / leaving | "Then" (entry only) |
| Composite state and group transitions (§14.2.3.8.2) | An arc from a parent applies to all substates | "From" with several stages |
| History (§14.2.3.4.4) | Return to the last active substate; "eliminates the need for users to explicitly keep track of history" | Skip; a bounce is handled by a fact ("some payments are left") |
| Regions (§14.2.3.2) | Parts that run concurrently | Separate tables |
| Unhandled event (§14.2.3.9.1) | "Discarded" | Not our default: refuse and say why |
| Time event (§13.4.10) | Event at a point in time, absolute or relative | A worked-out word, or a daily check |
| Protocol state machine (§14.4.3.1) | "A specification of the lifecycle of an instance of the Classifier ... from an external perspective", with pre- and post-conditions | The closest UML name for the block we keep |

*Verdict.* **Adopt silently** this subset. UML also says the *duration* of a transition is undefined and the order of event dispatch is "left undefined" [3 §14.2.3.8, §14.2.3.9.1]: a coding agent must decide both (we decide: one action at a time, refuse the rest). **Skip** the rest.

### Entity life histories (SSADM)
*What.* A diagram of "the complete catalogue of events that can affect a data entity from its creation to its deletion", with *sequence*, *selection* and *iteration* (zero or more) drawn as a tree, and a "parallel life" for events that can happen at any point (a change of address) [4]. The useful tools around the diagram are an **entity/event matrix** (rows: things, columns: events, each cell "1", "many" or none) and a **review list** (interactions, abnormal deaths, reversions, random events) [4]. Later SSADM adds "state indicators" with "valid previous values" [4]: a state table in all but name.
*Fails.* The tree notation is for analysts. Iteration, selection and "quit and resume" are ways to draw loops and branches that a plain table already holds.
*Verdict.* **Adopt silently** the questions and the review list (rec 5) and the events-by-thing matrix as the AI's scratch work. **Skip** the notation.

### Jackson System Development entity structures
*What.* Start with a list of *actions* (things that happen to an entity in the real world), define each with its attributes, then draw their time order as a tree [5] `[snippet]`. The key idea is time-ordering, not data structure.
*Verdict.* **Adopt silently** as the interview order: first what happens, then in what order. **Skip** the tree. It overlaps with EventStorming, which [02](02-ontology-vocabulary.md) already adopts for vocabulary: an event on a sticky note is a move here.

### Shlaer-Mellor object lifecycles, and Executable UML
*What.* Each class gets a state model; behaviour is expressed as events, states and actions, precise enough to run [6]. In the Executable UML rules, every event in every state is exactly one of **transition, ignore or error** ("can't happen") [7].
*Good at.* Completeness: a table of stages x events where every cell must be decided.
*Verdict.* **Adopt silently** the completeness rule: for every stage and every event the AI knows exactly which of {move, refuse, nothing} applies. The generated checks enforce it.

### Business artifacts (IBM)
*What.* Model the key business thing (an Air Courier Package, a Deal) as one unit with an **information model** and a **lifecycle model** [8][9]. Contrast with *activity-flow* models, where data is seen as "second-class citizens", and *document* models, where the process is "impoverished" [9]. In IBM Global Financing the Deal's lifecycle was drawn with a solid "sunny day" path and dashed extra transitions, and it "is easily understood by executives" [9] (an authors' claim from engagements, not a test). Once the key artifacts are identified, "they become the basis of a stakeholder vocabulary" [9]; a running prototype could be generated from the model so designers and executives could "step through different scenarios" [9]; and what a performer may change can depend on the artifact's state [9].
*Verdict.* **Adopt the idea, silently:** organise by the *thing*, not by the steps; sunny day first; stage-dependent edit rights ("Locked once here"); generate something the user can click. **Skip** the declarative variants and the BPM tooling.

### XState and Stately
*What.* A TypeScript library for state machines and statecharts with a visual editor, path generation (`getShortestPaths`, `getSimplePaths`) for "model-based testing - automatically generate test cases that cover all reachable states and transitions", and the older `@xstate/test` [10]. The docs claim state machines "are visual and simple to understand" and "a great way to communicate with your team and stakeholders" [10] (a vendor claim, no study).
*Verdict.* **Skip as a dependency**: it is an npm package added to a hardened starter for a 60-line job, and its editor is a hosted web app (the sketch policy blocks external scripts [REPO] `stack.md`). **Borrow** the idea that test paths come from the machine, which rec 13 does with a few lines. If one tool ever needs nested or parallel states, XState is the library to meet it. `[INFERENCE]`

### State-transition tables and tests from them
*What.* A state table has stages as rows and events as columns; cells hold the target (and the action); empty cells are invalid transitions [14]. ISTQB defines **all states**, **valid transitions (0-switch)** and **all transitions** coverage [14]; Chow's W-method (1978) generates complete test sets from a finite-state machine [15] `[snippet]`.
*Verdict.* **Adopt.** All-transitions coverage on a table of 5 stages x 5 events (times the yes/no facts) is exhaustive and takes milliseconds; nothing larger (sequences of moves) is needed for tools this size. `[INFERENCE]`

### "Make impossible states impossible"
*What.* Richard Feldman's elm-conf 2016 talk: if some combinations of data are not allowed, shape the data so they cannot be represented; "Testing is good. Impossible is better" [11] `[snippet: a third-party summary; I did not watch the video]`. Yaron Minsky's "make illegal states unrepresentable" shows a connection record with `option` fields replaced by one variant per state [12]. TypeScript's `never` gives exhaustive `switch` checks [13].
*Verdict.* **Adopt in code.** Limit: data in the user's files, and stored text, can still hold impossible states (Paid with no payment), so the import check in rec 13 stays.

### Status columns and Kanban boards: the user's own lifecycle
*What.* A Status column is already a lifecycle in the user's words. A Kanban board draws one column per stage; the Kanban Guide requires "one or more defined states that the work items flow through" and "explicit policies about how work items can flow through each state" [20]: a stage list plus a moves policy.
*Verdict.* **Adopt as the source of vocabulary and as the display** (rec 10). `[INFERENCE]` that users already have this picture.

### Evidence on non-experts reading state diagrams
Thin. I found no study of non-programmers reading state diagrams of their own tool.
- Controlled experiments on UML statecharts use students: in a family of experiments, composite states did not help understanding in the first four; in the fifth, with a bigger model, the hierarchical version did better [18] `[snippet]`. An 84-participant experiment found activity diagrams more comprehensible than state machines but more error-prone for deriving test cases [19] `[snippet; authors not confirmed]`.
- Petre's studies of graphical programming found that what matters is whether a notation matches the conventions its readers know, and that a hard graphic was read through its textual twin [17] `[snippet]`.
- For laypeople and diagrams in general: [11](11-data-diagrams.md) sources 23-24 (training matters; text first; simple pictures with text beside them).
- Hull's claim that executives understand a lifecycle picture [9] is from engagements.
So the design rests on: their own words and rows; text beside any picture; a thing they can click; and a read-back ([02](02-ontology-vocabulary.md) rec 5).

## Worked example: a freelancer's invoice tracker

*Made-up data.* The user, a freelance designer, shares `invoices.csv` in interview step 3. Today is 2026-10-01.

```
Number,Client,Issued,Due,Amount,Status,Paid so far
2026-011,Delta,2026-06-02,2026-07-02,300,Cancelled,0
2026-012,Birch & Co,2026-06-20,2026-07-20,800,Part paid,400
2026-013,Corvid Ltd,2026-07-08,2026-08-07,500,Paid,
2026-014,Acme,2026-08-03,2026-09-02,1200,Paid,1200
2026-015,Birch & Co,2026-08-15,2026-09-14,640,Late,0
2026-016,Corvid Ltd,2026-09-01,2026-10-15,900,Sent,0
2026-017,Acme,,,450,Draft,0
```

**What the AI finds silently (rec 1, 3, 6).**
- Status has six words, each used once except Paid (twice). The tool will change invoices (send, record payments), so a lifecycle is needed.
- "Late" is set on 2026-015 (due 14 Sep, unpaid) but not on 2026-012 (part paid, due 20 Jul, 10 weeks overdue). Worked out, not set.
- 2026-013 says Paid and has no payment recorded. A contradiction to ask about, and a row for the import check.
- Draft 2026-017 has no due date, so "send" must need one. A "Only if" the user never said.

**Messages the user sees (one per turn, each with a suggestion).**

> 1. Your Status column has six words: Draft, Sent, Part paid, Paid, Late and Cancelled (the last invoice, Acme 2026-017, is a Draft). I read them as the steps an invoice goes through. Is the usual way Draft, then Sent, then Paid, with Part paid in between when only some money has come in? I'd say yes.

*User: "yes".*

> 2. "Late" looks different from the others: nobody does anything to make an invoice late, it just stays unpaid after its due date. In your sheet 2026-015 says Late, but 2026-012 (part paid, due 20 July) doesn't. I'd have the tool show Late by itself on anything Sent or Part paid that's past its due date, so you never have to set it. OK?

*User: "yes please, I always forget."*

> 3. Has a payment ever bounced, so a Paid invoice had to go back? I'd guess now and then, and I'd send it back to Sent. Right?

*User: "Yes, twice this year."*

> 4. And has an invoice you'd cancelled ever come back to life? I'd guess not: you'd write a new one. Right?

*User: "Never. I just rewrite it."*

(The Corvid 2026-013 question is asked at the first look, when the row appears in the result with "Paid, but no payment recorded" marked first.)

**What the AI writes.** The `## Life of an invoice` block in `tools/invoices/NOTES.md` is the one in rec 7, with all seven moves (the full block is the `NOTES` string in the code below). In `CONTEXT.md`, a "Stages" heading is created with five entries ("**Part paid**: some money is in, not all") and `_Also said_: overdue` on Late.

**The shape (milestone 2), what the user sees.**

> **[Open the sketch](/C:/.../tools/invoices/sketches/board.html)**: click the buttons on the Corvid and Acme cards.
> Here is the life of an invoice, in your words:
> 1. You write it. It starts as Draft.
> 2. You send it: Draft becomes Sent, once it has a client, an amount and a due date.
> 3. A payment arrives: Sent or Part paid becomes Part paid if it doesn't cover the amount, Paid if it does.
> 4. You cancel it: from Draft, Sent or Part paid it becomes Cancelled.
> 5. A payment bounces: Paid goes back to Part paid if other payments are left, to Sent if none.
> Never: a Cancelled invoice never comes back, and a Paid invoice can't be cancelled.
> Late isn't a step. The tool shows it by itself when a Sent or Part paid invoice is past its due date.
> Is anything missing, or something you do that the buttons don't allow?

*User: "When I refund a client I cancel a paid one."* The AI answers in the rec 11 form ("Added move 8 ... Updated: the sketch"). [LOCAL] Adding `| 8 | Paid | you refund it | Cancelled | |` and removing the Never line, without touching the code: 8 of 243 generated checks fail (Paid + refund in each of 8 fact combinations). After adding one line to `step`: 243 pass. That is the table-first loop.

### From table to checks (the whole illustration)

[LOCAL] `bun test life.test.ts` and `node --test life.test.ts` both give 203 pass, 0 fail. Running with `BUG=1` switches on the planted mistake in `step` (the line marked "demo switch") and 8 checks fail.

```ts
// Table (as the user sees it in NOTES.md) -> step function -> generated checks.
// Run: bun test life.test.ts      or      node --test life.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';

// 1. The block exactly as it sits in tools/<name>/NOTES.md. The user can read and edit it.
const NOTES = `
## Life of an invoice
Stages
| Stage | Means | Still on the to-do list | Locked once here |
|---|---|---|---|
| Draft | still being written | yes | |
| Sent | with the client, nothing paid | yes | amount, client |
| Part paid | some money in | yes | amount, client |
| Paid | all the money in | no | amount, client |
| Cancelled | dropped | no | everything |

Worked out, never set: Late = Sent or Part paid, and the due date has passed.

Moves
| # | From | What happens | To | Only if | Then |
|---|---|---|---|---|---|
| 1 | (new) | you write it | Draft | | give it the next number |
| 2 | Draft | you send it | Sent | it has a client, an amount and a due date | note the date sent |
| 3 | Sent, Part paid | a payment arrives | Part paid | the payments don't cover the amount | list the payment |
| 4 | Sent, Part paid | a payment arrives | Paid | the payments cover the amount | list the payment; note the date paid |
| 5 | Draft, Sent, Part paid | you cancel it | Cancelled | | keep any payments listed |
| 6 | Paid | a payment bounces | Part paid | some payments are left | take that payment off the list |
| 7 | Paid | a payment bounces | Sent | no payments are left | take that payment off the list; clear date paid |

Never
- Cancelled -> *
- Paid -> Cancelled
`;

// 2. Read it. Any row it can't read stops everything, loudly.
const section = (name: string) => NOTES.split(new RegExp(`^${name}$`, 'm'))[1].split(/^(?:Stages|Moves|Never)$/m)[0];
const table = (name: string) =>
  section(name).split('\n').filter((l) => l.startsWith('|')).slice(2).map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));
const STAGES = table('Stages').map(([name, , open]) => ({ name, open: open === 'yes' }));
const MOVES = table('Moves').map(([n, from, what, to, only]) => ({ n, from: from.split(', '), what, to, only }));
const NEVER = section('Never').split('\n').filter((l) => l.startsWith('- ')).map((l) => l.slice(2).split(' -> '));
const known = new Set(['(new)', ...STAGES.map((s) => s.name)]);
for (const m of MOVES) for (const name of [...m.from, m.to]) assert.ok(known.has(name), `move ${m.n}: unknown stage "${name}"`);

// 3. Plain-English conditions -> yes/no facts. A condition the table uses but this map lacks stops the run.
type Facts = { complete: boolean; covers: boolean; left: boolean };
const WHEN: Record<string, (f: Facts) => boolean> = {
  '': () => true,
  'it has a client, an amount and a due date': (f) => f.complete,
  "the payments don't cover the amount": (f) => !f.covers,
  'the payments cover the amount': (f) => f.covers,
  'some payments are left': (f) => f.left,
  'no payments are left': (f) => !f.left,
};
for (const m of MOVES) assert.ok(m.only in WHEN, `move ${m.n}: don't know "${m.only}"`);

// 4. The code under test: what the tool's lifecycle.ts would look like. null = refused.
type Stage = 'Draft' | 'Sent' | 'Part paid' | 'Paid' | 'Cancelled';
function step(s: Stage, what: string, f: Facts): Stage | null {
  switch (s) {
    case 'Draft':
      if (what === 'you send it' && f.complete) return 'Sent';
      if (what === 'you cancel it') return 'Cancelled';
      return null;
    case 'Sent':
    case 'Part paid':
      if (what === 'a payment arrives') return f.covers ? 'Paid' : 'Part paid';
      if (what === 'you cancel it') return 'Cancelled';
      return null;
    case 'Paid':
      if (process.env.BUG && what === 'you cancel it') return 'Cancelled'; // demo switch: plants the mistake
      if (what === 'a payment bounces') return f.left ? 'Part paid' : 'Sent';
      return null;
    case 'Cancelled':
      return null;
    default: {
      const unreachable: never = s; // adding a stage to the type without handling it fails to compile
      return unreachable;
    }
  }
}

// 5. Generated checks: every stage x every event x every yes/no combination of the facts.
const EVENTS = [...new Set(MOVES.map((m) => m.what))];
const bools = [false, true];
for (const s of STAGES)
  for (const what of EVENTS)
    for (const complete of bools) for (const covers of bools) for (const left of bools) {
      const f = { complete, covers, left };
      const hits = MOVES.filter((m) => m.from.includes(s.name) && m.what === what && WHEN[m.only](f));
      test(`${s.name} + ${what} ${JSON.stringify(f)} -> ${hits[0]?.to ?? 'refused'}`, () => {
        assert.ok(hits.length <= 1, `moves ${hits.map((h) => h.n)} both fire`);
        assert.equal(step(s.name as Stage, what, f), hits[0]?.to ?? null);
      });
    }

// 6. Whole-table checks.
test('every stage can be reached', () => {
  const seen = new Set(['(new)']);
  for (let grew = true; grew; ) { grew = false; for (const m of MOVES) if (m.from.some((x) => seen.has(x)) && !seen.has(m.to)) { seen.add(m.to); grew = true; } }
  assert.deepEqual(STAGES.map((s) => s.name).filter((n) => !seen.has(n)), []);
});
test('the "Never" list is respected by the table', () => {
  for (const [from, to] of NEVER)
    assert.deepEqual(MOVES.filter((m) => m.from.includes(from) && (to === '*' || m.to === to)).map((m) => m.n), [], `${from} -> ${to}`);
});
test("last Tuesday's invoice: send, part payment, final payment", () => {
  const f = { complete: true, covers: false, left: false };
  let s: Stage = 'Draft';
  for (const [what, facts] of [['you send it', f], ['a payment arrives', f], ['a payment arrives', { ...f, covers: true }]] as const) s = step(s, what, facts)!;
  assert.equal(s, 'Paid');
});
```

Notes on the illustration. The facts (`complete`, `covers`, `left`) are yes/no inputs; in the tool, ordinary unit tests check that they are computed correctly from amounts and payments. The "Then" column, "Locked once here" and the worked-out Late tag are tested by ordinary unit tests too; the generated checks cover which moves are allowed. In the starters the test file would be `app/test/lifecycle.test.mjs` importing `../src/lifecycle.ts` (Node strips types; no enums or parameter properties, as the starter's `logic.ts` says [REPO]) and reading `../../NOTES.md`.

## Open questions

- **Can non-technical users find a wrong or missing move from a board plus numbered sentences?** No test found. A hands-on check with two or three users: seed a table with one extra allowed move and one missing move; count how many they catch at "the shape". This is the one claim the whole design leans on.
- **Do independent hand-written code and a table catch the AI's own mistakes, when the same AI writes both?** I planted four mistakes myself; that shows the checks work, not that the AI's errors are independent. A seeded-bug run with a real build would tell.
- **Escape hatch.** Should the tool ever offer "correct a mistake" (set any stage, with a one-line reason and a log)? Real sheets get hand edits. Against: it makes the table untrue. Default here: no, add the move instead (rec 11). Untested.
- **Store the stage, or work it out from dated facts?** A sheet with "Sent on" and "Paid on" columns already stores the facts; the stage could be computed (no stale stage, no migration on a rename). Against: cancelled and bounced need extra facts. I recommend storing the stage plus a dated move list (rec 12) but have not compared the two in a build.
- **Where the parser and generator live.** A tested `blocks/lifecycle/` is my suggestion; the main agent decides. Not built here.
- **NOTES.md reachable from the tests after packaging** `[UNVERIFIED]` (rec 14).
- **Base rate.** How many real tools have a lifecycle? I have no count. Of the three example tools in the brief, the invoice tracker and the book club's membership fees have one (the invoice; the member), while a household-bills summary built from two bank CSVs mostly does not `[INFERENCE]`. The skip rule (rec 2) matters as much as the model.
- **Tenses and other languages.** Pane's data are English-speaking children [16]; whether "present tense for the past event" holds in the user's own language is unknown.

### Conflicts with other traditions and with current rules

- **Use cases and user stories vs lifecycle.** A user story or use case is one *goal* ("As a freelancer I send an invoice"); a lifecycle is the *set of moves* on one thing. They can share rows: a move is a story's "when/then". The traditions disagree about the unit (goal vs thing); this note picks the thing for tools that change things, and leaves goals to the interview. A lifecycle is not a replacement for acceptance cases; it supplies the forbidden cases that stories rarely list.
- **Data model (entity-relationship) vs lifecycle.** An ER diagram says what a thing *has*; a lifecycle says what can *happen* to it. The status value lives in the data model; its allowed changes live here. Stage text is stored, so a rename is a migration (rec 12).
- **`CONTEXT.md` "a glossary and nothing else"** ([09](09-context-file.md) rec 2). Only stage *words* go there (rec 8); the moves go in NOTES. If the main agent wants a stricter reading, put the words in the NOTES block too.
- **`build.md` "ask only when a wrong guess is expensive" and "one question per message"**. Rec 5 asks up to four questions, one per message, and only when a wrong guess would be costly; a trivial lifecycle (rec 2) asks none.
- **`talking.md` "no hypotheticals".** "Can a paid invoice be undone?" would break it; "has a payment ever bounced?" does not. The note uses the second.
- **`data.md` item 5.** The import check for status words is the same check, applied to words.
- **UML default vs ours.** UML discards an event with no enabled transition [3 §14.2.3.9.1]; we refuse and say why. Executable UML's three-way choice [7] is closer.
- **Statecharts' strength is hierarchy and concurrency; this note skips both.** That is deliberate for tools of one person and a few stages; it would be wrong for a real-time controller.
- **Sibling notes (written in parallel; read after drafting).** [17](17-data-models.md) rec 7 says store base facts and work out the rest, but keep a value a person types (its "Lapsed") as a base fact. Rec 3 here agrees only after the user does: "Late" is worked out because they said so (message 2 of the worked example); if they say "I decide who has lapsed", that word stays a stage. [14](14-classic-requirements.md) adopts Cockburn's extensions ("what else can happen"); that is the same ground as rec 5's back-steps, so the AI asks one set of questions, not two. [15](15-agile-artifacts.md) keeps a "Cases" table of rules and examples (6-15 rows); a "Never" line is a rule there, and its refused cell is an example. The AI should not copy the generated grid (hundreds of cells) into Cases.

## Sources

[1] David Harel, "Statecharts: A Visual Formalism for Complex Systems", *Science of Computer Programming* 8(3):231-274, 1987, full text from the Internet Archive scan, https://archive.org/details/7.-statecharts (opened 2026-10-01). Reactive vs transformational systems; state-transition sentence; XOR clustering, history, timeouts (§4.2), exponential blow-up, orthogonality.
[2] David Harel, "On Visual Formalisms", *Communications of the ACM* 31(5):514-530, 1988, https://www.cs.mcgill.ca/~hv/articles/DiscreteEvent/StateCharts/ACM.OnVisualFormalisms.pdf (opened 2026-10-01; text extracted). Topological diagrams; "statecharts = state diagrams + depth + orthogonality + broadcast communication"; four problems of flat state diagrams.
[3] Object Management Group, *Unified Modeling Language (UML) 2.5.1*, formal/17-12-05, https://www.omg.org/spec/UML/2.5.1/PDF (downloaded and text extracted 2026-10-01). §13.4.10 (TimeEvent); §14.2.3.1-14.2.3.9 (states, history, transitions, event processing, enabled and conflicting transitions); §14.2.4.8 (transition notation); §14.4.3 (ProtocolStateMachine).
[4] Elaine Ferneley (Manchester Metropolitan University), "Entity / Event Modelling" (Entity Life Histories), https://www.jacksonworkbench.co.uk/stevefergspages/papers/entity_event_modelling/index.html (opened 2026-10-01). Sequence, selection, iteration; entity/event matrix; review list; state indicators.
[5] John R. Cameron, "An Overview of JSD", *IEEE Transactions on Software Engineering* SE-12(2):222-240, 1986; as summarised in "Jackson system development", https://en.wikipedia.org/wiki/Jackson_system_development and the Jackson Workbench FAQ http://www.jacksonworkbench.co.uk/stevefergspages/jsp_and_jsd/faq.html `[snippet]`. Entity structure diagrams: actions in time order.
[6] Sally Shlaer and Stephen J. Mellor, *Object Lifecycles: Modeling the World in States*, Yourdon Press, 1992 `[snippet: catalogue and book descriptions]`; "Shlaer-Mellor method", https://en.wikipedia.org/wiki/Shlaer%E2%80%93Mellor_method (opened 2026-10-01).
[7] Leon Starr, "Time and Synchronization in Executable UML", 2008, updated 2012, https://web.archive.org/web/20240111201722/https://www.modelint.com/time-and-synchronization-in-executable-uml (opened 2026-10-01; first half read). "Transition, ignore or error"; "Error" is also called "can't happen".
[8] Anil Nigam and Nathan S. Caswell, "Business artifacts: An approach to operational specification", *IBM Systems Journal* 42(3):428-445, 2003 `[snippet: abstract via search results]`; read through [9].
[9] David Cohn and Richard Hull, "Business Artifacts: A Data-centric Approach to Modeling Business Operations and Processes", *IEEE Data Engineering Bulletin* 32(3), 2009, http://sites.computer.org/debull/A09sept/david.pdf (opened 2026-10-01). Information model plus lifecycle model; Deal example; stakeholder vocabulary; BELA/FastPath; state-dependent rights.
[10] Stately, XState documentation: https://stately.ai/docs/xstate, https://stately.ai/docs/state-machines-and-statecharts, https://stately.ai/docs/graph, https://stately.ai/docs/xstate-test (opened 2026-10-01). Path generation for model-based testing; vendor claims.
[11] Richard Feldman, "Making Impossible States Impossible", elm-conf 2016; via the DailyDrip conference notes https://github.com/dailydrip/elmconf-2016 (opened 2026-10-01) `[snippet: third-party notes; video not watched]`.
[12] Yaron Minsky, "Effective ML Revisited" (Jane Street blog), 2011-03-09, https://blog.janestreet.com/effective-ml-revisited/ (opened 2026-10-01). "Make illegal states unrepresentable", before/after code.
[13] Microsoft, *TypeScript Handbook: Narrowing* (`never` and exhaustiveness checking), https://www.typescriptlang.org/docs/handbook/2/narrowing.html (opened 2026-10-01).
[14] ISTQB, *Certified Tester Foundation Level Syllabus v4.0*, 2023, §4.2.4 State Transition Testing, https://www.gasq.org/files/content/gasq/downloads/certification/ISTQB/Foundation%20Level/ISTQB_CTFL_Syllabus-v4.0%20.pdf (opened 2026-10-01; text extracted). State table shows invalid transitions as empty cells; all-states, valid-transitions and all-transitions coverage; one invalid transition per test.
[15] T. S. Chow, "Testing Software Design Modeled by Finite-State Machines", *IEEE Transactions on Software Engineering* SE-4(3):178-187, 1978 `[snippet]`.
[16] John F. Pane, Chotirat Ratanamahatana and Brad A. Myers, "Studying the language and structure in non-programmers' solutions to programming problems", *Int. J. Human-Computer Studies* 54(2), 2001, https://john.pane.net/pdf/PaneRatanamahatanaMyers2001.pdf (opened 2026-10-01; text extracted). §4.9.1 "Remembering state" (study one: 12 non-programmer fifth graders): present tense 56%, *after* 19%, state variable 11%; §6.7.
[17] Marian Petre, "Why looking isn't always seeing: readership skills and graphical programming", *Communications of the ACM* 38(6):33-44, 1995 `[snippet: summaries in search results]`.
[18] José A. Cruz-Lemus, Marcela Genero, Mario Piattini et al., "Assessing the understandability of UML statechart diagrams with composite states: a family of empirical studies", *Empirical Software Engineering*, https://link.springer.com/article/10.1007/s10664-009-9106-z `[snippet: result summaries only]`.
[19] "Comprehensibility of system models during test design: a controlled experiment comparing UML activity diagrams and state machines", https://www.researchgate.net/publication/324695528 `[snippet; page blocked (403); authors, venue and year not confirmed]`. 84 participants, three groups, two institutions.
[20] *The Kanban Guide*, May 2025, https://kanbanguides.org/the-kanban-guide/ (opened 2026-10-01). Definition of Workflow: defined states; explicit policies for flow through each state.
[21] This repository's notes [01](01-interview.md), [02](02-ontology-vocabulary.md), [05](05-mockups-alternatives.md), [09](09-context-file.md), [11](11-data-diagrams.md) (including its sources 23, Ottensooser et al. 2012, and 24, McInnis et al. 2025, cited here only through that note and not re-opened) and the README (for [03b](03b-data-storage.md)). Linked references like [09](09-context-file.md) are these notes; bare numbers are the sources in this list.
[22] This repository's skill files as read on 2026-10-01: `build.md`, `talking.md`, `data.md`, `stack.md`, `starters/NOTES.md`, and the starters' `package.json` test scripts (`node --test`).
