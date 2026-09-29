$exe = "$PSScriptRoot\..\out\Resume Parser-win32-x64\ResumeParserElectron.exe"
$p = Start-Process $exe -ArgumentList "--remote-debugging-port=9444" -PassThru
Start-Sleep -Seconds 4
& node "$PSScriptRoot\security-check.mjs" 9444
$null = $p.CloseMainWindow(); $null = $p.WaitForExit(8000)
