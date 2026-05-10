#!/usr/bin/env bash
# Boot the bagino AVD headlessly with WSL2-friendly flags.
# Designed to be safe to run from a Claude Code session: idempotent, no GUI.

set -euo pipefail

ANDROID_SDK="${ANDROID_SDK:-/home/dewi/code/android-sdk}"
EMULATOR="$ANDROID_SDK/emulator/emulator"
ADB="$ANDROID_SDK/platform-tools/adb"
AVD_NAME="${AVD_NAME:-bagino}"
BOOT_TIMEOUT="${BOOT_TIMEOUT:-180}"

# If an emulator is already up and booted, do nothing.
if "$ADB" devices | grep -q "emulator-.*device$"; then
  echo "[emulator] already running:"
  "$ADB" devices
  exit 0
fi

# Start ADB server explicitly so we don't race with flutter run.
"$ADB" start-server >/dev/null

echo "[emulator] booting AVD '$AVD_NAME' (headless, swiftshader_indirect)…"
nohup "$EMULATOR" -avd "$AVD_NAME" \
  -no-window \
  -no-audio \
  -no-snapshot-save \
  -no-boot-anim \
  -gpu swiftshader_indirect \
  -netdelay none \
  -netspeed full \
  >/tmp/bagino-emulator.log 2>&1 &
EMU_PID=$!
echo "[emulator] pid=$EMU_PID, log=/tmp/bagino-emulator.log"

# Wait for ADB to see it.
echo "[emulator] waiting for adb device…"
"$ADB" wait-for-device

# Wait for full boot.
echo "[emulator] waiting for boot_completed (up to ${BOOT_TIMEOUT}s)…"
deadline=$(( $(date +%s) + BOOT_TIMEOUT ))
while :; do
  status="$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '[:space:]')"
  if [ "$status" = "1" ]; then
    break
  fi
  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "[emulator] FAIL — boot timeout. Tail of log:"
    tail -40 /tmp/bagino-emulator.log
    exit 1
  fi
  sleep 2
done

# Disable lock screen for cleaner test runs.
"$ADB" shell settings put secure lockscreen.disabled 1 || true

echo "[emulator] OK"
"$ADB" devices
