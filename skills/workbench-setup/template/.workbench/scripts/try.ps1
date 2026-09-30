# Opens the new version of a tool as a "trying-out" copy, next to the version the user has in use.
#   powershell -NoProfile -ExecutionPolicy Bypass -File .workbench\scripts\try.ps1 <tool>
# Electron: copies the packaged build to tools\<tool>\trying-out\ (so packaging again never collides with an
#   open trial), makes a fresh practice copy of the real data in %TEMP%\workbench-trying-out\<TOOL_ID>\data
#   (Temp because Codex's sandbox can write there, not in %LOCALAPPDATA%) and starts the copy on it
#   (its window title says "trying out", it has its own profile; tools\<tool>\current is never touched).
# One HTML file: builds out\<title> (trying out).html (own practice storage) and opens it.
# Website: says how to preview; starts nothing.
# Always ends with the versions to record under "Built with" in the tool's NOTES.
param([Parameter(Mandatory = $true)][string]$Tool)
$ErrorActionPreference = 'Stop'
if ($Tool -notmatch '^[a-z0-9-]+$') { throw "Tool names are lowercase letters, digits and dashes: $Tool" }

$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$toolDir = Join-Path $root "tools\$Tool"
$app = Join-Path $toolDir 'app'
$run = Join-Path $PSScriptRoot 'run.cmd'
if (-not (Test-Path -LiteralPath (Join-Path $app 'package.json'))) { throw "tools\$Tool\app has no app yet." }

function Get-LockVersion($name) {
  # Windows PowerShell 5.1 can't ConvertFrom-Json a lockfile (its root package has an empty key).
  $lockFile = Join-Path $app 'package-lock.json'
  if (-not (Test-Path -LiteralPath $lockFile)) { return $null }
  $m = [regex]::Match((Get-Content -Raw -LiteralPath $lockFile), '"node_modules/' + [regex]::Escape($name) + '":\s*\{\s*"version":\s*"([^"]+)"')
  if ($m.Success) { return $m.Groups[1].Value } else { return $null }
}

$isWeb = Test-Path -LiteralPath (Join-Path $app 'wrangler.jsonc')
$isHtml = (Test-Path -LiteralPath (Join-Path $app 'build.mjs')) -and -not (Test-Path -LiteralPath (Join-Path $app 'forge.config.ts'))
$did = ''

if ($isWeb) {
  'A website is tried out with the local preview (this computer only): from the app folder,'
  '  run.cmd npm.cmd run build, then run.cmd npm.cmd run preview (http://127.0.0.1:4173); stop it when done.'
  'The live site is the version in use; only a deploy changes it.'
  $did = 'website preview'
} elseif ($isHtml) {
  Push-Location $app
  try { & cmd /c "`"$run`" node build.mjs --try"; if ($LASTEXITCODE -ne 0) { throw 'The build failed (see above).' } } finally { Pop-Location }
  $page = Get-ChildItem -LiteralPath (Join-Path $app 'out') -Filter '*(trying out).html' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  Start-Process -FilePath $page.FullName
  "Opened $($page.Name) in the browser. It keeps its own practice data; the copy in tools\$Tool\current is unchanged."
  $did = 'trying-out page opened'
} else {
  $main = Get-Content -Raw -LiteralPath (Join-Path $app 'src\main.ts')
  $toolId = [regex]::Match($main, "const TOOL_ID = '([^']+)'").Groups[1].Value
  if (-not $toolId -or $toolId -eq 'set-when-copied') { throw 'src\main.ts needs its real TOOL_ID first.' }
  if ($main -notmatch 'ON_A_COPY') { throw 'This tool is from before 0.2.4: copy the ON_A_COPY lines from the starter''s main.ts into src\main.ts first (stack.md, "In use and trying out"), then package again.' }
  $exeName = [regex]::Match((Get-Content -Raw -LiteralPath (Join-Path $app 'forge.config.ts')), "executableName:\s*'([^']+)'").Groups[1].Value
  $exe = Get-ChildItem -Path (Join-Path $app "out\*-win32-x64\$exeName.exe") -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $exe) { throw 'No packaged build yet: run.cmd npm.cmd run package first.' }
  $newest = Get-ChildItem -Recurse -File -LiteralPath (Join-Path $app 'src') | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($newest.LastWriteTime -gt $exe.LastWriteTime) { throw "The build is older than the code ($($newest.Name) changed since): run.cmd npm.cmd run package first." }

  # Close the previous trying-out copy: anything running from tools\<tool>\trying-out or app\out only ever
  # had practice data (the version in use runs from current\). Get-Process, not WMI: Codex's sandbox
  # refuses WMI queries. A lookup that fails never stops the script.
  $trialApp = Join-Path $toolDir 'trying-out'
  $dirs = @(($trialApp + '\'), ((Join-Path $app 'out') + '\'))
  $old = @()
  try { $old = @(Get-Process -ErrorAction SilentlyContinue | Where-Object { $p = $_.Path; $p -and @($dirs | Where-Object { $p.StartsWith($_, [StringComparison]::OrdinalIgnoreCase) }).Count -gt 0 }) } catch { }
  if ($old.Count -gt 0) {
    $old | ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 2
    'Closed the previous trying-out copy (it only had practice data).'
  }
  try { if (Test-Path -LiteralPath $trialApp) { Remove-Item -LiteralPath $trialApp -Recurse -Force } }
  catch { throw 'The previous trying-out window is still open and could not be closed from here: ask the user to close the window whose title says "trying out", then run this again.' }
  Copy-Item -LiteralPath $exe.Directory.FullName -Destination $trialApp -Recurse
  $trialExe = Join-Path $trialApp $exe.Name
  $tryRoot = Join-Path $env:TEMP "workbench-trying-out\$toolId"
  $realData = Join-Path $env:LOCALAPPDATA "WorkbenchTools\$toolId\data"
  if (Test-Path -LiteralPath (Join-Path $app 'src\data-safety-cli.mjs')) {
    # A consistent copy even while the version in use has its database open.
    Push-Location $app
    try {
      $env:WORKBENCH_DATA_DIR = $null
      $out = & cmd /c "`"$run`" node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --disable-warning=ExperimentalWarning src\data-safety-cli.mjs practice 2>&1"
      if ($LASTEXITCODE -ne 0) { throw ($out -join "`n") }
      $practice = ($out | Select-Object -Last 1).ToString().Trim()
    } finally { Pop-Location }
  } else {
    try { if (Test-Path -LiteralPath $tryRoot) { Remove-Item -LiteralPath $tryRoot -Recurse -Force } }
    catch { throw "Could not replace the old practice copy ($($_.Exception.Message)). If a window titled ""trying out"" is open, ask the user to close it, then run this again." }
    $practice = Join-Path $tryRoot 'data'
    if (Test-Path -LiteralPath $realData) { Copy-Item -LiteralPath $realData -Destination $practice -Recurse }
    else { New-Item -ItemType Directory -Force -Path $practice | Out-Null }
  }
  $env:WORKBENCH_DATA_DIR = $practice
  try { $p = Start-Process -FilePath $trialExe -PassThru } finally { Remove-Item Env:WORKBENCH_DATA_DIR -ErrorAction SilentlyContinue }
  "Started the trying-out copy (process $($p.Id)) from tools\$Tool\trying-out on a fresh practice copy of the data: $practice"
  "Its window title says 'trying out'. The version in use (tools\$Tool\current) and the real data were not touched."
  $did = 'trying-out copy started'
}

# Versions, written into the tool's NOTES under "Built with" so it can be rebuilt the same way later.
$node = & (Join-Path $root '.tools\node\node.exe') -v 2>$null
$wb = ((Get-Content -LiteralPath (Join-Path $root '.workbench\VERSION')) -match '^version:') -replace '^version:\s*', ''
$pinned = @(foreach ($pkg in 'electron', 'wrangler', 'vite', '@openai/codex') { $v = Get-LockVersion $pkg; if ($v) { "$pkg $v" } }) -join ', '
$model = $null
$aiRead = Join-Path $app 'src\ai-read.ts'
if (Test-Path -LiteralPath $aiRead) { $model = [regex]::Match((Get-Content -Raw -LiteralPath $aiRead), "AI_MODEL\s*=\s*'([^']+)'").Groups[1].Value }
$kind = if ($isWeb) { 'website (starters/web)' } elseif ($isHtml) { 'one HTML file (starters/html)' } else { 'Electron (starters/electron)' }
$blocks = @(foreach ($b in @(@('data-safety.ts', 'data-safety'), @('sheet.ts', 'excel'), @('ai-read.ts', 'ai-read'))) { if (Test-Path -LiteralPath (Join-Path $app "src\$($b[0])")) { $b[1] } }) -join ', '
$always = [ordered]@{
  'Node.js'      = $node
  'Pinned'       = $(if ($pinned) { "$pinned; every package: app\package-lock.json" } else { 'every package: app\package-lock.json' })
  'AI model'     = $(if ($model) { $model } else { 'none' })
  'Last checked' = "$(Get-Date -Format 'yyyy-MM-dd'), Windows $([Environment]::OSVersion.Version), $did"
}
# Only filled when empty: where the tool came from can't be seen later, so the first record stands.
$ifEmpty = [ordered]@{
  'Starter' = "$kind, workbench $wb or earlier"
  'Blocks'  = $(if ($blocks) { "$blocks, workbench $wb or earlier" } else { 'none' })
}
$notes = Join-Path $toolDir 'NOTES.md'
if (Test-Path -LiteralPath $notes) {
  $text = [IO.File]::ReadAllText($notes)
  $nl = if ($text -match "`r`n") { "`r`n" } else { "`n" }
  $ls = [Collections.Generic.List[string]]($text -split "`r?`n")
  $start = $ls.IndexOf('## Built with')
  if ($start -lt 0) {
    $at = $ls.IndexOf('## Things that work'); if ($at -lt 0) { $at = $ls.Count }
    $ls.InsertRange($at, [string[]]@('## Built with', '(Exact versions, so this tool can be rebuilt the same way later.)', ''))
    $start = $at
  }
  $end = $start + 1; while ($end -lt $ls.Count -and -not $ls[$end].StartsWith('## ')) { $end++ }
  foreach ($pair in @(@($always, $true), @($ifEmpty, $false))) {
    foreach ($label in $pair[0].Keys) {
      $line = "${label}: $($pair[0][$label])"
      $found = -1; for ($i = $start + 1; $i -lt $end; $i++) { if ($ls[$i].StartsWith("${label}:")) { $found = $i; break } }
      if ($found -ge 0) { if ($pair[1] -or $ls[$found].Trim() -eq "${label}:") { $ls[$found] = $line } }
      else { $ins = $end; while ($ins -gt $start + 1 -and $ls[$ins - 1].Trim() -eq '') { $ins-- }; $ls.Insert($ins, $line); $end++ }
    }
  }
  [IO.File]::WriteAllText($notes, ($ls -join $nl), (New-Object Text.UTF8Encoding($false)))
  ''
  "Recorded under ""Built with"" in tools\$Tool\NOTES.md: Node.js $node; $($always['Pinned']); last checked today. Check the Starter and Blocks lines are right."
}
