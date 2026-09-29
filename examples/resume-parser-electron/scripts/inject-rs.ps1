# Types "rs" + Enter into the console of a process I started myself (the `npm start` window),
# using WriteConsoleInput. Forge only listens for `rs` when stdin is a real TTY (a console).
# It targets exactly one PID that I launched; it does not touch any other window.
param([Parameter(Mandatory)][int]$ConsolePid, [string]$Text = "rs")
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class ConIn {
  [DllImport("kernel32.dll", SetLastError=true)] public static extern bool FreeConsole();
  [DllImport("kernel32.dll", SetLastError=true)] public static extern bool AttachConsole(uint pid);
  [DllImport("kernel32.dll", SetLastError=true, CharSet=CharSet.Unicode)] public static extern IntPtr CreateFile(string name, uint access, uint share, IntPtr sec, uint disp, uint flags, IntPtr tmpl);
  [StructLayout(LayoutKind.Explicit, CharSet=CharSet.Unicode)] public struct INPUT_RECORD {
    [FieldOffset(0)] public ushort EventType;
    [FieldOffset(4)] public int bKeyDown;
    [FieldOffset(8)] public ushort wRepeatCount;
    [FieldOffset(10)] public ushort wVirtualKeyCode;
    [FieldOffset(12)] public ushort wVirtualScanCode;
    [FieldOffset(14)] public char UnicodeChar;
    [FieldOffset(16)] public uint dwControlKeyState;
  }
  [DllImport("kernel32.dll", SetLastError=true)] public static extern bool WriteConsoleInputW(IntPtr h, INPUT_RECORD[] r, uint n, out uint written);
}
"@
[ConIn]::FreeConsole() | Out-Null
if (-not [ConIn]::AttachConsole([uint32]$ConsolePid)) { throw "AttachConsole failed: $([Runtime.InteropServices.Marshal]::GetLastWin32Error())" }
$h = [ConIn]::CreateFile("CONIN$", [uint32]3221225472, 3, [IntPtr]::Zero, 3, 0, [IntPtr]::Zero)
$recs = New-Object System.Collections.Generic.List[ConIn+INPUT_RECORD]
foreach ($ch in ($Text.ToCharArray() + [char]13)) {
  foreach ($down in 1,0) {
    $r = New-Object ConIn+INPUT_RECORD
    $r.EventType = 1; $r.bKeyDown = $down; $r.wRepeatCount = 1; $r.UnicodeChar = $ch
    if ($ch -eq [char]13) { $r.wVirtualKeyCode = 13 }
    $recs.Add($r)
  }
}
[uint32]$n = 0
$ok = [ConIn]::WriteConsoleInputW($h, $recs.ToArray(), [uint32]$recs.Count, [ref]$n)
Write-Host "wrote $n input records (ok=$ok) to console of pid $ConsolePid"
