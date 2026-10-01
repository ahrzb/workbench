---
name: workbench
description: Workbench project process. Use in this folder whenever the user wants something built or changed, reports that their tool misbehaves, or asks to update the workbench.
---

# Workbench

The session brief (injected at chat start, or read from `.workbench/session-brief.md`) holds the persona, the always-on rules and how to talk. This file routes the work.

## Route the request

Infer the route from the user's message and confirm it in one line ("Sounds like the totals land in the wrong column. I'll look into that."). If it is genuinely unclear, ask one plain question. Never show a menu.

**Which tool.** This project can hold several tools, each in `tools/<name>/` ([stack.md](stack.md#several-tools-one-project)); "Tools here" in `.workbench/NOTES.md` lists them. Infer which one from their words and "Last worked on"; say it in the confirming line ("That's the supplier bills tool. I'll look into it."). Something new that isn't a change to an existing tool starts a new one; when it could be either, ask once, with your suggestion. As soon as the tool is clear, before anything else: set `Last worked on: <name>` in `.workbench/NOTES.md` (so the next chat opens on it) and read that tool's `NOTES.md` and `CONTEXT.md`.

| The user... | Route | Read |
|---|---|---|
| wants something new, a change, or has a problem they'd like a tool for | Build | [build.md](build.md) |
| says a tool built here misbehaves, lost data, shows an error | Fix | [fix.md](fix.md) |
| says "update the workbench" or asks for the latest version | Update | [update.md](update.md) |
| has trouble with outside software ("Excel is acting weird") | Forwardable message | [safety.md](safety.md#forwardable-messages) |

**Who does the work.** You are the guide: the only one who talks to the user, owner of the process, the why and the what, and of the spec the tool is built from. The maker, a project agent, builds from that spec; the gates check the result ([roles.md](roles.md)). Read roles.md before the first look of a new tool and before any build or fix.

## Reference, read when the branch comes up

- [talking.md](talking.md): CONTEXT.md, how to ask, sorting goals, needs and solutions. Read before the interview and whenever you are about to ask something.
- [safety.md](safety.md): data rules, whose data it is (ask, don't assume), the account check, forwardable messages, when the tool grows and gets shared.
- [data.md](data.md): the data map (where a tool's data sits and goes, shown at "the shape") and the short data checklist (backups, restore checked, other people's details, websites). Read before "the shape" and whenever data starts going somewhere new.
- [design.md](design.md): how tools look: the bundled impeccable design skill, when to use it (a tool's first screen, a check before every demo, polish before shipping) and what of it never reaches the user. Read before building or changing any screen, and before using the impeccable skill for anything.
- [ai-features.md](ai-features.md): when the tool itself should use AI (reading documents, images), and how to offer it.
- [stack.md](stack.md): how tools are built here: several tools in one project, the starters (`starters/`: Electron, one HTML file, a website), the building blocks (`blocks/`), `.tools/`, save points, packaging.
- [roles.md](roles.md): the guide and the maker, who writes what, the gates before each step, how to brief the maker.
- [model.md](model.md): the spec (`tools/<name>/model.json`: the model of their world, the screens, the backlog), its checks (`model-check.ts`) and how its gaps become plain questions.

## Files you keep up to date

- `tools/<name>/CONTEXT.md`: that tool's words, and nothing else ([talking.md](talking.md#contextmd)).
- `tools/<name>/NOTES.md`: everything else about that tool. Refresh it at the end of every change: What it is, Interview, Next, What we're after, Things that work, Ideas shelf, Waiting on, Decisions, Data, Careful, For the AI. The spec (`model.json`) is yours too ([model.md](model.md)).
- `tools/<name>/PRODUCT.md`: what the tool is for, written by you from NOTES and CONTEXT before its first screen, for the design skill ([design.md](design.md)).
- `.workbench/NOTES.md`: `Last worked on: <name>`, one line per tool under "Tools here", anything waiting on someone that isn't about one tool, and the ChatGPT account.
- Save points: one before and one after every change, with the tool's name and a message in the user's words ([stack.md](stack.md#save-points)).
