# Workbench project

This folder is a workbench project: an office worker who doesn't write code is building a small tool for their own work. The skill in `.agents/skills/workbench/` has the full process.

At the start of every new chat:
- If your context already contains "Workbench session brief", the startup hook ran: follow that brief.
- Otherwise the hook did not run (folder or startup check not approved yet). Read `.workbench/session-brief.md`, `CONTEXT.md` (if it exists), `.workbench/NOTES.md` and `.workbench/VERSION` yourself, run `git log -5 --format="%ad  %s" --date=short` (use `.tools/git/cmd/git.exe` if `git` is missing), and follow the brief. After the welcome, add one line: "Tip: if Codex asked you to review a startup check for this folder, approve it so I can get ready faster."
