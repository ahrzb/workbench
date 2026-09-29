# Workbench

A skill for Codex (ChatGPT) that helps office workers build small tools for their own work: turn a pile of PDFs into a clean spreadsheet, check a monthly report, keep a list that Excel keeps getting wrong. The user describes their work in their own words; Codex does the building, on their own computer.

- **No admin rights, nothing installed.** Everything a tool needs downloads into its own project folder. The only thing outside it is a desktop shortcut.
- **Local and quiet.** Tools open no network ports and have no accounts or cloud of their own. AI features, when the user wants them, run through their own ChatGPT plan.
- **No technical questions.** The AI makes the technical choices and checks the machine itself. What only IT can answer becomes a message the user can forward.

## Start a project

Needs the Codex app, CLI or IDE extension, signed in with ChatGPT. Nothing is installed on the computer: the setup goes into the project folder and removes itself when it's done.

1. Make an empty folder named after the work (e.g. `Supplier bills`) and open Codex in it.
2. Paste this, and approve what Codex asks:

   > Set this folder up as a workbench: download https://github.com/ahrzb/workbench/archive/refs/tags/v0.1.2.zip, unpack it, copy its `skills/workbench-setup` folder to `.agents/skills/workbench-setup` in this folder, and delete the download. Then read `.agents/skills/workbench-setup/SKILL.md` and follow it.

3. Open a **new chat** in the same folder. Under the message box, click **Review hooks** and choose **Allow selected** (in the terminal version, type `/hooks`). If Codex asks to trust the folder, say yes. Then type **hi**.
4. Talk about your work. Later: "something's wrong with my tool", or "update the workbench".

## What's in this repo

| Path | What |
|---|---|
| `skills/workbench-setup/` | The one-time setup skill, and `template/`: everything a new project gets |
| `skills/workbench-setup/template/.agents/skills/workbench/` | The workbench skill itself: build, fix, update, how to talk, safety, AI features, the stack and the Electron starter |
| `research/` | The research behind every decision, with sources ([research/README.md](research/README.md)) |
| `examples/resume-parser-electron/` | The bake-off app the starter was cut from |
| `CHANGES.md` | What changed in each version, in plain words |

## Releasing

Projects update from the latest **tagged GitHub release** (see `update.md`). To release: add a `CHANGES.md` entry, set `.workbench/VERSION` in the template to the new version and date, commit, then tag `vX.Y.Z` and publish a GitHub release for it. Keep `.codex/hooks.json` unchanged across releases unless you must: any change makes every user review the startup check again.

**Trust.** Whoever can publish a release in this repository decides what runs in every project that updates. The update step shows the user, in plain words, every change to what runs automatically or what the AI may do, and downloads the exact release commit, but it doesn't verify a signature yet. Signed releases (a pinned maintainer key, checked before applying) are the next hardening step.

## Status

v0.1.2 is built and tested on Windows 11 (setup, first chat, save points, account check, starter build, packaged AI call) and reviewed adversarially by GPT reviewers over three rounds; the last round's fixes are tested but not re-reviewed. The desktop app's **Review hooks** button is named from the app's own text; clicking it is not yet tested. macOS paths are written but untested. The repository is private, so the line under "Start a project" works only once it's public.
