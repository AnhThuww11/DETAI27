#!/usr/bin/env bash
set -euo pipefail
URL="${1:-http://detai27.local/}"
COUNT="${2:-1200}"
DELAY="${DELAY:-0.1}"
echo "Sending $COUNT requests to $URL (Host header/ingress routing must work)"
for ((i=1;i<=COUNT;i++)); do
  curl -sS -o /dev/null --max-time 5 -w '%{http_code}\n' "$URL" || true
  sleep "$DELAY"
done
