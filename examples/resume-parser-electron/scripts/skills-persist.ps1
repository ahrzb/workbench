$exe = "$PSScriptRoot\..\out\Resume Parser-win32-x64\ResumeParserElectron.exe"
function Run($js) { & node "$PSScriptRoot\cdp-tool.mjs" 9444 eval $js }
$p = Start-Process $exe -ArgumentList "--remote-debugging-port=9444" -PassThru; Start-Sleep 3
Run "(() => { document.getElementById('skills-text').value = 'Excel\nPython\nRust'; document.getElementById('skills-save').click(); return 'saved click'; })()"
Start-Sleep 1
Write-Host ("status after save: " + (Run "document.getElementById('status').textContent"))
$null = $p.CloseMainWindow(); $null = $p.WaitForExit(8000)
$f = Join-Path $env:APPDATA "Resume Parser\skills.json"
Write-Host ("skills.json exists: {0}: {1}" -f (Test-Path $f), ((Get-Content $f -Raw) -replace "\s+", " "))
$p = Start-Process $exe -ArgumentList "--remote-debugging-port=9444" -PassThru; Start-Sleep 3
Write-Host ("after restart, summary: " + (Run "document.getElementById('skills-summary').textContent"))
Write-Host ("after restart, textarea: " + (Run "document.getElementById('skills-text').value"))
$null = $p.CloseMainWindow(); $null = $p.WaitForExit(8000)
Remove-Item $f -Force
