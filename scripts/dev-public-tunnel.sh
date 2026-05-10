#!/usr/bin/env bash
# Open / close the SSH reverse tunnel that exposes the laptop's Flutter dev
# server (port 8888) and bagina-server (port 3001) at
# https://333133333.xyz/bagina-dev/.
#
# Usage:
#   bash scripts/dev-public-tunnel.sh up      # bring tunnel up
#   bash scripts/dev-public-tunnel.sh down    # tear it down
#   bash scripts/dev-public-tunnel.sh status  # is it alive?
#
# Requires:
#   - SSH key auth to pi@333133333.xyz (no password prompt)
#   - GatewayPorts yes in Pi's sshd_config (already configured)
#   - bagina-dev-firewall.service active on Pi (already installed)

set -uo pipefail

PI="${PI:-pi@333133333.xyz}"
PIDFILE=/tmp/bagina-dev-tunnel.pid

case "${1:-up}" in
  up)
    if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
      echo "[tunnel] already up (pid=$(cat "$PIDFILE"))"
      exit 0
    fi
    # Match-and-kill any stray ssh -R from a previous session
    pkill -f "ssh.*-R.*8888.*localhost:8888.*$PI" 2>/dev/null || true
    sleep 0.5
    ssh -fN \
      -o ServerAliveInterval=30 \
      -o ServerAliveCountMax=3 \
      -o ExitOnForwardFailure=yes \
      -R 0.0.0.0:8888:localhost:8888 \
      -R 0.0.0.0:3001:localhost:3001 \
      "$PI"
    # ssh -fN backgrounds itself; find the pid by command line match.
    sleep 1
    PID=$(pgrep -fn "ssh.*-R 0.0.0.0:8888:localhost:8888.*$PI" || true)
    if [ -z "$PID" ]; then
      echo "[tunnel] FAIL — could not establish"
      exit 1
    fi
    echo "$PID" > "$PIDFILE"
    echo "[tunnel] up — pid=$PID"
    echo "[tunnel] live at https://333133333.xyz/bagina-dev/"
    ;;
  down)
    if [ -f "$PIDFILE" ]; then
      kill "$(cat "$PIDFILE")" 2>/dev/null || true
      rm -f "$PIDFILE"
    fi
    pkill -f "ssh.*-R 0.0.0.0:8888:localhost:8888.*$PI" 2>/dev/null || true
    echo "[tunnel] down"
    ;;
  status)
    if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
      echo "[tunnel] alive pid=$(cat "$PIDFILE")"
      curl -s -o /dev/null -w "  HTTP %{http_code} from https://333133333.xyz/bagina-dev/\n" https://333133333.xyz/bagina-dev/
    else
      echo "[tunnel] not running"
      exit 1
    fi
    ;;
  *)
    echo "Usage: $0 {up|down|status}" >&2
    exit 1
    ;;
esac
