#!/bin/sh
# SessionStart hook (macOS/Linux). Plain text on stdout becomes context for the AI only.
# Never touch /usr/bin/git unless the Command Line Tools exist: the stub pops an admin installer.
root=$(pwd)
part() { if [ -f "$root/$1" ]; then cat "$root/$1"; else echo "$2"; fi; }

# Account gate, checked here before any project notes reach the AI.
# .workbench/account holds `company` or `personal`. Only the plan type is read; no token is printed.
plan_kind() {
  auth="${CODEX_HOME:-$HOME/.codex}/auth.json"
  [ -f "$auth" ] || { echo unknown; return; }
  tok=$(sed -n 's/.*"id_token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$auth" | head -n 1)
  p=$(printf '%s' "$tok" | cut -d. -f2 | tr '_-' '/+')
  case $(( ${#p} % 4 )) in 2) p="$p==" ;; 3) p="$p=" ;; esac
  claims=$(printf '%s' "$p" | base64 -d 2>/dev/null || printf '%s' "$p" | base64 -D 2>/dev/null)
  plan=$(printf '%s' "$claims" | sed -n 's/.*"chatgpt_plan_type"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
  case "$plan" in
    "") echo unknown ;;
    *team*|*business*|*enterprise*|*edu*|*k12*) echo company ;;
    *) echo personal ;;
  esac
}
recorded=""; [ -f "$root/.workbench/account" ] && recorded=$(tr -d ' \r\n' < "$root/.workbench/account" | tr 'A-Z' 'a-z')
current=$(plan_kind)
if [ "$recorded" = personal ] || { [ "$recorded" = company ] && [ "$current" = company ]; }; then open=1; else open=0; fi
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
