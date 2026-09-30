# Updates this project's workbench to the latest release in one go (Windows).
#   powershell -NoProfile -ExecutionPolicy Bypass -File .workbench\scripts\update.ps1 [-CheckOnly]
# It needs the network and writes .agents\ and .codex\, which Codex's sandbox protects: run it once,
# with approval. Only the workbench's own files change; tools\, notes, history, .tools and data are never
# touched. Downloads only from the source in .workbench\VERSION, at the exact commit of its latest release.
# Keeps a copy of the old files and a save point first; if anything fails, it puts everything back.
# Exit: 0 updated or already up to date; 1 failed (and undone); 3 old one-tool layout (see update.md).
param([switch]$CheckOnly)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
function P([string]$rel) { Join-Path $root $rel }
$owned = @('.agents\skills\workbench', '.agents\skills\impeccable', '.impeccable\config.json', '.workbench\scripts',
  '.workbench\session-brief.md', '.codex\hooks', '.codex\hooks.json', 'AGENTS.md', '.gitignore', '.gitattributes', '.workbench\VERSION')
function Get-Json([string]$url) {
  $text = curl.exe -fsSL $url
  if ($LASTEXITCODE -ne 0) { throw "Could not download $url (no network here, or it's blocked)." }
  ($text -join "`n") | ConvertFrom-Json
}

# 1. Which release.
$verLines = Get-Content -LiteralPath (P '.workbench\VERSION')
$current = (($verLines | Where-Object { $_ -match '^version:' }) -replace '^version:\s*', '').Trim()
$source = (($verLines | Where-Object { $_ -match '^source:' }) -replace '^source:\s*', '').Trim()
if ($source -notmatch '^[\w.-]+/[\w.-]+$') { throw "VERSION names no valid source: '$source'." }
$tag = (Get-Json "https://api.github.com/repos/$source/releases/latest").tag_name
$new = "$tag" -replace '^v', ''
if ($new -notmatch '^\d+\.\d+\.\d+$') { throw "Unexpected release tag '$tag'." }
if ([version]$new -le [version]$current) { "UP_TO_DATE: this project has workbench $current, the latest."; exit 0 }
if ($CheckOnly) { "AVAILABLE: workbench $new (this project has $current)."; exit 0 }
if ((Test-Path -LiteralPath (P 'app\package.json')) -and -not (Test-Path -LiteralPath (P 'tools'))) {
  'OLD_LAYOUT: this project still has its one tool in app\. Move it into tools\<name>\ first (update.md), then run this again.'
  exit 3
}
$sha = (Get-Json "https://api.github.com/repos/$source/commits/$tag").sha
if ($sha -notmatch '^[0-9a-f]{40}$') { throw "Could not find the commit of $tag." }

# 2. Download that exact commit (a tag can move; the commit can't).
$work = P '.workbench\update'
if (Test-Path -LiteralPath $work) { Remove-Item -LiteralPath $work -Recurse -Force }
New-Item -ItemType Directory -Force -Path $work | Out-Null
$zip = Join-Path $work 'release.zip'
curl.exe -fsSL -o $zip "https://github.com/$source/archive/$sha.zip"
if ($LASTEXITCODE -ne 0) { throw "Could not download release $new." }
tar -xf $zip -C $work
if ($LASTEXITCODE -ne 0) { throw 'Could not unpack the release.' }
$top = Get-ChildItem -LiteralPath $work -Directory | Select-Object -First 1
$tpl = Join-Path $top.FullName 'skills\workbench-setup\template'
$tplVersion = ((Get-Content -LiteralPath (Join-Path $tpl '.workbench\VERSION') | Where-Object { $_ -match '^version:' }) -replace '^version:\s*', '').Trim()
if ($tplVersion -ne $new) { throw "The release says $tplVersion inside, not ${new}; not applied." }

# 3. A way back the update can't touch: a copy of every owned path, and a save point.
$before = Join-Path $work 'before'
foreach ($o in $owned) {
  $src = P $o
  if (-not (Test-Path -LiteralPath $src)) { continue }
  $dst = Join-Path $before $o
  New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
  Copy-Item -LiteralPath $src -Destination $dst -Recurse -Force
}
& powershell -NoProfile -ExecutionPolicy Bypass -File (P '.workbench\scripts\save.ps1') "before updating the workbench to $new" | Out-Null
if ($LASTEXITCODE -ne 0) { Remove-Item -LiteralPath $work -Recurse -Force; throw 'Could not make the save point before updating; nothing was changed.' }
$hooksChanged = $true
if (Test-Path -LiteralPath (P '.codex\hooks.json')) {
  $hooksChanged = (Get-FileHash -LiteralPath (P '.codex\hooks.json')).Hash -ne (Get-FileHash -LiteralPath (Join-Path $tpl '.codex\hooks.json')).Hash
}

function Restore-Before {
  foreach ($o in $owned) {
    $dst = P $o; $b = Join-Path $before $o
    if (Test-Path -LiteralPath $dst) { Remove-Item -LiteralPath $dst -Recurse -Force }
    if (Test-Path -LiteralPath $b) {
      New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
      Copy-Item -LiteralPath $b -Destination $dst -Recurse -Force
    }
  }
  foreach ($f in Get-ChildItem -LiteralPath $before -Recurse -File) {
    $rel = $f.FullName.Substring($before.Length).TrimStart('\')
    if ((Get-FileHash -LiteralPath (P $rel)).Hash -ne (Get-FileHash -LiteralPath $f.FullName).Hash) { throw "Could not restore $rel; the old copy is in $before." }
  }
}

try {
  # 4. Replace the owned files (whole folders, so files the release removed are gone too).
  foreach ($o in $owned) {
    if ($o -in @('.gitignore', '.gitattributes', '.workbench\VERSION')) { continue }
    $dst = P $o; $src = Join-Path $tpl $o
    if (Test-Path -LiteralPath $dst) { Remove-Item -LiteralPath $dst -Recurse -Force }
    if (Test-Path -LiteralPath $src) {
      New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
      Copy-Item -LiteralPath $src -Destination $dst -Recurse -Force
    }
  }
  # .gitignore / .gitattributes: the new file, plus lines this project added to the old one.
  foreach ($f in '.gitignore', '.gitattributes') {
    $newLines = @(Get-Content -LiteralPath (Join-Path $tpl $f))
    $oldLines = if (Test-Path -LiteralPath (Join-Path $before $f)) { @(Get-Content -LiteralPath (Join-Path $before $f)) } else { @() }
    $oldTemplate = $null
    $raw = curl.exe -fsSL "https://raw.githubusercontent.com/$source/v$current/skills/workbench-setup/template/$f"
    if ($LASTEXITCODE -eq 0) { $oldTemplate = @($raw) }
    $extra = @($oldLines | Where-Object { $_.Trim() -and $newLines -notcontains $_ -and ($null -eq $oldTemplate -or $oldTemplate -notcontains $_) })
    $out = $newLines
    if ($extra.Count -gt 0) { $out = $newLines + @('', '# Kept from this project') + $extra }
    [IO.File]::WriteAllText((P $f), (($out -join "`n") + "`n"), (New-Object Text.UTF8Encoding($false)))
  }
  # 5. Check the new version starts: the startup check prints the brief, and save points still work.
  Push-Location $root
  try { $brief = & powershell -NoProfile -ExecutionPolicy Bypass -File (P '.codex\hooks\session-start.ps1') 2>$null | Out-String } finally { Pop-Location }
  if ($brief -notmatch 'Workbench session brief') { throw 'The new startup check did not print the brief.' }
  & cmd /c "`"$(P '.workbench\scripts\git.cmd')`" log -1 --format=%h" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Save points did not work with the new version.' }
} catch {
  $why = $_.Exception.Message
  Restore-Before
  "FAILED_AND_UNDONE: $why Everything is back as it was (workbench $current)."
  exit 1
}

# 6. The design engine the new version pins (the update removed the old one with its folder).
if (Test-Path -LiteralPath (P '.tools')) {
  & powershell -NoProfile -ExecutionPolicy Bypass -File (P '.workbench\scripts\bootstrap.ps1') | Out-Null
  if ($LASTEXITCODE -ne 0) { 'NOTE: the design engine could not be downloaded now; bootstrap.ps1 will fetch it next time.' }
}

# 7. Finish: VERSION last, then a save point.
$date = ((Get-Content -LiteralPath (Join-Path $tpl '.workbench\VERSION') | Where-Object { $_ -match '^date:' }) -replace '^date:\s*', '').Trim()
[IO.File]::WriteAllText((P '.workbench\VERSION'), "version: $new`ndate: $date`nsource: $source`ncommit: $sha`n", (New-Object Text.UTF8Encoding($false)))
& powershell -NoProfile -ExecutionPolicy Bypass -File (P '.workbench\scripts\save.ps1') "Updated the workbench to $new" | Out-Null

# What changed, in the release's own plain words.
$changes = Get-Content -LiteralPath (Join-Path $top.FullName 'CHANGES.md')
$take = $false
$notes = foreach ($l in $changes) {
  if ($l -match '^## (\d+\.\d+\.\d+)') { $v = [version]$Matches[1]; $take = ($v -gt [version]$current -and $v -le [version]$new); continue }
  if ($take -and $l -match '^- ') { $l }
}
Remove-Item -LiteralPath $work -Recurse -Force
"UPDATED: workbench $current -> $new (commit $($sha.Substring(0, 7)))."
if ($hooksChanged) { 'HOOKS_CHANGED: Codex will ask to review the startup check again.' }
'WHAT_CHANGED:'
$notes
