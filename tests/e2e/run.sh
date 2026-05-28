#!/usr/bin/env bash
# Repeatable Electron renderer E2E. Ensures a clean single-instance state:
#   1. kill any running dev app + stale Electron (which holds the single-instance lock)
#   2. start the renderer vite dev server standalone on :5273 (VITE_DEV mode)
#   3. run the playwright _electron driver against the real Electron window
#
# Usage: bash tests/e2e/run.sh
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "[e2e] stopping dev app + stale electron (frees single-instance lock)…"
pkill -f "concurrently -k -n main,renderer" 2>/dev/null
pkill -f "electron@33.4.11" 2>/dev/null
sleep 2

if ! lsof -nP -tiTCP:5273 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "[e2e] starting renderer vite on :5273…"
  ( pnpm --filter @c-suite/renderer dev >/tmp/e2e-vite.log 2>&1 & )
  for i in $(seq 1 30); do
    lsof -nP -tiTCP:5273 -sTCP:LISTEN >/dev/null 2>&1 && break
    sleep 1
  done
fi
lsof -nP -tiTCP:5273 -sTCP:LISTEN >/dev/null 2>&1 && echo "[e2e] vite :5273 UP" || { echo "[e2e] vite failed to start"; tail -20 /tmp/e2e-vite.log; exit 1; }

echo "[e2e] launching Electron under Playwright…"
node tests/e2e/electron-renderer-smoke.mjs
code=$?
echo "[e2e] driver exit: $code"
exit $code
