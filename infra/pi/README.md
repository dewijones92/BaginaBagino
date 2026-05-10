# Pi deployment

The Bagino Bagina server lives on the Pi at `333133333.xyz` behind the existing
`nginx_dewi` ingress at `/bagina/`.

## First-time setup

On the Pi:

```bash
ssh pi@333133333.xyz
cd ~/code
git clone git@github.com:dewijones92/BaginaBagino.git
```

## Per-deploy

From your laptop (the repo root must be a clean tree on `main`):

```bash
make deploy-pi
# or
bash infra/pi/deploy.sh
```

The script:
1. SSHes to the Pi and `git reset --hard origin/main`
2. `docker compose up -d --build` for `bagina-server`
3. Copies the nginx location snippet into `nginx_dewi`
4. Inserts an `include` line into the existing default.conf if it's not already there
5. Tests + reloads nginx
6. Hits `https://333133333.xyz/bagina/healthz` and fails loudly if it doesn't 200

## Rollback

```bash
ssh pi@333133333.xyz
cd ~/code/BaginaBagino
git checkout <previous-sha>
cd infra/pi
docker compose up -d --build
```

## Logs

```bash
ssh pi@333133333.xyz docker logs -f bagina-server
```

## Networking

`bagina-server` joins the host's default `bridge` network so `nginx_dewi`
(which is on the same network) can resolve it by container name. The
container exposes port 3001 internally — there is **no** host port mapping;
all public traffic comes through nginx on 443.
