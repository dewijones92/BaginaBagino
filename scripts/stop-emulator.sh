#!/usr/bin/env bash
# Stop ONLY the bagina emulator (port 5582). Never touches other emulators.
set -euo pipefail
ADB="${ADB:-/home/dewi/code/android-sdk/platform-tools/adb}"
EMU_PORT="${BAGINA_EMU_PORT:-5582}"
DEVICE_ID="emulator-$EMU_PORT"
PID_FILE="${BAGINA_PID_FILE:-/tmp/bagina-emulator.pid}"

if "$ADB" devices | awk -v dev="$DEVICE_ID" '$1==dev {found=1} END{exit !found}'; then
  "$ADB" -s "$DEVICE_ID" emu kill || true
  echo "[bagina-emu] stop signal sent to $DEVICE_ID"
fi

if [ -f "$PID_FILE" ]; then
  pid="$(cat "$PID_FILE")"
  if kill -0 "$pid" 2>/dev/null; then
    sleep 2
    kill -0 "$pid" 2>/dev/null && kill "$pid"
  fi
  rm -f "$PID_FILE"
fi

echo "[bagina-emu] stopped"
