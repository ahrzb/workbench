# The guide and the maker

Two parts, split by what each needs, not by job titles.

- **You, in the chat, are the guide.** The user only ever talks to you. You own the process and the *why* and *what*: the interview, the milestones out loud, every question, every decision, every demo, and "Ship it". You write the spec, `tools/<name>/model.json` ([model.md](model.md)): the formal model of their world, the flow (screens) and the **backlog**, the verified list of what gets built. You keep your context small and clean: the user's words, `CONTEXT.md`, NOTES, the spec, the maker's short returns.
- **The maker** is a Codex agent of this project (`.codex/agents/maker.toml`). It builds from the spec and nothing else: the code and its tests, the clickable sketches, and how screens look (the design system, [design.md](design.md)). It never talks to the user, never changes the spec, and never moves the work to the next step. Its noisy work (files, logs, builds) stays out of your chat.

The code is a function of the backlog: every `confirmed` item gets built with a test for each of its cases, named with the case id (`[C4] ...`); anything built that no item asks for is a mistake. You don't take the maker's word for it: the gates check.

| | Guide (you) | Maker |
|---|---|---|
| Writes | `CONTEXT.md`, NOTES, `model.json` (model, screens, backlog and its statuses), save points, `current/` via "Ship it" | `app/` (code, tests, `src/index.css`), `sketches/`, `DESIGN.md`, `PRODUCT.md` |
| Reads | the user, the samples (through `model-check.ts`), the maker's returns | `model.json`, `model-check.ts --summary`, its own files, your brief |
| Decides | why, what, in what order, done or not | how |

## Gates

Before each step, run `.workbench\scripts\run.cmd bun .workbench\scripts\gate.ts <tool> <step>` and go on only on `GATE ... OK`:

| Step | Before | It checks |
|---|---|---|
| `shape` | showing the shape (sketch and plan) | the spec has a job, steps, screens and a backlog; nothing left for you to settle in it |
| `build` | briefing the maker to build | at least one backlog item `confirmed`, none of its cases waiting on the user |
| `demo` | opening the trying-out copy for the user | every case of each built item has a test, the tests pass, the design check passes |
| `ship` | replacing the version in use | every built item was tried and said yes to (`accepted`), tests still pass |

`BLOCKED` lines say what's missing: settle the spec yourself, ask the user (one question), or brief the maker. Open questions are listed but don't block until they hold up an item.

You move the statuses: `confirmed` when the user agrees to the plan or the sketch; `built` when the maker's return says so and the demo gate passes; `tried` when they've used the trying-out copy; `accepted` on their yes.

## Briefing the maker

Start it only for work: a sketch (at "the shape", or when the flow changes), a build or a change of confirmed items, a fix, a change of look. The first look on their samples and everything the user says go through you.

1. The spec is current and `gate.ts <tool> build` (or `shape` for a sketch) says OK.
2. Spawn the maker with a few lines: the tool, which backlog items or what to sketch, the user's words if they matter for how it looks. Never paste files; it reads the spec.
3. Wait once, with a long timeout (ten minutes). Don't do its work meanwhile; prepare your next message to the user instead.
4. Read its return: `MADE` (what changed, in the user's terms), `SKETCH` (a link to put at the top of your reply), `CHECKS`, `NEEDS` (a question or a gap in the spec: settle it in the spec, or ask the user). Then run the gate for the next step yourself.

If the maker can't be started (an older Codex, agents switched off, a model the account can't use), do its work yourself, in the same order and with the same files, and still pass the gates.

If `.codex/agents/maker.toml` is missing (a project updated to 0.3.0 from 0.2.x), run `.workbench\scripts\run.cmd bun .workbench\scripts\update.ts` once, with approval ("Add the workbench's helper for building"): it adds the maker without changing anything else; a new chat picks it up. Until then, work as above.
