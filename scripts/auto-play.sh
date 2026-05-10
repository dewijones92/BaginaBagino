#!/usr/bin/env bash
# Drive both bagina emulators through a full game by tapping the simplest
# legal action sequence: Take a step → Wrap turn. Whichever device is the
# current player goes; the other waits. Stops when no "Wrap turn" appears
# anywhere for N consecutive checks (game has ended → results page).
#
# Pure UI driving — no privileged hooks. Uses uiautomator dump + input tap.

set -uo pipefail

ADB="${ADB:-/home/dewi/code/android-sdk/platform-tools/adb}"
DEV1="emulator-5582"
DEV2="emulator-5584"
MAX_TURNS="${MAX_TURNS:-90}"
SLEEP_AFTER_TAP="${SLEEP_AFTER_TAP:-0.6}"

dump_xml() {
  local dev=$1 out=$2
  $ADB -s "$dev" shell uiautomator dump /sdcard/d.xml >/dev/null 2>&1 || return 1
  $ADB -s "$dev" pull /sdcard/d.xml "$out" >/dev/null 2>&1
}

# echoes "cx cy" or empty if not found
find_bounds() {
  local xml=$1 desc=$2
  local line
  line=$(grep -oE "content-desc=\"$desc\"[^/]*bounds=\"\[[0-9,]+\]\[[0-9,]+\]\"" "$xml" | head -1)
  [ -z "$line" ] && return 1
  local b
  b=$(echo "$line" | grep -oE 'bounds="\[[0-9,]+\]\[[0-9,]+\]"' | head -1)
  local nums
  nums=$(echo "$b" | grep -oE '[0-9]+')
  read -r x1 y1 x2 y2 <<<"$(echo "$nums" | tr '\n' ' ')"
  echo "$(( (x1+x2)/2 )) $(( (y1+y2)/2 ))"
}

is_active() {
  # XML on stdin path
  local xml=$1
  grep -q 'content-desc="Take a step"' "$xml"
}

has_wrap() {
  local xml=$1
  grep -q 'content-desc="Wrap turn"' "$xml"
}

is_results() {
  local xml=$1
  grep -qE 'content-desc="(Final scores|You absolute legend|Play again)"' "$xml"
}

drive_one() {
  local dev=$1
  local xml=/tmp/auto-${dev}.xml
  dump_xml "$dev" "$xml" || return 1

  if is_results "$xml"; then
    return 9 # endgame
  fi

  if is_active "$xml"; then
    local cxy
    cxy=$(find_bounds "$xml" "Take a step") || return 2
    echo "  [$dev] Take a step ($cxy)"
    $ADB -s "$dev" shell input tap $cxy
    sleep "$SLEEP_AFTER_TAP"

    # After step, post-move actions appear. Tap Wrap turn.
    dump_xml "$dev" "$xml" || return 1
    if has_wrap "$xml"; then
      cxy=$(find_bounds "$xml" "Wrap turn") || return 3
      echo "  [$dev] Wrap turn ($cxy)"
      $ADB -s "$dev" shell input tap $cxy
      sleep "$SLEEP_AFTER_TAP"
    fi
    return 0
  fi
  return 4 # not active here
}

echo "[auto-play] driving game between $DEV1 and $DEV2 (max $MAX_TURNS turns)"
turn=0
endgame_strikes=0
while (( turn < MAX_TURNS )); do
  turn=$((turn+1))
  echo "[turn $turn]"

  # Try bagina1 first; if not active, try bagina2.
  drive_one "$DEV1"
  rc1=$?
  if (( rc1 == 9 )); then
    echo "[auto-play] bagina1 reached endgame screen"
    break
  fi
  if (( rc1 == 4 )); then
    drive_one "$DEV2"
    rc2=$?
    if (( rc2 == 9 )); then
      echo "[auto-play] bagina2 reached endgame screen"
      break
    fi
    if (( rc2 == 4 )); then
      endgame_strikes=$((endgame_strikes+1))
      echo "[auto-play] neither active (strike $endgame_strikes/3)"
      if (( endgame_strikes >= 3 )); then
        echo "[auto-play] no active player after 3 checks — game likely ended"
        break
      fi
      sleep 1
      continue
    fi
  fi
  endgame_strikes=0
done

echo "[auto-play] stopping after $turn turns"
$ADB -s "$DEV1" exec-out screencap -p > /home/dewi/BaginaBagino/dev/recordings/full-game-bagina1-end.png
$ADB -s "$DEV2" exec-out screencap -p > /home/dewi/BaginaBagino/dev/recordings/full-game-bagina2-end.png
echo "[auto-play] end screenshots saved"
