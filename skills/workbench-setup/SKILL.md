---
name: workbench-setup
description: Sets up the current folder as a workbench project, where an office worker builds small tools for their own work with Codex. Use when the user asks to set this up as a workbench or start a workbench project.
---

# Set up a workbench

The user is an office worker who doesn't write code. Keep every message short and plain; never ask them about technology.

1. **Check the folder.** Run `pwd`/`Get-Location` and list it.
   - Already has `.workbench/`: it's set up. Say so and ask them to open a new chat here.
   - It's their home folder, Desktop, Documents, Downloads or a drive root, or it holds unrelated files: suggest a new empty folder with a name from their work (e.g. `Supplier bills`), and stop until they open Codex there.
   - It's inside a synced or shared place (a path under `$env:OneDrive`, `$env:OneDriveCommercial`, a folder named like `OneDrive`, `Dropbox`, `Google Drive`, `iCloud`, `Box`, or a network path starting with `\\`): suggest a local folder instead, `%USERPROFILE%\Workbench\<name>` (macOS: `~/Workbench/<name>`), because notes and the tool's code would sync from there. Stop until they open Codex in the new folder.
2. **Say what happens, in 2 lines:** "I'll add the workbench files to this folder. Codex will ask you to approve that once."
3. **Copy the template in one command** (so Codex asks for approval once). The template is the `template/` folder next to this file.
   - Windows: `Copy-Item -Path "<this skill folder>\template\*" -Destination . -Recurse -Force`
   - macOS: `cp -R "<this skill folder>/template/." .`
   - Check that `.codex/hooks.json`, `.agents/skills/workbench/SKILL.md`, `.workbench/session-brief.md` and `AGENTS.md` now exist.
   - Record which ChatGPT account this project is built with, silently: run `powershell -NoProfile -ExecutionPolicy Bypass -File .workbench\scripts\account.ps1` (macOS: `sh .workbench/scripts/account.sh`) and write its exact output to `.workbench/account` (`unverified` if it prints `unknown`), and the same in words in NOTES under Data -> ChatGPT account. Don't mention the account or data to the user now: whether their files are for work comes up later, once, as "Whose data" in `.agents/skills/workbench/safety.md` says.
4. **Make the first save point.** Save points keep their history in `.workbench/history`, not `.git` (the sandbox keeps `.git` read-only).
   - Windows: if `git` isn't on PATH, first run `powershell -NoProfile -ExecutionPolicy Bypass -File .workbench\scripts\bootstrap.ps1` (downloads Node.js and a private git into `.tools\`, a few minutes). Then: `.workbench\scripts\git.cmd init -q -b main` and `powershell -NoProfile -ExecutionPolicy Bypass -File .workbench\scripts\save.ps1 "Workbench set up"`.
   - macOS: `sh .workbench/scripts/save.sh "Workbench set up"` (it uses git only when that's safe, and snapshots otherwise).
5. **Finish in 3 short lines**, and don't start building in this chat (the new files only take effect in a new chat):
   "Done. Now open a new chat in this folder. Under the message box you'll see **Review hooks**: click it and choose **Allow selected**. That lets me pick up where we left off at the start of every chat."
   - If Codex asks whether to trust the folder, they should say yes. In Codex in a terminal the review is `/hooks` instead of the button.
   - If they carry on here anyway, help them, but end your reply with the same one line about opening a new chat.
