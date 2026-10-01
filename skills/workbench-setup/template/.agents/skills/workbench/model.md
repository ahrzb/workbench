# The spec: what the user wants, written formally

For the guide (see [roles.md](roles.md)), never for the user. The conversation stays in the user's world: their words, their rows, sketches. This file is the other layer: the same things written as a formal spec the scripts can check, so every gap in it is found by a script, not by luck, and comes back to the user as one plain question about their own rows. It is also the maker's only input: the tool's code, tests and sketches are made from it, and the gates check them against it.

```
user's words and files  --(you formalize)-->  tools/<name>/model.json  --(model-check.ts)-->  gaps
        ^                                             |                                          |
        |                                             +--> maker: code, tests, sketches          |
        +------------- one question, their words, a found row, your suggestion <-----------------+
```

## The file: `tools/<name>/model.json`

JSON, written and kept by you, the guide; the maker only reads it. No real data in it: facts are generic ("each member has their own number"), cases are made-up twins of the real tricky rows (same shape, invented names and amounts). Words for things, stages, events and screens are the user's words from `CONTEXT.md`; a thing with no word yet gets the naming dialogue first ([talking.md](talking.md)). Create it at the first look; keep it current after every answer; it is in every save point.

```json
{
  "version": 1,
  "job": { "when": "the bank export for the month arrives", "who": "the treasurer", "wants": "to see who still owes this year's fee", "so": "reminders go only to the right people" },
  "kind": ["transformation", "display"],
  "startsWhen": [{ "type": "arrives", "what": "the monthly bank export" }, { "type": "missing", "what": "a member who never pays leaves no line" }],
  "steps": ["saves the bank export", "opens the tool and picks the file", "sees who still owes, unsure ones apart", "sends reminders"],
  "firstVersionThrough": 3,
  "sources": [{ "id": "members", "file": "members.csv", "rowIs": "member" }, { "id": "payments", "file": "payments.csv", "rowIs": "payment" }],
  "things": [{ "id": "member", "word": "member", "toldApartBy": ["members.number"], "from": "members file", "changes": "band", "ends": "leaves (kept, marked)", "history": "none" }],
  "facts": [
    { "id": "F1", "says": "Each member has their own number", "rule": "unique", "where": "members.number", "source": "files", "hard": true },
    { "id": "F3", "says": "Each payment names one member number", "rule": "mentions-one", "where": "payments.reference", "args": { "in": "members.number" }, "source": "guess", "hard": true, "cost": "wrong-total" },
    { "id": "F8", "says": "Paid up means this year's payments reach the fee for their band", "rule": "derived" }
  ],
  "ignored": [{ "where": "members.notes", "why": "free text, only shown" }],
  "lives": [{
    "thing": "member", "statusAt": "members.status",
    "stages": [{ "id": "Active", "means": "pays and gets the books" }, { "id": "Lapsed" }, { "id": "Left" }],
    "workedOut": [{ "word": "Late", "rule": "Active and nothing paid by 1 April" }],
    "moves": [
      { "id": "M1", "from": ["(new)"], "event": "join", "to": "Active" },
      { "id": "M2", "from": ["Active", "Lapsed"], "event": "leave", "to": "Left", "source": "you" }
    ],
    "never": [{ "from": "Left", "event": "*" }],
    "refused": [{ "from": "Active", "event": "join", "source": "guess" }]
  }],
  "cases": [{ "id": "C1", "says": "A member who paid in two parts counts as paid", "about": ["F8"], "said": "you" }],
  "promises": [{ "to": "members", "says": "nobody unsure is listed as owing", "case": "C4" }],
  "screens": [{
    "id": "owing", "word": "Who still owes", "first": true,
    "shows": ["members who owe: name, band, paid so far, still owing", "the 'check these' list first when it has rows"],
    "actions": [{ "label": "Open this month's bank file", "does": "open-file" }, { "label": "Mark as left", "does": "member:leave", "greyedWhen": "already left" }],
    "empty": "Open a bank file to see who still owes."
  }],
  "backlog": [{
    "id": "B1", "milestone": 3, "canDo": "see who still owes this year's fee, unsure payments set apart",
    "quote": "I want to see quickly who still owes this year's fee",
    "cases": ["C1", "C4"], "facts": ["F3", "F8"], "screens": ["owing"],
    "status": "confirmed"
  }]
}
```

What each part catches, and the rules for writing it:

- **job**: "When <situation>, <who> wants <to do what>, so <result>". The one-sentence first version. Catches building the wrong thing.
- **kind**: transformation (inputs become outputs; inputs never change), display (shows part of the world: say what it can't see, and "as of"), workpieces (the user edits things: undo, which commands make no sense when), commanded (changes something outside: reversible? pressed twice? fails halfway?), required (acts by itself on a time: is the tool even open then?). It picks which gaps you look for.
- **startsWhen**: `arrives` (a file, a click), `date`, `missing` (something expected that never comes: a tool can only see what arrived, so the user must give the list of what should). Ask of every `arrives`: what if it doesn't?
- **steps**: the usual way, 3-9 steps by intent in their words, one sitting long. `firstVersionThrough` marks the first-version line.
- **sources**: one per sample file. Columns are named `<source id>.<column header>`.
- **things**: one per kind of thing the tool counts. `toldApartBy` is mandatory and never a name alone (a name is shown, never the key). Things that happen (payments) are their own history; a value that changes and was used (a fee) is copied onto what used it or kept per year (`history`: `none` / `copy` / `dated`).
- **facts**: one elementary sentence each (a sentence with "and" that splits without loss is two facts). `rule` is one of: `required`, `optional`, `unique` (a column, or `a+b`), `one-of` (`args.values`), `date` (`args.form`, e.g. `YYYY-MM-DD`, `DD/MM/YYYY`), `money`, `refers-to` / `mentions-one` / `mentions-some` (`args.in`: the column it points to, matched exactly or found inside text), `same-per` (`args.per`: the columns it's constant for), `follows` (a typed value that should agree with other data, like a Status, a Paid? column or a hand-typed total: `args.ok` is a JavaScript expression that is true when a row agrees; it sees `row` (by column header), `rows("<source>")`, `mentions(text, key)` and `today`; e.g. `"row.status !== 'Lapsed' || !rows('payments').some(p => mentions(p.reference, row.number) && p.date.startsWith(today.slice(0, 4)))"`. Write one for every typed column that looks worked out: a disagreement is the "typed or follows?" question), `derived` (worked out from other facts: becomes a view, never a stored column; needs a case), `words` (anything else; needs a case). `source`: `files` (the samples show it), `you` (the user said it), `guess` (yours). `hard: true` means the tool refuses data that breaks it; only `files` or `you` facts that every sample row keeps may be hard. Everything else is a warning the tool shows. `cost`: `ruins`, `wrong-total` or `annoying`.
- **ignored**: every sample column no fact uses, with why. A column nothing explains is how a need gets lost.
- **lives**: only when a thing changes over time and a wrong move costs something (a Status column, dates that fill in, "once / after / not yet" words). Stages are resting situations in the user's words (also listed in `CONTEXT.md`); events are what happens. Every stage x event is decided: a `move` (with `onlyIf` when several share a stage and event), a `never` (the user ruled it out), or `refused` (nothing ruled it in; refusing is the safe default). Words that follow from dates (Late) go in `workedOut`, never stages: they're shown, not stored. Separate tables for independent statuses.
- **cases**: a rule's examples, with the expected result, as made-up twins of the tricky real rows. `said`: `you` (the user confirmed the result: proof), `guess` (still runs, proves nothing about what they want), `waiting` (an open question). Cases become tests named by their sentence ([build.md](build.md)).
- **promises**: who else cares (members, a committee, a client) and what the tool promises them, each checked by a case.
- **screens**: the flow, because it's about how the user works: each screen in their words, what it shows (what they need to see to decide), the actions with `does` (`<thing>:<event>` from a life, or a plain command like `open-file`, `export`), `greyedWhen` with the reason they'll read for every action the spec can refuse, and the empty state. The user confirms the flow by clicking through the sketch the maker makes from it. How it looks (spacing, type, colour) is not here: that's the maker's craft ([design.md](design.md)); the user's reactions to the look come back as backlog items.
- **backlog**: what gets built, one item per thing the user will be able to do, in milestone order. Each item: `canDo` (their words: "you can now ..."), `quote` (what they said that asked for it), the `cases` that prove it, the `facts` and `screens` it relies on, and a `status` only you move: `proposed` → `confirmed` (the user said yes to the plan or the sketch) → `built` (the maker's checks pass) → `tried` (the user used the trying-out copy) → `accepted` (their yes; then "Ship it"). An item is ready for the maker only when it is `confirmed` and every one of its cases is `you` or `guess` (none `waiting`). The maker builds only `confirmed` items; anything it builds that no item asks for is a mistake.

Size: about six things, 25 facts, 8 stages and 12 moves per life. Past that it is probably two tools.

## Checking it

`.workbench\scripts\run.cmd bun .workbench\scripts\model-check.ts <tool>` (works inside Codex's sandbox; macOS: `.tools/bun/bun .workbench/scripts/model-check.ts <tool>`):

- `--profile` before there is a spec: per sample column, what it looks like, blanks, distinct values, what could tell rows apart, cells with several values. Start the spec from this, then from `CONTEXT.md`, then from the story.
- default: every fact run on the samples with up to five counterexample rows, identity collisions, every undecided stage x event, unreachable stages, overlapping moves, status words that are no stage, typed status columns with no `follows` fact, columns nothing explains, guessed hard facts, waiting cases, promises without a case, events no screen offers and actions the spec doesn't have, backlog items that point at nothing or have no case. Each gap is `ASK` (only the user can settle it) or `MODEL` / `DESIGN` (yours to settle in the spec).
- `--trace`: once there is code, every case of a `built` or later backlog item has a test whose name carries its id (`[C4] ...`), and every test that carries an id points at a real case.
- `--summary`: the spec in short, for the maker's brief.
- Real values from the samples appear only in its output (for the chat), never in the spec.

Before moving a milestone on, the gate checks all of this: `.workbench\scripts\run.cmd bun .workbench\scripts\gate.ts <tool> <shape|build|demo|ship>` ([roles.md](roles.md)).

Run it after every change to the spec. Settle every `MODEL` and `DESIGN` gap yourself: model the column or ignore it with a reason, decide the cell (refuse when nothing says otherwise), add the case, give the event an action. Don't stop at zero `ASK` gaps by making things soft; a hard rule the user cares about is worth one question.

## From gaps to questions

Only `ASK` gaps reach the user, and never as gaps. For each, write the question the user would answer without knowing there is a model:

| Gap | The question, in their world | Your suggestion |
|---|---|---|
| Two rows told apart by the same value; a name that looks like two people | "Rows 12 and 31 are both Ann Lee with the same email. Same person?" | What the data favours |
| A cell names two things ("M002+M003") | "The 15 January payment of 65 is for both Okafors. Does that happen, and should I split it by their fees?" | Split by fee |
| An enforced rule some rows break | "These 2 payments name no member. Handled differently, or should the tool put them aside for you to match?" | Put aside |
| The same thing with different values at different dates | "Standard was 35 in 2025 and 40 now. A 35 payment in January: still last year's fee?" | Fee per year |
| A status word that is no stage | "Dev is 'Paused'. Is that like Lapsed, or its own thing?" | The closest stage, if the rows agree |
| A typed status the data contradicts | "Eli is marked Lapsed but paid in March. Do you set Lapsed yourself, or should it follow from payments?" | You set it; the tool flags mismatches |
| A move nobody mentioned, where it could matter | "Has a member ever come back after leaving?" (past tense, never "can a member...") | No: they rejoin as new |
| A guessed enforced rule | "I'll treat each member number as belonging to one person, ever. Right?" (only if no row tests it) | Yes |
| A waiting case | The case as their own row, with your expected result | Your expected result |

Rules: use a row the script found (by what they'd recognise: date, name, amount), or what happened last time; one line; a suggested answer so "yes" is enough. Never "each", "at most", "always" on their own (people answer those wrongly; a row settles it). Never "is this model right?" (people say yes regardless). Rank by what a wrong guess costs: wrong money or a wrong person first, annoyances last. A question left unanswered takes the safe default, recorded as `guess` and soft: refuse the move, keep the row aside, mark instead of delete.

When the answer comes: change the spec first (`source: "you"`, hard or soft, the new move or stage, the case `said: "you"`, the backlog item's status), run the check, then brief the maker if a `confirmed` item changed ([roles.md](roles.md)).

For the first look, work the result out with a scratch Bun script in `.workbench/scratch/` (delete it after) and show it as a small table, tricky rows first and marked; real rows appear in the chat, never in the spec.
