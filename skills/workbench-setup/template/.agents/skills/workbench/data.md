# Data: where it goes, and a short checklist

For you, not the user. Every tool keeps two things about its data in its NOTES under "## Data": a map of where the data sits and goes, and a few lines from the checklist below. The user sees the map once at "the shape" and again only when it changes, and at most four questions over the tool's whole life. Everything else is silent. Words like UML, standard, control, ISO, policy or retention never reach the user; their own words from CONTEXT.md do. (Background: `research/11-data-diagrams.md`, `research/12-data-checklist-iso.md`.)

## The data map

A plain picture, not UML: people and companies on the left, "This computer" in the middle (the tool, what it reads, writes and keeps), other companies' computers on the right. Every arrow is numbered and has one plain sentence.

**The record** is a block in the tool's NOTES, under "## Data", after "Whose data":

```
### Where it goes
Places
| Place or party | Where | Notes |
|---|---|---|
| Your bank | outside | gives you the statement |
| Your bank files | this computer, your folder | never changed by the tool |
| Monthly summary | this computer, a file the tool writes | Excel |
| OpenAI | other companies' computers | your ChatGPT account |

Moves
| # | From | To | What | When | Leaves this computer? |
|---|---|---|---|---|---|
| 1 | Your bank files | The tool | the statement | when you click Make summary | no |
| 2 | The tool | Monthly summary | totals per category | same click | no |
| B | Sample copy | OpenAI | one statement | only while we build it | yes (building only) |

Leaves this computer: nothing while you use the tool.
```

- "Where" starts with `outside`, `this computer` or `other companies' computers`: that picks the column. "The tool" is always the tool itself; "You" is the user.
- Names are the user's words from CONTEXT.md or proper names (OpenAI, Cloudflare). Never "database", "API", "server", "cloud", "token". Kinds only, never contents: "a bank statement", not whose.
- "Leaves this computer?" is `yes` or `no`, never blank. `B` rows are building only: samples you read in this chat go to OpenAI. A row carrying other people's details says so in "What" ("resumes: applicants' details").
- At most about seven boxes. More: split into two maps by time ("using the tool", "while we build it").

**The picture** is generated, never drawn by hand: `powershell -NoProfile -ExecutionPolicy Bypass -File .workbench\scripts\data-map.ps1 <tool>` writes `tools/<name>/sketches/data-map.html` and prints its path (the page draws the picture from the tables itself; nothing to download, so it works at "the shape" before any build tools exist; loads nothing; not saved, made again whenever needed). Open it for the user. In chat, give the numbered sentences as plain text and the "Leaves this computer" line; never a mermaid block.

**When:**
- **"The shape" milestone** ([build.md](build.md)): write the block from the interview, make the picture, show it with one question and your guess: "Is this right? Does anyone else get or see any of it?" It answers "where their files come from and where they go"; the user is the expert on who gets what.
- **Whenever the path changes**, update the block in the same change as the code, regenerate, and say it in one line ("I added OpenAI to the picture: step 3 sends a picture of each page it can't read"): an AI feature, the first real files, a website or its first deploy, someone else using or receiving the tool or its output, a change in how data is stored, a rung on the sharing ladder.
- **The exits check**, before "thinnest working tool", before every "Ship it", and before a save point for any change that touches what the tool may send: every way out in the code (the `ai-read` block, a change to the allowed requests in `main.ts`, `deploy.mjs`, anything handed to another person) must be an arrow leaving "This computer", and every such arrow must exist in the code. A way out with no row: stop, add the row, show the user. A row with no way out: remove it.
- The `B` row is always in the table, because it's a fact, but it's said in chat, and in the "Leaves this computer" line, only when "Whose data" in [safety.md](safety.md#whose-data) says so (work with rules, not sure, or other people's data). The map adds no warnings of its own.

**If IT or a friend asks for "a proper diagram" (UML, a data flow diagram):** the same map, with their names: outside party = actor / external entity; the tool = the system / process; a place data sits = data store; arrow = data flow; the dashed "This computer" box = trust boundary. Mermaid text may go into a forwardable message for them, never to the user.

## The checklist

Silent when it passes; a failed check gets one line (what was wrong, what you did, that the data is fine or what's at stake). Lines go in the tool's NOTES under "## Data". Kinds only, never contents.

**Every tool that keeps data or writes files for the user**

| # | Check | When | Leaves behind |
|---|---|---|---|
| 1 | What does it hold, and could it be rebuilt from the user's original files? | The shape; when a field is added | `Holds:` (kinds), `Rebuild from originals: yes / no / partly`. Decides how much 3 and 4 matter |
| 2 | Is there an automatic copy, also while the tool stays open? | Before the first real data (the `data-safety` block, with its hourly check wired in) | `Backups:` path, and the worst case in plain words ("at most about a day of use") |
| 3 | Can a copy actually be brought back and opened? | Before the first real data; after any change to how data is stored; about every 3 months when it can't be rebuilt | Run `copy`, open the tool on it (with the user's approval, like `try.ps1`), compare counts; `Restore checked: <date>, <counts>` |
| 4 | Data that exists nowhere else: a copy off this disk too? | Thinnest working tool, only if 1 says no or partly; asked once | One question with a suggestion: "The entries in this tool exist only on this computer. I'd suggest it also saves a copy to a USB stick or a folder you choose. OK?" Yes: build a "Save a copy elsewhere" button (native folder picker). For work or others' data, only where their rules allow. `Copy elsewhere: <where> / declined` |
| 5 | Is anything silently lost between what goes in and what comes out? | The hard part; when import, export or a rule changes | A test: in = done + flagged + skipped; IDs stay text; dates in one form. The demo shows the counts, flagged ones first |
| 6 | Does anything leave this computer that the user doesn't know about? | The data map and its exits check (above); error messages and written files hold no document contents | The map's "Leaves this computer" line |
| 7 | Do real files stay in the samples and data folders, and are tests and demos made up? | Before every share and every website deploy | Say what's being packed or published; nothing from samples or data in it; delete Temp copies made for checks |

**Only when other people's details, a company, sharing or a website are involved**

| # | Check | When | Leaves behind |
|---|---|---|---|
| 8 | Why do we have these people's details, and do we keep only the fields we use? | Before the first real files of other people; again at the shape | `Purpose:` one sentence. One question: "I'd suggest the tool keeps only name, email and the skills lines, not the photo or date of birth, since you don't use them. OK?" |
| 9 | How long may they stay, and can one person be removed? | Same moment; again before sharing | `Keep until:` One question: "How long may these stay? I'd suggest until the role is filled; I'll add a button that clears them and one that removes a single person. OK?" Removal also covers the tool's backups; files they exported or sent are out of the tool's reach, say so in one line |
| 10 | What do the company's rules say, and who to tell if something goes wrong? | When "Whose data" is work with rules or not sure; before colleagues get the tool | The forwardable message ([safety.md](safety.md#forwardable-messages)) plus, where they apply: where copies may be kept (4), whether the laptop's disk is encrypted (you can't check that), who to tell at once if data may have leaked. `Who to tell:` |
| 11 | Who can open it or get a copy? | Before a website goes live; before a share | `Who can open it:` names or emails; for a share, the recipients, and "each person keeps their own data" |
| 12 | A website: private, nothing from the user's files in it, can be taken down, cost said? | Every first deploy and every deploy that adds a page or data | The starter's deploy flow proves sign-in is asked; 7 for `public/`; `Take it down:` the command. A form or sign-up counts as other people's details from the first entry: 8 and 9 first |

Every ~5 changes ([build.md](build.md)): re-read the Data lines and the map against the app (new fields, new ways out, new paths) and write `Data lines checked: <date>`.
