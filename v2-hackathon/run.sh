#!/bin/bash
set -e

# Ports
BACKEND_PORT=8080
FRONTEND_PORT=8010

# Directories
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend/app"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

cleanup() {
    echo -e "\n${RED}Shutting down all services...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    # Kill Meilisearch too
    lsof -ti:7700 | xargs kill 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM

# Kill anything on our ports
echo "Cleaning up existing processes..."
lsof -ti:$BACKEND_PORT | xargs kill 2>/dev/null || true
lsof -ti:$FRONTEND_PORT | xargs kill 2>/dev/null || true
lsof -ti:7700 | xargs kill 2>/dev/null || true
sleep 1

# --- Backend (port 8080) ---
echo -e "${GREEN}Starting backend on :$BACKEND_PORT ...${NC}"
cd "$BACKEND_DIR"
bash run.sh &
BACKEND_PID=$!
sleep 5

# --- Frontend (port 8010) ---
echo -e "${GREEN}Starting frontend on :$FRONTEND_PORT (HTTPS)...${NC}"
cd "$FRONTEND_DIR"
PORT=$FRONTEND_PORT npx next dev -p $FRONTEND_PORT --hostname 0.0.0.0 --experimental-https --experimental-https-key ./certs/key.pem --experimental-https-cert ./certs/cert.pem &
FRONTEND_PID=$!
sleep 3

echo ""
echo -e "${GREEN}All services running:${NC}"
echo "  Backend:          http://localhost:$BACKEND_PORT"
echo "  Backend (queue):  http://localhost:$BACKEND_PORT/api/queue"
echo "  Frontend:         https://localhost:$FRONTEND_PORT"
echo "  Frontend (phone): https://10.4.0.215:$FRONTEND_PORT"
echo "  LG Homescreen:    https://10.4.0.215:$FRONTEND_PORT/tv.html"
echo ""
echo "Press Ctrl+C to stop all services."

wait
