# Bagino Bagina

A cute, cozy, bouncy multiplayer board game. Two to four players race through a five-day week collecting parts to complete a *bagino* or a *bagina*, while puzzling out a hidden *homework* objective.

## What's in the box

- `client/` — Flutter Android app (also runs in browser for fast dev)
- `server/` — Node + TypeScript real-time server (Socket.IO)
- `packages/schema/` — Zod-based wire schema, source of truth, codegens to Dart
- `packages/theme/` — Cute palette + spring tokens, codegens to Dart and TS
- `infra/pi/` — Raspberry Pi deploy bits (Docker Compose, nginx config)
- `docs/` — Rules, protocol, balance, deployment

## Quick start

```bash
make doctor                  # checks toolchain
pnpm install
pnpm gen                     # generate wire types + theme
pnpm --filter server dev     # backend on :3001
cd client && flutter run -d chrome --dart-define=SERVER_HOST=localhost
```

To play on the headless Android emulator:

```bash
scripts/run-emulator.sh                  # boots the bagino AVD
cd client && flutter run --dart-define=SERVER_HOST=10.0.2.2
```

## Releases

APKs are built and attached to [GitHub Releases](https://github.com/dewijones92/BaginaBagino/releases) on every merge to `main`.

## License

TBC.
