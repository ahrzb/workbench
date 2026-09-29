param([int]$ProcId)
. "$PSScriptRoot\dialog.ps1"
$d = [D]::FindDialog([uint32]$ProcId)
"dialog $d"
[D]::Dump($d)
