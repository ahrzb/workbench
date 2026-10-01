# Classic requirements engineering for the workbench: what the structured-analysis, UML and waterfall-era tradition can still do for a tool built with a non-coder

Scope: which concepts from the structured-analysis, use-case, problem-frames and document-driven requirements tradition (roughly 1975–2005) help the AI **model what the user wants**, both internally and in what it shows. The user is comfortable with computers, doesn't write code, and never sees notation or method names. The tools are small, built in milestones of minutes to an hour. Research date 2026-10-01. Builds on [note 01](01-interview.md) (interview, slot checklist), [note 02](02-ontology-vocabulary.md) (their words), [note 05](05-mockups-alternatives.md) (sketches), [note 09](09-context-file.md) (`CONTEXT.md`, the six kinds, "the case that ruins it"), [note 11](11-data-diagrams.md) (data map) and the shipped `build.md`, `talking.md`, `data.md`, `starters/NOTES.md`. Nothing from those is re-derived here.

Tags: **[snippet]** = seen only as search-result text. **[secondary]** = seen through a summary of the source, not the source. **[INFERENCE]** = my reasoning, not a finding. **[UNVERIFIED]** = could not confirm. Sources I opened are marked in the list at the end. I read **drafts** of Cockburn's book (1999 and 2000), not the 2001 print edition; the ISO 29148 standard itself is paywalled and was not opened.

## Recommendations for the workbench

Most of this tradition is wrong for this user (diagrams, templates, "shall" statements, big documents). A few of its ideas catch real wrong turns cheaply, and the AI can keep them as short text in the tool's `NOTES.md`. The user sees almost none of them by name; they see their own sample rows and plain sentences, as [note 09](09-context-file.md) already requires.

| # | Concept (never named to the user) | The wrong turn it catches | Lives in | What the user sees |
|---|---|---|---|---|
| 1 | A short story of the one moment (casual use case at "sea level") | The wrong thing built; a slice too big or too small | NOTES, "Story" | The usual way, step by step, in their words: "What did I get wrong?" |
| 2 | "What else can happen" (extensions), long list, silent | The missed case | NOTES, under the story | A few real rows from their own files, tricky ones first |
| 3 | What starts it (event list), incl. "expected but never arrives" | Missing trigger; the bill that isn't there | NOTES, top of the story | One plain sentence + the AI's suggestion (as `talking.md` already does) |
| 4 | Facts we rely on (indicative) vs what we want (optative) | A rule broken silently; a wrong number trusted | NOTES, "What we're after" | "You said every bill has an order number; these 3 don't" and, later, a tool that stops and says why |
| 5 | Who else cares, and what would upset them | Someone harmed who never touches the tool | NOTES, one line; the data map | A promise, not a question: "it never marks a paid member as owing" |
| 6 | Kind of tool (problem frame), as a check selector | Wrong checks for the kind of problem | NOTES, "What it is" | Nothing |
| 7 | "We'll know when" lines; Past→Goal for qualities | "Done" that can't be told | NOTES, "Must have" | Their own case as the test (already a rule); their own numbers |
| 8 | Why/how ladder | Request at the wrong level | AI only | Nothing |
| 9 | NOTES as the clean record (Parnas) | Lost decisions; stale notes | NOTES | Nothing |
| 10 | Everything else | Process cost | — | — |

**1. Keep a short story of the one moment, written by intent, at "sea level".**
- *AI does.* After step 3 of the interview (walk the workaround) and again once the slice is chosen (step 5), it writes 3–9 numbered sentences in `tools/<name>/NOTES.md`: who does what, from what starts it to the result they wanted, in `CONTEXT.md` words, for the one chosen moment. Steps say what the person is trying to do, not which button ("saves the bank file in the fees folder", not "clicks File, Save As"). This is Cockburn's casual use case at user-goal ("sea level") [5][6].
- *Size test.* One person, one sitting (Cockburn: "2–20 minutes"), and they could go to lunch afterwards [5]. If the moment is bigger ("run the club's money"), ask the why/how question silently (rec 8) and cut down. If it is a click ("press Save"), go up. This is a check on the existing "does X for moment Y" sentence in `build.md` step 5, not a new step.
- *Two layers when they differ.* Keep "today, in their words" (the physical workaround) apart from the tool's story by intent ("each payment ends up against one member"). Yourdon: operational users "think of systems in very physical terms"; talk to them in those terms and translate separately into what the system must do whatever the technology [9]. This is what stops the tool from automating an accident of Excel.
- *User sees.* The Confirm step in `build.md` (retell what they do, ask "What did I get wrong?") is read straight off the story, and the clickable sketch at "the shape" walks the same steps on their sample rows.
- *Files.* `starters/NOTES.md` (new "Story" block under "For the AI"), `build.md` steps 3, 5, 6 and milestone 2.
- *Why.* Cockburn: use cases are mostly text that anyone can read and write, and "a bad use case is still a good use case" [5]. Carroll and Rosson: scenarios are concrete but rough, and prospective users can begin "by enacting or relating episodes of current activities" [24]. Evidence that non-experts understand them is thin (see "Evidence").

**2. Keep a long, silent "what else can happen" list under the story, and show only a few rows of it.**
- *AI does.* For each story step it brainstorms everything that could differ: Cockburn's "brainstorm all conceivable failures and alternative courses", long first, pruned later, "when in doubt, include it. The damage from an extra condition is small compared to the damage of a forgotten extension" [5]. Number them against the step (3a, 3b) so each is tied to a place. Include alternative successes (a payment covering two people) and **bad data already on disk**, which Cockburn found "really part of the external requirements" [5].
- *Probe list (the AI's, not asked of the user).* From Sutcliffe/Maiden's exception types [22] plus Cockburn [5]: missing or empty; arrives twice; wrong order or late; unexpected kind of value; out of date; too much or too little detail; the other side changes layout; nobody does the step; they pick the wrong file or the same one again. [INFERENCE: the workbench wording is mine; the types are theirs.]
- *Check the samples first.* The AI runs the list against the sample files itself and marks each item `[in sample]` or `[likely]`. This follows `talking.md`: facts about the files are the AI's job.
- *Sort by what a wrong guess costs* ([note 09](09-context-file.md) rec 16): ruins it → handle now or make the tool stop and flag; can wait → plain message + ideas shelf. Keep about 10 lines. Cap the effort at a couple of minutes.
- *User sees.* Never "what could go wrong?" (that is a hypothetical, banned by [note 09](09-context-file.md) rec 10). They see the real rows in the first-look table, tricky first with a reason, and at most one concrete question at a time with the AI's suggestion.
- *Each kept line becomes a sample row, a check in the tests, and a marked row in the demo* (`build.md` milestone 1 "tricky ones first"; `data.md` check 5). Cockburn: "capture them… consider them during design, and test for them during testing" [5].
- *Files.* `starters/NOTES.md`, `build.md` milestones 1 and 3, `talking.md` ("usual case vs the case that ruins it": add that the AI builds the list itself), `data.md` check 5.
- *Why.* This is the one idea in the tradition aimed squarely at the "missed case". Non-programmers' own descriptions leave the other branch out: "else" appeared 0.4 times per participant in Pane et al., and half the range specifications had gaps or overlaps [25]. In 30 use case descriptions found online, a missing part ("lack", such as no exception-flows section) was the biggest defect class: 108 of 248 problems [26]. Existing LLM approaches "still struggle… especially when identifying branch points and generating alternative flows" [27]. So the list needs explicit probes and real data.

**3. Write down what starts the tool, in three kinds, and ask of each external one: "what if it doesn't come?"**
- *AI does.* A `Starts when:` line at the top of the story: (a) something arrives or they do something (a file, a click); (b) a date or time ("1 January", "end of month"); (c) something expected that does not arrive. Kind (c) is the "non-event" of Ward and Mellor: for each normal event ask "Does the system need to respond if this event fails to occur as expected?" [10] [secondary]. It is the formal name for `talking.md`'s "knowledge only in their head" (a missing bill leaves no trace).
- *For time triggers on a local tool*, check who is there when the time comes: a tool that isn't open can't remind anyone. The honest answer is usually "it shows the list when opened", not a reminder. [INFERENCE]
- *User sees.* Exactly what `talking.md` already prescribes, once: "The tool can only see bills that have arrived. Give me the list of suppliers who bill you monthly, and I'll show who hasn't sent this month's. OK?"
- *Files.* `starters/NOTES.md` (story header), `talking.md` (cite the event types).
- *Why.* Yourdon, looking back, says that drawing a context diagram first and splitting the system top-down "has not worked well", and that event partitioning (McMenamin and Palmer 1984) was added instead [9]. That fits this skill's interview-first order. Volere keeps a "Business Event List" for the same purpose [15].

**4. Keep "facts we rely on" apart from "what we want", check each fact against the samples, and make the tool check them too.**
- *AI does.* Zave and Jackson separate statements about the world as it is, whatever the machine does (**indicative**: "every bill has an order number"; "amounts under 0 are money out") from statements about the world as we want it (**optative**: "chase a member 7 days after the due date") [1]. The tool is right only if the facts hold: their argument is *specification + domain knowledge ⊢ requirement* [1][2]. So the AI keeps a list, "Facts we rely on", each with `[held in 22 of 22 samples]`. Facts break; wishes can't be false, only wrong.
- *Designations.* Zave and Jackson: every primary term needs "an informal explanation… written down… and maintained" [1]. `CONTEXT.md` already does this for the user's words. Add the same for **columns in their files** ("Amount: negative means money out"), found by checking, asked only when truly ambiguous. Keep these in "For the AI" [INFERENCE: placement].
- *Tool behavior.* Each fact that a later file might break becomes a start-of-run check: stop and say which row or column, never total a guess ([note 09](09-context-file.md) rec 16; `data.md` check 5).
- *The tool's copy can drift from the world.* Zave and Jackson's warehouse example: the machine's model of the stock is "extremely likely" not to match the real bins [1]. van Lamsweerde: accuracy goals "are often overlooked"; violating them "may be responsible for major failures" [17]. So prefer recomputing from the user's files each time (`data.md` "Rebuild from originals: yes"), and where the tool keeps its own list of what is paid, show "as of <date in the file>".
- *User sees.* The existing move from `talking.md`: "You said every bill has an order number, but these 3 don't. Are they handled differently, or should the tool flag them?" Then, in the demo, a tool that stops with a plain message. Never "assumptions" or "domain knowledge".
- *Files.* `starters/NOTES.md` ("What we're after": add `Facts we rely on:`); `talking.md` ("A rule the data contradicts": also cover a rule the AI itself assumed); `build.md` milestone 3.

**5. Name who else cares, and turn what would upset them into a promise.**
- *AI does.* One line per person who never touches the tool but is affected (members, the treasurer's committee, the boss), with what they'd mind. These are Cockburn's "stakeholders and interests" [6]. Each interest that the tool could break becomes a guarantee the AI states and tests ("never shows a member who has paid as owing").
- *When.* At "the shape", at the same moment as the data map's question "Does anyone else get or see any of it?" ([note 11](11-data-diagrams.md) rec 7). The map's outside parties are the stakeholders; the new part is "what would they mind".
- *User sees.* A promise inside the story ("when I can't tell, it goes in 'check' rather than 'owes', so nobody is chased by mistake") for them to correct.
- *Why.* Cockburn reports a team who, asked to list stakeholders and interests for a delivered system, "found they were naming their recent change request items" [6]. [secondary: one anecdote.]
- *Files.* `starters/NOTES.md` (one line), `data.md` ("The shape" bullet).

**6. Silently classify the tool by problem frame, and use the class only to pick checks.**
- *AI does.* One line in NOTES, "What it is": the kind(s) of problem. Jackson's five basic frames [3][4] cover most workbench tools; the table below says which checks each makes the AI run. The user never hears "frame".
- *Why.* A frame says "what to specify and what questions to ask" [3]. [INFERENCE: no study tests frames with AI builders or small tools.] The cost is one line.
- *Files.* `starters/NOTES.md`, `build.md` "Pick how the tool does the work" (add "name the kind first").

| Frame [3] | Typical workbench tool | What it makes the AI check (silently) |
|---|---|---|
| **Transformation**: given inputs become required outputs by rules; inputs are not changed | Bank CSV → monthly summary; resume PDFs → sheet; two files → fee list | What exactly is one input item; every item ends done, flagged or skipped (`data.md` 5); the input file is never changed; same input twice; odd item → flagged |
| **Information display**: show information about a part of the world | "Who still owes", "what is due this week" | What the tool **cannot see** (the world part isn't fully shared with it [1]); how fresh ("as of"); what "owes" means (a designation) |
| **Simple workpieces**: a tool to create and edit things | Recipe box, stock list, member notes | Which commands make no sense now (the tool "can inhibit" them [2]); undo/trash; whether a thing has a life (states) or is shared [3] |
| **Commanded behavior**: the user's commands change something outside the tool | "Send these reminders", rename files, write the Excel | What changes outside; reversible?; what if it fails halfway; pressed twice. The user is a "biddable" domain: don't rely on them following the instructions [3][4] |
| **Required behavior**: the machine acts by itself on a rule or a time | Automatic backup; a reminder at day 7 | Is the tool running then; what if it's missed. Rare for local tools; usually avoid (rec 3) |

Most tools are Transformation + Display, later Workpieces.

**7. Give each "must have" a "we'll know when" line, and keep Past→Goal numbers for qualities. Nothing else from the standards.**
- *AI does.* A must-have gets a `Check:` line naming a concrete case from their files (already the rule: "their real episode becomes the acceptance check"). Qualities the user states ("quicker", "simple") get the user's own numbers from interview Stage 3: `Past: about 2 evenings; Goal: one sitting`. That is the useful core of Planguage: a benchmark ("Past") and a target ("Goal") on a scale with a way to measure [16], and Volere's "fit criterion", "a measurement against which it can be tested" [15]. Ask "did it take under an hour?" when they have used it for real (`build.md` step 8).
- *Skip the rest of 29148's nine per-requirement and five per-set characteristics* [12][13] and the rest of Planguage (Ambition, Wish, Fail, Stretch, qualifiers) [16]. Keep three questions for the AI's own notes: **unambiguous** (one reading, in their words), **verifiable** (can a sample row or a number show it?), **singular** (one thing per line). Why only these: when at least four software engineers rated each of 10 requirements, all 10 met "necessary" and "feasible", but only 2 met "complete", 5 "unambiguous" and 6 "verifiable" [13]; the cheap criteria discriminate little. Agreement between an LLM and those raters was weak before they saw its verdict (Cohen's kappa 0.40 on one project, 0.05 on another) [13]. Another study found AI useful for "syntactic and structural" attributes while "ambiguity resolution" still needed experts [29]. So the AI does not run a conformance check.
- *User sees.* Their own episode as the test and their own numbers, as now.
- *Files.* `starters/NOTES.md` ("Must have" lines carry `Check:`), `build.md` Stage 3 record and step 8.

**8. Use why/how, silently, to put each request at the right level.**
- *AI does.* "Why do you want that?" moves up; "how would you know it's done?" moves down, two rungs at most ([note 01](01-interview.md) rec 10 already caps laddering). van Lamsweerde: refine goals "by asking HOW and WHY" [17]. Zave and Jackson's zoo-turnstile "goal regress" shows why to stop: asking why forever ends at "the happiness of the zoo owner"; the subject matter (the people and money at the entrance) bounds the goals [1]. For the workbench: stop at the user's own work and files.
- *Obstacles at goal level.* Ask of each goal, silently, "what could make it look met when it isn't?" (van Lamsweerde's obstacle analysis in light form [17]). The usual answer is a silently wrong total, which goes into rec 2 and rec 4.
- *Files.* `talking.md` ("Sorting what the user says") gets one line; no new artifact.

**9. Keep NOTES as the clean, current record (Parnas and Clements), not a diary.**
- *AI does.* (a) NOTES describes the tool as it is now. After a surprise it is rewritten as if known from the start; history lives in save points. Parnas and Clements: a change that invalidates a document means it "must be faked to look as if the change had been the original design" [20]. (b) One place per fact [20]: words in `CONTEXT.md`, places and moves in the data map, the rest in NOTES. (c) Record **rejected alternatives and why** under "Decisions", so that "months, weeks, or even hours later" the reason can be found [20]. (d) Unknowns go where the answer will belong, with the design assumed to change: `Open: what "paid up" means for half-year payers` [20]. (e) One line, `Likely to change:` (the fee, the bank, the number of members): "You cannot design a system so that everything is equally easy to change" [20]. (f) Log each user-visible default the AI picked, so it doesn't make "requirements decisions accidentally while designing" [20].
- *User sees.* Nothing new. The "say it in one line, easy to change" rule in `talking.md` already shows them each default.
- *Files.* `starters/NOTES.md` ("Decisions", "Waiting on", add `Likely to change:`), `build.md` loop step 6.

**10. Skip.** UML use case diagrams and include/extend/generalize (see [note 11](11-data-diagrams.md) for why); the fully dressed use case template; actor profile maps; Jacobson's use-case-driven process; 29148 document sets, "shall" statements and set-level completeness; Volere's 90-page template; Planguage beyond Past→Goal; KAOS and i* models, formal goals, divergence, agent assignment; CRC cards as an artifact; DeMarco-style data flow decomposition and the context diagram as a first step; Jackson's problem diagrams. Reasons are in the concept sections.

## The concepts, one by one

### Jackson and Zave: the world and the machine
- **What.** Requirements engineering describes the **world**, not the machine. Primitive terms need **designations**: written, maintained explanations of what they mean in the world [1]. Statements are **indicative** (true regardless of the machine) or **optative** (what we want); the former are domain knowledge, the latter requirements [1]. Actions are environment-controlled or machine-controlled, and shared (the machine sees them) or unshared [1]. Requirements about unshared things are met via domain knowledge linking them to shared ones [1] (§5.2 "Unshared information").
- **Good at.** Naming exactly why a request can't be met (the tool can't see a missing bill), and why a rule can't be the tool's job (nothing in the files tells it).
- **Fails with non-experts.** The formalism (Büchi automata, temporal logic) is unusable by them. The paper says it is "limited to the formal aspects" [1], and van Lamsweerde notes that more formal specifications cost "lower usability by non-experts" [17].
- **Verdict.** Adopt silently: designations, the indicative/optative split, unshared information (recs 3, 4). Skip the notation.

### Problem frames
- **What.** Recurring problem shapes, each with its principal parts and a "frame concern" [2][3]. Five basic frames; a real tool is a mix [3]. Domains are *causal* (reacts predictably) or *biddable* (a person) [4].
- **Good at.** Telling the AI which questions apply. Wirfs-Brock et al. report that frames "[help] you to know what questions to ask" without going formal [3].
- **Fails.** Needs the vocabulary; no evidence for novices or AI builders [INFERENCE]. Jackson himself warns that a misfit gives a bad method (an avionics system is not an Information Display problem) [2].
- **Verdict.** Adopt silently as a check selector (rec 6).

### Use cases (Jacobson, UML, Cockburn)
- **Origin.** Jacobson at Ericsson in the late 1960s, brought to object-oriented work in the late 1980s [5]. UML 2.5.1 defines a UseCase as behavior yielding "an observable result… of value" to actors (as read in [note 11](11-data-diagrams.md), its source [1], §18.2.5) and adds include/extend between use cases [8] [secondary].
- **Cockburn's version** is the useful one. Goal levels: summary ("cloud"), **user goal ("sea level")**, subfunction ("underwater") [5]. A use case = a **main success scenario** (3–9 steps) plus **extensions**, each a *condition* attached to a step with its handling [5][6]. Stakeholders and interests give what the use case must protect; preconditions and guarantees say what holds before and after [6]. Forms: *brief* (a paragraph), *casual* (prose), *fully dressed* (numbered, fields); "neither style of writing is wrong", choose per project [5]. Work "breadth-first, from lower precision to higher": goal, then brief or main scenario, then extension conditions, then handling [6].
- **Good at.** The missed case (rec 2), the right level (rec 1), the people off stage (rec 5). Cockburn: "even mediocre use cases are useful" [6].
- **Fails.** UML turned a text technique into pictures; Cockburn says the "textual nature of use cases was lost in the standard" [6]. UML's *extend* also means something different from Cockburn's *extensions* [5][8]: a vocabulary collision to avoid, not to explain. His "system-in-use story" (one concrete example) is "not a use case", and at most "a promissory note for a future conversation" [5]; that is close to an agile user story (see the peer note on agile artifacts).
- **Verdict.** Adopt silently: the casual form with extensions, the sea-level test, stakeholders' interests. Skip UML, include/extend, the dressed template.

### Structured analysis: context diagram, event list, essential model
- **What.** DeMarco/Yourdon structured analysis drew a context diagram, then split it top-down. Yourdon records that this "has not worked well" and that **event partitioning** (McMenamin and Palmer 1984; extended by Ward and Mellor 1985) was added: list the external and **temporal** events that need a planned response, and model each [9][10] [secondary for the names]. The **essential model** is "required behavior independent of the technology used to implement the system" [11] [secondary]. Yourdon: users think physically; translate separately [9].
- **Good at.** The event list is the part to keep (rec 3). The essential/physical split is the part to borrow (rec 1).
- **Fails.** DFD-style decomposition and diagrams (see [note 11](11-data-diagrams.md) on laypeople and DFDs).
- **Verdict.** Adopt silently: event list; essential-versus-today wording. Skip the diagrams. The context diagram is already the data map.

### Good-requirement criteria: ISO/IEC/IEEE 29148, Volere, Planguage
- **What.** 29148 gives nine characteristics for one requirement (necessary, appropriate, unambiguous, complete, singular, feasible, verifiable, correct, conforming) and five for a set (complete, consistent, feasible, comprehensible, able to be validated) [12][13][14] [secondary; I did not open the standard]. Volere adds a **fit criterion** per requirement [15]. Planguage makes a quality requirement carry a Scale, a Meter and levels (Past, Goal, Wish, Fail…) [16]; Gilb's own advice: "you should only elect to do what pays off for you" [16].
- **Fails.** Weak reliability between reviewers (rec 7). The standard's "shall" format competes with the user's words ([note 02](02-ontology-vocabulary.md)). Fit criteria and Planguage assume someone will measure.
- **Verdict.** Adopt silently: unambiguous, verifiable, singular; fit criterion as "Check:"; Past→Goal from Stage 3. Skip the rest.

### Goal modelling (KAOS, i*)
- **What.** Goals refined with AND/OR links; goals owned by the software become requirements, goals owned by the environment become **assumptions**, which is the indicative side again [17]. **Obstacles** are conditions that break a goal; obstacle analysis finds them early [17]. i* models dependencies between actors [17].
- **Good at.** The why/how pair (rec 8); obstacles as "what could make it look met when it isn't"; goals/assumptions mirror requirements/facts (rec 4).
- **Fails.** A mapping study of 246 papers found separate camps; to apply the approach "one is almost forced to 'pick a side'" [19]. In a quasi-experiment with 57 novices, alternative i* symbols needed less visual effort but gave no gain in accuracy or speed [18] [snippet]. In another study, non-technical stakeholders found most dependencies but struggled with their types and with drawing them [28] [snippet].
- **Verdict.** Adopt silently: why/how and goal-level obstacles. Skip the graphs.

### Parnas and Clements, "A Rational Design Process: How and Why to Fake It" (1986)
- **What.** No project is rational: clients "do not know exactly what they want and are unable to tell us all that they know" [20]. Still, produce the documents "we would have produced" had we been rational; documents are "the medium of design and no design decisions are considered to be made until their incorporation" [20]. Their requirements document has sections for outputs, interfaces, **likely changes** and **undesired event handling**, and treats "areas of incompleteness" as something to mark explicitly [20].
- **Good at.** What NOTES is for (rec 9). Its "undesired event handling" section is the extension list: "Most requirements documents ignore those situations; they leave the decision… to the programmer" [20].
- **Fails.** Heavy formality (typed term brackets, tabular functions), and a document-first process. It assumes readers who study reference material.
- **Verdict.** Adopt silently: current-truth NOTES, one place per fact, rejected alternatives, `Likely to change:`. Skip the formality.

### CRC cards (Beck and Cunningham 1989)
- **What.** Index cards with a class name, its responsibilities (short verb phrases) and collaborators, used to teach object thinking by role-playing scenarios [21].
- **Good at.** Teaching; finding responsibilities by playing "what-if" [21].
- **Fails.** Beck and Cunningham report that cards delivered to a client as partial design documentation could not be understood "out of context"; a videotape of designers was easy to follow because viewers saw the cards handled and discussed [21]. The artifact does not travel. They also resisted computerizing the cards: the physical handling was the point [21].
- **Verdict.** Skip as an artifact. The useful part, naming things and what each *does*, is already `CONTEXT.md`'s "Things" and "Actions" plus the "For the AI" mapping. Role-playing the story against sample rows is rec 1 and 2.

## Evidence on end users: what exists, and how thin it is

| Source | Who | What it shows | Limits |
|---|---|---|---|
| Anda, Sjøberg, Jørgensen 2001 [7] | 139 students in 31 groups, some acting as customers | Customers answered more questions correctly about use case models written with a template guideline than with minimal guidelines (Kruskal-Wallis p=0.021) | Students; role-played; free-text answers |
| Carroll 2000; Rosson & Carroll 2002 [23][24] | Design practice and argument | Scenarios are accessible to many stakeholders; users "enact" current episodes; "what if" reasoning raises failure cases | Mostly argument and case examples, not a comprehension test |
| Sutcliffe, Maiden et al. 1998 [22] | Tool for scenario/exception generation | Exception types per step suggest abnormal paths; analyst selects the likely ones | Authors state effectiveness in practice still had to be shown [22][snippet] |
| Pane, Ratanamahatana, Myers 2001 [25] | 12 children (study 1); 5 adults + 14 children (study 2), non-programmers | 54% of statements were event rules ("when/if/after"); "else" 0.4 per person; half of range specifications wrong; "and" misused as a Boolean 76% | Mostly children; programming tasks, not requirements |
| Seki et al. 2020 [26] | 30 use case descriptions found online; 8 raters | Missing parts ("lack") were the largest defect class (108 of 248) | Convenience sample; not users |
| Petre 2013; Ottensooser et al. 2012 (in [note 11](11-data-diagrams.md)) | 50 professionals; students | Clients "couldn't make sense" of detailed UML; untrained students gained from text, not from a BPMN diagram | Not about use case text |
| Horkoff et al. 2019 [19]; Moody et al. 2010 [18]; i* with non-technical stakeholders [28] | Researchers; 57 novices; non-technical stakeholders | Goal models fragmented, hard for novices | Snippets for the last two |

What this adds up to: in one study untrained readers did better with text than with a diagram; concrete, rough stories are the best-supported medium; non-programmers' own descriptions omit the other branch. **No study found tests any of this with an AI building a small tool for a non-coder.** The recommendations are design choices backed by indirect evidence [INFERENCE].

## Worked example: a book club's membership fees

Illustrative only: the data and all three messages are invented to show the artifacts; nothing here was run. The user is Priya, treasurer of a 22-member book club. She has `members.csv` (Name, Email, Joined) and a bank export `payments.csv` (Date, Payer, Reference, Amount). The yearly fee is 48; some pay 24 in January and 24 in July; people who join after 1 March pay 4 per month left. Her goal: know who still owes before the January chase, in one sitting instead of two evenings.

### What the AI keeps: the tool's `CONTEXT.md` (excerpt, her words)

```markdown
# Context: Club fees
Who has paid the yearly fee and who hasn't.
## Things
**fee**: What a member owes for the year: 48. In one go, or 24 in January and 24 in July.
_Also said_: subs
**payment**: Money that arrives in the club account, as the bank file shows it.
## Actions
**chase**: Remind a member who hasn't paid.
## Rules
- Members who join after 1 March pay 4 for each month left in the year.
## Not sure yet
- "paid up": the whole year's fee, or only what is due so far?
```

### What the AI keeps: `tools/club-fees/NOTES.md` (new parts only)

```markdown
## What we're after
Goal: Know who still owes in one sitting (Past: about 2 evenings each January; Goal: one sitting)
Must have: For each member, what they've paid and what's still owed.
  Check: Aisha and Ben both show "paid" from the one payment of 96 on 14 Jan.
Facts we rely on (checked on her two sample files, 2026-10-01):
- Each member has one row; names are unique. [held: 22 of 22]
- "Payer" is the name on the paying account, not always the member. [3 of 31 differ]
- Amount below 0 is money out. [held; 1 refund of 48]
- One header row; dates dd/mm/yyyy; amounts like 24.00. [held in both files]
Likely to change: the fee; the bank (new layout); more members.
Who else cares: members (don't chase me if I've paid), the committee (money counted once).

## For the AI
### Kind
Two files become a list on screen (transformation + display). Maybe later she ticks "chased" (editing a list).

### Story: who still owes (January and July; about 20 minutes)
Starts when: she has downloaded the bank file; it is 1 Jan or 1 Jul (first chase due);
  a member she expects hasn't paid by end of January (expected, doesn't arrive).
1. Priya saves the new bank file in her fees folder.
2. She picks it in the tool.
3. The tool counts each payment toward one member (or two, when it says so).
4. It shows every member: fee, paid so far, still owed.
5. She looks at the rows marked "check" and settles each.
6. She copies the "still owes" names into her chase email.
Today (her words): downloads the CSV, pastes it under last time's in Excel, hunts for names by eye.

What else can happen:                                        [where seen]   [what the tool does]
3a. Payer isn't a member's name ("J SMITH", "Mrs Lindqvist") [sample, 3]    close match → counts, shows why; unsure → "check"
3b. One payment covers two people ("Okafor + Patel", 96)     [sample, 1]    splits by fee, shows how, "check"
3c. Payment nobody matches ("M HARRIS")                      [sample, 1]    "check"; never dropped
3d. Rows repeated (two exports overlap)                      [sample, 4]    same row in both files → counted once, said;
                                                                            same row twice in one file → counted twice, "check"
3e. Money out (refund, -48)                                  [sample, 1]    subtracted, "check"
3f. Half-year payers (24 now, 24 in July)                    [sample, 6]    shows "owes 0 until July" (see Open below)
3g. Joined after 1 March                                     [sample, 2]    fee from joined date
2a. She picks last month's file again                        [likely]       "31 of these rows are already counted"
4a. Next file has another layout or "24,00"                  [likely]       stops: which column it can't read; totals nothing
Shelved: payments typed in by hand; emailing the members.

### Decisions
- Unmatched payments go to "check", not to the closest name. Rejected: auto-match by closest name; wrongly chasing someone who has paid is the one thing that upsets members.
- Open: "paid up" for half-year payers. Default for now: owes nothing until July. Ask when the July list is built.
```

How each line gets used later:

| NOTES line | Becomes | Priya sees |
|---|---|---|
| 3a–3g | A row in `samples/` and a check in the tests; a marked row in the first look | The tricky rows first, each with a reason |
| 4a, the four facts | A start-of-run check | A plain stop message naming the column |
| "Who else cares" | The rule "unsure → check, not owes" | Rows marked "check" instead of a wrong "owes" |
| `Check:` and Past→Goal | The acceptance case; a question after real use | "Did it take under an hour this time?" |
| Decisions | Why the AI won't "improve" matching later | Nothing, unless she proposes it |

### What Priya sees: three messages

**After the first look** (before any app; per `build.md` milestone 1, the tricky rows first, one question):

> Here's the January list worked out from your two files. Nothing is built yet; this is just the answer. The rows to look at are first.
>
> | Member | Fee | Paid | Still owes | Why |
> |---|---|---|---|---|
> | Aisha Okafor | 48 | 48 | 0 | Your 96 on 14 Jan says "Okafor + Patel", so 48 each |
> | Ben Patel | 48 | 48 | 0 | (same payment) |
> | Jon Smith | 48 | 48 | 0 | Shown as "J SMITH" in the bank file |
> | *nobody* | | 48 | | "M HARRIS", 3 Jan. I can't tell who. Marked **check**, not thrown away |
> | Mrs R Lindqvist | 48 | 24 | 0 | Paid 24 on 8 Jan. I've shown nothing owed until July; easy to change |
> | …and 18 more below (13 paid, 5 owe) | | | | |
>
> Is this the list you'd want to end up with?

**At "the shape"** (link to the clickable sketch at the top; one question):

> Here's how I understand the usual way. Please click through the sketch too.
> 1. You save the new bank file in your fees folder.
> 2. You pick it in the tool.
> 3. It counts each payment toward a member. When it can't be sure who, it puts the row in "check" instead of saying they owe, so nobody is chased by mistake.
> 4. It shows every member: fee, paid so far, still owed.
> 5. You settle the "check" rows.
> 6. You copy the "still owes" names into your email.
>
> What did I get wrong or leave out?

**Mid-build, a fact broke** (`build.md` "stop and check in"; one question, with a suggestion):

> I tried the tool on last July's bank file too. In 3 rows the amount is written "24,00" with a comma, and my totals for those members came out as 0. I made the tool stop and show those 3 rows instead of adding them up. Shall I make it read the comma ones as amounts? I'd suggest yes; they all look like 24 and 48.

Words never used with her: use case, extension, stakeholder, frame, event list, indicative, fit criterion, sea level.

## Open questions

- **Does a silent extension list lead to better tools?** No study found. Check by comparing, on two or three real small tools, the cases the user reports as missed with and without the list. [INFERENCE]
- **Cap on cost.** Cockburn's list "should be longer than you will eventually use" [5]. A hard cap (about 10 lines, a couple of minutes) is my guess, not a finding.
- **How well does the AI find extensions unaided?** FlowGen's abstract says existing approaches struggle with branch points [27]. The probe list in rec 2 and the sample check are meant to help; unmeasured.
- **Frames.** Whether classifying a tool into a frame changes what the AI asks, with a coding agent, is untested.
- **Primary sources not opened:** Jackson's *Problem Frames* (2001) and *Software Requirements & Specifications* (1995); Jacobson's *OOSE*; McMenamin and Palmer 1984; DeMarco 1978; Gilb's *Competitive Engineering*; the full Volere template; the ISO 29148 text; Cockburn's 2001 print edition; Carroll's full 2000 paper. Frame definitions come from Wirfs-Brock et al., who took them "nearly verbatim from Jackson's books" [3].

## Conflicts and tensions

- **With "no hypotheticals" ([note 09](09-context-file.md) rec 10).** Cockburn's brainstorm is an analyst activity, and his students brainstormed on a machine they knew [5]. Here the AI does it from samples and probes, and the user only reacts to real rows. The rule holds.
- **Use cases vs user stories.** Cockburn calls a single situated example a "system-in-use story… not a use case… a promissory note" [5]. The story here is one concrete moment written by intent, and its extension list is what plain story formats lack. Peer note on agile artifacts should decide the visible wording; this note needs only the silent text.
- **Parnas: the document is the medium of design** [20] vs the skill, where the demo and the user's reaction are. Resolution: NOTES records after their reaction, in the same change. The user never reviews NOTES.
- **Jackson: requirements say nothing about the machine** [1] vs NOTES "How we're doing it" and "Must have" lines that name screens. Keep "Must have" about the world ("see who still owes"); screens go under "How we're doing it".
- **"Measurable" (Volere, Planguage, 29148) vs minimal decisions for the user.** Use their own numbers from Stage 3, never ask for a metric.
- **UML "extend" vs Cockburn "extensions".** Avoid both words everywhere user-facing; use "what else can happen".
- **Cost.** Recs 1–5 add up to roughly 30 lines of NOTES per tool. For a tiny tool, write only the story and three or four "what else" lines. If the user is impatient, build the story and extension list during the first look, not before it.
- **Consistent with** [note 01](01-interview.md) (episode first), [note 09](09-context-file.md) (usual case vs case that ruins it; knowledge in their head) and [note 11](11-data-diagrams.md) (the data map is the context diagram). Rec 3 and rec 4 give `talking.md`'s two blind spots their formal names and a place to live.

## Sources

Opened unless marked.

[1] Zave & Jackson, "Four Dark Corners of Requirements Engineering", ACM TOSEM 6(1), 1997, https://cse.msu.edu/~chengb/RE-491/Papers/dark-corners-re-zave-jackson.pdf (opened 2026-10-01). Designations, indicative/optative, control and sharing, §5 domain knowledge.
[2] M. Jackson, "Problem Analysis Using Small Problem Frames", South African Computer Journal 22, 1999, http://www.jacksonworkbench.co.uk/stevefergspages/papers/jackson--problem_analysis_using_small_problem_frames.pdf (opened 2026-10-01). R, W, S descriptions; early frames (Simple Control, Enquiry, Information Display, Workpieces).
[3] Wirfs-Brock, Taylor, Noble, "Problem Frame Patterns", PLoP 2006, https://wirfs-brock.com/rebecca/papers/problemframepatterns/ (opened 2026-10-01). The five frames with definitions taken "nearly verbatim" from Jackson's books; frame concerns; questions per frame.
[4] Wikipedia, "Problem frames approach", https://en.wikipedia.org/wiki/Problem_frames_approach (opened 2026-10-01). [secondary] Causal/biddable domains; the five frames named.
[5] A. Cockburn, *Writing Effective Use Cases*, pre-publication draft, 1999, https://people.inf.elte.hu/molnarba/Informaciorendszerek_ELTE/Writing_effective_Use_cases_Cockburn.pdf (opened 2026-10-01). Goal levels, §11 extension conditions, system-in-use story, casual vs dressed.
[6] A. Cockburn, *Writing Effective Use Cases*, pre-publication draft #3 (2000-02-21), extract, https://www.ifi.uzh.ch/dam/jcr:00000000-25a0-3d08-0000-00000ce96422/weuc_extract.pdf (opened 2026-10-01). Preface on UML, one-page reminders, writing process, stakeholders and interests (ch. 2, 4).
[7] Anda, Sjøberg, Jørgensen, "Quality and Understandability of Use Case Models", ECOOP 2001, https://web-backend.simula.no/sites/default/files/publications/SE.5.Anda.2001.b.pdf (opened 2026-10-01).
[8] "Conceptual Understanding of UseCase Based on UML specification ver. 2.5.1", Mamezou Developer Portal, 2025, https://developer.mamezou-tech.com/en/blogs/2025/05/29/umls_usecase/ (opened 2026-10-01). [secondary] Include/extend; UML text itself: [note 11](11-data-diagrams.md) [1].
[9] E. Yourdon, *Just Enough Structured Analysis*, web edition rev. 2006, via Wayback copy of https://zimmer.fresnostate.edu/~sasanr/Teaching-Material/SAD/JESA.pdf (opened 2026-10-01; chapters 1–7 text seen). Operational users think physically; classical context-diagram-first "has not worked well"; event partitioning.
[10] Wikipedia, "Event partitioning", https://en.wikipedia.org/wiki/Event_partitioning (opened 2026-10-01). [secondary] Ward & Mellor quote on "does the system need to respond if this event fails to occur".
[11] Wikipedia, "Essential systems analysis", https://en.wikipedia.org/wiki/Essential_systems_analysis (opened 2026-10-01). [secondary] McMenamin & Palmer 1984: essence = required behavior independent of technology.
[12] ISO/IEC/IEEE 29148:2018, *Systems and software engineering — Life cycle processes — Requirements engineering*, https://www.iso.org/standard/72089.html (not opened; paywalled). [snippet]
[13] Lubos et al., "Leveraging LLMs for the Quality Assurance of Software Requirements", arXiv 2408.10886, 2024, https://arxiv.org/pdf/2408.10886 (opened 2026-10-01). Table I of the nine characteristics; participant-vs-LLM agreement; per-characteristic pass counts.
[14] Modern Requirements, "ISO 29148 Explained", 2026, https://www.modernrequirements.com/blogs/iso-29148-explained/ (opened 2026-10-01). [secondary, vendor] Nine individual and five set characteristics.
[15] J. & S. Robertson, Volere Requirements Specification Template, Edition 20 extract, https://www.volere.org/templates/volere-requirements-specification-template/ (opened 2026-10-01). Fit criterion; Business Event List.
[16] T. Gilb, "How to Quantify Quality: Finding Scales of Measure", Methods & Tools, https://www.methodsandtools.com/archive/archive.php?id=91 (opened 2026-10-01). Scale, Meter, Past/Goal/Wish/Fail; "only elect to do what pays off".
[17] A. van Lamsweerde, "Goal-Oriented Requirements Engineering: A Guided Tour", RE'01, https://webperso.info.ucl.ac.be/~avl/files/RE01.pdf (opened 2026-10-01). Goals, WHY/HOW, assumptions, obstacles, accuracy goals.
[18] Moody, Heymans, Matulevičius, "Visual syntax does matter: improving the cognitive effectiveness of the i* visual notation", Requirements Engineering 15(2), 2010, via search summary (https://link.springer.com/article/10.1007/s00766-010-0100-1). [snippet]
[19] Horkoff et al., "Goal-oriented requirements engineering: an extended systematic mapping study", Requirements Engineering 24, 2019, https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6555435/ (opened 2026-10-01). "Pick a side".
[20] Parnas & Clements, "A Rational Design Process: How and Why to Fake It", IEEE TSE SE-12(2), 1986, https://www.cs.tufts.edu/~nr/cs257/archive/david-parnas/fake-it.pdf (opened 2026-10-01).
[21] Beck & Cunningham, "A Laboratory for Teaching Object-Oriented Thinking", OOPSLA 1989, https://www.inf.ufpr.br/andrey/ci221/docs/beckCunningham89.pdf (opened 2026-10-01).
[22] Sutcliffe, Maiden, Minocha, Manuel, "Supporting Scenario-Based Requirements Engineering", IEEE TSE 24(12), 1998, https://research.cs.vt.edu/ns/cs5724papers/1.motivatingreuse.tpgap.sutcliffe.scenarios.pdf (opened 2026-10-01, first part). Exception types (Table 1). The "effectiveness still to be demonstrated" line is from search-result text of this PDF.
[23] Carroll, "Five reasons for scenario-based design", Interacting with Computers 13(1), 2000, https://pure.psu.edu/en/publications/five-reasons-for-scenario-based-design-2/ (abstract opened 2026-10-01).
[24] Rosson & Carroll, "Scenario-Based Design", in *The HCI Handbook*, 2002, https://ocw.tudelft.nl/wp-content/uploads/2_RossonCarrollSBDforHandbook2002.pdf (opened 2026-10-01). Scenarios concrete but rough; users enact current episodes; claims and "what if".
[25] Pane, Ratanamahatana, Myers, "Studying the language and structure in non-programmers' solutions to programming problems", IJHCS 54, 2001, https://john.pane.net/pdf/PaneRatanamahatanaMyers2001.pdf (opened 2026-10-01). Also cited in [note 02](02-ontology-vocabulary.md) [31].
[26] Seki, Hayashi, Saeki, "Detecting Bad Smells in Use Case Descriptions", arXiv 2009.01542, 2020, https://arxiv.org/pdf/2009.01542 (opened 2026-10-01).
[27] Wang et al., "Relationally Guided Use Case Modeling with LLMs", arXiv 2609.18291, 2026, https://arxiv.org/abs/2609.18291 (abstract opened 2026-10-01).
[28] "An empirical study on the use of i* by non-technical stakeholders: the case of strategic dependency diagrams", https://www.researchgate.net/publication/325744852 (not opened). [snippet]
[29] Levy et al., "AI-Assisted Requirements Engineering: An Empirical Evaluation Relative to Expert Judgment", arXiv 2604.15222, 2026, https://arxiv.org/abs/2604.15222 (abstract opened 2026-10-01).
