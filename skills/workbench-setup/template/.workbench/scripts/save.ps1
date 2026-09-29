# Makes a save point from an explicit list of permitted files, never from ignore rules
# (a .gitignore anywhere in the project could otherwise let documents or secrets in).
# The save point holds exactly the permitted files that exist now; everything else is left out.
#   powershell -NoProfile -ExecutionPolicy Bypass -File .workbench\scripts\save.ps1 "<message in the user's words>"
#   ... save.ps1 -List    shows what would be saved, saves nothing
param([string]$Message, [switch]$List)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$git = Join-Path $PSScriptRoot 'git.cmd'

# The permitted files, as paths relative to the project with forward slashes.
$allowed = @(
  '^(\.gitignore|\.gitattributes|AGENTS\.md|CONTEXT\.md)$'
  '^\.codex/hooks\.json$'
  '^\.codex/hooks/session-start\.(ps1|sh)$'
  '^\.agents/skills/workbench/[\w./-]+\.(md|ts|mts|mjs|css|html)$'
  '^\.agents/skills/workbench/starter/(package|package-lock|tsconfig)\.json$'
  '^\.workbench/scripts/(bootstrap\.ps1|run\.cmd|git\.cmd|save\.ps1|save\.sh|account\.ps1|account\.sh)$'
  '^\.workbench/(session-brief\.md|NOTES\.md|VERSION|account)$'
  '^app/(package\.json|package-lock\.json|tsconfig\.json|index\.html|forge\.config\.ts|forge\.env\.d\.ts|README\.md)$'
  '^app/vite\.(main|preload|renderer)\.config\.mts$'
  '^app/src/[\w./-]+\.(ts|css|html)$'
  '^app/test/[\w./-]+\.(ts|mjs)$'
)
# Only these places are searched (never node_modules, builds, tools or data).
$places = @('.', '.codex', '.codex\hooks', '.agents\skills\workbench', '.workbench', '.workbench\scripts', 'app', 'app\src', 'app\test')
$recurse = @('.agents\skills\workbench', 'app\src', 'app\test')

$files = foreach ($place in $places) {
  $dir = Join-Path $root $place
  if (-not (Test-Path -LiteralPath $dir -PathType Container)) { continue }
  $items = if ($recurse -contains $place) { Get-ChildItem -LiteralPath $dir -File -Recurse -Force } else { Get-ChildItem -LiteralPath $dir -File -Force }
  foreach ($f in $items) {
    $rel = $f.FullName.Substring($root.Length).TrimStart('\').Replace('\', '/')
    if ($rel -match '/node_modules/|(^|/)\.env') { continue }
    foreach ($re in $allowed) { if ($rel -match $re) { $rel; break } }
  }
}
$files = $files | Sort-Object -Unique
if ($List) { $files; exit 0 }
if (-not $Message) { throw 'Give the save point a message in the user''s words.' }

# Rebuild the index from exactly this list, so nothing else can be in the save point.
$listFile = Join-Path $root '.workbench\save-list.tmp'
[IO.File]::WriteAllText($listFile, (($files -join "`0") + "`0"))
try {
  & $git read-tree --empty
  if ($LASTEXITCODE -ne 0) { throw 'Could not prepare the save point.' }
  & $git add -f --pathspec-from-file="$listFile" --pathspec-file-nul
  if ($LASTEXITCODE -ne 0) { throw 'Could not add the files.' }
  & $git commit -q --allow-empty -m $Message
  if ($LASTEXITCODE -ne 0) { throw 'Could not make the save point.' }
} finally { Remove-Item -LiteralPath $listFile -ErrorAction SilentlyContinue }
"Saved $($files.Count) files: $Message"
