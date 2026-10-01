# Update the workbench

The user said "update the workbench" (or similar). That is the go-ahead: don't list the changes first and don't ask again. Updates come only from the repository named in `.workbench/VERSION`, at the exact commit of its latest release; its owner decided that updating from there straight away is the safer default. Nothing checks for updates unless the user asks.

**Run** `.workbench\scripts\run.cmd bun .workbench\scripts\update.ts` (macOS: `.tools/bun/bun .workbench/scripts/update.ts`, not tried on a Mac yet) once, with escalated permissions (it needs the network and writes `.agents\` and `.codex\`, which Codex protects), reason in plain words: "Update the workbench to the latest version; your tools, notes and data aren't touched." It finds the latest release, downloads that exact commit, copies the workbench's own files aside and makes a save point, replaces them, checks the new version starts, fetches the design engine it pins, writes `VERSION` last and makes a save point "Updated the workbench to <version>". If anything fails, it puts every file back as it was. If `run.cmd` prints `NEEDS_BOOTSTRAP`, run `bootstrap.ps1` first (with approval), then this.

What it prints, and what you say:
- `UP_TO_DATE`: "You're on the latest version (<version>)."
- `UPDATED` plus `WHAT_CHANGED`: 2-4 plain lines of what's new for them, from those lines. If `HOOKS_CHANGED`: "Codex will ask you to review the startup check again: under the message box, **Review hooks** -> **Allow selected**." Always end with: "Open a new chat so the new version is used."
- `FAILED_AND_UNDONE` (exit 1): one line on what failed and that nothing changed. A blocked download: the forwardable message for IT ([safety.md](safety.md#forwardable-messages)); the project keeps working on its current version.
- `OLD_LAYOUT` (exit 3): do "From 0.1.x" below first, then run it again.

`-CheckOnly` only says whether a newer version exists.

**What the workbench owns** (the only things an update changes): `.agents/skills/workbench/`, `.agents/skills/impeccable/` (the bundled design skill), `.impeccable/config.json`, `.workbench/scripts/`, `.workbench/session-brief.md`, `.codex/hooks/`, `.codex/hooks.json`, `.codex/agents/` (the modeller, designer and implementer), `AGENTS.md`, `.gitignore` and `.gitattributes` (the new file plus lines this project added), `.workbench/VERSION`. Everything else belongs to the user: `tools/` (every tool's notes, words, design notes, code, samples and the copy in use), `.workbench/NOTES.md`, `.workbench/account`, `.workbench/history/`, `.workbench/snapshots/`, `.tools/`, and each tool's data and backups in `%LOCALAPPDATA%\WorkbenchTools\`. Put anything project-specific in NOTES, not in `AGENTS.md` or the skill files: those are replaced.

**Undo an update** when the user asks: go back to the save point "before updating the workbench to <version>" for the owned paths only (`git.cmd restore --source=<save point> --staged --worktree -- <owned paths>`), then `bootstrap.ps1` (approval) for the old design engine, and a save point "went back to workbench <old version>".

**From 0.1.x (one tool at the top, no `tools/` folder):** first move the one tool into `tools/<name>/` (a name from `What it is` in the old `.workbench/NOTES.md`): `app/`, `samples/`, `CONTEXT.md` into it, `tool/<App>/` to `tools/<name>/current/` (ask them to close the tool first; point the shortcut at the new place), `.workbench/sketches/` to `tools/<name>/sketches/`. The old `.workbench/NOTES.md` becomes `tools/<name>/NOTES.md` (drop its "ChatGPT account" line, add `TOOL_ID:` from `app/src/main.ts`); write a new `.workbench/NOTES.md` with that tool as its one line, `Last worked on: <name>`, and the account line. Old data backups in `%LOCALAPPDATA%\Workbench\backups\<project folder>\` stay where they are; mention them once. One line to the user: "Your tool now lives in its own folder, so this project can hold more tools." Save point "<name>: moved into its own folder", then run the update.

**macOS** without Bun in `.tools/bun/` yet: download it first as [stack.md](stack.md#tools-inside-the-project) says ("macOS"), with approval, then run the script as above.

**Notes changes are proposals.** If the new `CHANGES.md` suggests a change to a tool's NOTES or CONTEXT, show the exact change and apply it only if the user says yes.

Trust: whoever controls the repository in `VERSION` controls what an update contains, and hook scripts can change without Codex asking again. The owner accepted that for updates from that one source; the save point before every update is the way back.
