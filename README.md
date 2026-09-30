# Workbench

A skill for Codex (ChatGPT) for vibe coding when you don't write code yourself. You describe a small tool in your own words and Codex builds it on your computer: turn a pile of PDFs into a clean spreadsheet, track a club's members, sort job applications, keep a list that a spreadsheet keeps getting wrong, put up a small website. One project folder holds as many tools as you like.

Vibe coding without a developer watching goes wrong in familiar ways: the AI builds the wrong thing for an hour, loses or overwrites data, sends files somewhere unnoticed, or leaves something nobody can fix later. The workbench adds safeguards and a method against each of those:

- **A method, not a free-for-all.** A short interview finds what's actually needed; the user sees the result on their own examples and the shape of the tool before anything is built; then small milestones, each ending in a demo, with a check-in at every surprise.
- **Safeguards for data.** Originals are never changed; data gets automatic backups that are checked to open; new versions are tried on a practice copy next to the version in use; a plain picture shows where data goes, and nothing leaves the computer without the user knowing.
- **Undo and a memory.** Save points before and after every change, "go back" per tool, and notes in the user's own words so the next chat (or a friend helping out) picks up where things stood, with the exact versions each tool was built with.
- **No admin rights, nothing installed.** Everything the tools need downloads into the project folder. The only things outside it are a desktop shortcut per tool and each tool's own data folder.
- **Local and quiet.** Tools open no network ports and have no accounts or cloud of their own. AI features, when wanted, run through the user's own ChatGPT plan. A website is the one exception: it lives on the user's own Cloudflare account, private until they choose to make it public.
- **No technical questions.** The AI makes the technical choices and checks the machine itself. What only someone else can answer (IT, a tech-savvy friend) becomes a message the user can forward.

## Start a project

Needs the Codex app, CLI or IDE extension, signed in with ChatGPT. Nothing is installed on the computer: the setup goes into the project folder and removes itself when it's done.

1. Make an empty folder named after what the tool is for (e.g. `Club members`) and open Codex in it.
2. Paste this, and approve what Codex asks:

   > Set this folder up as a workbench: download https://github.com/ahrzb/workbench/archive/refs/tags/v0.2.6.zip, unpack it, copy its `skills/workbench-setup` folder to `.agents/skills/workbench-setup` in this folder, and delete the download. Then read `.agents/skills/workbench-setup/SKILL.md` and follow it.

3. Open a **new chat** in the same folder. Under the message box, click **Review hooks** and choose **Allow selected** (in the terminal version, type `/hooks`). If Codex asks to trust the folder, say yes. Then type **hi**.
4. Say what you want in your own words. Later: another tool in the same folder ("something new: ..."), "something's wrong with the members tool", or "update the workbench".

## What's in this repo

| Path | What |
|---|---|
| `skills/workbench-setup/` | The one-time setup skill, and `template/`: everything a new project gets |
| `skills/workbench-setup/template/.agents/skills/workbench/` | The workbench skill itself: build, fix, update, how to talk, safety, AI features and the stack |
| `.../workbench/starters/` | Starting points for a tool: `electron/` (desktop program, the default), `html/` (one HTML file), `web/` (a website on Cloudflare), and `NOTES.md` (each tool's notes) |
| `.../workbench/blocks/` | Tested pieces a tool copies in: `data-safety/` (backups, data versions), `excel/` (xlsx and csv), `ai-read/` (AI reads a document, code checks it) |
| `skills/workbench-setup/template/.agents/skills/impeccable/` | The bundled design skill, [impeccable](https://github.com/pbakaus/impeccable) 4.4.0 by Paul Bakaus (Apache-2.0, unmodified, licence included); its engine is fetched at a pinned version and hash by `bootstrap.ps1`. How the workbench uses it: `.../workbench/design.md` |
| `research/` | The research behind every decision, with sources ([research/README.md](research/README.md)) |
| `examples/resume-parser-electron/` | The bake-off app the Electron starter was cut from |
| `CHANGES.md` | What changed in each version, in plain words |

## Releasing

Projects update from the latest **tagged GitHub release** (see `update.md`). To release: add a `CHANGES.md` entry, set `.workbench/VERSION` in the template to the new version and date, commit, then tag `vX.Y.Z` and publish a GitHub release for it. Keep `.codex/hooks.json` unchanged across releases unless you must: any change makes every user review the startup check again.

**Trust.** Whoever can publish a release in this repository decides what runs in every project that updates. "Update the workbench" applies the latest release straight away (`.workbench/scripts/update.ps1`): it downloads the exact release commit from the source in `VERSION`, makes a save point first, undoes itself if anything fails, and then says in plain words what changed. It doesn't verify a signature yet. Signed releases (a pinned maintainer key, checked before applying) are the next hardening step.

## Status

v0.2 is built and tested on Windows 11: setup, first chat, several tools in one project (welcome, switching, a new tool, going back on one tool), save points, account check, both desktop starters and all three blocks (each with its own tests, packaged and run), and a packaged AI call; v0.2.1-0.2.5 (asking instead of assuming, milestones and demos, trying out next to the version in use, the data map, the design skill) were tried through Codex on made-up examples. v0.1 was reviewed adversarially by GPT reviewers over three rounds; v0.2's additions are not reviewed yet. Not tested: deploying a website to a real Cloudflare account and its Access setup, the design skill on a website, the desktop app's **Review hooks** button, and macOS.
