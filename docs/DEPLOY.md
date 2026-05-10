# Deploy

The server runs as a Docker container on the Raspberry Pi at `333133333.xyz`, behind the existing `nginx_dewi` ingress at `/bagina/`.

## One-time setup

1. Clone the repo on the Pi:
   ```bash
   ssh pi@333133333.xyz
   cd ~/code
   git clone git@github.com:dewijones92/BaginaBagino.git
   ```
2. Drop the nginx location block:
   ```bash
   docker cp ~/code/BaginaBagino/infra/pi/nginx-bagina.conf nginx_dewi:/etc/nginx/conf.d/bagina.conf
   docker exec nginx_dewi nginx -t
   docker exec nginx_dewi nginx -s reload
   ```
3. Bring up the server container:
   ```bash
   cd ~/code/BaginaBagino/infra/pi
   docker compose up -d --build
   ```

## Per-deploy

From your laptop:

```bash
make deploy-pi
```

That runs `infra/pi/deploy.sh`, which:

1. SSHes to the Pi.
2. `git pull` in `~/code/BaginaBagino`.
3. `docker compose up -d --build` to rebuild and restart the container.
4. Reloads nginx.
5. Hits `wss://333133333.xyz/bagina/healthz` to confirm liveness.

## Logs

```bash
ssh pi@333133333.xyz docker logs -f bagina-server
```

## Rollback

```bash
ssh pi@333133333.xyz
cd ~/code/BaginaBagino
git checkout <previous-sha>
docker compose up -d --build
```

## Persistence

SQLite snapshots live in a docker volume (`bagina-data`). Backups are out of scope for v1 — losing the Pi means losing in-flight games. Acceptable.
