# Workbench

A skill for Codex (ChatGPT) that helps people who are good with computers but don't write code build small tools, for their job or for themselves: turn a pile of PDFs into a clean spreadsheet, check a monthly report, sort their job applications, keep a list that Excel keeps getting wrong, put up a small website. The user describes what they want in their own words; Codex does the building, on their own computer. One project folder holds as many tools as they like.

- **No admin rights, nothing installed.** Everything the tools need downloads into the project folder. The only things outside it are a desktop shortcut per tool and each tool's own data folder.
- **Local and quiet.** Tools on the computer open no network ports and have no accounts or cloud of their own. AI features, when the user wants them, run through their own ChatGPT plan. A website is the one exception: it lives on the user's own Cloudflare account, private until they choose to make it public.
- **No technical questions.** The AI makes the technical choices and checks the machine itself. What only IT can answer becomes a message the user can forward.

## Start a project

Needs the Codex app, CLI or IDE extension, signed in with ChatGPT. Nothing is installed on the computer: the setup goes into the project folder and removes itself when it's done.

1. Make an empty folder named after the work (e.g. `Supplier bills`) and open Codex in it.
2. Paste this, and approve what Codex asks:

   > Set this folder up as a workbench: download https://github.com/ahrzb/workbench/archive/refs/tags/v0.2.1.zip, unpack it, copy its `skills/workbench-setup` folder to `.agents/skills/workbench-setup` in this folder, and delete the download. Then read `.agents/skills/workbench-setup/SKILL.md` and follow it.

3. Open a **new chat** in the same folder. Under the message box, click **Review hooks** and choose **Allow selected** (in the terminal version, type `/hooks`). If Codex asks to trust the folder, say yes. Then type **hi**.
4. Talk about your work. Later: another tool in the same folder ("something new: ..."), "something's wrong with the bills tool", or "update the workbench".

## What's in this repo

| Path | What |
|---|---|
| `skills/workbench-setup/` | The one-time setup skill, and `template/`: everything a new project gets |
| `skills/workbench-setup/template/.agents/skills/workbench/` | The workbench skill itself: build, fix, update, how to talk, safety, AI features and the stack |
| `.../workbench/starters/` | Starting points for a tool: `electron/` (desktop program, the default), `html/` (one HTML file), `web/` (a website on Cloudflare), and `NOTES.md` (each tool's notes) |
| `.../workbench/blocks/` | Tested pieces a tool copies in: `data-safety/` (backups, data versions), `excel/` (xlsx and csv), `ai-read/` (AI reads a document, code checks it) |
| `research/` | The research behind every decision, with sources ([research/README.md](research/README.md)) |
| `examples/resume-parser-electron/` | The bake-off app the Electron starter was cut from |
| `CHANGES.md` | What changed in each version, in plain words |

## Releasing

Projects update from the latest **tagged GitHub release** (see `update.md`). To release: add a `CHANGES.md` entry, set `.workbench/VERSION` in the template to the new version and date, commit, then tag `vX.Y.Z` and publish a GitHub release for it. Keep `.codex/hooks.json` unchanged across releases unless you must: any change makes every user review the startup check again.

**Trust.** Whoever can publish a release in this repository decides what runs in every project that updates. The update step shows the user, in plain words, every change to what runs automatically or what the AI may do, and downloads the exact release commit, but it doesn't verify a signature yet. Signed releases (a pinned maintainer key, checked before applying) are the next hardening step.

## Status

v0.2.0 is built and tested on Windows 11: setup, first chat, several tools in one project (welcome, switching, a new tool, going back on one tool), save points, account check, both desktop starters and all three blocks (each with its own tests, packaged and run), and a packaged AI call. v0.1 was reviewed adversarially by GPT reviewers over three rounds; v0.2's additions are not reviewed yet. Not tested: deploying a website to a real Cloudflare account and its Access setup, the desktop app's **Review hooks** button, and macOS. The repository is private, so the line under "Start a project" works only once it's public.
