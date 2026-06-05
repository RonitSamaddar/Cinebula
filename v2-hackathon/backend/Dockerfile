# ── Build stage ───────────────────────────────────────────────────────────────
FROM golang:latest AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o /app/bin/server ./cmd/server
RUN CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o /app/bin/indexer ./cmd/indexer

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Meilisearch
RUN curl -L https://install.meilisearch.com | sh \
    && mv ./meilisearch /usr/local/bin/meilisearch \
    && chmod +x /usr/local/bin/meilisearch

WORKDIR /app

# Copy built binaries
COPY --from=builder /app/bin/server /app/bin/server
COPY --from=builder /app/bin/indexer /app/bin/indexer

# Copy data files
COPY databases/ /app/databases/
COPY data-dirs/ /app/data-dirs/

# Create required directories
RUN mkdir -p /app/data-dirs/meilisearch /app/data-dirs/meili-db

# Copy entrypoint
COPY --chmod=755 entrypoint.sh /app/entrypoint.sh

EXPOSE 8080 7700

ENTRYPOINT ["/app/entrypoint.sh"]
