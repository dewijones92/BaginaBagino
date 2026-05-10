#!/usr/bin/env bash
# Run the Flutter client. Use the bagino AVD by default; pass `web` to use Chrome.
set -euo pipefail

FLUTTER_BIN="${FLUTTER_BIN:-/home/dewi/code/flutter/bin/flutter}"
EMU_PORT="${BAGINA_EMU_PORT:-5582}"
DEVICE_ID="emulator-$EMU_PORT"
TARGET="${1:-emulator}"

case "$TARGET" in
  web)
    cd client && exec "$FLUTTER_BIN" run -d chrome \
      --dart-define=SERVER_HOST=localhost \
      --dart-define=SERVER_PORT=3001
    ;;
  emulator)
    bash "$(dirname "$0")/run-emulator.sh"
    cd client && exec "$FLUTTER_BIN" run -d "$DEVICE_ID" \
      --dart-define=SERVER_HOST=10.0.2.2 \
      --dart-define=SERVER_PORT=3001
    ;;
  pi)
    bash "$(dirname "$0")/run-emulator.sh"
    cd client && exec "$FLUTTER_BIN" run -d "$DEVICE_ID" \
      --dart-define=SERVER_HOST=333133333.xyz \
      --dart-define=SERVER_PATH=/bagina \
      --dart-define=SERVER_TLS=true
    ;;
  *)
    echo "Usage: $0 [web|emulator|pi]" >&2
    exit 1
    ;;
esac
