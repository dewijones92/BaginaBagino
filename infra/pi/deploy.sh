#!/usr/bin/env bash
# Deploy bagina-server to the Pi:
#   1. ssh in, git pull the repo
#   2. docker compose up -d --build
#   3. drop the nginx location snippet into nginx_dewi (idempotent)
#   4. nginx -t + reload
#   5. smoke-test the public URL

set -euo pipefail

PI_HOST="${PI_HOST:-pi@333133333.xyz}"
REPO_DIR="${REPO_DIR:-/home/pi/code/BaginaBagino}"
NGINX_CONTAINER="${NGINX_CONTAINER:-nginx_dewi}"
PUBLIC_URL="${PUBLIC_URL:-https://333133333.xyz/bagina/healthz}"

echo "[deploy] pulling repo on $PI_HOST"
ssh "$PI_HOST" "cd '$REPO_DIR' && git fetch --all && git reset --hard origin/main"

echo "[deploy] building and (re)starting bagina-server container"
ssh "$PI_HOST" "cd '$REPO_DIR/infra/pi' && docker compose up -d --build"

echo "[deploy] installing nginx location snippet"
ssh "$PI_HOST" bash -s <<'REMOTE'
set -euo pipefail
SNIPPET="/home/pi/code/BaginaBagino/infra/pi/nginx-bagina.conf"
TARGET_DIR="/etc/nginx/conf.d"

# Copy the snippet into the running nginx container at a known name.
docker cp "$SNIPPET" nginx_dewi:$TARGET_DIR/bagina.locations.conf

# Make sure default.conf includes our snippet (idempotent).
DEFAULT_CONF="$TARGET_DIR/default.conf"
if ! docker exec nginx_dewi grep -q 'bagina.locations.conf' "$DEFAULT_CONF"; then
  # Insert `include /etc/nginx/conf.d/bagina.locations.conf;` just before the
  # last `}` in default.conf (which closes the server { ... } block).
  docker exec nginx_dewi sh -c "
    awk '
      { lines[NR] = \$0 }
      END {
        for (i = NR; i >= 1; i--) {
          if (lines[i] ~ /^}/) { last = i; break }
        }
        for (i = 1; i <= NR; i++) {
          if (i == last) print \"    include /etc/nginx/conf.d/bagina.locations.conf;\"
          print lines[i]
        }
      }
    ' $DEFAULT_CONF > /tmp/default.conf.new && mv /tmp/default.conf.new $DEFAULT_CONF
  "
fi

# Validate and reload.
docker exec nginx_dewi nginx -t
docker exec nginx_dewi nginx -s reload
REMOTE

echo "[deploy] hitting $PUBLIC_URL"
sleep 2
curl -sf "$PUBLIC_URL" || (echo "[deploy] healthz check FAILED" && exit 1)
echo
echo "[deploy] OK — bagina-server live at $PUBLIC_URL"
