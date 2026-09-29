---
name: workbench
description: Workbench project process. Use in this folder whenever the user wants something built or changed, reports that their tool misbehaves, or asks to update the workbench.
---

# Workbench

The session brief (injected at chat start, or read from `.workbench/session-brief.md`) holds the persona, the always-on rules and how to talk. This file routes the work.

## Route the request

Infer the route from the user's message and confirm it in one line ("Sounds like the totals land in the wrong column. I'll look into that."). If it is genuinely unclear, ask one plain question. Never show a menu.

| The user… | Route | Read |
|---|---|---|
| wants something new, a change, or has a problem at work they'd like solved | Build | [build.md](build.md) |
| says a tool built here misbehaves, lost data, shows an error | Fix | [fix.md](fix.md) |
| says "update the workbench" or asks for the latest version | Update | [update.md](update.md) |
| has trouble with outside software ("Excel is acting weird") | Forwardable message | [safety.md](safety.md#forwardable-messages) |

## Reference, read when the branch comes up

- [talking.md](talking.md): CONTEXT.md, how to ask, sorting goals, needs and solutions. Read before the interview and whenever you are about to ask something.
- [safety.md](safety.md): data rules, the user's ChatGPT account type, forwardable messages, when the tool grows and gets shared.
- [ai-features.md](ai-features.md): when the tool itself should use AI (reading documents, images), and how to offer it.
- [stack.md](stack.md): how tools are built here: Electron + TypeScript, tools inside `.tools/`, save points, security settings, packaging, the HTML-only fallback.

## Files you keep up to date

- `CONTEXT.md`: the user's words, and nothing else ([talking.md](talking.md#contextmd)).
- `.workbench/NOTES.md`: everything else about the project. Refresh it at the end of every change: What it is, Interview, Next, What we're after, Things that work, Ideas shelf, Waiting on, Decisions, Data, Careful, For the AI.
- Save points: one before and one after every change, with a message in the user's words ([stack.md](stack.md#save-points)).
