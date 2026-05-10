#!/usr/bin/env bash
# Run the server with watch + SQLite in /tmp.
set -euo pipefail
export PORT="${PORT:-3001}"
export DATA_DIR="${DATA_DIR:-/tmp/bagina-dev}"
export BASE_PATH="${BASE_PATH:-/}"
mkdir -p "$DATA_DIR"
exec pnpm --filter server run dev
