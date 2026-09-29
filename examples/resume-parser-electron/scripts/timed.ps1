# Usage: powershell -NoProfile -File scripts/timed.ps1 <label> <command line for cmd.exe>
# Runs the command through cmd (so stderr does not become PowerShell error records), prints wall time and a process snapshot.
param([string]$Label, [string]$Cmd, [string]$Log = "")
$snap = (Get-Process dart,flutter,java,gradle,node,msbuild,cargo,bun -ErrorAction SilentlyContinue | Group-Object ProcessName | ForEach-Object { "$($_.Name) x$($_.Count)" }) -join ", "
Write-Host "[$Label] other processes before: $snap"
$sw = [Diagnostics.Stopwatch]::StartNew()
if ($Log) { cmd /c "$Cmd > `"$Log`" 2>&1" } else { cmd /c "$Cmd 2>&1" }
$code = $LASTEXITCODE
$sw.Stop()
Write-Host ("[{0}] exit={1} wall={2:N1}s" -f $Label, $code, $sw.Elapsed.TotalSeconds)
