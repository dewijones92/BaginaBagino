#!/usr/bin/env bash
# Hybrid endgame test: bagina1 (real Flutter UI) creates a room, a Node bot
# joins as the second player and auto-pilots its turns via the playtest
# policy. We drive bagina1's turns via adb tap. Game runs to GameEnded.
# We screenshot bagina1's UI at every milestone — particularly the
# results screen — to prove the endgame UI renders.
#
# Run: bash scripts/uitest-endgame.sh
#   Requires emulator-5582 already up and APK installed.

set -uo pipefail

ADB="${ADB:-/home/dewi/code/android-sdk/platform-tools/adb}"
B1="emulator-5582"
REC=/home/dewi/BaginaBagino/dev/recordings
ROOT=/home/dewi/BaginaBagino

dump() {
  $ADB -s "$B1" shell uiautomator dump /sdcard/d.xml >/dev/null 2>&1 || return 1
  $ADB -s "$B1" pull /sdcard/d.xml /tmp/b1.xml >/dev/null 2>&1
}

center_for_desc_substring() {
  local needle=$1
  python3 - /tmp/b1.xml "$needle" <<'PY'
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
if not matches: sys.exit(1)
matches.sort()
_,x1,y1,x2,y2 = matches[0]
print(f"{(x1+x2)//2} {(y1+y2)//2}")
PY
}

tap() { $ADB -s "$B1" shell input tap $1 $2; }

# Step 1: nickname + create room on bagina1
echo "=== bagina1 setup ==="
$ADB -s "$B1" shell am force-stop com.dewijones92.bagina
$ADB -s "$B1" shell am start -n com.dewijones92.bagina/.MainActivity >/dev/null
sleep 5
dump
NICK_XY=$(python3 - /tmp/b1.xml <<'PY'
import sys, re, xml.etree.ElementTree as ET
tree = ET.parse(sys.argv[1] if len(sys.argv)>1 else '/tmp/b1.xml')
edits = [n for n in tree.iter('node') if n.attrib.get('class','').endswith('EditText')]
b = edits[0].attrib.get('bounds','')
m = re.match(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', b)
x1,y1,x2,y2 = map(int,m.groups())
print(f"{(x1+x2)//2} {(y1+y2)//2}")
PY
)
echo "  nickname field $NICK_XY"
$ADB -s "$B1" shell input tap $NICK_XY
sleep 0.5
$ADB -s "$B1" shell input text "UIPlayer"
sleep 0.7
# Don't press BACK — Flutter pops the app. Just tap on the title (above
# the keyboard) to take focus off the field.
$ADB -s "$B1" shell input tap 540 280
sleep 0.7
dump
CREATE_XY=$(center_for_desc_substring "Create room")
if [ -z "$CREATE_XY" ]; then
  echo "  no Create button visible — re-trying after extra sleep"
  sleep 2
  dump
  CREATE_XY=$(center_for_desc_substring "Create room")
fi
echo "  create btn $CREATE_XY"
[ -z "$CREATE_XY" ] && { $ADB -s "$B1" exec-out screencap -p > "$REC/uitest-fail-no-create.png"; exit 1; }
tap $CREATE_XY
sleep 4

# Read room code
dump
CODE=$(python3 - <<'PY'
import re
xml = open('/tmp/b1.xml').read()
m = re.search(r'content-desc="Room code[\\\s]*[\n\s]*([A-Z0-9]{4})', xml)
if m:
    print(m.group(1)); raise SystemExit
m = re.search(r'"Room code[^"]*?([A-Z0-9]{4})', xml.replace('\\n',' '))
if m: print(m.group(1))
PY
)
echo "  ROOM=$CODE"
[ -z "$CODE" ] && { echo "FAIL — no room code"; $ADB -s "$B1" exec-out screencap -p > "$REC/uitest-fail-no-code.png"; exit 1; }

$ADB -s "$B1" exec-out screencap -p > "$REC/uitest-lobby-1p.png"

# Step 2: spawn programmatic bot joiner in background
echo "=== bot joining room $CODE ==="
cd "$ROOT"
ROOM_CODE="$CODE" pnpm --filter server exec tsx tests/e2e/uitest-bot.ts >/tmp/bot.log 2>&1 &
BOT_PID=$!
echo "  bot pid=$BOT_PID"
sleep 4

# Step 3: ready bagina1
dump
$ADB -s "$B1" exec-out screencap -p > "$REC/uitest-lobby-2p.png"
READY_XY=$(center_for_desc_substring "I'm ready, let's go")
echo "  ready btn $READY_XY"
tap $READY_XY
sleep 4

# Step 4: loop - on bagina1's turn tap step+wrap; bot handles its own turns
echo "=== game loop ==="
turn=0
empty_strikes=0
MAX=120
while (( turn < MAX )); do
  turn=$((turn+1))
  if ! kill -0 $BOT_PID 2>/dev/null; then
    echo "  bot exited — game likely over"
    break
  fi
  dump || { sleep 2; continue; }
  if grep -qE 'content-desc="(Final scores|Play again|You absolute legend|We have a winner|Game over|absolute legend)"' /tmp/b1.xml; then
    echo "  endgame UI on bagina1 at turn $turn"
    break
  fi
  if grep -q 'content-desc="Take a step"' /tmp/b1.xml; then
    XY=$(center_for_desc_substring "Take a step")
    tap $XY
    sleep 0.8
    dump
    if grep -q 'content-desc="Wrap turn"' /tmp/b1.xml; then
      WXY=$(center_for_desc_substring "Wrap turn")
      tap $WXY
      sleep 0.8
    fi
    echo "[turn $turn] bagina1 stepped"
    empty_strikes=0
  else
    empty_strikes=$((empty_strikes+1))
    sleep 1
    if (( empty_strikes >= 8 )); then
      echo "  no actions for 8 strikes — break"
      break
    fi
  fi
done

# Final screenshots
$ADB -s "$B1" exec-out screencap -p > "$REC/uitest-endgame.png"
echo ""
echo "=== bot log ==="
cat /tmp/bot.log
wait $BOT_PID 2>/dev/null
echo "[done] bagina1 played $turn turns"
