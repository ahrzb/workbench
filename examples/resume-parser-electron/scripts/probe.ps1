# Launches the packaged exe, measures time to first visible window (owner = the process I started),
# sums working set / private bytes over the whole process tree 6 s later, lists TCP/UDP endpoints
# of that tree, then optionally leaves the app running (-Keep) for further driving.
param(
  [string]$Exe = "$PSScriptRoot\..\out\Resume Parser-win32-x64\ResumeParserElectron.exe",
  [string]$Title = "Resume Parser (Electron)",
  [switch]$Keep,
  [int]$SettleSeconds = 6,
  [string]$EnvFiles = ""
)
$ErrorActionPreference = "Stop"
if ($EnvFiles) { $env:RESUME_PARSER_DEBUG_FILES = $EnvFiles }  # ignored by a packaged app; kept only to prove that
Add-Type @"
using System; using System.Text; using System.Runtime.InteropServices;
public static class W {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc p, IntPtr l);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  public static IntPtr Find(uint pid, string title) {
    IntPtr found = IntPtr.Zero;
    EnumWindows((h, l) => {
      uint p; GetWindowThreadProcessId(h, out p);
      if (p != pid || !IsWindowVisible(h)) return true;
      var sb = new StringBuilder(256); GetWindowText(h, sb, 256);
      if (sb.ToString() == title) { found = h; return false; }
      return true;
    }, IntPtr.Zero);
    return found;
  }
}
"@
function Get-Tree([int]$rootPid) {
  $all = Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId
  $ids = @($rootPid); $queue = @($rootPid)
  while ($queue.Count) { $cur = $queue[0]; $queue = $queue[1..($queue.Count)] | Where-Object { $_ -ne $null }; foreach ($c in ($all | Where-Object { $_.ParentProcessId -eq $cur })) { $ids += $c.ProcessId; $queue += $c.ProcessId } }
  $ids | Select-Object -Unique
}
$snap = (Get-Process dart,flutter,java,gradle,node,msbuild,cargo,bun -ErrorAction SilentlyContinue | Group-Object ProcessName | ForEach-Object { "$($_.Name) x$($_.Count)" }) -join ", "
Write-Host "other processes: $snap"
$sw = [Diagnostics.Stopwatch]::StartNew()
$p = Start-Process -FilePath $Exe -PassThru
$hwnd = [IntPtr]::Zero
while ($sw.Elapsed.TotalSeconds -lt 30) {
  $hwnd = [W]::Find([uint32]$p.Id, $Title)
  if ($hwnd -ne [IntPtr]::Zero) { break }
  Start-Sleep -Milliseconds 20
}
$t = $sw.Elapsed.TotalSeconds
if ($hwnd -eq [IntPtr]::Zero) { Write-Host "no window within 30 s"; exit 1 }
Write-Host ("pid={0} time to first visible window: {1:N2} s" -f $p.Id, $t)
Start-Sleep -Seconds $SettleSeconds
$ids = Get-Tree $p.Id
$procs = $ids | ForEach-Object { Get-Process -Id $_ -ErrorAction SilentlyContinue } | Where-Object { $_ }
$ws = ($procs | Measure-Object WorkingSet64 -Sum).Sum / 1MB
$pv = ($procs | Measure-Object PrivateMemorySize64 -Sum).Sum / 1MB
Write-Host ("processes={0} total working set={1:N0} MB private={2:N0} MB" -f $procs.Count, $ws, $pv)
$procs | ForEach-Object { "{0,6} {1,-14} WS={2,6:N1} MB" -f $_.Id, $_.ProcessName, ($_.WorkingSet64/1MB) } | Write-Host
$tcp = @(Get-NetTCPConnection -ErrorAction SilentlyContinue | Where-Object { $ids -contains $_.OwningProcess })
$udp = @(Get-NetUDPEndpoint -ErrorAction SilentlyContinue | Where-Object { $ids -contains $_.OwningProcess })
Write-Host ("TCP connections/listeners owned by the app's processes: {0}; UDP endpoints: {1}" -f $tcp.Count, $udp.Count)
$tcp | ForEach-Object { Write-Host ("  TCP {0}:{1} -> {2}:{3} {4}" -f $_.LocalAddress, $_.LocalPort, $_.RemoteAddress, $_.RemotePort, $_.State) }
$udp | ForEach-Object { Write-Host ("  UDP {0}:{1}" -f $_.LocalAddress, $_.LocalPort) }
if (-not $Keep) {
  $null = $p.CloseMainWindow()
  if (-not $p.WaitForExit(8000)) { Write-Host "did not exit within 8 s after WM_CLOSE"; } else { Write-Host "closed cleanly, exit code $($p.ExitCode)" }
}
