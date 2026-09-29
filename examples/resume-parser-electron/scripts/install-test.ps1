# Installs the Squirrel Setup.exe as the current (standard) user, checks what it touched, drives the
# INSTALLED app (real dialogs, samples, export), then uninstalls and checks that it is gone.
param([switch]$SkipUninstall)
$ErrorActionPreference = "Stop"
$root = (Resolve-Path "$PSScriptRoot\..").Path
$setup = Join-Path $root "out\make\squirrel.windows\x64\Resume Parser-1.0.0 Setup.exe"
$installDir = Join-Path $env:LOCALAPPDATA "ResumeParserElectron"
$id = [Security.Principal.WindowsIdentity]::GetCurrent()
$isAdmin = ([Security.Principal.WindowsPrincipal]$id).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
Write-Host "user=$($id.Name) elevated=$isAdmin"
if (Test-Path $installDir) { throw "$installDir already exists; refusing to touch it" }

# does the installer ask for elevation? (manifest text inside the exe)
$bytes = [IO.File]::ReadAllBytes($setup)
$txt = [Text.Encoding]::ASCII.GetString($bytes)
$m = [regex]::Match($txt, 'requestedExecutionLevel[^/]*level="([A-Za-z]+)"')
Write-Host "installer manifest requestedExecutionLevel: $($m.Groups[1].Value)"

$sw = [Diagnostics.Stopwatch]::StartNew()
$p = Start-Process -FilePath $setup -PassThru
# Squirrel's Setup.exe unpacks, installs, creates shortcuts, launches the app, and exits.
$exe = Join-Path $installDir "app-1.0.0\ResumeParserElectron.exe"
while ($sw.Elapsed.TotalSeconds -lt 120 -and -not (Test-Path $exe)) { Start-Sleep -Milliseconds 100 }
$tExe = $sw.Elapsed.TotalSeconds
$null = $p.WaitForExit(60000)
Write-Host ("Setup.exe: installed exe present after {0:N1} s, Setup.exe exited={1} code={2} after {3:N1} s" -f $tExe, $p.HasExited, $(if ($p.HasExited) { $p.ExitCode } else { "n/a" }), $sw.Elapsed.TotalSeconds)
Start-Sleep -Seconds 3
Write-Host "install dir: $installDir"
Get-ChildItem $installDir | ForEach-Object { Write-Host ("   {0}" -f $_.Name) }
$size = (Get-ChildItem $installDir -Recurse -File | Measure-Object Length -Sum).Sum
Write-Host ("installed size: {0:N1} MB ({1:N0} bytes)" -f ($size / 1MB), $size)
foreach ($hive in "HKCU", "HKLM") {
  $keys = Get-ChildItem "${hive}:\Software\Microsoft\Windows\CurrentVersion\Uninstall" -ErrorAction SilentlyContinue | Where-Object { $_.PSChildName -match "ResumeParserElectron" }
  Write-Host ("{0} uninstall keys matching: {1}" -f $hive, (@($keys).Count))
  $keys | ForEach-Object { Write-Host ("   {0} DisplayName={1} UninstallString={2}" -f $_.PSChildName, $_.GetValue("DisplayName"), $_.GetValue("UninstallString")) }
}
$lnks = @()
$lnks += Get-ChildItem ([Environment]::GetFolderPath("Desktop")) -Filter "*.lnk" -ErrorAction SilentlyContinue | Where-Object { $_.Name -match "Resume" -and $_.Name -notmatch "Python|Compose|Flutter" }
$lnks += Get-ChildItem (Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs") -Recurse -Filter "*.lnk" -ErrorAction SilentlyContinue | Where-Object { $_.FullName -match "ResumeParserElectron|Resume Parser|Example" }
$lnks | ForEach-Object { Write-Host ("shortcut: {0}" -f $_.FullName) }

# close the app that Squirrel launched (only processes that run from the install folder)
$running = Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Path -and $_.Path.StartsWith($installDir) -and $_.ProcessName -eq "ResumeParserElectron" }
Write-Host ("app processes launched by the installer: {0}" -f @($running).Count)
foreach ($r in $running) { if ($r.MainWindowHandle -ne 0) { $null = $r.CloseMainWindow() } }
Start-Sleep -Seconds 3

Write-Host "---- driving the installed app"
& "$PSScriptRoot\drive-packaged.ps1" -Exe $exe -Shot (Join-Path $env:TEMP "installed-shot.png") -OutDir (Join-Path $env:TEMP "resume-parser-electron-out-installed")

if (-not $SkipUninstall) {
  Start-Sleep -Seconds 2
  $update = Join-Path $installDir "Update.exe"
  $sw.Restart()
  $u = Start-Process -FilePath $update -ArgumentList "--uninstall", "-s" -PassThru
  $null = $u.WaitForExit(60000)
  Write-Host ("Update.exe --uninstall -s exit={0} after {1:N1} s" -f $u.ExitCode, $sw.Elapsed.TotalSeconds)
  Start-Sleep -Seconds 4
  Write-Host ("install dir still exists: {0}" -f (Test-Path $installDir))
  if (Test-Path $installDir) { Get-ChildItem $installDir -Recurse -ErrorAction SilentlyContinue | Select-Object -First 8 | ForEach-Object { Write-Host "   left: $($_.FullName)" } }
  foreach ($hive in "HKCU", "HKLM") {
    $keys = Get-ChildItem "${hive}:\Software\Microsoft\Windows\CurrentVersion\Uninstall" -ErrorAction SilentlyContinue | Where-Object { $_.PSChildName -match "ResumeParserElectron" }
    Write-Host ("{0} uninstall keys after uninstall: {1}" -f $hive, @($keys).Count)
  }
  $lnks | ForEach-Object { Write-Host ("shortcut still there: {0} = {1}" -f $_.Name, (Test-Path $_.FullName)) }
}
