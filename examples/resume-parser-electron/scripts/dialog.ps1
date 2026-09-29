# Helpers to drive a NATIVE common file dialog without any keystrokes: find the dialog owned by a
# given process, set the file-name box with WM_SETTEXT, read it back with WM_GETTEXT, and only then
# press OK with BM_CLICK. Nothing is ever typed into a window, and no folder is browsed.
Add-Type @"
using System; using System.Text; using System.Collections.Generic; using System.Runtime.InteropServices;
public static class D {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc p, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr parent, EnumProc p, IntPtr l);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr GetParent(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr GetDlgItem(IntPtr h, int id);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr SendMessage(IntPtr h, uint m, IntPtr w, string l);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr SendMessage(IntPtr h, uint m, IntPtr w, StringBuilder l);
  [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  static string Cls(IntPtr h) { var sb = new StringBuilder(128); GetClassName(h, sb, 128); return sb.ToString(); }
  public static IntPtr FindDialog(uint pid) {
    IntPtr found = IntPtr.Zero;
    EnumWindows((h, l) => { uint p; GetWindowThreadProcessId(h, out p); if (p == pid && IsWindowVisible(h) && Cls(h) == "#32770") { found = h; return false; } return true; }, IntPtr.Zero);
    return found;
  }
  // the file-name edit box is the first Edit that lives inside a ComboBox (Open: ComboBoxEx32 > ComboBox > Edit; Save: FloatNotifySink > ComboBox > Edit)
  public static IntPtr FindNameEdit(IntPtr dlg) {
    IntPtr found = IntPtr.Zero;
    EnumChildWindows(dlg, (h, l) => {
      if (Cls(h) == "Edit") { IntPtr p1 = GetParent(h); if (p1 != IntPtr.Zero && Cls(p1) == "ComboBox") { found = h; return false; } }
      return true; }, IntPtr.Zero);
    return found;
  }
  public static string Dump(IntPtr dlg) { var sb = new StringBuilder(); EnumChildWindows(dlg, (h, l) => { var t = new StringBuilder(128); GetWindowText(h, t, 128); sb.AppendLine(h + " parent=" + GetParent(h) + " " + Cls(h) + " \"" + t + "\""); return true; }, IntPtr.Zero); return sb.ToString(); }
  public static string Title(IntPtr h) { var sb = new StringBuilder(256); GetWindowText(h, sb, 256); return sb.ToString(); }
  public static string GetText(IntPtr h) { var sb = new StringBuilder(4096); SendMessage(h, 0x000D, (IntPtr)4096, sb); return sb.ToString(); }
  public static void SetText(IntPtr h, string s) { SendMessage(h, 0x000C, IntPtr.Zero, s); }
  public static void ClickOk(IntPtr dlg) { IntPtr ok = GetDlgItem(dlg, 1); SendMessage(ok, 0x00F5, IntPtr.Zero, IntPtr.Zero); } // BM_CLICK on IDOK
}
"@

function Wait-Dialog([int]$ProcId, [int]$TimeoutSec = 20) {
  $sw = [Diagnostics.Stopwatch]::StartNew()
  while ($sw.Elapsed.TotalSeconds -lt $TimeoutSec) {
    $d = [D]::FindDialog([uint32]$ProcId)
    if ($d -ne [IntPtr]::Zero) { Start-Sleep -Milliseconds 400; return $d }
    Start-Sleep -Milliseconds 50
  }
  throw "no file dialog owned by pid $ProcId within $TimeoutSec s"
}

# Sets the box, verifies it byte-for-byte, then presses OK. Throws (and presses nothing) on mismatch.
function Set-DialogName([IntPtr]$Dlg, [string]$Text, [switch]$PressOk) {
  $edit = [D]::FindNameEdit($Dlg)
  if ($edit -eq [IntPtr]::Zero) { throw "file-name edit not found in dialog '$([D]::Title($Dlg))'" }
  [D]::SetText($edit, $Text)
  Start-Sleep -Milliseconds 150
  $back = [D]::GetText($edit)
  if ($back -ne $Text) { throw "WM_GETTEXT mismatch. wanted [$Text] got [$back]" }
  Write-Host "  dialog '$([D]::Title($Dlg))' file-name box verified: $Text"
  if ($PressOk) { [D]::ClickOk($Dlg) }
}
