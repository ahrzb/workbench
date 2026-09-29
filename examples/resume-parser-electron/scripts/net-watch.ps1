# Launch the packaged exe (optionally with extra args), sample the TCP/UDP endpoints of its whole process tree every 200 ms for N seconds.
param([int]$Seconds = 10, [string[]]$AppArgs = @(), [string]$Exe = "$PSScriptRoot\..\out\Resume Parser-win32-x64\ResumeParserElectron.exe")
$p = if ($AppArgs.Count) { Start-Process -FilePath $Exe -ArgumentList $AppArgs -PassThru } else { Start-Process -FilePath $Exe -PassThru }
$seen = @{}
$end = (Get-Date).AddSeconds($Seconds)
while ((Get-Date) -lt $end) {
  $all = Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId
  $ids = @($p.Id); $i = 0
  while ($i -lt $ids.Count) { foreach ($c in ($all | Where-Object { $_.ParentProcessId -eq $ids[$i] })) { $ids += [int]$c.ProcessId }; $i++ }
  foreach ($c in (Get-NetTCPConnection -ErrorAction SilentlyContinue | Where-Object { $ids -contains $_.OwningProcess })) {
    $k = "TCP $($c.LocalAddress):$($c.LocalPort) -> $($c.RemoteAddress):$($c.RemotePort) $($c.State) pid=$($c.OwningProcess)"; if (-not $seen[$k]) { $seen[$k] = 1; Write-Host ("t+{0:N1}s {1}" -f (((Get-Date) - $end).TotalSeconds + $Seconds), $k) }
  }
  foreach ($c in (Get-NetUDPEndpoint -ErrorAction SilentlyContinue | Where-Object { $ids -contains $_.OwningProcess })) {
    $k = "UDP $($c.LocalAddress):$($c.LocalPort) pid=$($c.OwningProcess)"; if (-not $seen[$k]) { $seen[$k] = 1; Write-Host ("t+{0:N1}s {1}" -f (((Get-Date) - $end).TotalSeconds + $Seconds), $k) }
  }
  Start-Sleep -Milliseconds 100
}
Write-Host "distinct endpoints seen: $($seen.Count)"
$null = $p.CloseMainWindow(); $null = $p.WaitForExit(8000)
