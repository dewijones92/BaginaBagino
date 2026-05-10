#!/usr/bin/env bash
# Boot the bagino AVD on a *dedicated port* so we never collide with other
# emulators that might be running on this machine (e.g., other AI agents).
#
# We own port 5582 (console) / 5583 (adb). PID lives in /tmp/bagina-emulator.pid.
# This script only ever starts, checks, or stops THAT specific instance.

set -euo pipefail

ANDROID_SDK="${ANDROID_SDK:-/home/dewi/code/android-sdk}"
EMULATOR="$ANDROID_SDK/emulator/emulator"
ADB="$ANDROID_SDK/platform-tools/adb"
AVD_NAME="${AVD_NAME:-bagino}"
EMU_PORT="${BAGINA_EMU_PORT:-5582}"
DEVICE_ID="emulator-$EMU_PORT"
PID_FILE="${BAGINA_PID_FILE:-/tmp/bagina-emulator.pid}"
LOG_FILE="${BAGINA_LOG_FILE:-/tmp/bagina-emulator.log}"
BOOT_TIMEOUT="${BOOT_TIMEOUT:-180}"

# Ensure the port is even — Android emulator requires it.
if (( EMU_PORT % 2 != 0 )); then
  echo "[bagina-emu] FAIL — emulator console port must be even, got $EMU_PORT" >&2
  exit 1
fi

# Make sure adb server is up; never racing flutter or other tools.
"$ADB" start-server >/dev/null

# If our specific device is already a known live device, do nothing.
if "$ADB" devices | awk -v dev="$DEVICE_ID" '$1==dev && $2=="device" {found=1} END{exit !found}'; then
  echo "[bagina-emu] already up: $DEVICE_ID"
  exit 0
fi

# If our PID file points at a live process, but adb hasn't connected yet, wait for it.
if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "[bagina-emu] booting (pid $(cat "$PID_FILE"))…"
else
  # Refuse to take a port that something else is already using.
  if ss -ltn | awk -v p=":$EMU_PORT" '$4 ~ p {found=1} END{exit !found}'; then
    echo "[bagina-emu] FAIL — port $EMU_PORT is already in use by another process. Set BAGINA_EMU_PORT to a free even port." >&2
    exit 1
  fi

  echo "[bagina-emu] booting AVD '$AVD_NAME' on port $EMU_PORT (headless, swiftshader_indirect)…"
  nohup "$EMULATOR" -avd "$AVD_NAME" \
    -port "$EMU_PORT" \
    -no-window \
    -no-audio \
    -no-snapshot-save \
    -no-boot-anim \
    -gpu swiftshader_indirect \
    -netdelay none \
    -netspeed full \
    >"$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"
  echo "[bagina-emu] pid=$(cat "$PID_FILE") log=$LOG_FILE"
fi

# Wait for the device-id to appear in adb.
echo "[bagina-emu] waiting for $DEVICE_ID to register with adb…"
deadline=$(( $(date +%s) + 60 ))
while ! "$ADB" devices | awk -v dev="$DEVICE_ID" '$1==dev {found=1} END{exit !found}'; do
  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "[bagina-emu] FAIL — $DEVICE_ID never registered." >&2
    tail -40 "$LOG_FILE" >&2 || true
    exit 1
  fi
  sleep 2
done

# Wait for full boot (boot_completed=1).
echo "[bagina-emu] waiting for boot_completed (up to ${BOOT_TIMEOUT}s)…"
deadline=$(( $(date +%s) + BOOT_TIMEOUT ))
while :; do
  status="$("$ADB" -s "$DEVICE_ID" shell getprop sys.boot_completed 2>/dev/null | tr -d '[:space:]')"
  if [ "$status" = "1" ]; then
    break
  fi
  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "[bagina-emu] FAIL — boot timeout. Tail of log:" >&2
    tail -40 "$LOG_FILE" >&2
    exit 1
  fi
  sleep 2
done

"$ADB" -s "$DEVICE_ID" shell settings put secure lockscreen.disabled 1 || true

echo "[bagina-emu] OK — $DEVICE_ID ready"
"$ADB" devices
