# Changes

Written for the people using the workbench. The AI reads the entries newer than a project's version when it updates.

## 0.2.7 (2026-09-30)

- Sketches you can find: the link to a sketch is the first thing in the reply (in the Codex app it opens beside the chat), and after every change to it the link comes again with what changed.
- Sketches of changes to a tool you already have look like that tool: its colours, type, buttons and cards, not a grey stand-in.
- The workbench's helpers now run on Bun, a small program downloaded into the project like the other build tools. The same helpers work on Windows and Mac, and the AI makes fewer slips with them. The first time after updating, Codex asks once to download it.

## 0.2.6 (2026-09-30)

- You try things yourself. Before anything is built you click through a rough sketch of the tool; after every step and every fix, the new version opens for you to try, with the question "does it work the way you want, and do you like it?"
- Your copy only changes after you've tried the new one and said yes, fixes included. The AI's own checks never count as your OK.
- Updating is one step: say "update the workbench" and it updates, keeps a save point to go back to, and tells you what's new. No second question.
- Desktop tools are designed for their window sizes, not for phones.

## 0.2.5 (2026-09-30)

- Better-looking, clearer tools: the workbench now brings a design skill (impeccable) that the AI uses for every screen, with a check before each demo for hard-to-read text and the generic "made by AI" look. You see only the result.
- It works offline and stays inside the project: its program is downloaded once into the project with the other build tools, and it never checks for updates or phones home.
- The workbench is described for anyone who doesn't write code, whatever the tools are for.

## 0.2.4 (2026-09-30)

- Keep using your tool while it's being changed. New versions open as a separate "trying out" copy, next to the one you use, on a practice copy of your data. Your usual copy and your real data only change when you say "use this version". Codex asks you to allow opening that window each time.
- A picture of where your data goes: early on, before anything is built, you see who and what touches your data and whether anything leaves your computer, and say if it's right.
- A short, mostly silent data checklist behind the scenes: copies of your data also while a tool stays open, a check that a copy really opens, a suggestion to keep a copy off this computer for data that exists nowhere else, and, for other people's details, keeping only what's used and for how long.
- Each tool writes down the exact versions it was built with, so it can be rebuilt the same way later.
- Downloads for building ask for your OK (Codex's sandbox has no network), instead of being mistaken for a blocked network.
- Tools made before this version get the "trying out" part the next time they're changed.

## 0.2.3 (2026-09-30)

- Demos you can look at: after each milestone the AI shows the actual rows or cases, the tricky ones first, instead of a sentence of counts.

## 0.2.2 (2026-09-30)

- You see it before it's built. The AI first shows the result on your own examples, then how you'll use the tool (what you put in, what you click, what comes out), and waits for your OK before building anything.
- A short plan you can see: a few milestones, each ending in a demo you can try in about a minute. It does one at a time and stops to hear what you think before the next.
- It checks in as soon as something surprises it, such as an example that doesn't fit what you said, instead of carrying on and telling you at the end.

## 0.2.1 (2026-09-30)

- Less cautious by default. The AI no longer assumes your files are for work or need special care. The first time you share real files it asks once: is this for work, and if so, are there rules to keep in mind? Your answer decides, and it doesn't ask again.
- It remembers how you use the workbench (what you build tools for, whether company rules generally apply, how much explaining you want) in a few lines of the project notes, so later tools don't ask again either.
- Sharing with colleagues and putting up a work website: you're asked whether your company needs to OK it, instead of always being sent to IT first.

## 0.2.0 (2026-09-30)

- One project, many tools. Keep all your tools in one folder: each has its own notes and words, and "go back" only ever touches the tool you're talking about.
- Websites: ask for a site and it's built with you and put on your own Cloudflare account, private to the people you name until you decide to make it public.
- A one-file version of a tool, for computers where programs can't run or for sharing with a few people without warnings.
- Sturdier tools: tested ready-made pieces for keeping your data safe (automatic backups, safe upgrades), reading and writing Excel files, and having AI read documents with every answer checked.
- Backups of a tool's data now sit next to that tool's data.

## 0.1.2 (2026-09-29)

- Nothing is installed on your computer any more, not even the setup: it goes into the project folder, sets it up, and removes itself. Starting a project is one pasted line (see the README).

## 0.1.1 (2026-09-29)

- The startup check now actually gets switched on: setup ends by showing where to allow it (**Review hooks** under the message box, then **Allow selected**), and until it's allowed every new chat reminds you once.
- Less fuss about data. The workbench no longer assumes your files are sensitive or for work. When real files first come up, it asks once whether they're for your job or your own. Your own files: no more to say. Work files on a personal ChatGPT account: one short heads-up, and it's your call.

## 0.1.0 (2026-09-29)

First version.
- Set up a folder with "Set this up as a workbench"; every new chat starts with a short welcome and the next step.
- Build: a short interview about a real example from your work, then one small change at a time that you can try in a minute, with a save point before and after.
- Fix: tell it what you expected and what happened; it reproduces the problem, fixes it and shows what it checked. Your data is restored first if it looks wrong.
- Everything downloads into the project folder; nothing is installed and no admin rights are needed.
- Ask any time for a ready-to-send message for IT or a tech-savvy friend.
- "Update the workbench" gets the latest version, after showing what changes.
