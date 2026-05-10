#!/usr/bin/env bash
# Drive a full 2-player game on bagina1+bagina2 emulators.
# Steps: nickname → create on b1 → read code → join on b2 → ready both → loop turn cycle to end.

set -uo pipefail

ADB="${ADB:-/home/dewi/code/android-sdk/platform-tools/adb}"
B1="emulator-5582"
B2="emulator-5584"
REC=/home/dewi/BaginaBagino/dev/recordings

dump() {
  local dev=$1 out=$2
  $ADB -s "$dev" shell uiautomator dump /sdcard/d.xml >/dev/null 2>&1 || return 1
  $ADB -s "$dev" pull /sdcard/d.xml "$out" >/dev/null 2>&1
}

# echo "cx cy" for a content-desc value (substring match — tolerates Flutter
# semantic-merging where parent nodes carry combined descs like
# "Start a new room\nCreate room").
center_for_desc() {
  local xml=$1 desc=$2
  local nums
  nums=$(python3 - "$xml" "$desc" <<'PY'
import sys, re, xml.etree.ElementTree as ET
xml, needle = sys.argv[1], sys.argv[2]
tree = ET.parse(xml)
matches = []
for n in tree.iter('node'):
    cd = n.attrib.get('content-desc','')
    if needle in cd and n.attrib.get('clickable','') == 'true':
        m = re.match(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', n.attrib.get('bounds',''))
        if m:
            x1,y1,x2,y2 = map(int,m.groups())
            matches.append((x2-x1, x1, y1, x2, y2))
# Prefer the smallest matching node (most specific)
if not matches:
    sys.exit(1)
matches.sort()
_, x1, y1, x2, y2 = matches[0]
print(f"{(x1+x2)//2} {(y1+y2)//2}")
PY
)
  [ -z "$nums" ] && return 1
  echo "$nums"
}

# echo "cx cy" for a text= value
center_for_text() {
  local xml=$1 text=$2
  local b
  b=$(grep -oE "text=\"$text\"[^/]*bounds=\"\[[0-9,]+\]\[[0-9,]+\]\"" "$xml" | head -1 | grep -oE 'bounds="\[[0-9,]+\]\[[0-9,]+\]"' | grep -oE '[0-9]+')
  [ -z "$b" ] && return 1
  read -r x1 y1 x2 y2 <<<"$(echo "$b" | tr '\n' ' ')"
  echo "$(( (x1+x2)/2 )) $(( (y1+y2)/2 ))"
}

tap_desc() {
  local dev=$1 xml=$2 desc=$3
  local cxy
  cxy=$(center_for_desc "$xml" "$desc") || { echo "  [FAIL] desc '$desc' not found on $dev"; return 1; }
  echo "  [$dev] tap '$desc' @ $cxy"
  $ADB -s "$dev" shell input tap $cxy
}

# Find the editable text field bounds (nickname or code field).
center_for_field() {
  local xml=$1 hint=$2
  # Hint text appears in content-desc for accessible labels. Otherwise look for an EditText.
  python3 - "$xml" "$hint" <<'PY'
import sys, re, xml.etree.ElementTree as ET
xml, hint = sys.argv[1], sys.argv[2]
tree = ET.parse(xml)
for n in tree.iter('node'):
    if n.attrib.get('class','').endswith('EditText'):
        # Walk up siblings — heuristic: text or content-desc near hint.
        pass
# Simpler: just find the FIRST EditText
for n in tree.iter('node'):
    if n.attrib.get('class','').endswith('EditText'):
        b = n.attrib.get('bounds','')
        m = re.match(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', b)
        if m:
            x1,y1,x2,y2 = map(int,m.groups())
            print(f"{(x1+x2)//2} {(y1+y2)//2}")
            sys.exit(0)
sys.exit(1)
PY
}

# Step 1: nicknames
echo "=== nicknames ==="
dump "$B1" /tmp/b1.xml
dump "$B2" /tmp/b2.xml

# bagina1 nickname
NICK1_XY=$(center_for_field /tmp/b1.xml nickname)
NICK2_XY=$(center_for_field /tmp/b2.xml nickname)
echo "  b1 nickname field: $NICK1_XY"
echo "  b2 nickname field: $NICK2_XY"

$ADB -s "$B1" shell input tap $NICK1_XY
sleep 0.4
$ADB -s "$B1" shell input text "SirRuffles"
sleep 0.4
# Hide IME by tapping outside
$ADB -s "$B1" shell input tap 540 200
sleep 0.4

$ADB -s "$B2" shell input tap $NICK2_XY
sleep 0.4
$ADB -s "$B2" shell input text "LadyBuns"
sleep 0.4
$ADB -s "$B2" shell input tap 540 200
sleep 0.4

# Step 2: bagina1 create room
echo "=== bagina1 creates room ==="
dump "$B1" /tmp/b1.xml
tap_desc "$B1" /tmp/b1.xml "Create room" || exit 1
sleep 3

# Step 3: read code from bagina1's lobby
dump "$B1" /tmp/b1.xml
CODE=$(grep -oE 'content-desc="Room code\\n[A-Z0-9]{4}\\n[^"]*"' /tmp/b1.xml | head -1 | grep -oE '[A-Z0-9]{4}' | head -1)
if [ -z "$CODE" ]; then
  # alt: content-desc might be split, try text
  CODE=$(grep -oE '"Room code[^"]*"' /tmp/b1.xml | grep -oE '[A-Z0-9]{4}' | head -1)
fi
echo "  ROOM=$CODE"
[ -z "$CODE" ] && { echo "FAIL — couldn't read room code"; exit 1; }

# Step 4: bagina2 enters code and joins
echo "=== bagina2 joins $CODE ==="
dump "$B2" /tmp/b2.xml
# Find Room code field — the second EditText (after nickname). Use python to pick the second one.
CODE_XY=$(python3 - /tmp/b2.xml <<'PY'
import sys, re, xml.etree.ElementTree as ET
xml = sys.argv[1]
tree = ET.parse(xml)
edits = [n for n in tree.iter('node') if n.attrib.get('class','').endswith('EditText')]
if len(edits) < 2:
    sys.exit(1)
b = edits[1].attrib.get('bounds','')
m = re.match(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', b)
x1,y1,x2,y2 = map(int,m.groups())
print(f"{(x1+x2)//2} {(y1+y2)//2}")
PY
)
echo "  b2 code field: $CODE_XY"
$ADB -s "$B2" shell input tap $CODE_XY
sleep 0.4
$ADB -s "$B2" shell input text "$CODE"
sleep 0.4
$ADB -s "$B2" shell input tap 540 200
sleep 0.4
dump "$B2" /tmp/b2.xml
tap_desc "$B2" /tmp/b2.xml "Join room" || exit 1
sleep 3

# Step 5: ready both
echo "=== ready both ==="
for i in 1 2 3; do
  dump "$B1" /tmp/b1.xml
  if grep -q "I'm ready" /tmp/b1.xml; then break; fi
  sleep 1
done
tap_desc "$B1" /tmp/b1.xml "I'm ready, let's go" || exit 1
sleep 1
dump "$B2" /tmp/b2.xml
tap_desc "$B2" /tmp/b2.xml "I'm ready, let's go" || exit 1
sleep 3

$ADB -s "$B1" exec-out screencap -p > "$REC/full-game-bagina1-start.png"
$ADB -s "$B2" exec-out screencap -p > "$REC/full-game-bagina2-start.png"

# Step 6: loop turns until game ends
echo "=== auto-play loop ==="
turn=0
endgame_strikes=0
MAX=160
while (( turn < MAX )); do
  turn=$((turn+1))
  acted=0
  for DEV in "$B1" "$B2"; do
    dump "$DEV" "/tmp/${DEV}.xml" || continue
    XML="/tmp/${DEV}.xml"
    if grep -qE 'content-desc="(Final scores|Play again|You absolute legend|We have a winner|Game over)"' "$XML"; then
      echo "[turn $turn] $DEV reached endgame"
      $ADB -s "$B1" exec-out screencap -p > "$REC/full-game-bagina1-end.png"
      $ADB -s "$B2" exec-out screencap -p > "$REC/full-game-bagina2-end.png"
      exit 0
    fi
    if grep -q 'content-desc="Take a step"' "$XML"; then
      tap_desc "$DEV" "$XML" "Take a step" >/dev/null
      sleep 0.7
      dump "$DEV" "$XML"
      if grep -q 'content-desc="Wrap turn"' "$XML"; then
        tap_desc "$DEV" "$XML" "Wrap turn" >/dev/null
        sleep 0.7
      fi
      acted=1
      echo "[turn $turn] $DEV took a turn"
      break
    fi
  done
  if (( acted == 0 )); then
    endgame_strikes=$((endgame_strikes+1))
    echo "[turn $turn] no actor (strike $endgame_strikes/4)"
    if (( endgame_strikes >= 4 )); then
      echo "stopping — likely endgame or stuck"
      break
    fi
    sleep 1.5
  else
    endgame_strikes=0
  fi
done

$ADB -s "$B1" exec-out screencap -p > "$REC/full-game-bagina1-end.png"
$ADB -s "$B2" exec-out screencap -p > "$REC/full-game-bagina2-end.png"
echo "[done] played $turn turns"
