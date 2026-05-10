#!/usr/bin/env bash
# Deploy bagina-server to the Pi.
#
# Steps:
#   1. ssh, git pull on the Pi
#   2. docker build the server image, docker compose up -d
#   3. drop the nginx snippet into /etc/nginx/snippets/bagina.partial
#      (NOT under /etc/nginx/conf.d/ — that dir is auto-included at
#      http-level via *.conf, and a bare `location` block isn't legal there)
#   4. ensure the main 333133333.xyz server block in default.conf includes it
#   5. nginx -t + reload
#   6. smoke-test https://333133333.xyz/bagina/healthz

set -euo pipefail

PI_HOST="${PI_HOST:-pi@333133333.xyz}"
REPO_DIR="${REPO_DIR:-/home/pi/code/BaginaBagino}"
NGINX_CONTAINER="${NGINX_CONTAINER:-nginx_dewi}"
PUBLIC_URL="${PUBLIC_URL:-https://333133333.xyz/bagina/healthz}"

echo "[deploy] pulling repo on $PI_HOST"
ssh "$PI_HOST" "cd '$REPO_DIR' && git fetch --all && git reset --hard origin/main"

echo "[deploy] building image"
ssh "$PI_HOST" "cd '$REPO_DIR' && docker build -f server/Dockerfile -t bagina-server:local ."

echo "[deploy] (re)starting bagina-server"
ssh "$PI_HOST" "cd '$REPO_DIR/infra/pi' && docker compose up -d --force-recreate"

echo "[deploy] wiring nginx"
ssh "$PI_HOST" bash -s <<'REMOTE'
set -euo pipefail
SNIPPET_SRC="/home/pi/code/BaginaBagino/infra/pi/nginx-bagina.conf"

docker exec nginx_dewi mkdir -p /etc/nginx/snippets
docker cp "$SNIPPET_SRC" nginx_dewi:/etc/nginx/snippets/bagina.partial

# Inject `include /etc/nginx/snippets/bagina.partial;` into the main 443
# server block (the one for 333133333.xyz with `server_name 333133333.xyz`).
# Idempotent: only adds the line if it's not already present.
docker exec nginx_dewi sh -c '
  if grep -q "snippets/bagina.partial" /etc/nginx/conf.d/default.conf; then
    exit 0
  fi
  awk "
    BEGIN { in_main = 0; depth = 0 }
    /^server[[:space:]]*{/ {
      block_start = NR
      block_text = \"\"
      capture = 1
    }
    capture {
      block_text = block_text \$0 \"\\n\"
      depth += gsub(/{/, \"&\")
      depth -= gsub(/}/, \"&\")
      if (depth == 0 && capture) {
        if (block_text ~ /server_name 333133333.xyz/) {
          # Print everything up to but not including the closing }
          n = split(block_text, lines, \"\\n\")
          for (i = 1; i < n - 1; i++) print lines[i]
          print \"    include /etc/nginx/snippets/bagina.partial;\"
          print lines[n - 1]
        } else {
          printf \"%s\", block_text
        }
        capture = 0
      }
      next
    }
    { print }
  " /etc/nginx/conf.d/default.conf > /tmp/d.conf
  cat /tmp/d.conf > /etc/nginx/conf.d/default.conf
  rm /tmp/d.conf
'

docker exec nginx_dewi nginx -t
docker exec nginx_dewi nginx -s reload
REMOTE

echo "[deploy] smoke test $PUBLIC_URL"
sleep 2
curl -sf --max-time 5 "$PUBLIC_URL" || (echo "[deploy] FAILED — healthz not reachable" && exit 1)
echo
echo "[deploy] OK — bagina-server live at $PUBLIC_URL"
