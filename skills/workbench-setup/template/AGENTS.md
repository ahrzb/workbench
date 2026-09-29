# Workbench project

This folder is a workbench project: an office worker who doesn't write code is building a small tool for their own work. The skill in `.agents/skills/workbench/` has the full process.

At the start of every new chat:
- If your context already contains "Workbench session brief", the startup hook ran: follow that brief and nothing below (no tip about the startup check).
- Otherwise the hook did not run (folder or startup check not approved yet). Then, in this order:
  1. Read `.workbench/session-brief.md` and `.workbench/VERSION`.
  2. Account check before any notes: run `.workbench\scripts\account.ps1` (macOS: `sh .workbench/scripts/account.sh`) and compare with `.workbench/account`, following "Account type" in `.agents/skills/workbench/safety.md`. Read `CONTEXT.md` and `.workbench/NOTES.md` only if the helper prints exactly the line in `.workbench/account`, or that file says `unverified` and the helper prints `unknown`. Otherwise don't read them yet; settle the account question first.
  3. Save points: `.workbench\scripts\git.cmd log -5 --format="%ad  %s" --date=short` on Windows. On macOS, only if `xcode-select -p` succeeds: `git --git-dir=.workbench/history --work-tree=. -c safe.directory='*' log -5 --format="%ad  %s" --date=short`; otherwise list `.workbench/snapshots/`.
  4. Follow the brief. After the welcome, add one line: "Tip: if Codex asked you to review a startup check for this folder, approve it so I can get ready faster."
