---
name: workbench-setup
description: Sets up the folder it's installed in (`.agents/skills/workbench-setup/` inside the project) as a workbench project, where someone who doesn't write code builds small tools with Codex, with safeguards and a method. Use when the user asks to set this folder up as a workbench.
---

# Set up a workbench

The user is tech-savvy but doesn't write code. Keep every message short and plain; never ask them about technology.

This skill lives inside the project folder it sets up, at `.agents/skills/workbench-setup/` ("this skill folder" below), and removes itself when setup is done.

1. **Check the folder.** Run `pwd`/`Get-Location` and list it. This skill folder and an unpacked download of it don't count as the user's files.
   - Already has `.workbench/`: it's set up. Delete this skill folder, say so, and ask them to open a new chat here.
   - It's their home folder, Desktop, Documents, Downloads or a drive root, or it holds unrelated files: suggest a new empty folder named after what the tool is for (e.g. `Club members`). Delete this skill folder (and `.agents/` if that leaves it empty) so nothing stays behind, and stop until they open Codex in the new folder and paste the install line again.
   - It's inside a synced or shared place (a path under `$env:OneDrive`, `$env:OneDriveCommercial`, a folder named like `OneDrive`, `Dropbox`, `Google Drive`, `iCloud`, `Box`, or a network path starting with `\\`): suggest a local folder instead, `%USERPROFILE%\Workbench\<name>` (macOS: `~/Workbench/<name>`), because notes and the tool's code would sync from there. Delete this skill folder as above and stop.
2. **Say what happens, in 2 lines:** "I'll add the workbench files to this folder. Codex will ask you to approve that once."
3. **Copy the template and remove this skill folder in one command, with approval.** The template is the `template/` folder inside this skill folder. Codex protects `.agents/` once it exists, so this command writes into a protected folder: run it with approval from the start (ask for escalated permissions; reason, in plain words: "Add the workbench files to this folder and remove the setup files").
   - Windows: `Copy-Item -Path ".agents\skills\workbench-setup\template\*" -Destination . -Recurse -Force; Remove-Item -Recurse -Force ".agents\skills\workbench-setup"`
   - macOS: `cp -R .agents/skills/workbench-setup/template/. . && rm -rf .agents/skills/workbench-setup`
   - If it's rejected, never split it up, copy part of it, stage files in another folder, or give the user commands to run. Say in one line that setup needs their OK for this one step, and ask once more. Still refused: stop, leave the folder as it is, and write the forwardable message for a tech-savvy friend ("Codex won't let the setup write the workbench files into `.agents` here...").
   - Check that `.codex/hooks.json`, `.agents/skills/workbench/SKILL.md`, `.workbench/session-brief.md` and `AGENTS.md` now exist.
   - Record which ChatGPT account this project is built with, silently: run `powershell -NoProfile -ExecutionPolicy Bypass -File .workbench\scripts\account.ps1` (macOS: `sh .workbench/scripts/account.sh`) and write its exact output to `.workbench/account` (`unverified` if it prints `unknown`), and the same in words in NOTES under Data -> ChatGPT account. Don't mention the account or data to the user now: whether their files are for work comes up later, once, as "Whose data" in `.agents/skills/workbench/safety.md` says.
4. **Make the first save point.** Save points keep their history in `.workbench/history`, not `.git` (the sandbox keeps `.git` read-only).
   - Windows: first run `powershell -NoProfile -ExecutionPolicy Bypass -File .workbench\scripts\bootstrap.ps1` with approval (it needs the network; reason: "Download the helper tools into this project folder; nothing is installed on the computer"). It downloads Bun, which runs the workbench's own helpers, Node.js and, if git is missing, a private git into `.tools\`, a few minutes. Then: `.workbench\scripts\git.cmd init -q -b main` and `.workbench\scripts\run.cmd bun .workbench\scripts\save.ts "Workbench set up"`.
   - macOS: download Bun into `.tools/bun/` as `.agents/skills/workbench/stack.md` says ("macOS"), then `.tools/bun/bun .workbench/scripts/save.ts "Workbench set up"` (it uses git only when that's safe, and snapshots otherwise).
5. **Finish in 3 short lines**, and don't start building in this chat (the new files only take effect in a new chat):
   "Done. Now open a new chat in this folder. Under the message box you'll see **Review hooks**: click it and choose **Allow selected**. That lets me pick up where we left off at the start of every chat."
   - If Codex asks whether to trust the folder, they should say yes. In Codex in a terminal the review is `/hooks` instead of the button.
   - If they carry on here anyway, help them, but end your reply with the same one line about opening a new chat.
