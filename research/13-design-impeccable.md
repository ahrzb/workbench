# Better-looking tools: bundling the impeccable design skill

Scope: whether the workbench should use impeccable ([impeccable.style](https://impeccable.style/designing/), [github.com/pbakaus/impeccable](https://github.com/pbakaus/impeccable)) so the tools Codex builds look and work better, and how to fit it to the workbench's rules (no admin, nothing installed outside the project, nothing sent unknowingly, no ports, no technical questions). Checked 2026-09-30. `[LOCAL]` = run on this machine.

## What it is

- One skill with 24 commands (critique, audit, polish, harden, clarify, layout, typeset, colorize, ...), a craft floor of rules and bans, four modes by what the visitor does (Persuade, Operate, Read, Experience), and a deterministic detector with 61 rules for accessibility problems and the generic look AI-made interfaces share [README]. Apache-2.0. Codex is a supported host: the skill lives in `.agents/skills/impeccable/`, used as `$impeccable` [README].
- The skill text needs no runtime; its scripts run through a launcher (`scripts/impeccable.cmd`) that starts a self-contained engine binary: next to the launcher if present, else `IMPECCABLE_BIN`, else a cache in `~/.impeccable/bin/`, else downloaded there [launcher source].

## What was checked

1. **Engine:** Windows x64 build of engine 0.1.8 is 17 MB, SHA-256 `5f39…ddcd` matches the published digest, Authenticode signature valid, "Renaissance Geek, Inc." `[LOCAL]`. Placed at `scripts/bin/windows-x64/impeccable.exe`, the launcher uses it and downloads nothing `[LOCAL]`.
2. **Network and home-folder writes:** its context step polls `impeccable.style/api/version` and writes `~/.impeccable/update-check.json` and `staleness-check.json` [CLI contract]; observed on the first run `[LOCAL]`. Switched off by `"updateCheck": false` and `"stalenessCheck": false` in the project's `.impeccable/config.json`; afterwards no write to the home folder across several Codex sessions `[LOCAL]`. Other network: `concept-seed` fetches a design "roll" and posts the chosen direction as telemetry (skipped with `IMPECCABLE_NO_TELEMETRY`/`DO_NOT_TRACK`, or when offline) [CLI contract]; Codex's sandbox has no network, so inside it both fail closed.
3. **Ports:** its decision pages (`serve-question`), live mode and critique overlays run a localhost server [new-work.md, critique.md]. Not used here.
4. **Per-tool design notes:** it takes the nearest `PRODUCT.md` walking up from the target, so `tools/<name>/PRODUCT.md` gives each tool its own record and `.impeccable/` folder `[LOCAL]`.
5. **Detector:** offline and fast; caught 13 problems on a deliberately bad page `[LOCAL]`. On an Electron tool it must scan the built page (`.vite/renderer/main_window/index.html`): the source `index.html` has no styles, so it reports a false "flat type hierarchy" `[LOCAL]`.
6. **Fit with the persona:** its critique asks to start sub-agents and returns scored reports; `init` interviews for `PRODUCT.md`; new-work presents direction cards [reference files]. All of that would put jargon and extra questions in front of the user.

## What ships (v0.2.5)

The skill (4.4.0, unmodified, with its licence) in the template; the engine pinned by version and hash in `bootstrap.ps1`, placed beside the launcher; the project `.impeccable/config.json` (code-led, no update or staleness checks); `design.md` saying when the AI uses it (a tool's first screen after writing `PRODUCT.md` from NOTES and CONTEXT; the detector on the built page before every demo; harden, clarify and audit before shipping; critique privately for "make it nicer") and what never reaches the user (commands, reports, scores, its interviews and question pages, anything with a port, image generation, updates of its own). The workbench's rules and way of talking win where they disagree.

## Test through Codex `[LOCAL, Codex CLI 0.157.1, gpt-6-sol, --approve-for-me]`

Same tool (the Electron starter as a "reading log"), same request: "it looks plain and bare. Make it look nicer, and show me."

| | v0.2.4 (no design skill) | first try with impeccable | after fixing `design.md` |
|---|---|---|---|
| What happened | Described a direction and asked first; built it after "yes" | Restyled colours and spacing only; same bare text box | Wrote `PRODUCT.md`, then redesigned: heading with an instruction, empty-state hint, one main button in the user's words |
| Detector on the built page | 4: placeholder fails contrast, cramped box, two "kicker" labels | not measured | 1: cream background (a taste warning, left as a choice) |

The first try was the rule's fault: `design.md` said a refinement keeps wording, and nothing made the AI write `PRODUCT.md` first, so the skill had no purpose to design for. On a screen this small, plain Codex already does a decent job; what the skill added measurably was no accessibility problems and fewer generic-AI tells. One test, one screen: no general claim.

## Open

- A website (Persuade or Experience mode), where impeccable should matter most, was not tested; nor its new-work direction round without the decision page.
- The engine exists for Windows x64 here; macOS was not checked.
- Updating impeccable is a workbench release (new pin and hash), not something a project does on its own.
