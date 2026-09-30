# Makes a tool's data map: tools\<tool>\sketches\data-map.html, drawn from the tables under
# "### Where it goes" in tools\<tool>\NOTES.md. Needs nothing but Windows PowerShell (works before any
# build tools are downloaded). Prints the path; open it for the user.
#   powershell -NoProfile -ExecutionPolicy Bypass -File .workbench\scripts\data-map.ps1 <tool>
param([Parameter(Mandatory = $true)][string]$Tool)
$ErrorActionPreference = 'Stop'
if ($Tool -notmatch '^[a-z0-9-]+$') { throw "Tool names are lowercase letters, digits and dashes: $Tool" }

$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$toolDir = Join-Path $root "tools\$Tool"
$notesFile = Join-Path $toolDir 'NOTES.md'
if (-not (Test-Path -LiteralPath $notesFile)) { throw "tools\$Tool has no NOTES.md." }
$notes = [IO.File]::ReadAllText($notesFile)
if ($notes -notmatch '(?m)^###\s+Where it goes') { throw 'NOTES.md has no "### Where it goes" block under "## Data" yet.' }
$name = [regex]::Match($notes, '(?m)^# Notes:\s*(.+?)\s*$').Groups[1].Value
if (-not $name) { $name = $Tool }

$page = [IO.File]::ReadAllText((Join-Path $root '.agents\skills\workbench\data-map.html'))
# Base64, so nothing in the notes can end the script element or be read as HTML.
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($notes))
$page = $page.Replace('__NOTES_BASE64__', $b64).Replace('__TOOL_NAME__', [Net.WebUtility]::HtmlEncode($name))

$out = Join-Path $toolDir 'sketches\data-map.html'
New-Item -ItemType Directory -Force -Path (Split-Path $out) | Out-Null
[IO.File]::WriteAllText($out, $page, (New-Object Text.UTF8Encoding($false)))
$out
