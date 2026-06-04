#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "================================================"
echo "  Cinebula — Integration Tests"
echo "================================================"

go test ./integration-tests/... -v -count=1 "$@"
