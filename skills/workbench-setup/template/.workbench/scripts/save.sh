#!/bin/sh
# Makes a save point from an explicit list of permitted files, never from ignore rules.
#   sh .workbench/scripts/save.sh "<message in the user's words>"
#   sh .workbench/scripts/save.sh --list      shows what would be saved
# Uses git (history in .workbench/history) only when it is safe to run; otherwise copies the
# permitted files into .workbench/snapshots/<date>-<message>/.
root=$(cd "$(dirname "$0")/../.." && pwd)
cd "$root" || exit 1
# Each tool lives in tools/<name>/ (name: lowercase letters, digits, hyphens).
allowed='^(\.gitignore|\.gitattributes|AGENTS\.md)$
^\.codex/hooks\.json$
^\.codex/hooks/session-start\.(ps1|sh)$
^\.agents/skills/workbench/[A-Za-z0-9_./-]+\.(md|ts|tsx|mts|mjs|css|html|jsonc|txt)$
^\.agents/skills/workbench/starters/[a-z0-9-]+/(package|package-lock|tsconfig|components)\.json$
^\.agents/skills/workbench/starters/web/public/[A-Za-z0-9_./-]+\.json$
^\.workbench/scripts/(bootstrap\.ps1|run\.cmd|git\.cmd|save\.ps1|save\.sh|try\.ps1|data-map\.ps1|account\.ps1|account\.sh)$
^\.workbench/(session-brief\.md|NOTES\.md|VERSION|account)$
^tools/[a-z0-9-]+/(NOTES|CONTEXT)\.md$
^tools/[a-z0-9-]+/app/(package\.json|package-lock\.json|tsconfig\.json|index\.html|build\.mjs|forge\.config\.ts|forge\.env\.d\.ts|vite\.config\.ts|wrangler\.jsonc|components\.json|README\.md)$
^tools/[a-z0-9-]+/app/vite\.(main|preload|renderer)\.config\.mts$
^tools/[a-z0-9-]+/app/src/[A-Za-z0-9_./-]+\.(ts|tsx|mts|mjs|css|html)$
^tools/[a-z0-9-]+/app/test/[A-Za-z0-9_./-]+\.(ts|mjs)$
^tools/[a-z0-9-]+/app/scripts/[A-Za-z0-9_.-]+\.mjs$
^tools/[a-z0-9-]+/app/public/[A-Za-z0-9_./-]+\.(txt|xml|json|svg|png|jpg|jpeg|webp|ico|webmanifest)$'

list() {
  { find . -maxdepth 1 -type f
    for d in .codex .codex/hooks .workbench .workbench/scripts tools/*/ tools/*/app tools/*/app/scripts; do [ -d "$d" ] && find "$d" -maxdepth 1 -type f; done
    for d in .agents/skills/workbench tools/*/app/src tools/*/app/test tools/*/app/public; do [ -d "$d" ] && find "$d" -type f -not -path '*/node_modules/*'; done
  } | sed 's|^\./||; s|//|/|g' | grep -v '\(^\|/\)\.env' | grep -E "$allowed" | sort -u
}

if [ "$1" = "--list" ]; then list; exit 0; fi
[ -n "$1" ] || { echo "Give the save point a message in the user's words." >&2; exit 1; }

if [ -x .tools/git/bin/git ]; then g=.tools/git/bin/git
elif c=$(command -v git) && { [ "$c" != /usr/bin/git ] || xcode-select -p >/dev/null 2>&1; }; then g=$c
else g=""; fi

if [ -n "$g" ]; then
  G() { "$g" --git-dir=.workbench/history --work-tree=. -c safe.directory='*' -c user.name=Workbench -c user.email=workbench@localhost "$@"; }
  [ -d .workbench/history ] || G init -q -b main
  list > .workbench/save-list.tmp
  G read-tree --empty && G add -f --pathspec-from-file=.workbench/save-list.tmp && G commit -q --allow-empty -m "$1"
  rc=$?; rm -f .workbench/save-list.tmp; [ $rc = 0 ] || exit $rc
else
  dest=".workbench/snapshots/$(date +%Y-%m-%d-%H%M)-$(printf '%s' "$1" | tr -c 'A-Za-z0-9 _-' '_' | cut -c1-40)"
  list | while IFS= read -r f; do mkdir -p "$dest/$(dirname "$f")" && cp -p "$f" "$dest/$f"; done
fi
echo "Saved: $1"
