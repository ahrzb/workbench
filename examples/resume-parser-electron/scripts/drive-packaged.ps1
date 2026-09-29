# End-to-end driver for the PACKAGED exe (or an installed copy): launch, measure, open the samples
# through the real native Open dialog (WM_SETTEXT + WM_GETTEXT check + BM_CLICK), measure again,
# screenshot, export through the real native Save dialog, close with WM_CLOSE.
param(
  [string]$Exe = "$PSScriptRoot\..\out\Resume Parser-win32-x64\ResumeParserElectron.exe",
  [string]$Title = "Resume Parser (Electron)",
  [string]$Shot = "",
  [string]$OutDir = (Join-Path $env:TEMP "resume-parser-electron-out"),
  [int]$Port = 9444
)
$ErrorActionPreference = "Stop"
. "$PSScriptRoot\dialog.ps1"
Add-Type @"
using System; using System.Text; using System.Runtime.InteropServices;
public static class W2 {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc p, IntPtr l);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  public static IntPtr Find(uint pid, string title) { IntPtr f = IntPtr.Zero;
    EnumWindows((h, l) => { uint p; GetWindowThreadProcessId(h, out p); if (p != pid || !IsWindowVisible(h)) return true; var sb = new StringBuilder(256); GetWindowText(h, sb, 256); if (sb.ToString() == title) { f = h; return false; } return true; }, IntPtr.Zero); return f; }
}
"@
$root = (Resolve-Path "$PSScriptRoot\..").Path
$samples = Join-Path $root "samples"
$names = "resume-1-sofia-alvarez.pdf", "resume-2-daniel-okafor.docx", "resume-3-priya-raman.txt", "scanned-example.pdf"
foreach ($n in $names) { if (-not (Test-Path (Join-Path $samples $n))) { throw "missing sample $n" } }
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

function Get-TreeIds([int]$rootPid) {
  $all = Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId
  $ids = @($rootPid); $i = 0
  while ($i -lt $ids.Count) { foreach ($c in ($all | Where-Object { $_.ParentProcessId -eq $ids[$i] })) { $ids += [int]$c.ProcessId }; $i++ }
  $ids
}
function Report-Memory([string]$label, [int]$rootPid) {
  $ids = Get-TreeIds $rootPid
  $procs = $ids | ForEach-Object { Get-Process -Id $_ -ErrorAction SilentlyContinue } | Where-Object { $_ }
  $ws = ($procs | Measure-Object WorkingSet64 -Sum).Sum / 1MB
  $pv = ($procs | Measure-Object PrivateMemorySize64 -Sum).Sum / 1MB
  Write-Host ("[{0}] processes={1} total working set={2:N0} MB, private={3:N0} MB" -f $label, $procs.Count, $ws, $pv)
  $procs | ForEach-Object { Write-Host ("    {0,6} {1,-13} WS={2,6:N1} MB" -f $_.Id, $_.ProcessName, ($_.WorkingSet64 / 1MB)) }
  $tcp = @(Get-NetTCPConnection -ErrorAction SilentlyContinue | Where-Object { $ids -contains $_.OwningProcess })
  $udp = @(Get-NetUDPEndpoint -ErrorAction SilentlyContinue | Where-Object { $ids -contains $_.OwningProcess })
  Write-Host ("[{0}] TCP endpoints={1} UDP endpoints={2}" -f $label, $tcp.Count, $udp.Count)
}
function Cdp([string]$cmd, [string]$arg) { & node "$PSScriptRoot\cdp-tool.mjs" $Port $cmd $arg }

$snap = (Get-Process dart,flutter,java,gradle,node,msbuild,cargo,bun -ErrorAction SilentlyContinue | Group-Object ProcessName | ForEach-Object { "$($_.Name) x$($_.Count)" }) -join ", "
Write-Host "other processes: $snap"
$sw = [Diagnostics.Stopwatch]::StartNew()
$p = Start-Process -FilePath $Exe -ArgumentList "--remote-debugging-port=$Port" -PassThru
$hwnd = [IntPtr]::Zero
while ($sw.Elapsed.TotalSeconds -lt 30) { $hwnd = [W2]::Find([uint32]$p.Id, $Title); if ($hwnd -ne [IntPtr]::Zero) { break }; Start-Sleep -Milliseconds 20 }
if ($hwnd -eq [IntPtr]::Zero) { throw "no window" }
Write-Host ("pid={0} time to first visible window: {1:N2} s (with --remote-debugging-port)" -f $p.Id, $sw.Elapsed.TotalSeconds)
Start-Sleep -Seconds 6
Report-Memory "empty" $p.Id

# ---- Open dialog: real mouse click inside MY window (CDP), then WM_SETTEXT into the native dialog
Cdp click "#open"
$dlg = Wait-Dialog $p.Id
Write-Host "Open dialog appeared: '$([D]::Title($dlg))'"
Set-DialogName $dlg $samples -PressOk       # navigate into my samples folder (nothing else is ever browsed)
Start-Sleep -Milliseconds 800
$dlg = Wait-Dialog $p.Id
$quoted = ($names | ForEach-Object { '"' + $_ + '"' }) -join " "
Set-DialogName $dlg $quoted -PressOk
$sw.Restart()
$rows = 0
while ($sw.Elapsed.TotalSeconds -lt 30) {
  $rows = [int](Cdp eval "document.querySelectorAll('#rows tr').length")
  if ($rows -ge $names.Count) { break }
  Start-Sleep -Milliseconds 50
}
Write-Host ("rows in table: {0} (after {1:N2} s from OK)" -f $rows, $sw.Elapsed.TotalSeconds)
Write-Host ("status: " + (Cdp eval "document.getElementById('status').textContent"))
Write-Host (Cdp eval "[...document.querySelectorAll('#rows tr')].map(tr => tr.cells[0].textContent + ' | ' + [...tr.querySelectorAll('input')].map(i => i.value).join(' | ') + ' || ' + tr.cells[1].innerText.replace(/\n/g,' / ')).join('\n')")
Start-Sleep -Seconds 6
Report-Memory "samples loaded" $p.Id

# ---- inline edit through the page's own input events (my own window, no dialog open)
Cdp click "#rows tr:first-child td:nth-child(3) input"
Cdp eval "(() => { const i = document.querySelector('#rows tr:first-child td:nth-child(3) input'); i.value = i.value + ' (edited)'; i.dispatchEvent(new Event('input', { bubbles: true })); return i.className; })()"
Cdp click "#rows tr:nth-child(2)"
if ($Shot) { Cdp shot $Shot }

# ---- Save dialog
$xlsx = Join-Path $OutDir "resumes-out.xlsx"
Remove-Item -Force $xlsx -ErrorAction SilentlyContinue
Cdp click "#export"
$dlg = Wait-Dialog $p.Id
Write-Host "Save dialog appeared: '$([D]::Title($dlg))'"
Set-DialogName $dlg $xlsx -PressOk
$sw.Restart()
while ($sw.Elapsed.TotalSeconds -lt 15 -and -not (Test-Path $xlsx)) { Start-Sleep -Milliseconds 50 }
Start-Sleep -Milliseconds 500
Write-Host ("xlsx written: {0} bytes at {1}" -f (Get-Item $xlsx).Length, $xlsx)
Write-Host ("status: " + (Cdp eval "document.getElementById('status').textContent"))
# the page must stay responsive after the export
Write-Host ("responsive after export: " + (Cdp eval "document.title + ' / rows=' + document.querySelectorAll('#rows tr').length"))
Report-Memory "after export" $p.Id

$null = $p.CloseMainWindow()
if ($p.WaitForExit(10000)) { Write-Host "closed with WM_CLOSE, exit code $($p.ExitCode)" } else { Write-Host "did NOT exit within 10 s after WM_CLOSE" }
