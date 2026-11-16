#!/usr/bin/env bash
set -euo pipefail
URL="${1:-http://127.0.0.1:8081/}"
COUNT="${2:-0}" # 0 means continuous until Ctrl+C
HOST="${HOST_HEADER:-canary.local}"
DELAY="${DELAY:-0.05}"
i=0
while [[ "$COUNT" == "0" || "$i" -lt "$COUNT" ]]; do
  i=$((i+1))
  code=$(curl -sS -o /dev/null --max-time 5 -H "Host: $HOST" -w '%{http_code}' "$URL" || echo 'ERR')
  printf '%s %s
' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$code"
  sleep "$DELAY"
done
