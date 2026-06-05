#!/bin/bash
set -euo pipefail

IMAGE="docker.io/library/cinebula-backend:latest"
CONTAINER_NAME="cinebula-backend"

# Stop and remove existing container if running
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "Stopping existing container..."
  docker stop "$CONTAINER_NAME" 2>/dev/null || true
  docker rm "$CONTAINER_NAME" 2>/dev/null || true
fi

echo "Starting Cinebula backend..."
docker run -d \
  --name "$CONTAINER_NAME" \
  -p 8080:8080 \
  -p 7700:7700 \
  --restart unless-stopped \
  "$IMAGE"

echo "Container started. Backend available at http://localhost:8080"
echo "Meilisearch available at http://localhost:7700"
echo ""
echo "Logs: docker logs -f $CONTAINER_NAME"
