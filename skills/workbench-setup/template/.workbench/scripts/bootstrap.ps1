# Downloads the project's tools into .tools\ (Windows). No admin rights, nothing installed.
#   Node.js  -> .tools\node   (official zip, SHA-256 checked against nodejs.org's SHASUMS256.txt)
#   MinGit   -> .tools\git    (only when git is not already on PATH; checked against GitHub's asset digest)
# Safe to run again: it skips what is already there.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$NodeVersion = 'v24.21.0'

$root  = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$tools = Join-Path $root '.tools'
$tmp   = Join-Path $tools 'tmp'
New-Item -ItemType Directory -Force -Path $tmp | Out-Null

function Get-Checked($url, $file, $sha256) {
  curl.exe -fsSL --retry 3 -o $file $url
  if ($LASTEXITCODE -ne 0) { throw "Download failed: $url" }
  $got = (Get-FileHash -Algorithm SHA256 -LiteralPath $file).Hash.ToLower()
  if ($got -ne $sha256.ToLower()) { Remove-Item -LiteralPath $file; throw "Checksum mismatch for $url" }
}

# --- Node.js
$node = Join-Path $tools 'node'
if (-not (Test-Path -LiteralPath (Join-Path $node 'node.exe'))) {
  $arch = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'x64' }
  $name = "node-$NodeVersion-win-$arch"
  $sums = curl.exe -fsSL "https://nodejs.org/dist/$NodeVersion/SHASUMS256.txt"
  $line = $sums | Where-Object { $_ -match "\s$name\.zip$" }
  if (-not $line) { throw "No checksum for $name.zip" }
  $zip = Join-Path $tmp "$name.zip"
  Get-Checked "https://nodejs.org/dist/$NodeVersion/$name.zip" $zip ($line -split '\s+')[0]
  tar -xf $zip -C $tools
  if ($LASTEXITCODE -ne 0) { throw 'Unpacking Node failed' }
  Rename-Item -LiteralPath (Join-Path $tools $name) 'node'
  Remove-Item -LiteralPath $zip
  "Node.js $NodeVersion ready."
} else { 'Node.js already there.' }

# --- git (only if missing)
$git = Join-Path $tools 'git'
if ((Get-Command git -ErrorAction SilentlyContinue) -or (Test-Path -LiteralPath (Join-Path $git 'cmd\git.exe'))) {
  'git already available.'
} else {
  $rel = curl.exe -fsSL https://api.github.com/repos/git-for-windows/git/releases/latest | ConvertFrom-Json
  $pattern = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { '^MinGit-[\d.]+(\.windows\.\d+)?-arm64\.zip$' } else { '^MinGit-[\d.]+(\.windows\.\d+)?-64-bit\.zip$' }
  $asset = $rel.assets | Where-Object { $_.name -match $pattern } | Select-Object -First 1
  if (-not $asset -or -not $asset.digest) { throw 'No MinGit download with a checksum found' }
  $zip = Join-Path $tmp $asset.name
  Get-Checked $asset.browser_download_url $zip ($asset.digest -replace '^sha256:', '')
  New-Item -ItemType Directory -Force -Path $git | Out-Null
  tar -xf $zip -C $git
  if ($LASTEXITCODE -ne 0) { throw 'Unpacking MinGit failed' }
  Remove-Item -LiteralPath $zip
  "MinGit $($rel.tag_name) ready."
}
