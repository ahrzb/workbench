# Agile and lean artifacts for capturing and checking what the user wants

Scope: which artifacts from agile and lean methods (user stories, job stories, story maps, acceptance criteria, BDD, Specification by Example, Example Mapping, impact maps, walking skeletons and spikes, Definition of Done, MoSCoW, Shape Up, personas, EventStorming beyond vocabulary) help the AI **model what a non-programmer wants**, and **check that it built that**, for small tools made in milestones of minutes to an hour. It builds on [01](01-interview.md) (interview, slot checklist, "turn the real episode into the acceptance test"), [02](02-ontology-vocabulary.md) (words, EventStorming for vocabulary), [05](05-mockups-alternatives.md) (sketches), [06](06-build-loop.md) (the loop), [09](09-context-file.md) (`CONTEXT.md`, goal/need/requirement/guideline/want/solution) and [11](11-data-diagrams.md) (the data map), and the current `build.md`, `talking.md` and `starters/NOTES.md`. Research date 2026-10-01. Tags: **[INFERENCE]** my reasoning, not a finding in a source; **[UNVERIFIED]** could not confirm in a primary source; **[snippet]** I saw only search-result text, not the page; **[LOCAL]** I ran it on this machine (Windows 11, Node 24.21, Bun 1.4.2); **[REPO]** a fact about this repository's skill files as read today. Internal notes are cited as [09]; external sources as [9] (list at the end). Concept names appear in this note only. The user never sees them.

## Recommendations for the workbench

The short version: the traditions that earn a place are the ones that end in **concrete examples the AI can run**. Keep the milestone plan. Add one small text artifact per tool (a table of cases built from the user's own samples), turn it into tests, and use a handful of cheap habits from story splitting, story mapping and Shape Up to size and order the work. Skip the story-writing ceremony.

Each item says what the AI does, when, what the user sees, which skill file would change, and why.

### A. Keep what the user said checkable

**1. Keep a "Cases" table per tool, built Example-Mapping style from the user's samples.**
- *The AI does.* While looking at the samples (interview Stage 2, then the first look), the AI sorts what it learns into three things, as in Example Mapping: **rules** (general statements: "a member is paid up when what they paid this year reaches their fee"), **examples** (one concrete case that shows a rule, with an expected result) and **questions** (a case where nobody, the user included, knows the right result yet) [15]. Rules are the user's own sentences from `CONTEXT.md`, quoted verbatim, so a renamed word renames the case too. Each example is named after the user's episode in the "friends episode" style: "the one where the bank writes her name differently" [15]. That is also how [01] already tells the AI to ask: "tell me about the last time".
- *Rule vs example.* A rule is general; an example has values and an outcome. If the outcome is unclear, it is a question, not an example [15]. A rule that is obvious to everyone gets no example [15]. A rule with many examples may be two rules [15].
- *When.* Start at the first look (milestone 1). Add or retire cases as the loop goes on. Keep it to about 6 to 15 rows [INFERENCE: the number is mine]: BDD suites get costly to maintain as examples multiply, and parts of a system can become frozen by the effort of finding and changing the examples [30].
- *What the user sees.* Not the table, unless they ask. They see the cases inside the first look: their own rows, tricky ones first, each with the result the AI expects ([06] rec 9 and `build.md` milestone 1 already say this). Later, in each hand-back, they see "What I checked: your cases" with the new or changed one named in their words.
- *Files.* New `## Cases` and `## Questions` sections in `starters/NOTES.md`; `build.md` milestone 1 and loop steps 3, 5 and 7; `talking.md` (rule vs example, one short paragraph).
- *Why.* Jeffries says confirmation by examples, "preferably automated", works better than use cases, spreadsheets, sketches or multi-page documents, and that other documents should be added "only if they are clearly needed" [1]. Wynne's Example Mapping is a cheap, low-tech way to get rules, examples and questions out of a conversation: about 25 minutes for a story, four card types, no formal syntax [15]. The workbench already has the pieces in prose (rules in `CONTEXT.md`, "a rule the data contradicts", the ideas shelf); this gives them one home and a use.

**2. Make the user's reaction the oracle, say who confirmed each case, and turn cases into tests.**
- *The AI does.* Each row in Cases has a "Said by" column with three values: **you** (the user confirmed the result), **my guess** (the AI inferred it from the samples), **waiting** (it is in Questions). Only "you" cases count as proof that the tool does what the user wants. "My guess" cases still run, but only as regression checks, and the AI says so. Cases become tests in `app/test/` using the starters' own runner (`node --test`, `npm.cmd test`) [REPO: `starters/*/package.json`]. **Test names are the case names, as sentences.** North's finding is that sentence-style names make the output readable to business users [13]. A case that is "waiting" becomes a `todo` test, so nothing is forgotten and nothing is pretended [LOCAL, see worked example].
- *Two tiers, because notes and tests hold no real data.* `safety.md` says `CONTEXT.md` and `NOTES.md` hold "words and plans, never data" and that examples in them "are made up or generic" [REPO]. `data.md` check 7 says tests and demos are made up [REPO]. So: the Cases table and the tests use **made-up rows shaped like the real ones** (a "twin" of each real case: same kind of odd spelling, same split payment, invented names and amounts). The **real samples** are run by a scratch script (`.workbench/scratch/`, never saved, as `stack.md` already says) that applies the same rules and prints counts and the flagged rows. That printed output is the demo. [INFERENCE: the twin idea is mine; it keeps the note's data rule and still gives the tests the real file's shape.]
- *When.* Cases exist from the first look. Tests exist from milestone 4 (when `app/` exists). Before that, the scratch script runs the same cases.
- *What the user sees.* "6 of your cases pass; 1 is waiting for your answer." They see a case's name only when it fails, is new, or changed.
- *Files.* `build.md` loop step 5 ("add a check for it" becomes "add the case for it") and the hand-back template's "What I checked" line; `data.md` check 5 (see rec 8).
- *Why.* Users and end-user programmers are overconfident testers: in the end-user software engineering survey cited in [06], 5 to 23% of correctness judgments were wrong, mostly calling wrong values right. A table of "you said this, it came out like that" reduces the chance that a plausible-looking wrong row is waved through. The Gherkin reference makes the same point from the other side: "an example is also a *test*", and the outcome checked should be what the user can observe, not something buried inside the system [14]. Jeffries adds that the customer says how she will confirm the work, and the programmers show the tests running [1].

**3. Run a "tester pass" on every rule before building, and keep the answers as Questions, asked one at a time.**
- *The AI does.* The three amigos idea is three perspectives on one piece of work: business ("what problem are we solving?"), development ("how might we build it?") and testing ("what about this? what could possibly happen?") [16]. In the workbench, the user is the business, the AI is development, **and the AI also takes the testing seat**, because the user cannot be asked hypotheticals ([09] rec 10). For each rule, the AI looks in the samples for counterexamples and awkward neighbours: duplicates, blanks, one thing in two rows, a name spelled two ways, a value that arrives in two parts, a row that belongs to nobody, a date on a boundary, a total that does not add up. It sorts each one with the existing test from `talking.md`: "what happens if we get this one wrong?" One that can ruin the result becomes a Question now. One that can wait goes to the ideas shelf. The tool says plainly when it meets it.
- *What the user sees.* One question at a time, with the AI's suggestion and, where possible, the real row that raised it ([09] rec 19: "You said every bill has an order number, but these 3 don't"). Never a list of ten. The AI says how many are left only if the user asks.
- *Files.* `talking.md` (one paragraph under "The usual case vs the case that ruins it": "look for the counterexample yourself first"); `starters/NOTES.md` `## Questions`.
- *Why.* Wynne's red cards turn "an unknown unknown into a known unknown", and a table covered in red tells the group there is still a lot to learn [15]. Ferrari et al. found that an interviewer surfacing an ambiguity often unlocked tacit knowledge ([01] rec 9). The AI can do the sorting alone, and then needs the user only for the cases that matter.

**4. Add a "testable" gate before every change, and pick the next change with North's question.**
- *The AI does.* Before the echo (loop step 2), the AI must be able to name **at least one case** that will show the change works. If it cannot, what is missing is a question, not more code. To choose the change, it asks itself North's question: "What's the next most important thing the system doesn't do?" [13].
- *What the user sees.* Nothing new. The echo line already says "after this, you'll be able to …"; it now has a case behind it.
- *Files.* `build.md` loop steps 1 to 3.
- *Why.* Wake's "testable" says a story carries the promise "I understand what I want well enough that I could write a test for it". He adds that if the customer cannot say how to test it, the story may be unclear, may not be valuable, or the customer may need help testing [2]. "Next most important thing the system doesn't do" matches [06] rec 14 ("what would you do with it tomorrow morning?").

### B. Shape and slice

**5. Phrase the one-sentence first version as a job story. Skip "As a user …", INVEST lists, estimates and story points.**
- *The AI does.* The Stage 4 sentence in `build.md` ("does X for moment Y") gets its three slots: **When** (the situation, in the user's words), **want** (what they are trying to do), **so** (what they get). Example: "When the bank export for the month arrives, the treasurer wants to see who has not paid, so they can send reminders without checking every line." This is the "What it is:" line in NOTES and the seed of the goal. Each milestone's echo uses the same shape.
- *Why a job story and not a user story.* The user-story template is "As a [type of user], I [need/want] to [do something], so that [reason]" [3]. 59% of 182 surveyed practitioners use the Connextra form, and they say the "why" is essential [28]. But for a one-person tool the role is always "me", so the *who* adds nothing and the *when* is what is missing. Cohn says the same: where users do not differ much, job stories are the better fit, and long runs of "As a user …" are the signal [6]. Klement's five steps (start with the high-level job; identify smaller jobs; observe how people solve it now; write the job story from that; only then create a solution) are close to the interview stages already in [01] [7]. Klement also warns that a user story couples implementation with motivation and outcome, so when a feature fails you cannot tell which was wrong [7].
- *What to skip.* Backlogs of stories, INVEST scoring, estimation and points. In the practitioner survey only 23.5% used INVEST, and interviewees called it a training aid for inexperienced teams whose need fades after two or three months [28]. The workbench has one change in flight, so "independent" and "estimable" have no work to do. Four INVEST letters survive as silent checks the loop already makes: negotiable (the echo), valuable and small (loop step 3 "Size"), testable (rec 4).
- *Files.* `build.md` interview step 5; `starters/NOTES.md` "What it is:".

**6. Draw the shape as ordered steps with a "first version" line, keep the later ideas under the step they extend, and keep a words-only screen map in NOTES.**
- *The AI does.* At milestone 2 (the shape), the walkthrough the user clicks through is also written down as: (a) **steps** in the order the user does them (3 to 7 steps, their words); (b) a line under them: what is in the first version, and, **under each step, what comes later** ("the ideas shelf, grouped by step"); (c) **screens** in the breadboard way: for each screen, what you can do there and where each action leads, in words only; (d) for each action that needs a decision, **what the user needs to see to decide** (the EventStorming "information" note). Items (a) and (b) go in `## Steps`; (c) and (d) go in `## Screens`, both in the tool's NOTES.
- *Why this is needed.* `stack.md` says sketches are never saved [REPO], so once the clickable sketch is gone, the agreed shape lives only in chat. [02] cites Pail's finding that design decisions "rapidly disappeared into chat history" and Laban et al.'s multi-turn unreliability; [06] rec 19 keeps a progress file for the same reason. Patton's point about flat backlogs is the same: without the map, stories become "context-free mulch" [9]. A text breadboard (places, things you can act on, lines between them) is the cheapest durable form [23].
- *What the user sees.* The walkthrough they already get, plus one question: "Is there a step I missed? Is the first version above the line right?" Patton reports that users, walking the map, say "you've missed a couple steps here" [9]. The AI keeps screens and the information-to-decide table to itself.
- *Files.* `build.md` milestone 2; `starters/NOTES.md` (replace the flat `## Ideas shelf` with "Ideas shelf (by step)" and add `## Steps` and `## Screens`).
- *How it relates to the milestone plan.* Patton's map orders slices by value, top row first, and calls the top row the walking skeleton [9]. The workbench plan puts risk first: first look and "the hard part" before the thinnest tool. Keep the plan. Shape Up's hill-chart chapter says to push the riskiest unknowns uphill first so surprises do not arrive at the end [24]. The map and the plan answer different questions: the map says *what*, the plan says *in what order to learn*.

**7. Give the AI a short splitting menu for "Size" and "Slice", and end every spike with a written answer, not code.**
- *The AI does.* When a change is too big for one build and a one-minute try, or the first version is still too large, it splits with Cohn's SPIDR (**S**pike, **P**aths, **I**nterfaces, **D**ata, **R**ules) [5] plus three of Lawrence's patterns [4]. In the user's words: "just the usual path first" (paths); "a plain table before a nice screen" (interface); "just Bank A's layout first" (data); "ignore the exception rule for now and flag those rows" (rules); "end to end with a crude middle step" (workflow steps); "read-only before editing" (operations). Lawrence's rule for choosing a split: pick the one that lets you throw something away, then the one that gives more equal pieces [4]. His meta-pattern for a first slice is: find the core complexity, list its variations, reduce them to one [4]. In a complex domain he advises against listing every story: find one or two that teach you something, build them, and use what you learn [4]. That is the first-look milestone.
- *Spikes.* A spike is a small throwaway program to answer a hard question [12]; Lawrence adds that its acceptance criteria should be **the questions to answer**, and that you stop when they are answered [4]. Milestones 1 and 3 are spikes in this sense. The rule to add: a spike script ends with a written answer (a count, a layout, a rule) copied into Cases, Questions or "Careful", and then the script is deleted (which `stack.md` already says for scratch files [REPO]). This keeps the tracer-bullet code (milestone 4, kept) apart from prototype code (thrown away) [11].
- *What the user sees.* Plain-word splits in the plan ("1. Bank A, usual payments. 2. Split payments. 3. Other banks") and the usual "what I found" line after a spike.
- *Files.* `build.md` loop step 3 and milestone 3; no new files.
- *Why.* Teams learn splitting fast (Lawrence reports 2.5 to 3 hours of practice) [4]; an AI can use the list at once. The risk it guards against is horizontal slicing: Wake's "layer cake" warns that a finished database layer has little value to the customer without a screen [2], and coding agents default to building layers.

### C. Close each change and each milestone

**8. State a short Definition of Done, in two levels.**
- *The AI does.* Scrum calls it "a formal description of the state of the Increment when it meets the quality measures required for the product", and says work that does not meet it cannot even be shown [19]. The workbench has the pieces spread over `build.md`, `data.md`, `design.md` and `stack.md`. Gather them in one place in `build.md` loop step 5: a change is done when (1) the new case and all earlier cases pass; (2) counts add up (in = done + flagged + skipped, `data.md` check 5, kept as one standing case); (3) the tool was used as the user would (`try.ts`); (4) the data lines and map are current if the change touched them; (5) a save point exists and NOTES is updated. A milestone is done when the user tried it and said it is right ("Ship it" is separate and already needs a yes).
- *Why.* A fixed list is what lets "done" mean the same thing every time. [06] rec 8 shows agents declaring features done early without testing end to end. The cases are the acceptance criteria for *this* change; the Definition of Done is the same for *every* change. Keep both.
- *What the user sees.* Nothing new; the hand-back's "What I checked" line is now always true to the list.
- *Files.* `build.md` loop step 5.

**9. Use three process-level EventStorming prompts in the interview and the shape; skip the rest.**
- *The AI does.* Note [02] used EventStorming for vocabulary and hotspots. Its process-level pieces add three prompts, all in everyday words [25]: **policy** ("whenever X happens, we do Y": automatic or by hand?), **information** (what the person needs to see to decide what to do next) and **constraint** (what must always or never hold). The DDD Crew sheet itself says "action" fits stakeholders better than "command", and that "aggregate" became the legacy word "constraint" because they prefer not to use it with business people [25]. The three prompts map to things the workbench already tracks: policies are the user's `Rules` ("when … then …", which Pane et al. found made up 54% of non-programmers' statements [02]) and the manual-vs-automatic question in `talking.md` ("knowledge only in their head"); information feeds rec 6(d); constraints are the "one exception can ruin it" list.
- *Skip.* Colours, timelines on paper rolls, aggregates, bounded contexts, event sourcing, CQRS, design-level modelling. They are for teams designing large event-driven systems [26].
- *Files.* `build.md` interview step 3 and milestone 2 (a sentence each).

**10. Add MoSCoW's workaround question to the need test.**
- *The AI does.* `talking.md` already has the need test: "would you still use it tomorrow without this?" Add DSDM's follow-up: **"If it didn't do this, what would you do instead?"** DSDM says that if there is a workaround, even a manual and painful one, the item is not a Must [20]. It is a first-hand question the user can answer ([09] rec 10). The answer also separates a "should" (a painful workaround) from a "want" (no workaround needed). Use the four labels only inside the AI's head. When a milestone grows past about two build-and-check rounds (the existing trigger), drop the wants first and say so.
- *Skip.* The 60/20/20 effort split [20]: it assumes estimates and a team.
- *Files.* `talking.md` "Sorting what the user says", the Need row.

### What to skip, and why

| Skip | Why |
|---|---|
| The "As a [role] …" template, epics, themes, INVEST scoring, points | One person, one change at a time. The role is always "me" (rec 5). |
| Story-writing workshops, backlog refinement, Definition of Ready | Ceremonies for teams. The loop's echo and "size" steps do the work. |
| Cucumber, Gherkin files, step definitions | The starters test with Node's built-in runner and the workbench bans extra packages for scratch work [REPO]. Take the shape (context → event → outcome, 3 to 5 steps, observable outcome, "imagine it's 1922") and leave the tooling [14]. |
| Coloured-card Example Mapping sessions, three-amigos meetings | A table in NOTES and a tester pass do the same job without a meeting. |
| Impact mapping as an artifact | See "Impact mapping" below: its goal-to-deliverable chain is already note 09's links. One question is borrowed. |
| Hill charts | A status tool for managers who cannot see the work. The user sees every demo. |
| Personas | The user is the persona. See below. |
| Design-level EventStorming, aggregates, CQRS | Software architecture for teams. |
| QUS/AQUSA story linting | It checks the *text format* of backlog stories [27]. We have no stories. Borrow only the set-level criteria for rules: conflict-free, unambiguous, complete (rec 3). |

## How this fits the current milestone plan

The plan in `build.md` stays. It is a better fit for this audience than release slices, because it orders work by what could be wrong first. Nothing is replaced; each milestone gets one small addition.

| Milestone ([REPO] `build.md`) | Agile/lean counterpart | What to add |
|---|---|---|
| 1. First look, on their samples | A spike on the *output* [12]; Example Mapping's examples and questions from real rows [15] | Write the first Cases and Questions. The user's reaction to tricky rows is the oracle (rec 1, 2, 3). |
| 2. The shape (walkthrough, clickable sketch, data map) | Shape Up's "shaped" work: rough, solved, bounded [21]; story-map backbone [9]; breadboard [23] | Write `## Steps` and `## Screens` (rec 6). The sketch stays a throwaway; the words stay. |
| 3. The hard part, proven | Spike [12]; Shape Up "rabbit holes" [21] | The spike ends in a written answer, then the script is deleted (rec 7). |
| 4. Thinnest working tool | Walking skeleton [10] and tracer bullets [11] | Cases become tests (rec 2). The Definition of Done applies (rec 8). |
| 5. Widen | Story-map slices below the line [9]; Lawrence and SPIDR splitting [4][5] | Pick from the ideas shelf by step; split with the menu (rec 7). |

Three points of comparison with Patton's story map:

- **Backbone and skeleton.** Patton's high-level activities across the top are the walk-through steps. His top row, the smallest end-to-end system, is milestone 4's "thinnest working tool" [9]. Cockburn's walking skeleton is "a tiny implementation of the system that performs a small end-to-end function" that links the main architectural components [10, quoting *Crystal Clear*]. Hunt and Thomas' tracer bullets are the same shape, kept and grown, in contrast to prototypes that are "all facade" and thrown away [11]. The workbench's clickable sketch is the facade; `app/` is the tracer.
- **Crutches.** Adzic's variant is to ship the part the user touches on a simple back end and swap the back end later [10]. For local tools, the first-look table and the clickable sketch on real rows already behave like that.
- **Release slices.** Patton's horizontal swim lanes for releases [9] have no counterpart in a one-person tool. The line between "first version" and "later" is enough.

## Concepts, one by one

Detail sits in the recommendations; here is the verdict for each tradition.

**User stories (Connextra, Card/Conversation/Confirmation, INVEST, Cohn).** Jeffries' three Cs: Card (just enough text to remind), Conversation (where the requirement is actually exchanged), Confirmation (the acceptance tests) [1]. The template "As a [type of user], I [need/want] to [do something], so that [reason]" [3] is what Lucassen et al. call the Connextra template [28]; North says it was in common use at his company when he and Chris Matts built BDD on it [13]. Wake's INVEST came from clustering attributes of good stories, and he calls stories "a pidgin language" for customers and programmers [2]. Cohn: the sentence is "a reminder to have a conversation" [3]. (*User Stories Applied* not opened.) Good at keeping the "why" visible and work small. Fails here: it assumes a team and a backlog, and for one user "as a" carries nothing. **Adopt the three Cs as a shape and the "testable" gate, silently; skip the template, backlog and INVEST list.**

**Splitting (Lawrence, SPIDR).** Lawrence: nine patterns plus a meta-pattern (find the core complexity, list its variations, reduce them to one) [4]; Cohn's SPIDR compresses them to five, from over a thousand stories he collected over 15 years [5]. Lawrence notes that most "unsplittable" stories are tasks or components posing as stories, so check value first [4]. Only the names are jargon. **Adopt silently (rec 7).**

**Job stories and Jobs To Be Done.** "When [situation], I want to [motivation], so I can [expected outcome]" [6][8]. Intercom says it invented the form after finding personas of limited use [8]; Klement named it and wrote the process [7]. Lawrence's line: JTBD lives in the problem space, user stories translate empathy into system changes [4]. Practitioner argument only; I found no controlled study against user stories, and Cohn calls the two compatible [6]. **Adopt silently as the shape of the first-version sentence (rec 5);** [01] already took the interview side of JTBD.

**Story mapping, walking skeleton, tracer bullets, spikes.** Patton: activities left to right as a backbone, steps beneath, priority top to bottom, top row = walking skeleton, lanes = releases [9]. Hunt and Thomas: a tracer is a thin end-to-end skeleton that grows; a prototype explores one aspect and is "designed to be thrown away" [11]. XP's spike: "most spikes are not good enough to keep" [12]. Good at the big picture and at finding missing steps by walking it with a user [9]. Patton warns his own method can turn into dogma [9]; for a four-step tool the map is a list. **Adopt and show as the walkthrough with a "first version" line (rec 6); skeleton and tracer are already in the plan; make the spike's end explicit (rec 7).**

**Acceptance criteria, BDD, Gherkin, Specification by Example, Example Mapping, three amigos.** North: a story's behaviour "is simply its acceptance criteria", written as executable Given/When/Then scenarios [13]. Gherkin: `Rule` and `Example`, 3 to 5 steps per example, an example "is also a *test*", `Then` should check something observable not the database, "imagine it's 1922" to keep technology out [14]. Adzic's *Specification by Example* draws on over 50 projects and claims living documentation, clearer expectations and less rework [17]. Wynne's Example Mapping: story, rules, examples, questions, about 25 minutes, Gherkin later [15]. Three amigos: business, development and testing perspectives in as small a group as possible; term from George Dinwiddie, 2009 [16]. Benefits named by 75 surveyed BDD practitioners: domain terms, communication, executable specifications, code comprehension [30]. With non-experts the **evidence is thin and mixed** (see Evidence below), and Wynne leaves the Gherkin writing to the other two amigos [15]. **Adopt silently without the tooling:** the four card types become Cases and Questions (recs 1, 3), executable examples become tests (rec 2), the testing seat becomes the AI's tester pass (rec 3). The user never sees Given/When/Then.

**Impact mapping.** Goal at the centre; actors; impacts (the behaviour change wanted from them); deliverables [18]. It avoids "shopping lists of features" and shows the reasoning behind each, but is aimed at product managers, sponsors and senior technical leadership and "created collaboratively by senior technical and business people" [18]. It is the chain of [09] rec 21 (goal; impact = what is different for a person; deliverable = solution). What [09] lacks is actors other than the user; the data map's question already covers that ("does anyone else get or see any of it?", [11] rec 7). **Skip as an artifact.** Borrow one habit: write the goal as a **change in a person's behaviour** ("the treasurer sends reminders in one sitting"), which can be checked after a day or two of real use.

**Definition of Done and MoSCoW.** Scrum's Definition of Done [19]; DSDM's MoSCoW with the Must test "what happens if this requirement is not met?", the workaround rule and a 60/20/20 effort guide [20]. "Start with everything as Won't Have and justify upward" fits the thin-slice habit; "everything is a Must" is the failure DSDM itself names, blaming missing decomposition [20]. Both assume a team and estimates. **Adopt silently (recs 8, 10).**

**Shape Up.** Appetite first ("appetites start with a number and end with a design"); a raw idea gets "Interesting. Maybe some day." [22] ([01] adopted both). Shaped work is rough, solved and bounded; wireframes are "too concrete", words "too abstract" [21]. Pitch: problem, constraints, solution, rabbit holes, limitations [21]. Breadboards: places, affordances, connection lines, in words [23]. Hill charts: "a dot that doesn't move is effectively a raised hand" [24]. "Rough, solved, bounded" describes milestone 2 with the grey sketch of [05]; "rabbit holes" is milestone 3; the calendar story ("when did you want it?" surfaced "see free spaces") is the one [01] rec 7 already uses [22]. Written for six-week team cycles [21][22]; hill charts report status to someone not in the room, and here the user watches every demo. **Adopt breadboards in words (rec 6) and "rough, solved, bounded" as a check on milestone 2; skip pitches, fat-marker sketches (the HTML sketch replaces them [05]) and hill charts.**

**Personas.** Cooper's archetypes (*The Inmates Are Running the Asylum*, 1999, as described in [8]; not opened). Intercom found them "laborious to create well" and focused on differences, and never used them [8]; Klement says demographics do not explain behaviour [7]; a 2018 review weighs both sides [37]. There is one user, in the room. **Skip.** For a recipient (the boss, the club) a line in `CONTEXT.md` ("the treasurer reads it on her phone") is enough.

**EventStorming beyond vocabulary.** [02] covered big-picture events, hotspots and renames. The process level adds **policy** ("whenever X happens, we do Y"), **action**, **query model/information** ("to make decisions an actor might need information") and **systems**; the design level adds **constraint**, formerly "aggregate" [25]. Big Picture sessions run with 10 to 30+ people [25]. Practitioner glossary only; no controlled study found [25][26]; Brandolini's book not opened. **Adopt three prompts, skip the workshop (rec 9).**

## Worked example: a book club's membership fees

**The tool.** The club's treasurer has two files: `members.csv` (name, plan: Full or Student) and `payments.csv` (the bank export: date, from, amount, note). Every January she spends a Sunday working out who has paid this year's fee. Full fee 40, student fee 20 (the club's rule). She says: "Last year three people paid in halves, and one paid for two years."

**What the AI keeps: the first-version sentence** (`NOTES.md`, "What it is:").

> When the bank export arrives, the treasurer wants to see who hasn't paid this year's fee, so she can send reminders without checking every line.

**`CONTEXT.md`, excerpt** (the user's words; rules quoted as she said them):

```markdown
## Rules
- A member is paid up when what they've paid this year reaches their fee.
- A student pays half.

## Careful words
- "year" here means January to December, not the club's season. (Asked once.)

## Not sure yet
- "paid up" for someone who paid two years at once: does the next year count?
```

**The AI's tester pass over her real samples** (a scratch script). She mentioned two things (halves, two years at once); the pass confirms both and finds two she did not mention: the bank writes names differently ("A REYES"), and one payment is from someone not on the list. It sorts them by "what happens if we get this one wrong?": an unmatched payment silently dropped would hide money (can ruin it, so a case now); the odd spelling decides who gets a reminder (case now); two halves decides the same (case now); the 80 only changes next year's list (a Question; the tool shows it plainly meanwhile).

**What the user sees: the first look** (milestone 1, in chat, tricky first; the plan follows in the same message):

> Here's your January, worked out from your two files. Tricky ones first:
>
> | Member | Paid | Shown as |
> |---|---|---|
> | Chloe Martin | 20 + 20 (two payments) | Paid up |
> | Ana Reyes | 40, bank says "A REYES" | Paid up |
> | Dev Patel | nothing | Not paid |
> | … 38 more | | 31 paid up, 5 not paid, 2 part paid |
>
> And 2 payments I couldn't match to anyone are shown at the top: "J SMITH 40" and one more. Nothing is left out; 41 members and 63 payment lines all accounted for.
>
> Is this what you want to end up with? (One thing for later: Eli paid 80 at once. For now I show him as paid up and flag it; I'll ask you about it once you've looked.)

**What the AI keeps: `NOTES.md`** (made-up rows shaped like hers; no names or amounts from her files):

```markdown
## Cases
(Made-up rows shaped like the real ones. "Said by": you = you confirmed it; my guess = I worked it out, not confirmed; waiting = it is in Questions.)
| # | The one where… | Rule (from CONTEXT) | In (made up) | Should come out | Said by | Check |
|---|---|---|---|---|---|---|
| 1 | a full member pays 40 | paid up when paid reaches fee | Ana, Full; pays 40 | Ana: paid up | you | test "a full member who pays 40 is paid up" |
| 2 | a student pays 20 | a student pays half | Ben, Student; pays 20 | Ben: paid up | you | test "a student who pays 20…" |
| 3 | the bank writes her name differently | (matching) | pays from "A REYES" | Ana: paid up | you | test "the bank writes 'A REYES'…" |
| 4 | someone pays in two halves | paid up when paid reaches fee | Chloe pays 20, then 20 | part paid, then paid up | you | test "paid in two halves…" |
| 5 | someone doesn't pay | (not paid) | Dev pays nothing | Dev: not paid | you | test "a member with no payment is not paid" |
| 6 | someone not on the list pays | (nothing lost) | pays from "J SMITH" | shown in "couldn't match" | you | test "a payment from someone not on the list…" |
| 7 | every line is accounted for | (nothing lost) | 3 payments, one unmatched | matched + unmatched = total | my guess | test "every payment is either matched…" |
| 8 | someone pays 80 | (not sure yet) | Eli pays 80 | ? | waiting | todo test |

## Questions
1. Eli paid 80: does the second year count? My suggestion: yes, show "paid up until 2027". (not asked yet; shown plainly meanwhile)
2. Two members with the same first initial and surname would be mixed up by my matching. None today; the tool will list such payments as "couldn't match" rather than guess. (not asked: can wait)

## Steps (agreed at the shape)
First version: 1 Pick the two files → 2 See who hasn't paid → 3 Copy the list for the reminder email.
Later, under the step it extends: 1 other banks' layouts. 2 pay-by-instalments plan. 3 send the reminders itself.

## Screens
Start: you can pick the members file and the bank file → Result.
Result: you see unpaid first, then part paid, then payments I couldn't match. You can pin a match (A REYES = Ana Reyes) → Result. You can copy the unpaid list.
Needs to see to decide: name, plan, paid so far, fee, date of last payment.
```

**What the AI keeps: the test file** (`app/test/fees.test.mjs`; the starters' own runner; the names are the case names). Four of the eight tests:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { whoHasPaid } from '../src/fees.ts';
// members: Ana Reyes (Full), Ben Okafor (Student), Chloe Martin (Full), Dev Patel (Full)
const pay = (from, amount) => ({ date: '2026-01-10', from, amount });
const statusOf = (result, name) => result.rows.find((r) => r.name === name)?.status;

test('a full member who pays 40 is paid up', () => {
  assert.equal(statusOf(whoHasPaid(members, [pay('Ana Reyes', 40)]), 'Ana Reyes'), 'paid up');
});
test('the bank writes "A REYES"; she is still matched to Ana Reyes', () => {
  assert.equal(statusOf(whoHasPaid(members, [pay('A REYES', 40)]), 'Ana Reyes'), 'paid up');
});
test('a payment from someone not on the list is shown, never dropped', () => {
  const r = whoHasPaid(members, [pay('J SMITH', 40)]);
  assert.equal(r.unmatched.length, 1);
});
test.todo('paid 80 for two years: does the second year carry over? (waiting for her answer)');
```

`[LOCAL]` I wrote the eight tests of this table plus a short `whoHasPaid` function (about 30 lines) in a temporary folder and ran `node --test` (Node 24.21): 7 passed, 0 failed, 1 reported as `# TODO`. The temporary folder was deleted. It shows the cases-to-tests path works on the starters' own runner (`node --test`, `.ts` imported directly), not that the real tool is correct.

**What the user sees at milestone 4 (the hand-back):**

> Milestone 4 of 5 done: you can now pick your two files and see who hasn't paid.
>
> Try it now (about a minute): I've opened the new version, titled "Club fees (trying out)", on a practice copy; yours is unchanged.
> 1. Pick last January's two files.
> 2. Find Eli (he paid 80) and the payments I couldn't match.
>
> You should see: 33 paid up, 6 not paid, 2 part paid, and 2 payments I couldn't match.
> Does it work the way you want?
>
> What I checked: your 6 confirmed cases come out as you said (including "the one where the bank writes her name differently"), plus one check of my own that no payment line goes missing; 1 case is waiting for your answer about Eli.
> Next: milestone 5, other banks' layouts. Or something you noticed?

That hand-back follows the existing template [REPO: `build.md` step 7]. The only change is the "What I checked" line, which now names cases in her words.

**What was caught that a flat story list would have missed.** The unmatched payment and the "A REYES" spelling came from the tester pass on her real files, not from anything she said. The 80-payment is on the record as a question, not a guess buried in code. When she answers, the todo test becomes a real test and Question 1 is struck. If she says "no, it doesn't carry over", case 8 changes and the old wording is kept in one line so the decision is not re-litigated (the idea of "Retired" in [09], and North's advice to delete a test whose premise changed [13]).

## Evidence, and how thin it is

- **User-story practice.** Lucassen et al. surveyed practitioners (182 valid responses, 21 interviews). 94% worked with Scrum; 59% used the Connextra template, 15% none; 23.5% used INVEST, 39.5% no quality guideline. A majority agreed stories improve productivity (61%) and quality (68%); interviewees said they help build the *right* software, not faster software, and that the "why" is essential [28]. This is perceived effectiveness, from self-selected respondents, half from product-software companies and many from the authors' networks; non-technical roles were more positive than technical ones [28].
- **User-story quality.** The QUS framework has 13 criteria (well-formed, atomic, minimal, conceptually sound, problem-oriented, unambiguous, full sentence, estimatable, unique, uniform, independent, complete, conflict-free) [27]. On 1,023 stories from 18 companies the AQUSA tool reported 917 defects, 255 of them false positives (micro recall 93.8%, precision 72.2%); on average 56% of stories had at least one reported defect. Version 1 checked only syntactic and pragmatic criteria; the semantic ones (conflict, ambiguity, completeness) "require deep understanding" [27]. The paper does not show that better-formed stories give better software. The semantic criteria are the ones an AI can check on a list of rules (rec 3).
- **Notations.** In a controlled classroom experiment user stories fit better than use cases for deriving a conceptual model; a longer quasi-experiment found the derivation process and the case's complexity mattered more than the notation [29].
- **BDD with non-experts.** Customers can use executable acceptance tests with an IT partner but find them hard to learn [32]; Fit tables helped students understand requirements [33][snippet]; practitioners rate communication and domain terms as the main benefit and maintenance as the main cost [30]. I found no study where non-programmers wrote Given/When/Then unaided.
- **Specification by Example in practice.** The evidence is Adzic's case studies of more than 50 projects, of teams who made it work [17]. They show what adopters report, not how often it fails. I did not open the book.
- **LLMs writing the artifacts.** In an industrial case study GPT-4 Turbo generated Gherkin scenarios from user stories; users found them helpful 95% of the time, some revealing overlooked cases. For the Cypress scripts made from them, 92% were helpful, 60% usable as generated, 8% needed minor fixes, 24% were regenerated and 8% discarded; the authors say "with appropriate tooling and supervision" [35]. Another study found GPT-3.5 and GPT-4 produced error-free BDD acceptance tests, better with few-shot examples [36]. ChatGPT's user-story quality ratings aligned well with human ones, and best-of-three improved stability [34]. All used developers or testers as judges, not end users. [INFERENCE: this supports "the AI can draft cases and check rule lists", not "a non-programmer will spot a wrong expected value". Hence rec 2's insistence on the user as oracle.]
- **No evidence at all.** I found nothing testing story maps, example maps, job stories, impact maps, Definition of Done, MoSCoW or hill charts with *end users* building *personal tools*, or with an AI as the other party. Whatever rests on them above is [INFERENCE].

## Tensions with other traditions and with current rules

- **Real rows vs "no data in notes".** The best examples are the user's own rows [15], but `safety.md` keeps real data out of `NOTES.md`, `CONTEXT.md` and tests [REPO]. Rec 2 uses made-up "twins" plus a local real-sample run. A twin might miss the real quirk; the real-sample run is the guard.
- **Rules in three places.** `CONTEXT.md` "Rules", NOTES "Rules we must follow" and the Cases "Rule" column could drift. Proposal: the Cases column quotes the `CONTEXT.md` sentence; NOTES keeps only "who set it". Untested.
- **Rule vs example look alike.** The user's "when … then …" rules ([02], Pane et al.) resemble Gherkin's When/Then, but a rule is general and an example specific. A test generated straight from a rule checks only what the code already assumes. Examples must come from the samples or the user's episodes.
- **User stories vs use cases.** The use-case tradition (actors, preconditions, main and alternate flows) and the story tradition disagree on granularity, but neither is shown to this user. The AI's artifacts are neutral: walkthrough steps are the main flow, SPIDR "paths" the alternates, Cases the scenarios. I do not recommend picking a side [29].
- **Story map's value order vs the plan's risk order.** Keep risk first (see "How this fits").
- **Example Mapping's visible red cards vs one question per message.** Wynne wants questions on the table [15]; `talking.md` wants one at a time. Keep the list in NOTES for the AI; ask one.
- **"No app before milestone 4" vs tests.** Cases and Questions exist earlier as text and a scratch script; tests arrive with `app/`. Consistent, but `build.md` should say so.

## Open questions

- **Does the user catch a wrong expected value?** Rec 2 depends on it; [06] rec 9 cites 5 to 23% wrong correctness judgments by end users. One mitigation to test: ask for the expected result of one tricky row before showing the AI's (predict, then reveal), a show-me version of teach-back [02]. [INFERENCE]
- **How many cases is too many?** 6 to 15 is my guess from the maintenance complaint [30]; no source measures it for tiny tools.
- **Are "twin" rows faithful enough?** Untested.
- **Would the user ever read the Cases table?** Untested; I assumed not, unless asked.
- **One home for rules:** should Cases quote `CONTEXT.md`, or should `CONTEXT.md` hold only words? Undecided.
- **Job-story wording in other languages** ("When … I want … so …") may not translate neatly. Untested.
- **Not opened:** Cohn's *User Stories Applied*, Patton's story-mapping book, Adzic's *Specification by Example* and *Impact Mapping*, Brandolini's EventStorming book, Cooper's persona books. I used the authors' own articles and sites.

## Sources

External sources are numbered. Internal notes are cited as [01], [02], [05], [06], [09], [11]. "Opened" means I read the page or paper text on 2026-10-01.

1. Ron Jeffries, *Essential XP: Card, Conversation, Confirmation*, 2001, https://ronjeffries.com/xprog/articles/expcardconversationconfirmation/ (opened 2026-10-01).
2. Bill Wake, *INVEST in Good Stories, and SMART Tasks*, 2003, https://xp123.com/invest-in-good-stories-and-smart-tasks/ (opened 2026-10-01). Also the 2011 postscript on how the acronym was built.
3. Mike Cohn, *User Stories* (guide), Mountain Goat Software, https://www.mountaingoatsoftware.com/agile/user-stories (opened 2026-10-01; first 300 of 392 lines).
4. Richard Lawrence (Humanizing Work), *The Humanizing Work Guide to Splitting User Stories*, https://www.humanizingwork.com/the-humanizing-work-guide-to-splitting-user-stories/ (opened 2026-10-01; the last short "vertical slices at scale" part not read).
5. Mike Cohn, *SPIDR: Five Simple but Powerful Ways to Split User Stories*, https://www.mountaingoatsoftware.com/agile/five-simple-but-powerful-ways-to-split-user-stories (opened 2026-10-01).
6. Mike Cohn, *Job Stories Offer a Viable Alternative to User Stories*, https://www.mountaingoatsoftware.com/agile/job-stories-offer-a-viable-alternative-to-user-stories (opened 2026-10-01).
7. Alan Klement, *Designing features using Job Stories* (guest post), Intercom, 2013-12-23, https://www.intercom.com/blog/using-job-stories-design-features-ui-ux/ (opened 2026-10-01). His earlier jtbd.info article could not be fetched.
8. Paul Adams, *How we accidentally invented Job Stories*, Intercom, 2016-06-28, https://www.intercom.com/blog/accidentally-invented-job-stories/ (opened 2026-10-01).
9. Jeff Patton, *The New User Story Backlog is a Map*, 2008, https://jpattonassociates.com/the-new-backlog/ (opened 2026-10-01).
10. Gojko Adzic, *Forget the walking skeleton – put it on crutches*, 2014, https://gojko.net/2014/06/09/forget-the-walking-skeleton-put-it-on-crutches/ (opened 2026-10-01). Quotes Cockburn's *Crystal Clear* definition; Cockburn's own page redirected to "coming soon", so the quote is second-hand.
11. Bill Venners, *Tracer Bullets and Prototypes: A Conversation with Andy Hunt and Dave Thomas, Part VIII*, Artima, 2003-04-21, https://www.artima.com/articles/tracer-bullets-and-prototypes (opened 2026-10-01).
12. Don Wells, *Create a Spike Solution*, extremeprogramming.org, http://www.extremeprogramming.org/rules/spike.html (opened 2026-10-01).
13. Dan North, *Introducing BDD*, 2006, https://dannorth.net/blog/introducing-bdd/ (opened 2026-10-01).
14. Cucumber, *Gherkin Reference*, https://cucumber.io/docs/gherkin/reference/ (opened 2026-10-01; first 300 of 697 lines).
15. Matt Wynne, *Introducing Example Mapping*, Cucumber blog, 2015-12-08, https://cucumber.io/blog/bdd/example-mapping-introduction/ (opened 2026-10-01).
16. Agile Alliance, *Three Amigos* (glossary), https://agilealliance.org/glossary/three-amigos/ (opened 2026-10-01).
17. Gojko Adzic, *Specification by Example* (book page), https://gojko.net/books/specification-by-example/ ; Manning's page, https://www.manning.com/books/specification-by-example (both opened 2026-10-01; blurbs only, book not opened).
18. Gojko Adzic, *Impact Mapping*: https://www.impactmapping.org/ and *Drawing impact maps*, https://www.impactmapping.org/drawing.html (opened 2026-10-01).
19. Schwaber and Sutherland, *The 2020 Scrum Guide*, https://scrumguides.org/scrum-guide.html (opened 2026-10-01; Definition of Done section).
20. Agile Business Consortium, *What is MoSCoW Prioritization?*, https://www.agilebusiness.org/resource/what-is-moscow-prioritization/ (opened 2026-10-01; the older handbook URL redirected here).
21. Basecamp, *Shape Up*, ch. 2 "Principles of Shaping", https://basecamp.com/shapeup/1.1-chapter-02 (opened 2026-10-01).
22. Basecamp, *Shape Up*, ch. 3 "Set Boundaries", https://basecamp.com/shapeup/1.2-chapter-03 (opened 2026-10-01).
23. Basecamp, *Shape Up*, ch. 4 "Find the Elements", https://basecamp.com/shapeup/1.3-chapter-04 (opened 2026-10-01).
24. Basecamp, *Shape Up*, ch. 13 "Show Progress", https://basecamp.com/shapeup/3.4-chapter-13 (opened 2026-10-01).
25. DDD Crew, *EventStorming Glossary & Cheat Sheet*, https://github.com/ddd-crew/eventstorming-glossary-cheat-sheet (raw README opened 2026-10-01; about the first 60%, which covers the glossary).
26. EventStorming.com (Brandolini), https://www.eventstorming.com/ (opened 2026-10-01).
27. Lucassen, Dalpiaz, van der Werf, Brinkkemper, *Improving agile requirements: the Quality User Story framework and tool*, Requirements Engineering 21(3), 2016, https://doi.org/10.1007/s00766-016-0250-x (full text opened 2026-10-01 via https://dspace.library.uu.nl/handle/1874/344432).
28. Lucassen, Dalpiaz, van der Werf, Brinkkemper, *The Use and Effectiveness of User Stories in Practice*, REFSQ 2016, https://webspace.science.uu.nl/~dalpi001/papers/luca-dalp-werf-brin-16-refsq.pdf (opened 2026-10-01; sections 1 to 5 read; related work not).
29. Dalpiaz and Sturm, *On deriving conceptual models from user requirements: An empirical study*, Information and Software Technology, 2020, https://doi.org/10.1016/j.infsof.2020.106484 (abstract via OpenAlex, 2026-10-01).
30. Binamungu, Embury, Konstantinou, *Maintaining behaviour driven development specifications: Challenges and opportunities*, SANER 2018, https://doi.org/10.1109/saner.2018.8330207 (abstract via OpenAlex, 2026-10-01).
31. Binamungu et al., *Characterising the Quality of Behaviour Driven Development Specifications*, https://pmc.ncbi.nlm.nih.gov/articles/PMC7251619/ (abstract only, 2026-10-01).
32. Melnik, Maurer, Chiasson, *Executable Acceptance Tests for Communicating Business Requirements: Customer Perspective*, Agile 2006, https://doi.org/10.1109/agile.2006.26 (abstract via OpenAlex, 2026-10-01).
33. Ricca, Torchiano, Di Penta, Ceccato, Tonella, *Using acceptance tests as a support for clarifying requirements: A series of experiments*, Information and Software Technology 51(2), 2009, https://doi.org/10.1016/j.infsof.2008.01.007 ([snippet] of the abstract via a search summary, 2026-10-01; students, library-system requirements).
34. Ronanki, Cabrero-Daniel, Berger, *ChatGPT as a tool for User Story Quality Evaluation: Trustworthy Out of the Box?*, 2023, https://arxiv.org/abs/2306.12132 (abstract opened 2026-10-01).
35. *Acceptance Test Generation with Large Language Models: An Industrial Case Study*, AST 2025, https://doi.org/10.1109/ast66626.2025.00007 (abstract via OpenAlex, 2026-10-01; authors not recorded).
36. *Comprehensive Evaluation and Insights Into the Use of Large Language Models in the Automation of Behavior-Driven Development Acceptance Test Formulation*, IEEE Access, 2024, https://doi.org/10.1109/access.2024.3391815 (abstract via OpenAlex, 2026-10-01; authors not recorded).
37. Salminen et al., *Are Personas Done? Evaluating Their Usefulness in the Age of Digital Analytics*, Persona Studies 4(2), 2018, https://doi.org/10.21153/psj2018vol4no2art737 (abstract via OpenAlex, 2026-10-01).
