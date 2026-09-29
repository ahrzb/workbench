---
name: workbench-setup
description: Sets up the current folder as a workbench project, where an office worker builds small tools for their own work with Codex. Use when the user asks to set this up as a workbench or start a workbench project.
---

# Set up a workbench

The user is an office worker who doesn't write code. Keep every message short and plain; never ask them about technology.

1. **Check the folder.** Run `pwd`/`Get-Location` and list it.
   - Already has `.workbench/`: it's set up. Say so and ask them to open a new chat here.
   - It's their home folder, Desktop, Documents, Downloads or a drive root, or it holds unrelated files: suggest a new empty folder with a name from their work (e.g. `Supplier bills`), and stop until they open Codex there.
2. **Say what happens, in 3 lines:** "I'll add the workbench files to this folder. Codex will ask you to approve that once. After that, open a new chat here: Codex may ask you to trust the folder and to review a startup check. Please approve both."
3. **Copy the template in one command** (so Codex asks for approval once). The template is the `template/` folder next to this file.
   - Windows: `Copy-Item -Path "<this skill folder>\template\*" -Destination . -Recurse -Force`
   - macOS: `cp -R "<this skill folder>/template/." .`
   - Check that `.codex/hooks.json`, `.agents/skills/workbench/SKILL.md`, `.workbench/session-brief.md` and `AGENTS.md` now exist.
4. **Make the first save point.** Save points keep their history in `.workbench/history`, not `.git` (the sandbox keeps `.git` read-only).
   - Windows: if `git` isn't on PATH, first run `powershell -NoProfile -ExecutionPolicy Bypass -File .workbench\scripts\bootstrap.ps1` (downloads Node.js and a private git into `.tools\`, a few minutes). Then: `.workbench\scripts\git.cmd init -q -b main`, `.workbench\scripts\git.cmd add -A`, `.workbench\scripts\git.cmd commit -qm "Workbench set up"`.
   - macOS: only if `xcode-select -p` succeeds, run the same three commands as `git --git-dir=.workbench/history --work-tree=. -c safe.directory='*' -c user.name=Workbench -c user.email=workbench@localhost <command>`; otherwise skip (the workbench skill uses snapshots).
