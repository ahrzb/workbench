#!/bin/sh
# SessionStart hook (macOS/Linux). Plain text on stdout becomes context for the AI only.
# Never touch /usr/bin/git unless the Command Line Tools exist: the stub pops an admin installer.
root=$(pwd)
if [ -x "$root/.tools/git/bin/git" ]; then git_bin="$root/.tools/git/bin/git"
elif g=$(command -v git) && { [ "$g" != /usr/bin/git ] || xcode-select -p >/dev/null 2>&1; }; then git_bin=$g
else git_bin=""; fi
part() { if [ -f "$root/$1" ]; then cat "$root/$1"; else echo "$2"; fi; }

echo "# Workbench session brief (from the startup hook)"; echo
part .workbench/session-brief.md "(missing: .workbench/session-brief.md)"; echo
echo "## Our words (CONTEXT.md)"; part CONTEXT.md "(no shared words yet)"; echo
echo "## Project notes (.workbench/NOTES.md)"; part .workbench/NOTES.md "(missing: .workbench/NOTES.md)"; echo
echo "## Workbench version"; part .workbench/VERSION "(unknown)"; echo
echo "## Last save points"
if [ -n "$git_bin" ] && [ -d "$root/.workbench/history" ]; then
  g() { "$git_bin" --git-dir="$root/.workbench/history" --work-tree="$root" -c safe.directory='*' "$@"; }
  g log -5 --format='%ad  %s' --date=short 2>/dev/null || echo "(no save points yet)"
  echo; echo "Unsaved changed files right now: $(g status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
elif [ -d "$root/.workbench/snapshots" ]; then
  ls -1t "$root/.workbench/snapshots" | head -5
else
  echo "(no save points yet)"
fi
exit 0
