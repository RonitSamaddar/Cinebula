#!/bin/bash
set -euo pipefail

# ── Start Meilisearch ────────────────────────────────────────────────────────
mkdir -p /app/data-dirs/meilisearch /app/data-dirs/meili-db

if [ -n "${MEILI_MASTER_KEY:-}" ]; then
  meilisearch \
    --db-path /app/data-dirs/meili-db \
    --http-addr 0.0.0.0:7700 \
    --master-key "$MEILI_MASTER_KEY" \
    --no-analytics \
    >> /app/data-dirs/meilisearch/meilisearch.log 2>&1 &
else
  meilisearch \
    --db-path /app/data-dirs/meili-db \
    --http-addr 0.0.0.0:7700 \
    --no-analytics \
    >> /app/data-dirs/meilisearch/meilisearch.log 2>&1 &
fi

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
    cat /app/data-dirs/meilisearch/meilisearch.log
    exit 1
  fi
done

# ── Index movies ─────────────────────────────────────────────────────────────
echo "Running movie indexer..."
/app/bin/indexer
echo "Indexer done."

# ── Start server ─────────────────────────────────────────────────────────────
echo "Starting Cinebula backend on :8080..."
exec /app/bin/server
