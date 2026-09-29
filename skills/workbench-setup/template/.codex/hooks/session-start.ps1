# SessionStart hook (Windows). Needs only Windows PowerShell 5.1: no Node, no Python.
# Plain text on stdout becomes context for the AI only; the user never sees it.
# Keep this file's behaviour in the files it reads: editing .codex/hooks.json forces a new review.
$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false

$root = (Get-Location).Path
function Read-Part($rel, $whenMissing) {
  $p = Join-Path $root $rel
  if (Test-Path -LiteralPath $p) { (Get-Content -Raw -Encoding UTF8 -LiteralPath $p).Trim() } else { $whenMissing }
}

# Account gate, checked here before any project notes reach the AI.
# .workbench/account holds `personal <id>` or `company <id>`, written by the AI from
# .workbench\scripts\account.ps1, which reads the current sign-in (never a token).
$current = 'unknown'
$helper = Join-Path $root '.workbench\scripts\account.ps1'
if (Test-Path -LiteralPath $helper) { . $helper; $current = Get-AccountKind }
$recorded = ((Read-Part '.workbench/account' '') -replace '\s+', ' ').Trim().ToLower()
# Open only for the very same account; `unverified` projects (sign-in kept in the keyring, so no
# account can be read) open only while it still can't be read.
$open = ($current -ne 'unknown' -and $recorded -eq $current) -or ($recorded -eq 'unverified' -and $current -eq 'unknown')
$withheld = @"
(withheld by the startup check: recorded account '$recorded', current account '$current')
Do not read .workbench/NOTES.md or any tool's NOTES.md or CONTEXT.md yet. Follow "Account type" in .agents/skills/workbench/safety.md first.
"@

# The tool worked on last: "Last worked on: <folder>" in .workbench/NOTES.md, a folder in tools/.
$last = ''
if ($open) {
  foreach ($line in ((Read-Part '.workbench/NOTES.md' '') -split "`r?`n")) {
    if ($line -cmatch '^Last worked on:\s*([a-z0-9-]+)\s*$') {
      if (Test-Path -LiteralPath (Join-Path $root "tools\$($Matches[1])") -PathType Container) { $last = $Matches[1] }
      break
    }
  }
}

# Save points live in .workbench\history (see .workbench\scripts\git.cmd), not .git.
$git = Join-Path $root '.tools\git\cmd\git.exe'
if (-not (Test-Path -LiteralPath $git)) { $git = 'git' }
$gitArgs = @('--git-dir', (Join-Path $root '.workbench\history'), '--work-tree', $root, '-c', 'safe.directory=*')
$saves = (& $git @gitArgs log -5 --format='%ad  %s' --date=short 2>$null) -join "`n"
if (-not $saves) { $saves = '(no save points yet)' }
$unsaved = @(& $git @gitArgs status --porcelain 2>$null).Count

$project = if ($open) { Read-Part '.workbench/NOTES.md' '(missing: .workbench/NOTES.md)' } else { $withheld }
$toolPart = if (-not $open) { $withheld }
  elseif (-not $last) { '(no tool worked on yet)' }
  else {
@"
### Our words (tools/$last/CONTEXT.md)
$(Read-Part "tools/$last/CONTEXT.md" '(no shared words yet)')

### Its notes (tools/$last/NOTES.md)
$(Read-Part "tools/$last/NOTES.md" "(missing: tools/$last/NOTES.md)")
"@
  }

@"
# Workbench session brief (from the startup hook)

$(Read-Part '.workbench/session-brief.md' '(missing: .workbench/session-brief.md)')

## ChatGPT account
Recorded for this project: $(if ($recorded) { $recorded } else { '(not checked yet)' }). Signed in now: $current.

## This project's tools (.workbench/NOTES.md)
$project

## The tool worked on last: $(if ($last) { $last } else { '(none)' })
$toolPart

## Workbench version
$(Read-Part '.workbench/VERSION' '(unknown)')

## Last save points
$saves

Unsaved changed files right now: $unsaved
"@
exit 0
