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
# .workbench/account holds `company` or `personal` (written by the AI after the first check).
# Only the plan type is read from the sign-in file; no token is ever printed.
function Get-PlanKind {
  $auth = Join-Path $env:USERPROFILE '.codex\auth.json'
  if ($env:CODEX_HOME) { $auth = Join-Path $env:CODEX_HOME 'auth.json' }
  $a = Get-Content -Raw -LiteralPath $auth | ConvertFrom-Json
  if (-not $a -or -not $a.tokens.id_token) { return 'unknown' }
  $part = ($a.tokens.id_token -split '\.')[1]
  if (-not $part) { return 'unknown' }
  $part = $part.Replace('-', '+').Replace('_', '/')
  switch ($part.Length % 4) { 2 { $part += '==' } 3 { $part += '=' } }
  $claims = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($part)) | ConvertFrom-Json
  $plan = [string]$claims.'https://api.openai.com/auth'.chatgpt_plan_type
  if (-not $plan) { return 'unknown' }
  if ($plan -match 'team|business|enterprise|edu|k12') { return 'company' }
  return 'personal'
}
$recorded = (Read-Part '.workbench/account' '').ToLower()
$current = Get-PlanKind
$open = ($recorded -eq 'personal') -or ($recorded -eq 'company' -and $current -eq 'company')
$withheld = @"
(withheld by the startup check: recorded account '$recorded', current account '$current')
Do not read CONTEXT.md or .workbench/NOTES.md yet. Follow "Account type" in .agents/skills/workbench/safety.md first.
"@

# Save points live in .workbench\history (see .workbench\scripts\git.cmd), not .git.
$git = Join-Path $root '.tools\git\cmd\git.exe'
if (-not (Test-Path -LiteralPath $git)) { $git = 'git' }
$gitArgs = @('--git-dir', (Join-Path $root '.workbench\history'), '--work-tree', $root, '-c', 'safe.directory=*')
$saves = (& $git @gitArgs log -5 --format='%ad  %s' --date=short 2>$null) -join "`n"
if (-not $saves) { $saves = '(no save points yet)' }
$unsaved = @(& $git @gitArgs status --porcelain 2>$null).Count

$words = if ($open) { Read-Part 'CONTEXT.md' '(no shared words yet)' } else { $withheld }
$notes = if ($open) { Read-Part '.workbench/NOTES.md' '(missing: .workbench/NOTES.md)' } else { $withheld }

@"
# Workbench session brief (from the startup hook)

$(Read-Part '.workbench/session-brief.md' '(missing: .workbench/session-brief.md)')

## ChatGPT account
Recorded for this project: $(if ($recorded) { $recorded } else { '(not checked yet)' }). Signed in now: $current.

## Our words (CONTEXT.md)
$words

## Project notes (.workbench/NOTES.md)
$notes

## Workbench version
$(Read-Part '.workbench/VERSION' '(unknown)')

## Last save points
$saves

Unsaved changed files right now: $unsaved
"@
exit 0
