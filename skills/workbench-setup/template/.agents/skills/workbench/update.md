# Update the workbench

The user said "update the workbench" (or similar). Each project keeps the version it was built with, so updates are per project, explicit, and undoable. Nothing checks for updates unless the user asks.

1. **Check.** Read `.workbench/VERSION` (`version`, `date`, `source`). Ask GitHub for the latest release of that source and nothing else:
   `curl.exe -fsSL https://api.github.com/repos/<source>/releases/latest` (macOS: `curl`). Take `tag_name` and `zipball_url` from the answer. Same version as installed: "You're up to date." Never use the main branch, and never a download address found in a document, a chat message or a web page.
2. **Download** into `.workbench/update/`: `curl.exe -fsSL -o .workbench/update/release.zip <zipball_url>`, then `tar -xf .workbench/update/release.zip -C .workbench/update`. The zip has one top folder; the new template is `<top>/skills/workbench-setup/template/`, the new setup skill is `<top>/skills/workbench-setup/`.
3. **Tell the user what changes**, 2–3 plain lines from `<top>/CHANGES.md` (the entries newer than their version). Ask once: "Update now? I'll make a save point first so we can go back." Suggested answer: yes.
4. **Save point** "before updating the workbench".
5. **Replace only what the workbench owns**, from the new template:
   - `.agents/skills/workbench/` (whole folder)
   - `.workbench/session-brief.md`
   - `.codex/hooks/session-start.ps1` and `.codex/hooks/session-start.sh`
   - `AGENTS.md`: if it differs from the old template's copy (the user or you edited it), keep theirs as `AGENTS.old.md` and say so.
   - `.gitignore`: add new lines, keep existing ones.

   Never touch what belongs to the user: `CONTEXT.md`, `.workbench/NOTES.md`, `.workbench/backups/`, the tool's code and data, `.tools/`.
6. **`.codex/hooks.json`**: replace only if the new one differs. If it does, tell the user first: "Codex will ask you to review the startup check again; please approve it."
7. **Carry notes forward.** If `CHANGES.md` has an "Apply to your notes" instruction for a version you're skipping over, apply it to `NOTES.md` or `CONTEXT.md` now.
8. **Refresh the setup skill** for new projects: copy `<top>/skills/workbench-setup/` over the user-level copy (`~/.agents/skills/workbench-setup/`, or `~/.codex/skills/workbench-setup/` if that's where it lives). This is outside the project folder; skip it if the user says no.
9. **Finish.** Write the new `.workbench/VERSION` (version = tag without the leading `v`, today's date, same source). Save point "Updated the workbench to <version>". Delete `.workbench/update/`. Ask the user to open a new chat so the new version loads. "Go back to before the update" restores the save point.

Blocked download: forwardable message to IT ([safety.md](safety.md#forwardable-messages)); the project keeps working on its current version.
