# SessionStart hook (Windows). Needs only Windows PowerShell 5.1: no Node, no Python.
# Plain text on stdout becomes context for the AI only; the user never sees it.
# Keep this file's behaviour in the files it reads: editing .codex/hooks.json forces a new review.
$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false

$root = (Get-Location).Path
$git = Join-Path $root '.tools\git\cmd\git.exe'
if (-not (Test-Path -LiteralPath $git)) { $git = 'git' }
function Read-Part($rel, $whenMissing) {
  $p = Join-Path $root $rel
  if (Test-Path -LiteralPath $p) { (Get-Content -Raw -Encoding UTF8 -LiteralPath $p).Trim() } else { $whenMissing }
}
# Save points live in .workbench\history (see .workbench\scripts\git.cmd), not .git.
$gitArgs = @('--git-dir', (Join-Path $root '.workbench\history'), '--work-tree', $root, '-c', 'safe.directory=*')
$saves = (& $git @gitArgs log -5 --format='%ad  %s' --date=short 2>$null) -join "`n"
if (-not $saves) { $saves = '(no save points yet)' }
$unsaved = @(& $git @gitArgs status --porcelain 2>$null).Count

@"
# Workbench session brief (from the startup hook)

$(Read-Part '.workbench/session-brief.md' '(missing: .workbench/session-brief.md)')

## Our words (CONTEXT.md)
$(Read-Part 'CONTEXT.md' '(no shared words yet)')

## Project notes (.workbench/NOTES.md)
$(Read-Part '.workbench/NOTES.md' '(missing: .workbench/NOTES.md)')

## Workbench version
$(Read-Part '.workbench/VERSION' '(unknown)')

## Last save points
$saves

Unsaved changed files right now: $unsaved
"@
exit 0
