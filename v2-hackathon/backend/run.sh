#!/bin/bash
# Run from the backend/ directory
cd "$(dirname "$0")"

# Kill anything already on port 8080
EXISTING=$(lsof -ti tcp:8080)
if [ -n "$EXISTING" ]; then
  echo "Killing existing process on :8080 (PID $EXISTING) ..."
  kill -9 $EXISTING
  sleep 0.3
fi

echo "Starting Cinebula backend on :8080 ..."
go run ./cmd/server
