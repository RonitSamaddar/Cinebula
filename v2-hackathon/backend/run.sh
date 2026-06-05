#!/bin/bash
# Run from the backend/ directory
set -euo pipefail
cd "$(dirname "$0")"

# ── Kill existing :8080 ──────────────────────────────────────────────────────
EXISTING=$(lsof -ti tcp:8080 2>/dev/null || true)
if [ -n "$EXISTING" ]; then
  echo "Killing existing process on :8080 (PID $EXISTING)..."
  kill -9 "$EXISTING"
  sleep 0.3
fi

# ── Start Meilisearch ────────────────────────────────────────────────────────
if ! command -v meilisearch &>/dev/null; then
  echo "ERROR: 'meilisearch' binary not found."
  echo "Install with: brew install meilisearch"
  exit 1
fi

MEILI_PID=$(lsof -ti tcp:7700 2>/dev/null || true)
if [ -n "$MEILI_PID" ]; then
  echo "Killing existing Meilisearch on :7700 (PID $MEILI_PID)..."
  kill -9 "$MEILI_PID"
  sleep 0.5
fi

mkdir -p ./data-dirs/meilisearch
mkdir -p ./data-dirs/meili-db

if [ -n "${MEILI_MASTER_KEY:-}" ]; then
  meilisearch \
    --db-path ./data-dirs/meili-db \
    --http-addr 127.0.0.1:7700 \
    --master-key "$MEILI_MASTER_KEY" \
    --no-analytics \
    >> ./data-dirs/meilisearch/meilisearch.log 2>&1 &
else
  meilisearch \
    --db-path ./data-dirs/meili-db \
    --http-addr 127.0.0.1:7700 \
    --no-analytics \
    >> ./data-dirs/meilisearch/meilisearch.log 2>&1 &
fi
MEILI_PROC=$!
echo "Meilisearch starting (PID $MEILI_PROC)..."

# ── Wait for Meilisearch health ──────────────────────────────────────────────
echo -n "Waiting for Meilisearch"
for i in $(seq 1 40); do
  if curl -sf http://127.0.0.1:7700/health >/dev/null 2>&1; then
    echo " ready."
    break
  fi
  echo -n "."
  sleep 0.5
  if [ "$i" -eq 40 ]; then
    echo " TIMEOUT"
    echo "Check ./data-dirs/meilisearch/meilisearch.log for errors."
    kill "$MEILI_PROC" 2>/dev/null || true
    exit 1
  fi
done

# ── Index movies into Meilisearch (~2-4s, skipped if already indexed) ────────
echo "Running movie indexer..."
go run ./cmd/indexer
echo "Indexer done."

# ── Start server ─────────────────────────────────────────────────────────────
echo "Starting Cinebula backend on :8080..."
go run ./cmd/server
