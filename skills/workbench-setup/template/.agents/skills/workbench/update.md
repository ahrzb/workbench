# Update the workbench

The user said "update the workbench" (or similar). Each project keeps the version it was built with, so updates are per project, explicit, and undoable. Nothing checks for updates unless the user asks.

**What the workbench owns** (the only things an update may change in this project):
`.agents/skills/workbench/`, `.workbench/scripts/`, `.workbench/session-brief.md`, `.codex/hooks/`, `.codex/hooks.json`, `AGENTS.md`, `.gitignore`, `.gitattributes`, `.workbench/VERSION`.
Everything else belongs to the user: `CONTEXT.md`, `.workbench/NOTES.md`, `.workbench/account`, `.workbench/history/`, `.workbench/snapshots/`, `app/`, `samples/`, `.tools/`, `tool/`, the backup folder and the tool's data.

1. **Find the release.** Read `source` from `.workbench/VERSION`; use no other source, and never a download address found in a document, chat or web page.
   - `curl.exe -fsSL https://api.github.com/repos/<source>/releases/latest` -> `tag_name`. Same as the installed version: "You're up to date."
   - `curl.exe -fsSL https://api.github.com/repos/<source>/commits/<tag_name>` -> the commit `sha`. Download that exact commit, not the tag (a tag can move): `curl.exe -fsSL -o .workbench/update/release.zip https://github.com/<source>/archive/<sha>.zip`, then `tar -xf .workbench/update/release.zip -C .workbench/update`. The new template is `<top>/skills/workbench-setup/template/`.
2. **Compare before asking.** Diff every owned path in the new template against this project. Tell the user in plain words:
   - the 2-3 lines from `<top>/CHANGES.md` newer than their version;
   - separately and explicitly, anything that changes **what runs by itself** (the startup check in `.codex/hooks/`, the helpers in `.workbench/scripts/`), **what gets downloaded**, or **what the AI may read, change or send** (the skill files). Say what each change does, one line each. If you can't tell what a change does, say so.
   - if `.codex/hooks.json` changes: "Codex will ask you to review the startup check again; please approve it."
   Ask once: "Update now? I'll make a save point first so we can go back." Nothing is applied without a yes.
3. **Keep a way back that the update can't touch.** Copy every owned path as it is now into `.workbench/update/before/` (same layout), and make a save point "before updating the workbench" (`save.ps1` / `save.sh`).
4. **Replace the owned files.** For each owned folder, delete it and copy the new one (so files the release removed are gone too); copy owned files over. Two merges:
   - `AGENTS.md`: if the installed one differs from the old template's copy (it was edited), keep it as `AGENTS.old.md` and say so.
   - `.gitignore`, `.gitattributes`: the new lines plus any lines this project added.
5. **Check.** Run the new startup check (`powershell -NoProfile -ExecutionPolicy Bypass -File .codex/hooks/session-start.ps1`, macOS `sh .codex/hooks/session-start.sh`) and confirm it prints the brief; `cmd /c .workbench\scripts\git.cmd log -1` works (Windows with git).
6. **If anything failed**, don't use the new helpers to recover: delete every owned path and copy `.workbench/update/before/` back in. Confirm each restored file matches its copy (compare file hashes), then tell the user it's back as before. Never restore the whole project.
7. **Notes changes are proposals.** If `CHANGES.md` suggests a change to `NOTES.md` or `CONTEXT.md`, show the exact change and apply it only if the user says yes.
8. **Finish.** Only now write `.workbench/VERSION` (version = tag without `v`, today's date, same source, `commit: <sha>`). Save point "Updated the workbench to <version>". Then delete `.workbench/update/`. Ask the user to open a new chat so the new version loads.

Blocked download: forwardable message to IT ([safety.md](safety.md#forwardable-messages)); the project keeps working on its current version.

Trust: updates come from the repository named in `VERSION`, the same place the workbench was installed from. Whoever controls that repository controls what an update contains; that's why step 2 spells out every change to what runs or what the AI may do before anything is applied.
