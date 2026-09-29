#!/bin/sh
# SessionStart hook (macOS/Linux). Plain text on stdout becomes context for the AI only.
# Never touch /usr/bin/git unless the Command Line Tools exist: the stub pops an admin installer.
root=$(pwd)
part() { if [ -f "$root/$1" ]; then cat "$root/$1"; else echo "$2"; fi; }

# Account gate, checked here before any project notes reach the AI.
# .workbench/account holds `personal` or `company <id>`, written by the AI from
# .workbench/scripts/account.sh, which reads the current sign-in (never a token).
current=unknown
if [ -f "$root/.workbench/scripts/account.sh" ]; then . "$root/.workbench/scripts/account.sh"; current=$(account_kind); fi
recorded=""; [ -f "$root/.workbench/account" ] && recorded=$(tr -s ' \t\r\n' ' ' < "$root/.workbench/account" | sed 's/^ *//; s/ *$//' | tr 'A-Z' 'a-z')
# Open only for the very same account; `unverified` projects (sign-in in the keyring) only while
# no account can be read.
open=0
if [ "$current" != unknown ] && [ "$recorded" = "$current" ]; then open=1; fi
if [ "$recorded" = unverified ] && [ "$current" = unknown ]; then open=1; fi
withheld="(withheld by the startup check: recorded account '$recorded', current account '$current')
Do not read CONTEXT.md or .workbench/NOTES.md yet. Follow \"Account type\" in .agents/skills/workbench/safety.md first."

if [ -x "$root/.tools/git/bin/git" ]; then git_bin="$root/.tools/git/bin/git"
elif g=$(command -v git) && { [ "$g" != /usr/bin/git ] || xcode-select -p >/dev/null 2>&1; }; then git_bin=$g
else git_bin=""; fi

echo "# Workbench session brief (from the startup hook)"; echo
part .workbench/session-brief.md "(missing: .workbench/session-brief.md)"; echo
echo "## ChatGPT account"
echo "Recorded for this project: ${recorded:-(not checked yet)}. Signed in now: $current."; echo
echo "## Our words (CONTEXT.md)"
if [ $open = 1 ]; then part CONTEXT.md "(no shared words yet)"; else echo "$withheld"; fi; echo
echo "## Project notes (.workbench/NOTES.md)"
if [ $open = 1 ]; then part .workbench/NOTES.md "(missing: .workbench/NOTES.md)"; else echo "$withheld"; fi; echo
echo "## Workbench version"; part .workbench/VERSION "(unknown)"; echo
echo "## Last save points"
if [ -n "$git_bin" ] && [ -d "$root/.workbench/history" ]; then
  g() { "$git_bin" --git-dir="$root/.workbench/history" --work-tree="$root" -c safe.directory='*' "$@"; }
  g log -5 --format='%ad  %s' --date=short 2>/dev/null || echo "(no save points yet)"
  echo; echo "Unsaved changed files right now: $(g status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
elif [ -d "$root/.workbench/snapshots" ]; then
  ls -1t "$root/.workbench/snapshots" | head -n 5
else
  echo "(no save points yet)"
fi
exit 0
