# Prints which ChatGPT account Codex is signed in with: `personal <id>`, `company <id>` or `unknown`.
# <id> is the first 12 hex digits of the SHA-256 of the ChatGPT account id, so two accounts are
# told apart without storing the id itself.
# Reads only auth_mode, the plan type and the account id from ~/.codex/auth.json; never prints or
# copies a token. `unknown` when Codex keeps its sign-in in the system keyring instead of that file,
# when it uses an API key, or when nothing can be read.
# Used by the startup check, and by the AI to fill in .workbench/account:
#   powershell -NoProfile -ExecutionPolicy Bypass -File .workbench\scripts\account.ps1
function Get-AccountKind {
  try {
    $auth = Join-Path $env:USERPROFILE '.codex\auth.json'
    if ($env:CODEX_HOME) { $auth = Join-Path $env:CODEX_HOME 'auth.json' }
    $a = Get-Content -Raw -LiteralPath $auth -ErrorAction Stop | ConvertFrom-Json
    if (-not $a -or $a.auth_mode -ne 'chatgpt' -or -not $a.tokens.id_token) { return 'unknown' }
    $part = ($a.tokens.id_token -split '\.')[1]
    if (-not $part) { return 'unknown' }
    $part = $part.Replace('-', '+').Replace('_', '/')
    switch ($part.Length % 4) { 2 { $part += '==' } 3 { $part += '=' } }
    $claims = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($part)) | ConvertFrom-Json
    $info = $claims.'https://api.openai.com/auth'
    $plan = [string]$info.chatgpt_plan_type
    $id = [string]$info.chatgpt_account_id
    if (-not $id) { $id = [string]$info.chatgpt_user_id }
    if (-not $plan -or -not $id) { return 'unknown' }
    $kind = if ($plan -match 'team|business|enterprise|edu|k12') { 'company' } else { 'personal' }
    $sha = [Security.Cryptography.SHA256]::Create()
    $hash = -join ($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($id)) | ForEach-Object { $_.ToString('x2') })
    return $kind + ' ' + $hash.Substring(0, 12)
  } catch { return 'unknown' }
}
if ($MyInvocation.InvocationName -ne '.') { Get-AccountKind }
