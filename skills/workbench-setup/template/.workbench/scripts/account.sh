#!/bin/sh
# Prints which kind of ChatGPT account Codex is signed in with: `personal`, `company <id>` or `unknown`.
# <id> is the first 12 hex digits of the SHA-256 of the ChatGPT account id.
# Reads only auth_mode, the plan type and the account id; never prints or copies a token.
#   sh .workbench/scripts/account.sh
account_kind() {
  auth="${CODEX_HOME:-$HOME/.codex}/auth.json"
  [ -f "$auth" ] || { echo unknown; return; }
  grep -q '"auth_mode"[[:space:]]*:[[:space:]]*"chatgpt"' "$auth" || { echo unknown; return; }
  tok=$(sed -n 's/.*"id_token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$auth" | head -n 1)
  p=$(printf '%s' "$tok" | cut -d. -f2 | tr '_-' '/+')
  case $(( ${#p} % 4 )) in 2) p="$p==" ;; 3) p="$p=" ;; esac
  claims=$(printf '%s' "$p" | base64 -d 2>/dev/null || printf '%s' "$p" | base64 -D 2>/dev/null)
  plan=$(printf '%s' "$claims" | sed -n 's/.*"chatgpt_plan_type"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
  case "$plan" in
    "") echo unknown; return ;;
    *team*|*business*|*enterprise*|*edu*|*k12*) ;;
    *) echo personal; return ;;
  esac
  id=$(printf '%s' "$claims" | sed -n 's/.*"chatgpt_account_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
  [ -n "$id" ] || { echo unknown; return; }
  hash=$(printf '%s' "$id" | shasum -a 256 2>/dev/null || printf '%s' "$id" | sha256sum 2>/dev/null)
  echo "company $(printf '%s' "$hash" | cut -c1-12)"
}
case "$0" in *account.sh) account_kind ;; esac
