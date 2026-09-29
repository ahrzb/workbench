function Sz($p) { if (Test-Path $p) { $s = (Get-ChildItem $p -Recurse -Force -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum; "{0,-70} {1,10:N1} MB ({2:N0} bytes)" -f $p, ($s/1MB), $s } else { "$p (missing)" } }
$r = (Resolve-Path "$PSScriptRoot\..").Path
Sz "$r\node_modules"; Sz "$r\out\Resume Parser-win32-x64"; Sz "$r\out\make"; Sz "$r\.vite"; Sz "$env:LOCALAPPDATA\electron\Cache"; Sz "$r\out\Resume Parser-win32-x64\resources"
Get-ChildItem "$r\out\make" -Recurse -File | ForEach-Object { "{0,-80} {1,14:N0} bytes = {2:N1} MiB" -f $_.FullName.Substring($r.Length+1), $_.Length, ($_.Length/1MB) }
Get-Item "$r\out\Resume Parser-win32-x64\ResumeParserElectron.exe" | ForEach-Object { "exe {0:N0} bytes = {1:N1} MiB" -f $_.Length, ($_.Length/1MB) }
Get-ChildItem "$r\out\Resume Parser-win32-x64\resources" | ForEach-Object { "resources/{0} {1:N0} bytes" -f $_.Name, $_.Length }
Get-ChildItem "$r\.vite\renderer\main_window\assets" | ForEach-Object { "asset {0} {1:N0} bytes" -f $_.Name, $_.Length }
Get-AuthenticodeSignature "$r\out\Resume Parser-win32-x64\ResumeParserElectron.exe" | ForEach-Object { "signature status: $($_.Status)" }
Get-AuthenticodeSignature "$r\out\make\squirrel.windows\x64\Resume Parser-1.0.0 Setup.exe" | ForEach-Object { "installer signature status: $($_.Status)" }
Get-MpThreatDetection -ErrorAction SilentlyContinue | Measure-Object | ForEach-Object { "Get-MpThreatDetection entries: $($_.Count)" }
$sdir = (Get-Item "$env:APPDATA\Resume Parser" -ErrorAction SilentlyContinue); if ($sdir) { "userData: $($sdir.FullName)" ; Get-ChildItem $sdir.FullName -Name | Select-Object -First 30 }
