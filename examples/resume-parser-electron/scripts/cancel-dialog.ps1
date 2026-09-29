param([int]$ProcId)
. "$PSScriptRoot\dialog.ps1"
$d = [D]::FindDialog([uint32]$ProcId)
if ($d -ne [IntPtr]::Zero) { [void][D]::SendMessage([D]::GetDlgItem($d, 2), 0x00F5, [IntPtr]::Zero, [IntPtr]::Zero); "cancelled dialog" }
