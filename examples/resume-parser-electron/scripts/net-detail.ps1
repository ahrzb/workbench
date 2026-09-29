param([int]$RootPid)
$all = Get-CimInstance Win32_Process
$ids = @($RootPid); $i = 0
while ($i -lt $ids.Count) { $cur = $ids[$i]; foreach ($c in ($all | Where-Object { $_.ParentProcessId -eq $cur })) { $ids += [int]$c.ProcessId }; $i++ }
foreach ($id in $ids) {
  $pr = $all | Where-Object { $_.ProcessId -eq $id }
  $type = if ($pr.CommandLine -match '--type=([a-z-]+)') { $Matches[1] } else { 'main' }
  $sub = if ($pr.CommandLine -match '--utility-sub-type=([\w.]+)') { $Matches[1] } else { '' }
  Write-Host ("pid {0} parent {1} type={2} {3}" -f $id, $pr.ParentProcessId, $type, $sub)
  Get-NetTCPConnection -OwningProcess $id -ErrorAction SilentlyContinue | ForEach-Object { Write-Host ("    TCP {0}:{1} -> {2}:{3} {4}" -f $_.LocalAddress, $_.LocalPort, $_.RemoteAddress, $_.RemotePort, $_.State) }
  Get-NetUDPEndpoint -OwningProcess $id -ErrorAction SilentlyContinue | ForEach-Object { Write-Host ("    UDP {0}:{1}" -f $_.LocalAddress, $_.LocalPort) }
}
