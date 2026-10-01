# Data models: what the data is, and how what the user says becomes one

Scope: how the AI should work out what a small tool's data *is* (the things, how to tell them apart, the facts and rules about them, what changes and what must be remembered), check that against the user's sample files, show it to a non-developer without notation, and turn it into SQLite tables and versioned migrations. Note 11 covers where data goes; this note covers what it is. It builds on notes 01 (interview), 02 and 09 (the user's words, `CONTEXT.md`, sorting what they say) and 11, and on `build.md`, `talking.md`, `data.md`, `safety.md`, `stack.md` and the `data-safety` block. Research date 2026-10-01.

Tags: `[INFERENCE]` is my reasoning. `[UNVERIFIED]` means I could not confirm it. `[snippet]` means I saw only search-result or abstract text. `[secondary]` means I read a summary of the work, not the work. `[LOCAL]` means I ran it on this machine (Windows, Node 24.21.0 with SQLite 3.53.4, Bun 1.4.2; throwaway scripts, deleted afterwards). `[REPO]` is a fact about this repository's skill files as read today. Sources are numbered in "Sources"; repo notes are cited as "note NN".

## Recommendations for the workbench

The core idea: **the model has two layers, and they belong to different people.** The *facts and rules* (this thing is told apart by that; a payment is for one member; a fee belongs to a year) are about the user's world. They are the user's to confirm, and they live in plain sentences. The *table design* (which tables, keys, column types) is a design choice with many valid answers [11], so it is the AI's, never a question to the user (`talking.md`: technical choices are never questions). The AI works out the facts from the user's sample files first and their words second, checks them with a script, asks only what the files cannot settle, and generates the table design from the facts.

### A. What the AI keeps

**1. One section in the tool's `NOTES.md`: `## Things and facts`, just before `## Data`.** Not in `CONTEXT.md`, which stays "a glossary and nothing else" (note 09 rec 2). The words in it are the user's words from `CONTEXT.md`; a thing with no word yet gets the naming dialogue first (note 09 rec 3). Two tables, a closed set of rules, a size budget.

```markdown
## Things and facts
(What the data is, in your words. Examples are made up. Check: `.workbench\scripts\run.cmd bun .workbench\scripts\model-check.ts <tool>`)

Things
| Thing | Told apart by | Comes from | Changes / ends | Old values matter? |
|---|---|---|---|---|

Facts
| # | In your words | Rule | Where | Source | Enforced by |
|---|---|---|---|---|---|

Checked against samples: <date>, <what failed and what we did>
```

- **Things**: one row per kind of thing the tool counts. *Told apart by* is mandatory (rec 4). *Comes from* and *Changes / ends* are a CRUD matrix in the user's verbs (rec 8 and "CRUD matrix" below): which action creates it, what changes it, what ends it. *Old values matter?* is the history question (rec 6).
- **Facts**: one sentence per row, one fact per sentence. *Rule* is one word from a short closed list, so a script can check it: `required`, `optional`, `unique` (one column, or `a + b`), `one-of a / b / c`, `refers-to <file: column>`, `mentions-one` or `mentions-some <file: column>` (a value found inside a text column, like a member number inside a bank reference), `date <form>`, `money`, `same-per <column> per <column, column>` (a value is always the same for one other value or pair), and `derived` or `words` for anything else (written as a sentence, checked by a test the AI writes). *Where* is the file and column in their samples (or `-`). *Source* is `you` (they said it), `files` (the samples show it) or `my default` (unconfirmed). *Enforced by* is filled in at the schema step (rec 13).
- **Size budget.** About six things and 25 facts. Past that the tool is probably two tools (`stack.md`: a new need is a new folder), or the record has become a spec (note 09 rec 2, rec 6).
- **No real data in the file.** `safety.md` says `CONTEXT.md` and `NOTES.md` hold no names, amounts or numbers: facts are written generically ("two members can have the same name"), patterns not values ("a member number like M001"), and what the samples showed is recorded as counts and row numbers only. Real rows appear in chat and in sketches, which `safety.md` and `stack.md` already allow as "Whose data" permits.

**2. Work it out from the samples first, the user's sentences second.** Order of sources: (1) the headers and values of the sample files; (2) the nouns and actions already in `CONTEXT.md`; (3) the nouns and verbs of the user's story. The third is the weakest: see "Noun-verb heuristics" below. Step 1 is a *profile*, run as soon as the first sample arrives (it also feeds the first look in `build.md`). It reports, per file and column:

- types and formats, with the evidence: dates day-first when a first part exceeds 12 and no second part does; IDs and codes that must stay text (Excel's default conversions corrupted gene names in 19.6% of genomics papers with Excel gene lists, 704 of 3,597 [18]);
- blanks, distinct counts, which columns could tell rows apart, and collisions (two rows with the same name but different keys; two people with one email);
- Wickham's five messy patterns [16]: column headers that are values (one column per month); several values in one cell ("M002+M003"); variables in both rows and columns; several kinds of thing in one table; one kind of thing across several tables (one sheet or file per month). Over 30% of the spreadsheet and web tables Li et al. surveyed were not relational [17]. That is their corpus, not office workers' own sheets, so the share for a user's file is unknown [INFERENCE];
- layout noise in `.xlsx`: merged cells, total rows inside the data, repeated header rows, notes typed into cells. Microsoft's own advice is the opposite: similar items in the same column, no blank rows inside a range [19]. Cell colour or strike-through carrying meaning (paid, cancelled) is common practice but I measured nothing [INFERENCE];
- a value from one file found inside text in another (candidate link);
- a value that repeats exactly where another value repeats (a member's name on every payment line): a candidate "fact about something else", the update-anomaly shape in [10]. Cunha et al. describe a route from a spreadsheet's tabular layout to a relational schema and back, using data refinement rules [20, snippet]; whether they infer dependencies from the data I did not check [UNVERIFIED];
- columns that look worked out but are hand-typed (Status, Paid?, Total), and where they disagree with the data;
- columns no fact mentions (rec 12).

Everything here is a *candidate*. A pattern in 40 rows is not a rule: in Halpin's method the sample population "suggests" a constraint and the domain expert is consulted to verify it [6]; and functional dependencies are only defined when things have unique, singular identifiers [10].

**3. Write each fact as one elementary sentence in the user's words.** Rules for the AI: (a) the "and-test": a sentence containing "and" that can be split without losing information is two facts [6]; (b) verbs that are Actions in `CONTEXT.md` ("chase up") go in the *Changes / ends* column or, if someone later needs to know it happened, become a thing of their own (a contact), not a fact; (c) do not agonise over entity versus attribute versus relationship. Kent could not tell attributes from relationships ("Henry Jones works in Accounting" has the same structure as "Henry Jones weighs 175 pounds") [9], Halpin finds attributes unstable and models everything as facts [7][8], and Chen's own footnote leaves "marriage" as entity or relationship to the enterprise's choice [1]. Write the sentence; the table design decides later.

**4. Identity first: a "Told apart by" for every thing, found from the data and confirmed in one line.** Evans: "The model must define what it means to be the same thing"; mistaken identity "can lead to data corruption" [12]. Kent's "one thing or two" is a likely source of wrong totals in small tools [INFERENCE]: one physical thing playing two roles (a player and a position), one name for two things, two spellings for one [9]. Rules: a name is never the key; if the user has an ID that is always present, never reused and found unique in the samples, it is the key (kept as text); if not, the tool gets its own internal number, never shown, and the natural columns stay visible (Kent's "surrogate" is information-free and not exposed to users [9]); people and organisations are never merged automatically: suggestions are shown with both rows and the user decides. When the samples show a collision, that is question 1 (rec 10).

**5. Every fact is hard or soft, and every hard fact has a source.** *Hard* facts are enforced (NOT NULL, a key, a foreign key, a CHECK). *Soft* facts are checked and shown as a warning, never refused ("this email already belongs to another member: same household?"). The test: a hard fact needs `Source` = `you` or `files` with the samples fully satisfying it; anything that is `my default`, or that some sample rows break, is soft. One exception: a rule that only *refuses to destroy* data (a thing others point to cannot be deleted) may be hard even as `my default`, because being wrong costs a click, not data. Reason: Vernon calls developer-imposed rules "false invariants"; only "a business rule that must always be consistent" belongs in the hard boundary [13]. An invented UNIQUE on email would refuse a real couple (rows 3 and 4 in the worked example). Tightening a soft rule later is one unique index after a preflight; loosening a hard one is a migration (recs 13 and 14).

**6. History: ask only when the samples or the story show something changed, and default to the cheapest rung.** The ladder, from Fowler [27][28][29]:
1. Things that *happen* (payments, contacts, deliveries) are rows already; they are their own history. Never update them; correct with a reversing line.
2. A value that changes and was *used* by something (a fee, a price, a rate): copy the value onto the thing that used it when it was used. Fowler: rather than a bitemporal model, "store a detailed trace of the calculations when you calculate the bill" [27].
3. A value people will want to look back on ("what was it in June?"): a table with a year or date range (a fee per band per year), or an audit log. If a log: always write both the date it was true and the date it was recorded, "they may be the same 99% of the time, the 1% can save your bacon" [28].
4. Never two-dimensional history. Fowler: bi-temporality is "the full solution, but it's always worth thinking of ways around it" [27], and "one of the hardest parts of this is educating users on how bitemporal history works" [29].
Triggers for asking: the same thing has different values at different dates in the samples, or the user says "it used to be". The question is question 4 in rec 10.

**7. Store base facts; work out the rest, and keep a rule for each worked-out value.** Totals, balances and statuses that follow from other facts (paid up, overdue, count of members) are *derived*: a `derived` fact with the rule in the user's words ("paid up means this year's payments add up to at least the fee") and a SQL view, not a column. Halpin: every derived fact type needs a derivation rule [6]. Exception: a value typed by a person is a base fact even if it looks derived (Eli's "Lapsed" in the example), and a value that depends on a moment is a base fact copied when it happened (rec 6, rung 2). The user's own sheet gives the test: their existing totals are the expected answers (note 01 rec 18: their real episode is the acceptance test). Where a hand-typed column disagrees with what the data implies, show the rows first (rule data contradicts, `talking.md`).

**8. Normalise only as far as it prevents a real bug.** Two tests, from Kent's guide [10]; the AI applies them silently:
- **Change it once.** Pick any fact: if it changed, how many places hold it? One, except deliberate copies (rec 6 rung 2, labelled as such). Kent's four symptoms of a fact stored about the wrong thing: it repeats, a change must touch every copy, copies can disagree, and it has no home when there are no rows (a warehouse with no stock has nowhere to keep its address) [10].
- **Can it exist alone?** A member with no payments yet, a supplier with no bills, a fee band with no members: each needs its own table.
Also first normal form: no lists inside a cell ("M002+M003", "Alice; Bob"); a repeated group becomes a child table or one row per item. Stop there. Do not teach normal forms, and do not denormalise for speed at this size [INFERENCE]. Kent's caution still applies: normalisation does not repair dirty identifiers ("123 Main St" and "123 Main Street" are two values) [10], so cleaning and identity (rec 4) come first.

### B. What the user sees, and what they are asked

**9. Show the data as sentences and their own rows, never as a diagram.** At "the shape" (`build.md` step 2), next to the data map from note 11:
- **A short story, five or six sentences, in their words, with one of their own examples each** ("two members can have the same name: there are two Ann Lees, M001 and M005"). Not the facts table, and no words like key, field, record or constraint. The table stays in `NOTES.md` where they can open it.
- **A page of "your rows, as the tool will keep them"**: their sheet on the left, the tables the tool will keep on the right, their real rows in both, the key column marked, the odd rows first. It is made by a script from the facts and the samples, like the data map (`data-map.ts` already turns NOTES tables into a page [REPO]); it is a sketch, so it is not saved and loads nothing. The design is mine; I did not build or test the page [INFERENCE].
- **At most one question per message** (rec 10).
Why tables and sentences: Ottensooser et al. found untrained students gained understanding from text but not from a BPMN diagram (note 11) [snippet there]; Hvalshagen et al. found in two lab experiments that cardinality constraints described in a narrative were understood better than ones shown only in the model diagram [23, snippet]; Halpin's own claim is that a schema stated as "unambiguous sentences backed up by illustrative examples" makes it "not necessary for domain experts to understand the diagram notation at all" [7]. No study I found tests this with non-technical users reading their own data (see "Evidence").

**10. The questions: seven kinds, each fired by a trigger, each with a suggested answer, one per message.** Usually two to four fire in a tool's whole life; most tools fire none of the later ones.

| # | Trigger (from samples or story) | The question, in their terms | Suggested answer | What the answer changes |
|---|---|---|---|---|
| 1 Identity | Two rows share a name but not a key; or no column is unique | "Row 12 'A. Lee' and row 31 'Ann Lee' have the same email. The same person?" (or: "Two members are both called Ann Lee, M001 and M005. I'll tell members apart by number, not name. OK?") | The reading the data favours | *Told apart by*; merge list |
| 2 One or many | A cell lists two things; or one thing repeats | "Row 5 is one payment of 80 for M002 and M003. Does that happen, and should I split it 40 each?" | Yes, split by their fees | `mentions-one` becomes `mentions-some`; a link table |
| 3 Exception | A fact fails on some rows | "These 3 lines name no member (rows 6, 7, 15). Handled differently, or should the tool keep them aside for you?" | Keep aside, you pick | hard becomes soft; a "needs a member" list. This is the existing rule in `talking.md`, applied to model facts |
| 4 Before | The same thing has different values at different dates | "Standard was 35 in 2024 and 40 in 2025. A payment of 35 in November: still counts as paid for 2024?" | Yes, a fee per year | rec 6 rung 3 |
| 5 Ending | The story has leave, cancel or delete; or a thing that others point to can be deleted | "What do you do with a member's line when they leave?" | Mark as left, keep their payments | `Changes / ends`; no delete |
| 6 Fixing | Things typed in the tool (not imported) | "If a payment is typed wrong, how do you fix it today?" | Cancel it with a minus line | edit versus reversal |
| 7 Typed or follows | A hand-typed column that looks worked out disagrees with the data | "Eli Brandt is marked Lapsed but paid in March. Do you set Lapsed yourself, or should it follow from payments?" | You set it; the tool flags mismatches | base versus derived |

Rules for asking: use the rows from *their* files (found counterexamples), or what happened last time (note 09 rec 10); ask in one line with a default; defaults toward the reversible option (mark instead of delete, soft instead of hard) are said in one line, not asked (note 09 rec 9). Never ask with quantifiers ("each", "at most one"): Halpin reports that experts' use of such words is often "imprecise or even incorrect" and fixes it with concrete rows [7]. Never ask "is this model right?": people say yes regardless (note 02 rec 11, AHRQ).

**11. When a rule changes later, say it in one line and change the record first.** "I changed one rule: a payment can now be for more than one member. Your old payments stay as they were." Edit the row in `Things and facts`, then the schema and migration, then the check (rec 14). A change in the user's *word* is a rename everywhere (note 09 rec 5).

### C. Checking the model against their files, by script

**12. `.workbench/scripts/model-check.ts <tool>`, Bun only, same convention as `data-map.ts` [REPO].**
- `--profile`: reads `tools/<tool>/samples/` and prints the profile of rec 2. Used before any record exists, at the first look.
- Default: parses the two tables in `NOTES.md`, runs every rule on the samples, prints for each fact `ok n/n` or `FAIL k/n` with up to five counterexamples (file, row number, what is wrong), then every column no fact mentions, then exits non-zero if a *hard* fact fails. Real values go to the terminal and chat only, never into NOTES or logs.
- **Column coverage is the omission guard.** Panko: omission errors were 31% and 53% of errors in two spreadsheet-building experiments (the 53% was "an anomaly of the task statement wording"), and "their detection rate tends to be very low" [14]. A column in their file that no fact mentions must be modelled or written down as `ignored on purpose`. For other people's details this is also `data.md` check 8 (keep only the fields we use).
- `--page`: writes `sketches/data-shape.html` (rec 9).
- Conservation: `data.md` check 5 already requires in = loaded + kept aside + skipped. The record names the "kept aside" bucket as a fact (F11 in the example).

When it runs: first look (profile); the shape (draft record, check, story, page, at most one question); the hard part (check on *all* samples, counts in the demo, exception questions fire here); before the thinnest working tool (schema from the record, rec 13); each later change (record first); every ~5 changes with the other data re-reads in `build.md`. A hard fact with `Source` = `my default` blocks the schema step until it is confirmed or made soft (except a rule that only refuses a delete, rec 5).

Prototype status [LOCAL]: rules `required`, `optional`, `unique`, `one-of`, `date`, `money`, `mentions-one` ran on made-up CSV samples (worked example), plus the coverage check and some ad hoc profile checks (repeated lines, name matching, amounts per band per year, typed status versus payments). `refers-to`, `same-per`, `derived`, `.xlsx` reading (merged cells, colours), `--page` and exit codes are specified here but not built. The SQLite behaviours in recs 13 and 14 and the example's schema, import, views, constraint test and migration also ran [LOCAL], in throwaway scripts that are deleted. `build.md` already assumes a one-off Bun script can read their samples before any app exists; an `.xlsx` reader there is the open dependency.

### D. From the record to the schema and migrations

**13. Each rule has one standard SQLite form.** (SQLite facts are from [31]–[35] and my runs [LOCAL].)

| Rule or fact | In SQLite | Notes |
|---|---|---|
| Thing, told apart by a value they already have | `col TEXT PRIMARY KEY` | IDs stay text: in a STRICT TEXT column `'007'` stays text; in a non-STRICT `ANY` column it became the number 7 [31] [LOCAL] |
| Thing with no reliable ID | `id INTEGER PRIMARY KEY`, natural columns visible, no unique on a name | rec 4 |
| `required` / `optional` | `NOT NULL` / nullable | `ALTER COLUMN ... SET NOT NULL` and `DROP NOT NULL` exist from SQLite 3.53.0 (2026-04-09) [33] and worked in my run; setting NOT NULL over a NULL fails with only "constraint failed" [LOCAL]. Before 3.53 a rebuild |
| hard `unique` | `CREATE UNIQUE INDEX name ...`, **not** inline `UNIQUE` | an index can be dropped later; an inline UNIQUE's index cannot: "index associated with UNIQUE or PRIMARY KEY constraint cannot be dropped" [LOCAL] |
| `one-of`, fixed by meaning | `CONSTRAINT status_ok CHECK (col IN (...))`, always named | on SQLite 3.53 or later a named CHECK can be replaced with `ALTER TABLE ... DROP CONSTRAINT` then `ADD CONSTRAINT` [LOCAL]; an `ADD CONSTRAINT` over rows that break it fails with only "constraint failed" [LOCAL]. On older SQLite the table is rebuilt [33] |
| `one-of`, a list the user edits in the tool | a small table plus a foreign key | a new value is a row, not a migration |
| `refers-to`, one-to-many | `REFERENCES parent(key)` | deleting a referenced row then fails: "FOREIGN KEY constraint failed" [LOCAL] |
| many-to-many, or "one or more" | a link table with a two-column primary key | |
| `mentions-*` | the *import* finds the id in the text and writes link rows; unmatched lines stay stored and unlinked, and a view lists them | never guess, never drop |
| `date` | TEXT, ISO `YYYY-MM-DD` | SQLite has no date type; it stores dates as TEXT, REAL or INTEGER through its functions [34] |
| `money` | INTEGER in the smallest unit | JS and SQLite floats: `0.1 + 0.2 = 0.30000000000000004` and `0.1 + 0.2 = 0.3` is false in SQLite [LOCAL] |
| yes/no | INTEGER 0/1 with `CHECK (x IN (0,1))` | |
| `same-per` | the "per" thing owns the column (its own table); two-column key for a pair | a fee per band per year is `PRIMARY KEY (band, year)` |
| `derived` | a VIEW | a view holds no data, so changing it needs no data migration [INFERENCE]; the example's migration replaced one |
| soft | no constraint; a query finds violations, the tool shows them | |

Always: `STRICT` tables (SQLite 3.37.0 or later) so a wrong type is an error, not a silent conversion [31]; run `PRAGMA foreign_keys = ON` at open and have a test read it back. SQLite leaves foreign keys off by default [32]; `node:sqlite` turned them on by default here (`PRAGMA foreign_keys` returned 1 [LOCAL], and the docs list `enableForeignKeyConstraints` as defaulting to true [35]), but I could not check the Node inside the Electron the starter uses, so do not rely on it [UNVERIFIED]. `node:sqlite` is "Release candidate" (stability 1.2) in the Node 26 docs [35]. Check `select sqlite_version()` once in the trying-out build.

**14. One schema in code; every change after the first real data is a migration that is tested.**
- `src/schema.ts` holds `createSchema(db)` (the newest shape, used for fresh data) and `MIGRATIONS` (the `data-safety` block's `MIGRATIONS[n]`: version n to n+1, working only in the private copy it is given [REPO]). The block's version lives in `version.json`; do not also use `PRAGMA user_version` as a second version number [REPO: the block copies `user_version` but decides on `version.json`].
- **Until the first "Ship it" with real data, change `createSchema` and keep `DATA_VERSION`; from then on, every storage change is `DATA_VERSION + 1` plus a migration** (`stack.md`: "changing how data is stored is its own change" [REPO]). Reason: the practice copy that `try.ts` makes is real data, and a fresh start never runs migrations [INFERENCE from the README: `status: 'fresh'` for a new folder].
- **Test that fresh equals migrated.** Build the version-n folder, migrate, and compare its structure with a fresh database: tables, columns sorted by name (`PRAGMA table_xinfo`), foreign keys, index origins, view text. `ALTER TABLE ADD COLUMN` appends the column and rewrites the stored `CREATE` text, so comparing text breaks when column order differs; comparing sorted structure does not [LOCAL]. A forgotten migration made the comparison fail in my run [LOCAL]. This sits next to the block's own test ("the previous version's data opens correctly in the new one").
- **Migration recipes by kind of change** (limits from [33] and my runs on SQLite 3.53.4 [LOCAL]; older SQLite lacks some of them, and I did not check the SQLite inside the starter's Electron [UNVERIFIED]). New fact with a new column: `ADD COLUMN` (a NOT NULL column needs a non-NULL default when rows exist: "Cannot add a NOT NULL column with default value NULL"; a UNIQUE or PRIMARY KEY column cannot be added: "Cannot add a UNIQUE column"). New thing: `CREATE TABLE`. Loosened rule: `DROP INDEX` (unique rules kept as indexes), `DROP CONSTRAINT <name>` (a named CHECK), `ALTER COLUMN ... DROP NOT NULL`. Tightened rule: first a *preflight query* on the practice copy that finds the rows that break it (`GROUP BY ... HAVING count(*) > 1`) and shows them to the user, because `CREATE UNIQUE INDEX` over duplicates fails with only "UNIQUE constraint failed: mem.email", and `ADD CONSTRAINT ... CHECK` or `SET NOT NULL` over bad rows with only "constraint failed" [LOCAL]. The block would leave the real data untouched, but the user deserves the rows, not the message. Not possible with ALTER in my run: an inline `UNIQUE` constraint or a `FOREIGN KEY` added to an existing table (syntax errors) [LOCAL]. A new unique *rule* is `CREATE UNIQUE INDEX`; a new foreign key, and splitting a table, use the 12-step rebuild in [33], in a transaction, with `foreign_keys` off. Changed view: `DROP VIEW` then `CREATE VIEW`.
- A migration already shipped is never edited (block rule).

**15. One small data-driven test from the facts table.** For each hard fact, the AI writes the one insert that violates it and asserts the database refuses; for each soft fact the same kind of insert must succeed. This catches a constraint lost in a later refactor and a soft rule hardened by mistake, which are plausible bugs. In the example it ran 7 of 7 [LOCAL]. Not a test of the SQL text: a test of behaviour.

### E. Edges

**16. No database, one-file tools, other people's details.** A tool that only reads files and writes a summary still has things and facts: they describe the import and the output columns, the check still runs, and there is no schema or migration. A one-HTML-file tool has the same record and no SQLite. When the data is other people's, the *Changes / ends* column carries `data.md` checks 8 and 9: why we keep a field, how long, and how one person is removed (removing a person's details while keeping totals is a fact, not an afterthought).

## Verdicts, concept by concept

| Concept | Verdict | Where it lands |
|---|---|---|
| Chen's ER model (1976): entities, relationships, attributes, keys, weak entities | Adopt silently; skip the diagram | vocabulary in recs 3–4 |
| Chen (1983) and Abbott (1983): noun and verb to entity and relationship | Adopt silently as a *candidate generator* on `CONTEXT.md` and headers | rec 2, rec 3 |
| Fact-based modelling (NIAM, ORM): elementary facts, populations, counterexamples | Adopt the parts, in plain words; skip the diagram, most constraint kinds, nesting | recs 1, 3, 7, 9, 10 |
| Kent: identity, "one thing or two", names versus things, surrogates, five normal forms | Adopt silently | recs 4, 8 |
| Conceptual, logical, physical; Simsion's design stance | Adopt as two layers; only the first is shown | the core idea; recs 1, 13 |
| Domain-driven design: entity versus value, invariants, aggregates, ubiquitous language | Three ideas silently; skip the rest | recs 4, 5, 6 |
| Spreadsheet research as a model of how users structure data | Adopt: profile first | rec 2, rec 12 |
| CRUD matrix | Adopt silently, as two columns | rec 1 |
| Temporal patterns | Adopt the low rungs; skip bitemporal | rec 6 |
| Normal forms | Two tests; skip names | rec 8 |
| Frictionless Table Schema [36] | Skip as the format; the rule words are a subset of what it expresses (primary key, foreign keys, constraints) | rec 1 |

### Noun-verb heuristics (Chen 1976 and 1983, Abbott 1983)

**What they are.** Chen (1976): an entity is "a 'thing' which can be distinctly identified"; a relationship is "an association among entities"; design has four steps: identify entity and relationship sets, identify mapping information (such as one-to-many), define value sets and attributes, then decide primary keys [1]. Chen (1983) maps English grammar onto the diagram; his own later summary table says: common noun, an entity type "(a possible candidate)"; proper noun, an entity; transitive verb, a relationship type (candidate); intransitive verb, an attribute type (candidate); adjective, an attribute; adverb, an attribute of a relationship; gerund, an entity type converted from a relationship type; clause, a high-level entity type [3]. The 1983 abstract speaks of eleven rules [2, snippet; I could not open the paper]. Abbott (1983): data types from common nouns, objects from proper nouns, operators from verbs and attributes [5, secondary; 4, snippet].

**Good at:** a cheap first list of candidates from words people already use. **Fails**, with evidence:
- *They only propose.* Every row in Chen's table is a "candidate", and his footnote hands entity-versus-relationship to the enterprise's choice [1][3].
- *Omissions.* Things nobody says out loud never appear. Kent's soccer team has 36 things (11 positions and 25 players) while the text says "players" [9]. In the example, nobody mentions the bank statement upload, which the double-counting guard needs.
- *Words are slippery.* One thing has several names and one name several things (note 02, recs 17–19); Kent's "part" means a kind in inventory and a physical unit in quality control [9].
- *Verbs are not all facts.* Saeki et al. separate relation verbs from action verbs [5, secondary]; "chase up" is an action. Hence rec 3(b).
- *Manual repair is needed.* The review of this tradition says the analyst needs domain knowledge and the text is "ambiguous, possibly inconsistent" [5, secondary]. A 2026 study found that LLM-generated ER diagrams degrade as requirements grow, with more inconsistencies and failures to represent constraints, and that "the cost of validation may offset the apparent productivity gains" [26].
- *The hard part is elsewhere.* In a lab study summarised by Rosenthal et al., learners' difficulties were "not primarily" in finding entity types but in relationship types, and grew with the degree of the relationship (Batra et al. 1990); novices could not integrate parts of the description (Batra and Davis 1992) [21]. Those are students, not users, but they say where to spend effort: identity, one-or-many, cardinality.

**Verdict: adopt silently** as a candidate generator, after the samples. Not a method with the user.

### Fact-based modelling (NIAM and Object-Role Modeling)

**What it is.** NIAM (Europe, mid-1970s [6]; Nijssen is the usual name attached to it, which the pages I opened do not say [UNVERIFIED]) became ORM in Halpin's formalisation. All information is stated as *elementary facts*: sentences naming objects and roles, which cannot be split without losing information ("Academic 715 works for Dept 'Computer Science'") [6]. Objects are referred to by a value with a reference mode ("the Academic with empNr 715"). Each fact type is shown with a *sample population* in a table, one column per role [6][7]. Constraints are read back as sentences: a uniqueness constraint is "Each Activity has at most one ActivityName"; a mandatory role is "Each Activity has some ActivityName" [7]. The design procedure (CSDP) has seven steps, and step 1, verbalising familiar examples taken from existing reports and forms, is "the most important stage" [6]. Halpin's tests include the "and-test", the uniqueness-misses-two-roles splitting test, and checking identifiers against the population ("Jones E" repeats, so academics cannot be identified by name; the expert confirms employee number suffices) [6].

**Why it is the best candidate.** It starts from artefacts the user has (reports, forms, sheets), which is what this skill already does with samples. Its unit is a sentence plus a table of rows, which is what a spreadsheet user reads. Its checks are mechanical: a constraint is a statement about columns, and a script can test it on a population. Its counterexample method turns a rule into a case: to test "at most one Activity per Room and time", show Room 20, Mon 9 a.m., booked for two activities, and ask whether that can happen [7].

**What I would not take.**
- *The claim that experts can validate it.* Halpin: "all domain experts are good at working with concrete examples", and they need not understand the diagram at all [7]. That is advocacy. Halpin himself says experts misuse "each", "at least", "at most" [7]. My searches found *no* controlled study comparing ORM verbalisation with ER for non-expert understanding [UNVERIFIED as an absence: I searched, I did not review a literature]. See "Evidence".
- *Counterexamples about cases the user has not met.* Halpin's counterexample rows are often invented. Note 09 rec 10 forbids hypotheticals they have never met. Rec 10 above uses found counterexamples first and last-time experience second. Whether to allow invented counterexamples at all, for money, identity and data loss, is the author's call (see "Conflicts").
- *Its machinery.* Seven steps, mandatory/exclusion/subset/ring constraints, nesting, subtypes, FORML. None of this fits "minutes to an hour".
- *The populations in the file.* Halpin treats sample populations as a validation aid, "not part of the conceptual schema itself" [8]. Same here, and `safety.md` forbids real rows in NOTES anyway. The record holds the sentences; real rows live in chat and the page.
- *Its stance on attributes* (it models none, to keep models stable [7][8]) matters for design, not for users: their sheets are columns. Kent agrees there is no real difference [9]. Rec 3 follows both: write facts, let the table design choose.

**Verdict: adopt and show, in plain sentences and their own rows.** Not in the diagram, and not with quantifier wording.

### Kent, *Data and Reality*: identity and names

Kent's point is that data structures are maps, not the territory; his questions are "What is 'one thing'?", sameness, and change [9]. Two examples carry over to small tools. A part is one *kind* in an inventory file and one *physical object* in a quality-control file; integrating them needs two kinds of thing [9] (the same split as an "item" on a bill and an "item" in a stock list, note 09 rec 1). And a person can be two things at once: the same husband and wife are each an employee and a dependent when working out benefits [9]. Kent also separates names from things: surrogates are information-free, globally unique, not exposed to users and one-to-one with an entity, while names are many-to-many with entities [9]. *Fails with non-experts:* the book is philosophy; the user never needs it. **Verdict: adopt silently** (recs 4 and 8).

### Conceptual, logical, physical, and design versus discovery (Simsion and Witt)

Simsion and Witt: data modelling "is a *design* activity, with opportunities for choice and creativity. For a given problem there will usually be many possible models that satisfy the business requirements and conform to the rules of sound design." They add that producing a model is not straightforward once you know the notation, "like suggesting that if we understand architectural drawing conventions, we can design buildings", and that "no database was ever built without at least an implicit model" [11]. The book is addressed to professionals "and for that matter, casual builders of information systems" [11]. Its contents list the three stages (conceptual, logical, physical models), but the preview I could read did not include that chapter [11]. Halpin's text puts the line the same way: a conceptual design "should be free of implementation concerns", then mapped down to a logical (relational) one [7]. Chen's four levels in 1976 draw a similar line [1].

**For this skill:** *conceptual* = the Things and facts in NOTES (user's words); *logical* = tables, keys and column types in `schema.ts`; *physical* = `STRICT`, indexes, pragmas (the AI only). No third and fourth artefacts that can drift; the test in rec 15 and the fresh-equals-migrated test in rec 14 are the links. Simsion's criteria (completeness, non-redundancy, enforcement of business rules, stability, communication) are the AI's silent checklist when it picks between two valid designs [11, contents]. **Verdict: adopt the two layers; the user sees only the first.**

### Domain-driven design (Evans, Vernon)

Useful at this scale: (1) **Entity versus value object.** An entity "is distinguished by its identity, rather than its attributes"; a value object has "no conceptual identity" [12]. Vernon's test: "ask whether that part must itself change over time, or whether it can be completely replaced"; if replaceable, it is a value [13]. For small tools: a fee, an address or a status is a value on a row unless someone must track it or pick from a list, which is the "can it exist alone?" test in rec 8. (2) **Invariants and false invariants** (rec 5) [13]. (3) **The consistency boundary** is what must change together in one transaction [13]. With one SQLite file and one user it is nearly always "one transaction", so there is nothing to design. Evans on events: audit trails and change histories keep old values but not the meaning of the change, while a domain event records "something happened that domain experts care about" [12]; this is why recording payments and contacts as rows is the first rung of rec 6. (4) **Ubiquitous language** is already settled in notes 02 and 09.

Not useful here: layers, repositories, services, factories, bounded-context mapping, CQRS. One tool is one context (note 09 rec 1). Vernon's "don't trust every use case" (a use case that changes several aggregates may mean a missed invariant) [13] needs a team and concurrency. **Verdict: three ideas silently, the rest skipped.**

### Spreadsheets as the user's existing model

The user's sheet already *is* a data model, built by someone with little training in structuring data. Hermans et al., studying spreadsheet design, say business analysts have "very limited training in programming or structuring data"; in their ten real spreadsheets at one Dutch asset manager, the owners of the seven with strongly coupled sheets needed time to recall why ("what did I do here again"), and none of the spreadsheets documented its design decisions [15]. Panko's review: cell error rates 1–5% in studies (3.9% average over 14 lab studies, 967 people); 94% of 85 operational spreadsheets audited in depth contained errors; and people found about 60% of errors in inspection experiments, 63% alone and 83% in teams of three in one study [14]. Conclusion for the AI: people cannot be relied on to *read* a model and spot what is wrong (rec 10, rec 12); a script and concrete cases do better [INFERENCE from spreadsheet inspection]. Messy layouts are normal: Wickham's five patterns [16], over 30% non-relational in Li et al.'s survey [17]. Excel's habit of converting text silently is documented and persistent [18]. **Verdict: adopt**: profile first, patterns as the profiler's checklist, coverage as the guard.

### CRUD matrix

CRUD was "likely first popularized in 1983 by James Martin" [30]. As a requirements tool it crosses actions with things (C, R, U, D). For this skill, two columns of the Things table do the job in the user's verbs: *Comes from* (Create) and *Changes / ends* (Update, Delete); "looked at by" is covered by the screens in the sketch. What it catches, cheaply: a thing nothing creates (where does it come from?); a thing nothing reads (why store it?); a thing nothing updates (how is a typo fixed: question 6); a thing deleted while others point to it (question 5). I found no study of whether it catches errors in practice [UNVERIFIED]; the checks are my reasoning [INFERENCE]. **Verdict: adopt silently.**

## Evidence on end users validating data models

| Evidence | What it shows | Strength for this skill |
|---|---|---|
| Halpin: verbalisation plus populations and counterexamples [6][7][8] | Claims that domain experts validate models this way | Advocacy by the method's author; no study cited in the pages I read |
| Hvalshagen, Lukyanenko and Samuel, ISR 2022 [23] | Two lab experiments: cardinality constraints in a narrative were understood better than in the model alone | [snippet]. Closest to what rec 9 does; participants and tasks unknown to me |
| Poels et al., ER 2005 [22] | Controlling for cardinality knowledge, business users interpret a many-to-many with attributes better as an association class (UML) | Opened (abstract). Shows how much representation matters to users; UML, not ORM |
| Bodart et al., ISR 2001 [24] | Theory and three experiments: optional attributes and relationships are acceptable when users need only a surface-level understanding, but "undermine users' abilities to grasp important domain semantics" when they need a deep one | [snippet]. Fits ORM's null-free facts and rec 5's hard/soft split; not a test of ORM |
| Batra et al. 1990; Batra and Davis 1992 [21] | Learners' errors concentrate in relationships and in integrating the whole description | Students modelling, not users validating |
| Panko [14] | Individuals find about 60% of errors; omissions are the hardest | Spreadsheet inspection; supports checking by script |
| Ottensooser et al. (note 11) | Untrained readers gained from text, not from a BPMN diagram | [snippet]; process notation |
| Purchase et al., IJHCS 2004 [25] | A method for comparing two ER notations: subjects judged whether a text specification matched a diagram; the more concise notation gave better performance and higher preference | [snippet]; notation comparison, not users validating their own data |
| Liu et al. (note 02) | Translating what the system will do back into natural language improved end-user programmers' understanding (n=24) | Not data models |
| AHRQ teach-back (note 02) | "Does that make sense?" gets yes regardless | Health communication; basis of rec 10's rules |

**Conclusion:** I found no direct evidence that ORM-style verbalisation helps non-technical users validate data models better than alternatives, and no head-to-head ER-versus-ORM comprehension experiment [UNVERIFIED as an absence]. Indirect evidence supports four design choices: text next to or instead of diagrams; concrete cases; cardinality and identity as the hard part; and not relying on people to find every error. So the design reads facts out as sentences and rows, asks about cases, and lets a script do the finding. **Thin evidence; the real test is the user's reaction to rec 9 and rec 10 (see "Open questions").**

## Worked example: a book club's membership fees

**The tool.** A treasurer has a member list (`members.csv`) and the monthly bank export (`payments.csv`). They want: each payment next to its member, and who has paid up this year. All names and numbers below are made up. This is milestone 1 to 4 of `build.md`, with the record from rec 1.

**Samples.** `members.csv` has 10 lines, e.g. `M001,Ann Lee,ann.lee@example.com,2019-09-03,Standard,Active` and `M003,Chidi Okafor,okafor.family@example.com,2020-01-14,Standard,Active`. `payments.csv` has 14 lines, e.g. `06/01/2025,40.00,M001 subs 2025,ANN LEE` and `08/01/2025,80.00,M002+M003 subs,B OKAFOR`. The files are seeded with traps on purpose: two members called Ann Lee; a couple sharing an email; one payment for two members; payments with no usable member number; one payment that seems to repeat; a fee that rose in January; a member marked Lapsed who paid.

**Milestone 1, first look (profile, then the existing demo rule: odd lines first).** The profile [LOCAL] found: dates are day-first (6 lines have a first part over 12, none a second part over 12); four payment lines that do not name exactly one known member; line 12 repeats line 4 ("M001 subs 2025", 40.00, 39 days apart); "Standard" payments are 35.00 twice in 2024 and 40.00 five times in 2025; a member marked Lapsed has a 2025 payment; and two columns (Joined, Paid by) that nothing models. The user sees:

> Here is your bank file as I read it, the odd ones first:
>
> | line | date | amount | reference | what I found |
> |---|---|---|---|---|
> | 5 | 8 Jan 2025 | 80.00 | M002+M003 subs | two member numbers in one payment |
> | 6 | 9 Jan | 25.00 | Dana W membership | no member number |
> | 7 | 13 Jan | 40.00 | annlee subs | no member number; "A Lee" could be M001 or M005 |
> | 15 | 5 Mar | 40.00 | M011 subs | M011 isn't in your member list |
> | 12 | 14 Feb | 40.00 | M001 subs 2025 | looks like line 4 (6 Jan) |
>
> The other 9 each match one member. Is this what you'd like to end up with: each payment next to its member, and who's paid up?

**Milestone 2, the shape: the record (first draft), as kept in NOTES.** `Source` marks what is unconfirmed. F1 to F8 are the plain column facts and appear in full in the final record below.

```markdown
## Things and facts
Things
| Thing | Told apart by | Comes from | Changes / ends | Old values matter? |
|---|---|---|---|---|
| member | member number (like M001) | the member list | email, band and status are changed by you; never deleted, marked Lapsed | no |
| payment | the tool's own number (bank lines have none) | the bank statement | never changed | it is the history |
| bank statement | its first and last date | you download it monthly | never changed | no |

Facts
| # | In your words | Rule | Where | Source | Enforced by |
|---|---|---|---|---|---|
| F1-F8 | One row per column of the two files (member number, name, email, band, status, payment date, amount) | required / unique / optional / one-of / date / money | both files | files | |
| F9 | A payment is for exactly one member, named in its reference. | mentions-one members.csv: Member no | payments.csv: Reference | my default | |
| F10 | A band has one fee. | same-per amount per band | payments.csv: Amount | my default | |
```

`model-check` on the samples [LOCAL]:

```
F1 ok   10/10  members.csv: Member no  [required]      ... F2..F8 ok
F9 FAIL 10/14  payments.csv: Reference  [mentions-one members.csv: Member no]
      row 5: 2 member numbers in "M002+M003 subs"
      row 6: no member number in "Dana W membership" (paid by D WHITFIELD)
      row 7: no member number in "annlee subs" (paid by A LEE)
      row 15: M011 is not in the member list
NOT IN THE MODEL: members.csv: Joined
NOT IN THE MODEL: payments.csv: Paid by
```

The coverage lines make the AI decide: `Joined` becomes a fact ("A member joined on a date", optional); `Paid by` is the name on the bank line, kept as text for matching and display, which is a new fact, not a key. F9 and F10 are `my default` and fail, so they are soft until answered. The user sees (the facts table is not shown):

> Here is how I read your two files. I've opened a page that shows your rows as the tool will keep them.
> - A **member** is one line of your member list. You tell members apart by **member number**: two members can have the same name (two Ann Lees, M001 and M005) and can share an email (the Okafors).
> - A **payment** is one line of the bank file. The bank gives it no number, so the tool numbers it and remembers which download it came from, so loading the same month twice doesn't count it twice.
> - A payment is for a member, found from the member number in its reference.
> - Each member has a fee band, and each band has a fee.
> - "Paid up" means this year's payments add up to at least the fee.
>
> 10 of the 14 payments name exactly one member and match right away. One thing before I go on: line 5 is one payment of 80.00 for M002 and M003. Does that happen (the Okafors paying together), and should the tool split it 40 each? I'd suggest yes, split by their fees.

**Questions as they fire (one per message), and what each answer does.** Question kind 1 (identity) does not fire: the user's own member number is always there and unique, so the story simply states it. Five questions fire in this example, because it is seeded; a real tool usually fires two to four.

| Question (kind) | Answer | Change to the record |
|---|---|---|
| Line 5, one payment for two members (2) | "Yes, they always pay together; split it." | F9 becomes `mentions-some`, source `you`; a link table; payment amount split by fee |
| Standard was 35 in 2024 and 40 in 2025 (4) | "Yes. A payment counts for the year it was paid." | F10 becomes "A band has one fee per year", `same-per fee per band, year`; new thing `fee` (told apart by band + year) |
| Lines 6, 7, 15 name no usable member (3) | "Keep them aside, I'll pick." | New F11: unmatched payments are kept and listed, never dropped or guessed (a view); hard F9 becomes soft for them |
| M001 paid 40.00 on 6 Jan and again on 14 Feb with the same reference (3) | "She paid twice by mistake; refund her." | New F13: a member can pay more than the fee; shown as "over", not refused. Nothing in the schema changes |
| Eli Brandt is Lapsed but paid in March (7) | "She rejoined. I set Lapsed by hand." | F6 stays a hand-set fact; the tool flags "Lapsed but paid this year" |

Three defaults are *said*, not asked (rec 10): "I'll mark leavers Lapsed instead of deleting them, so their payments still add up" (F14, `my default`, soft); the guard against loading a bank period twice (F12, `my default`); and "member number tells members apart" (F1/F2, `files`).

**The record at milestone 4 (thinnest working tool), with `Enforced by` filled in:**

```markdown
| # | In your words | Rule | Where | Source | Enforced by |
|---|---|---|---|---|---|
| F1/F2 | A member has a member number; no two members share one. | required; unique | members.csv: Member no | files | PRIMARY KEY (text) |
| F3 | A member has a name; two can share one | required | members.csv: Name | files | NOT NULL (no unique on name) |
| F4 | Two members can share an email | optional | members.csv: Email | files | none: soft |
| F5 | Fee band is one of a list you can add to | one-of | members.csv: Fee band | files | table fee_band + FOREIGN KEY |
| F6 | A member is Active or Lapsed; you set it | one-of Active / Lapsed | members.csv: Status | you | named CHECK (`status_ok`) |
| F7/F8 | date day-first; money, minus = refund | date / money | payments.csv | files | import converts to ISO text / whole cents |
| F9 | A payment is for one or more members, named in its reference; the amount is split by fee | mentions-some members.csv: Member no | payments.csv: Reference | you | link table payment_for + import check |
| F10 | A band has one fee per year | same-per fee per band, year | - | you | PRIMARY KEY (band, year) |
| F11 | A payment that names no known member is kept and listed | words | - | you | VIEW unassigned_payment; test: in = matched + kept aside |
| F12 | Loading a bank period already loaded is flagged | words | - | my default | import check |
| F13 | A member can pay more than the fee; shown as "over" | words | - | you | none: soft |
| F14 | A member with payments is never deleted, only marked Lapsed | refers-to | - | my default | FOREIGN KEY (delete refused) |
| F15 | Paid up = this year's payments to a member >= that band's fee for the year | derived | - | you | VIEW paid_up; their own totals are the test |
```

**Becomes schema (version 1)**, run on `node:sqlite` with the 14 payments imported [LOCAL]:

```sql
CREATE TABLE fee_band (name TEXT PRIMARY KEY) STRICT;
CREATE TABLE fee (band TEXT NOT NULL REFERENCES fee_band(name), year INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0), PRIMARY KEY (band, year)) STRICT;
CREATE TABLE member (member_no TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT, joined TEXT,
  fee_band TEXT NOT NULL REFERENCES fee_band(name),
  status TEXT NOT NULL CHECK (status IN ('Active','Lapsed'))) STRICT;
CREATE TABLE statement (id INTEGER PRIMARY KEY, from_date TEXT NOT NULL, to_date TEXT NOT NULL,
  imported_on TEXT NOT NULL, CHECK (from_date <= to_date)) STRICT;
CREATE TABLE payment (id INTEGER PRIMARY KEY, statement_id INTEGER NOT NULL REFERENCES statement(id),
  paid_on TEXT NOT NULL, amount_cents INTEGER NOT NULL, reference TEXT NOT NULL, paid_by TEXT NOT NULL) STRICT;
CREATE TABLE payment_for (payment_id INTEGER NOT NULL REFERENCES payment(id),
  member_no TEXT NOT NULL REFERENCES member(member_no), amount_cents INTEGER NOT NULL,
  PRIMARY KEY (payment_id, member_no)) STRICT;
CREATE VIEW unassigned_payment AS SELECT * FROM payment WHERE id NOT IN (SELECT payment_id FROM payment_for);
CREATE VIEW paid_up AS SELECT m.member_no, m.name, f.year, f.amount_cents AS due_cents,
  COALESCE(SUM(pf.amount_cents),0) AS paid_cents FROM member m JOIN fee f ON f.band = m.fee_band
  LEFT JOIN payment p ON substr(p.paid_on,1,4) = CAST(f.year AS TEXT)
  LEFT JOIN payment_for pf ON pf.payment_id = p.id AND pf.member_no = m.member_no
  GROUP BY m.member_no, f.year;
```

(Two things to note: F4 has no unique index because the Okafors share an email; and the user's list of bands is a table, not a CHECK, because a new band should not need a migration. The run used unnamed CHECKs; real ones are named, rec 13.) Result of importing the sample [LOCAL]: 14 payments loaded, 3 kept aside (lines 6, 7, 15), and for 2025: M001 paid 80.00 against 40.00 (over 40.00); M002 and M003 40.00 each, paid up; M004 0.00 and M005 0.00 (the lines that might be theirs are among the kept-aside ones); M006 paid up (Lapsed, but paid); M007 0.00 (paid 25.00, refunded 25.00); M008 to M010 paid up; and for 2024 M008 and M009 paid 35.00, paid up. The import split line 5 equally, which equals splitting by fee here because both members are Standard. The treasurer's own sheet is the expected answer for these totals. The user sees the milestone 3 demo as a table of exactly these rows, flagged ones first, with "in = 14 loaded, 11 matched, 3 kept aside, 0 skipped".

**The constraint test from the facts table** [LOCAL, 7 of 7 pass]: second member with an existing number (refused: `UNIQUE constraint failed: member.member_no`); member with no name (refused: `NOT NULL constraint failed: member.name`); two members sharing an email (accepted, F4 is soft); unknown fee band (refused); status "Retired" (refused: CHECK); a payment link to an unknown member (refused: `FOREIGN KEY constraint failed`); deleting a member who has payments (refused, F14).

**A month later: a migration.** The treasurer says: "life members never owe a fee". The AI edits the record first (F16, `you`: "A member can be a life member; they owe nothing", enforced by a CHECK on a 0/1 column and the view), then writes migration 1 to 2 [LOCAL]:

```ts
MIGRATIONS[1] = async (dir) => {      // version 1 -> 2, on the private copy
  const db = new DatabaseSync(path.join(dir, 'tool.db'));
  db.exec(`ALTER TABLE member ADD COLUMN life_member INTEGER NOT NULL DEFAULT 0 CHECK (life_member IN (0,1));
           DROP VIEW paid_up; CREATE VIEW paid_up AS ... CASE WHEN m.life_member = 1 THEN 0 ELSE f.amount_cents END ...;`);
  db.close();
};
```

On version-1 rows, the old members read back with `life_member = 0` and unchanged amounts; setting one to 1 made that member's due amount 0; setting a member's flag to 2 was refused by the CHECK; the migrated database's structure equalled a fresh version-2 database, and a version with the migration left out did not [LOCAL; the SQL ran, the `dir` wrapper is the block's documented shape, not run here]. The user is told: "I added 'life member'. Nobody is one yet: tell me who. Your data was backed up first." (the `data-safety` block already does the backup and the plain failure message).

## Open questions

- **Do non-technical users read the story and answer the questions correctly?** Nothing found tests it. The design leans on indirect evidence (see "Evidence"); the test is two or three real users and their own files.
- **Are LLM-written facts faithful?** The model writes the sentences; the script grounds them only for the rules it implements. A fact in `words` rests on a test the same model writes [26]. Measuring how often the AI's wording and rule disagree is untested.
- **How often do users' own sheets show each of Wickham's patterns?** The only numbers I found are for tables in the wild [17].
- **`.xlsx` profiling** (merged cells, colour, hidden rows) needs a reader that works before any app exists; not built.
- **Electron's Node.** The starter's Electron bundles a Node I did not check: its SQLite version (needed for `STRICT`, 3.37 or later, and for `ALTER ... DROP CONSTRAINT` and `SET NOT NULL`, 3.53 or later) and the foreign-key default [UNVERIFIED]. `node:sqlite` is a release candidate in Node 26 [35].
- **Surrogate versus natural keys** at the edge: when a user's ID is "usually" unique. Rec 4 says use the internal number; the samples can't tell how often the user's ID is reused.
- **Money, dates and time zones** beyond one currency and day-level dates are not covered.
- **Non-English users:** facts in their language with English column headers in the mapping; the rule words stay English. Same unresolved issue as note 09.
- **Does the CRUD check catch anything real?** Reasoned, not measured.

## Conflicts with other traditions and with current rules

- **Counterexamples versus "no hypotheticals".** Halpin's method asks whether an invented row can happen [7]; note 09 rec 10 and `talking.md` forbid questions about cases the user has never met. Rec 10 uses found rows and last-time experience. If the author wants invented counterexamples for money, identity and data loss, that is a deliberate exception to `talking.md`.
- **ORM populations versus `safety.md` line 11.** NOTES holds no names or amounts. Halpin treats populations as a validation aid outside the schema [8], which fits: here the record holds sentences, patterns and counts, and real rows are chat and sketches only. Tools that store populations with the model (not Halpin's pages) would not.
- **ORM "no attributes" versus ER and spreadsheets (attributes are columns).** Halpin, Kent and Chen disagree on whether the distinction matters [7][9][1]. Resolved by two layers: facts in the record, tables in code.
- **Simsion (design) versus Halpin and Chen (describe what's there).** Resolved by the same split: the facts are discoverable and the user is the expert; the table design is a choice and the AI's.
- **DDD aggregates versus use cases.** Vernon warns that a use case changing several aggregates may be wrong [13]; that is a team-scale concern. One SQLite transaction covers any user action here. This may differ from how a sibling note treats use cases or user stories [INFERENCE: I did not read it].
- **"Is this right?" versus teach-back.** Note 11 ends the data-map message with "Is this right?"; note 02 recs 9 and 11 prefer "What did I get wrong?" and show-me questions. Rec 10 here follows note 02, so the data map's question should too.
- **`data.md` check 8 (keep only the fields we use) versus the coverage check.** Compatible: coverage forces the decision, and "ignored on purpose" means not stored.
- **`data-safety` block's `user_version`.** The block copies `PRAGMA user_version` in backups but decides on `version.json` [REPO]; rec 14 says to use only the latter.
- **`build.md` "thinnest working tool: one action" versus a record covering the whole shape.** The record is written at the shape; schema version 1 contains only the tables the one action needs; later milestones add tables (cheap before the first real data, a migration after).

## Sources

[1] Peter P. Chen, *The Entity-Relationship Model: Toward a Unified View of Data*, ACM TODS 1(1), 1976, MIT Sloan working paper copy (OCR text), https://archive.org/details/entityrelationshx00chen (opened 2026-10-01). Definitions, footnote on marriage, four design steps, weak entities, key identification.
[2] Peter P. Chen, *English Sentence Structure and Entity-Relationship Diagrams*, Information Sciences 29, 1983, 127–149, https://www.sciencedirect.com/science/article/abs/pii/0020025583900142 (page blocked, 403; Semantic Scholar record opened 2026-10-01; abstract text via search only: **[snippet]**). "Eleven rules".
[3] Peter P. Chen, *From Ancient Egyptian Language to Future Conceptual Modeling*, https://bit.csc.lsu.edu/~chen/pdf/Egyptian.pdf (opened 2026-10-01). Chen's own summary table of the 1983 mapping (section 2).
[4] R. J. Abbott, *Program Design by Informal English Descriptions*, CACM 26(11), 1983, 882–894 (page not opened; abstract via search, **[snippet]**).
[5] Tripathy and Rath, *Object Oriented Analysis using Natural Language Processing concepts: A Review*, https://arxiv.org/pdf/1510.07439 (opened 2026-10-01). **[secondary]** for Abbott 1983 and Saeki et al. 1989.
[6] Terry Halpin, *Object-Role Modeling: an overview*, https://www.orm.net/pdf/ORMwhitePaper.pdf (opened 2026-10-01). CSDP, elementary facts, the "and-test", populations, derivation rules.
[7] Terry Halpin, *Information Modeling and Relational Databases* (2nd ed., Morgan Kaufmann/Elsevier), chapter 1 publisher sample, https://booksite.elsevier.com/samplechapters/9780123735683/Sample_Chapters/02~Chapter_1.pdf (opened 2026-10-01; the co-author on the 2nd edition is not named on the sample **[UNVERIFIED]**). ORM versus ER and UML, verbalisation, counterexamples.
[8] Terry Halpin, *Business Rules and Object Role Modeling*, Database Programming & Design, October 1996, https://www.orm.net/pdf/dppd.pdf (opened 2026-10-01).
[9] William Kent, *Data and Reality* (1stBooks, 1998 edition), PDF copy https://cmpct.info/~calvin/Papers/Data%20and%20Reality.pdf and excerpts https://www.bkent.net/Doc/darxrp.htm (opened 2026-10-01). Sections 1.1–1.3, 3.8.3, 5.2.
[10] William Kent, *A Simple Guide to Five Normal Forms in Relational Database Theory*, CACM 26(2), 1983, https://www.bkent.net/Doc/simple5.htm (opened 2026-10-01).
[11] Graeme Simsion and Graham Witt, *Data Modeling Essentials*, 3rd ed., Morgan Kaufmann, 2005, publisher preview (preface and contents only), https://api.pageplace.de/preview/DT0400.9780080488677_A24385595/preview-9780080488677_A24385595.pdf (opened 2026-10-01).
[12] Eric Evans, *Domain-Driven Design Reference*, 2015 (CC BY 4.0), https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf (opened 2026-10-01).
[13] Vaughn Vernon, *Effective Aggregate Design, Part I*, 2011, https://www.dddcommunity.org/wp-content/uploads/files/pdf_articles/Vernon_2011_1.pdf (opened 2026-10-01).
[14] Raymond R. Panko, *What We Don't Know About Spreadsheet Errors Today*, EuSpRIG 2015, https://arxiv.org/pdf/1602.02601 (opened 2026-10-01).
[15] Hermans, Pinzger and van Deursen, *Detecting and Visualizing Inter-worksheet Smells in Spreadsheets*, ICSE 2012, https://repository.tudelft.nl/file/File_9d609140-7387-49d8-af04-a7e861b35c70 (opened 2026-10-01).
[16] Hadley Wickham, *Tidy Data*, Journal of Statistical Software, 2014, https://vita.had.co.nz/papers/tidy-data.pdf (opened 2026-10-01).
[17] Li, He, Yan, Wang and Chaudhuri, *Auto-Tables*, PVLDB 16(11), 2023, https://arxiv.org/abs/2307.14565 (abstract opened 2026-10-01).
[18] Ziemann, Eren and El-Osta, *Gene name errors are widespread in the scientific literature*, Genome Biology 17, 2016, https://link.springer.com/article/10.1186/s13059-016-1044-7 (opened 2026-10-01).
[19] Microsoft, *Guidelines for organizing and formatting data on a worksheet*, https://support.microsoft.com/en-us/excel/guidelines-for-organizing-and-formatting-data-on-a-worksheet (opened 2026-10-01).
[20] Cunha, Saraiva and Visser, *From spreadsheets to relational databases and back*, PEPM 2009 (abstract via Semantic Scholar through search, **[snippet]**).
[21] Rosenthal, Strecker and Snoeck, *Modeling difficulties in creating conceptual data models*, Software and Systems Modeling 22, 2023, https://link.springer.com/article/10.1007/s10270-022-01051-8 (opened 2026-10-01). Related-work summaries of Batra et al. 1990, Batra and Davis 1992, Shanks 1997; the primary papers were not opened (**[secondary]** for those).
[22] Poels, Gailly, Maes and Paemeleire, *Object Class or Association Class? Testing the User Effect on Cardinality Interpretation*, ER 2005, https://link.springer.com/chapter/10.1007/11568346_5 (abstract opened 2026-10-01).
[23] Hvalshagen, Lukyanenko and Samuel, *Empowering Users with Narratives*, Information Systems Research 34(3), 2022, https://pubsonline.informs.org/doi/10.1287/isre.2022.1141 (page blocked, 403; abstract text via search, **[snippet]**).
[24] Bodart, Sim, Patel and Weber, *Should Optional Properties Be Used in Conceptual Modelling?*, Information Systems Research 12(4), 2001, https://pubsonline.informs.org/doi/10.1287/isre.12.4.384.9702 (abstract via search, **[snippet]**).
[25] Purchase et al., *Comprehension of diagram syntax: an empirical study of entity relationship notations*, International Journal of Human-Computer Studies, 2004, https://www.sciencedirect.com/science/article/abs/pii/S1071581904000072 (page blocked, 403; abstract via search, **[snippet]**).
[26] Siqueira et al., *On the Limitations of Large Language Models for Conceptual Database Modeling*, 2026, https://arxiv.org/abs/2605.11986 (abstract opened 2026-10-01).
[27] Martin Fowler, *Temporal Patterns*, https://martinfowler.com/eaaDev/timeNarrative.html (opened 2026-10-01).
[28] Martin Fowler, *Audit Log*, https://martinfowler.com/eaaDev/AuditLog.html (opened 2026-10-01).
[29] Martin Fowler, *Bitemporal History*, 2021, https://martinfowler.com/articles/bitemporal-history.html (opened 2026-10-01).
[30] Wikipedia, *Create, read, update and delete*, https://en.wikipedia.org/wiki/Create,_read,_update_and_delete (opened 2026-10-01). Martin 1983 "likely first popularized".
[31] SQLite, *STRICT Tables*, https://sqlite.org/stricttables.html (opened 2026-10-01).
[32] SQLite, *Foreign Key Support*, https://sqlite.org/foreignkeys.html (opened 2026-10-01).
[33] SQLite, *ALTER TABLE*, https://sqlite.org/lang_altertable.html (opened 2026-10-01).
[34] SQLite, *Datatypes In SQLite*, https://sqlite.org/datatype3.html (opened 2026-10-01). Date and time storage.
[35] Node.js, *SQLite* (v26.10.0 documentation), https://nodejs.org/api/sqlite.html (opened 2026-10-01).
[36] Frictionless Data, *Table Schema*, https://specs.frictionlessdata.io/table-schema/ (opened 2026-10-01).
