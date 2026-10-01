# Roles and the model loop: a product manager, a modeller, a designer, an implementer

Scope: how the workbench splits the AI's work into a conversation that stays in the user's world and a team that works formally, and how gaps in the formal work come back to the user as plain questions. It turns notes [14](14-classic-requirements.md)–[17](17-data-models.md) (what to model) and [18](18-refactoring-ui.md) (the designer's craft) into a working design, and records a first test through Codex. Research and prototype date 2026-10-01. `[LOCAL]` = run on this machine (Windows 11, Codex CLI with `gpt-6-sol`, Bun 1.4.2); `[INFERENCE]` = my reasoning; `[DOCS]` = OpenAI's Codex documentation [1].

## The idea, from the owner

Two layers. The conversation stays in the problem domain: the user's words, their rows, sketches. Behind it, the AI turns what was said into formal models; the models' gaps become questions, asked back in the user's words about their own rows. The main session is the **product manager**: it owns the process and the *why* and *what*, keeps milestones visible so the user feels in control, checks in with the team, routes decisions, and translates both ways. The team: a **modeller** (what the user wants, formally), a **designer** (flows, screens, the design system, consistency) and an **implementer** (code and tests). Not every role runs every turn, and each reads only its own artifacts.

```
user  <->  product manager (their words, milestones, demos, decisions)
                |  briefs (precise)            ^  returns (short, structured)
                v                               |
        modeller: model.json  -- model-check.ts -->  gaps --> questions in the user's words
        designer: screens.json, DESIGN.md, index.css, sketches
        implementer: app/ code and tests (cases and every stage x event from the model)
```

## What Codex offers [DOCS] [LOCAL]

- Project agents are TOML files in `.codex/agents/` with `name`, `description` and `developer_instructions`, optionally their own `model`, `model_reasoning_effort` and `sandbox_mode` [1]. Codex spawns one when asked directly or when `AGENTS.md` or a skill tells it to; the parent waits and collects the result [1].
- Subagents inherit the parent's sandbox and approval settings; in non-interactive runs an action needing a fresh approval fails back to the parent [1].
- The docs' own reason for subagents is the one that matters here: keep noisy intermediate output (logs, exploration) out of the main thread, which "can become less reliable over time" [1]. They also warn that subagent workflows use more tokens [1].
- Tested [LOCAL]: a project `modeller.toml` was spawned by `codex exec` with role `modeller` (visible in the session's `source.subagent.thread_spawn.agent_role`), wrote its file under the `workspace-write` sandbox and returned its line to the parent (40 s for a trivial job). The `multi_agent` feature is on by default in the installed Codex.

## The design (built, not released)

Files in the template (all under `skills/workbench-setup/template/`; `S` = `.agents/skills/workbench/`):

| File | What it is |
|---|---|
| `S/roles.md` | The product manager's job (why and what, the plan out loud, translate both ways, route decisions, check in with the team), who owns which file, when each role runs, how to brief and wait, the checks between roles, and the fallback when agents aren't available |
| `S/model.md` | The formal model `tools/<name>/model.json` (job, kind, starts-when, steps, sources, things with `toldApartBy`, facts with a closed rule list, ignored columns, lives with stages/moves/never/refused, cases, promises), how to check it, the gap-to-question table, the modeller's return |
| `.workbench/scripts/model-check.ts` | `--profile` (the samples' columns), default (every fact against the samples with counterexample rows, identity collisions, undecided stage x event cells, unreachable stages, overlapping moves, status words that are no stage, columns nothing explains, guessed hard facts, waiting cases, promises without a case, and against `screens.json`: events no screen offers, actions the model lacks), `--summary` (the short model the designer and implementer read), `--json`. Gaps are `ASK` (only the user can settle), `MODEL` (the modeller's), `DESIGN` (the designer's) |
| `.codex/agents/{modeller,designer,implementer}.toml` | Each: what it owns, what it reads, what it never touches, and the exact shape of its return |
| `S/design.md` | New section: the screens map `screens.json` (screens, what each shows, actions with `does: <thing>:<event>`, `greyedWhen`, empty states) |
| `SKILL.md`, `build.md`, `session-brief.md` | The main session as product manager; who does each milestone; no `MODEL`/`DESIGN` gaps and passing tests before every demo |
| `save.ts`, `.gitignore`, `update.ts`, `update.md` | `model.json`, `screens.json` and `.codex/agents/*.toml` are saved; `.codex/agents/` is workbench-owned for updates |

Decisions, with reasons:
- **The formal layer is JSON, not prose tables in NOTES** (notes 14–17 proposed Markdown tables). A script can find gaps only in something it can parse without guessing, and the user never reads it [INFERENCE]. Its words are still the user's (`CONTEXT.md`), so the translation back is short.
- **Gaps make questions, not the AI's memory.** A guessed hard rule, a broken rule, an undecided move, a status word nobody explained, a waiting case: each is found by the script, whatever the AI happened to think of. Only `ASK` gaps reach the user, rewritten as one plain question about a found row, with a suggestion, ranked by what a wrong guess costs ([model.md](../skills/workbench-setup/template/.agents/skills/workbench/model.md) has the table; it merges the question kinds of notes 14, 16 and 17).
- **One writer per file; others read summaries.** That is what keeps the gaps between roles visible: the designer can't quietly add a move, the implementer can't add a style; `model-check.ts` reports the mismatch.
- **The product manager never names the team or its artifacts to the user.** The user sees milestones, demos, their rows and one question at a time (notes 01, 09).
- **Roles run on triggers** (`roles.md` table): sample files → modeller; the shape → modeller then designer; an answer that changes a rule → modeller, then whoever its return names; a bug with no rule change → implementer only.
- **Fallback:** if spawning fails, the product manager does each role's pass itself with the same file ownership.

## First test through Codex [LOCAL]

Same project and messages for both: a book club with `members.csv` (7 members), `payments.csv` (7 lines) and `fees.csv` (fees per band per year), with nine planted problems: two members named Ann Lee; a couple sharing an email; one payment for two members (`M002+M003`); a cash payment naming only "Ann Lee"; the same payment line twice; an impossible date (31/02/2026); a status word no one explained ("Paused"); a member marked Lapsed who paid; a payment of last year's fee amount. Three user turns: the request; "yes, the cash one was the first Ann, go on"; "clicked through, looks right; paused members don't pay, lapsed ones owe if they come back". Codex `exec`, `workspace-write` sandbox, approvals off (so nothing could be escalated), both projects run at the same time.

**A first version of the roles cost too much.** The main session polled the modeller every 10–20 s (eleven waits, each re-reading its whole context), started the modeller before the samples were in the tool's folder, and did the first look itself in parallel: 532 s and 1.58 M input tokens for the first turn alone, against 63 s and 108 k for one agent. Fixes in `roles.md`: copy the samples first, brief in a few lines, **wait once with a long timeout**, don't do the role's work in parallel; and the first-look table moved into the modeller's return. The same first turn then took 174 s, one wait, 353 k input tokens.

Results over the three turns, after the fix:

| | A: v0.2.7, one agent | B: product manager + team |
|---|---|---|
| Time (3 turns) | 468 s (63 + 110 + 295) | 1,242 s (174 + 179 + 889) |
| Input tokens, all threads | 1.48 M (68 k not cached) | 8.27 M (main 2.85 M, modeller 0.50 M, designer 0.94 M, implementer 3.99 M; about 330 k not cached) |
| Output tokens | 13.7 k | 36.7 k |
| Planted problems shown to the user | 2 of 9: the ambiguous cash payment, Paused and Lapsed members | 5 of 9: the cash payment, the couple's joint payment, the repeated line, the impossible date, Paused and Lapsed members |
| Missed by both | the Lapsed member who paid; the shared email; last year's fee amount | |
| The user's rule about Paused/Lapsed | in the chat | recorded as a confirmed case in the model |
| Sketch | link first, clickable, data map | link first, clickable, data map; `screens.json` matched the model (0 design gaps) |
| By turn 3 | started the Electron app, stopped: a package wasn't cached and the sandbox had no network; offered a one-HTML-file version | Electron app built with the Excel block, tests passing, and a trying-out copy started by `try.ts` (with approvals off, whether a window actually opened was not checked; in a real chat `try.ts` runs with the user's approval) |
| Questions in a message | one | one |

Reading it:
- **The team caught more.** The script's counterexample rows put the joint payment, the repeated line and the bad date in front of the product manager without anyone having to think of them; the one agent never mentioned them. That is the point of the second layer, and on this one example it worked.
- **It costs about 2.7 times the time and, counting only uncached tokens, about 5 times the input.** Most of it is the implementer (4 M input tokens: reading the starter, the Excel block, packaging) and the main thread re-reading its context while it waits. The comparison is uneven at turn 3, because A failed to build and B built.
- **Both missed a typed status the data contradicts** (Eli: Lapsed but paid). The model recorded status as `one-of`; `model-check.ts` has no rule that compares a typed column with what other columns imply (note 17's question 7 "typed or follows"). A `follows` rule is the obvious next check.
- One run per side, one example, a simulated user: this shows the design works and where the cost goes, not that it is better on average.

## Second run, with the 0.3.0 changes [LOCAL]

The same book club files and planted problems, now with a `follows` rule in `model-check.ts`, the implementer set to `gpt-6-luna` in its agent file, the token set in the starters' stylesheets and `design-check.ts`. Five user turns this time (one question per message, so the scripted answers didn't line up with three): 178 s, 47 s, 51 s, 211 s (sketch and data map), then about 730 s for the build, plus a few minutes lost when the test harness itself crashed mid-build. Total about 20 minutes, about the same as the first team run and about 2.5 times the one-agent run (which never got to a built app). Uncached input tokens about 350 k (main 89 k, modeller 40 k, designer 36 k, implementer 185 k over two threads), against about 330 k before and 68 k for one agent. The app built with 62 tests passing; `model-check.ts` showed no design gaps; `design-check.ts` found nothing.

- **The cheaper implementer didn't apply.** Both implementer threads ran on `gpt-6-sol`: Codex passes the chat's own model (set here on the command line; in the app, picked in the window) on to every agent, as its documentation says for runtime overrides [1]. The `model` line only helps where the chat's model isn't set for the session.
- **Eli (Lapsed but paid) was missed again.** The modeller kept the status column as a plain `one-of` list, so no `follows` fact was written. `model-check.ts` now reports any typed status column without a `follows` fact as a gap. Re-run on the same model, it flagged `members.status`; the modeller, started again, declined to add the rule ("the confirmed paused and lapsed cases mean payments cannot safely determine it"). A judgement call the user's earlier answer invited, not a missing check.
- **Where the time goes** (from the session logs): not the build tools. The implementer's 673 s build thread spent 79 s in commands (npm, tests, packaging) and about 595 s in the model, over 38 tool round trips; the modeller 370 s of 419 s in the model over 22 round trips; the designer 267 s of 288 s. The main thread spent 913 s of 1,500 s waiting for agents, mostly in 120 s waits. So the cost is the number of model round trips each role makes (reading files, small edits, re-checks), times about 15 s each, done one role after another while the main thread idles.

## Third run: one agent with the scripts vs a guide and a maker [LOCAL]

After the owner's point that four tech-company roles were incidental, the split became two parts: the **guide** (the chat: process, why and what, the spec `model.json` with the model, the screens and a **backlog** whose statuses only it moves) and the **maker** (one project agent that builds from the spec only). New scripts: `model-check.ts --trace` (every case of a built backlog item has a test named `[Cn] ...`) and `gate.ts <tool> shape|build|demo|ship` (the guide checks, rather than trusts). Two variants of the same template, run at the same time on the same book club with the same three scripted turns (all answers given up front in turn 2): **B** without the maker's agent file (the guide does the maker's work itself, as `roles.md` says), **C** with it.

| | B: one agent, scripts and gates | C: guide + maker |
|---|---|---|
| Time (3 turns) | 466 s (58 + 35 + 373) | 556 s (69 + 58 + 429) |
| Uncached input tokens | 83 k | 158 k (guide 81 k, maker 77 k) |
| Planted problems shown to the user | 6 of 9 (the two Ann Lees and the cash payment, the joint payment, the repeated line, the impossible date, Paused) | 5 of 9 (as B, without the repeated line) |
| Gates run | shape 2, build 1, demo 2; demo OK, ship correctly blocked (not tried yet) | build 3, demo 3; demo OK, ship correctly blocked |
| Built | one HTML file, 21 tests, every case traced to a test (Electron fell back: no network in the sandbox) | one HTML file, 22 tests, every case traced |

For comparison: 0.2.7 with one agent, 468 s and 68 k uncached tokens, showed 2 of 9 and didn't get to a build; the four-role team about 20 minutes and 330-350 k tokens for 5 of 9.

Reading it: **the gain comes from the spec and the scripts, not from splitting the work.** One agent with them matched the old single agent's speed and found three times as many problems; adding the maker cost about 20% more time and twice the tokens for no extra catch here. The maker's possible benefit, a clean guide context over a long session, isn't visible in three turns and wasn't measured. Missed by all: the shared email, Lapsed-but-paid (both specs wrote a `follows` fact saying status is set by hand, in line with the user's front-loaded answer), and last year's fee amount. One run per variant, one example, a simulated user.

## Open questions

1. **Cost.** Is a 2–3 times slower, roughly 5 times more expensive build worth five extra problems found? Options: run the team only from "the shape" on; keep the modeller and drop the separate implementer (the product manager builds); use a smaller model for the implementer (`model` in its TOML [1]); cap reads in the implementer's brief.
2. **The `follows` rule** for typed columns that should follow from data, and the "same thing at different dates" check (last year's fee).
3. **The designer's craft.** Note [18](18-refactoring-ui.md) proposes a token set in the starter's stylesheet, a hierarchy pass per screen, and a `design-check` script run before impeccable's detector. Not built yet.
4. **The desktop app.** Not tested: how the Codex app shows subagent threads to the user, and whether approvals from a subagent (the implementer's packaging, `try.ts`) are clear there [1].
5. **Waiting.** Whether the product manager reliably waits once; the second run still showed seven waits on turn 3 (one per role start plus re-waits).

## Sources

[1] OpenAI, *Subagents* (Codex documentation), https://developers.openai.com/codex/subagents (opened 2026-10-01; redirects to learn.chatgpt.com/docs/agent-configuration/subagents). Custom agent files and fields, triggering by AGENTS.md or skill instructions, inherited sandbox and approvals, token cost, context pollution.
