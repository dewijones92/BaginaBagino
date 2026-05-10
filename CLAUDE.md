# Bagino Bagina — repo guide for Claude Code

This repo is a monorepo for **Bagino Bagina**, a turn-based multiplayer board game. Flutter Android client, Node + TS server on a Raspberry Pi, shared schema codegen so both sides stay in lockstep.

## Tone

UK English everywhere — UI copy, comments, commit messages, docs. The product is meant to feel **cute, bouncy, and cozy**: warm pastels, springy physics, generous corner radii, friendly micro-copy. When in doubt, err softer and rounder.

## Stack

- **Client**: Flutter 3.x / Dart 3.x. State: `riverpod`. Anim: `flutter_animate` + `lottie` + `flutter_svg`. Net: `socket_io_client`. Wire types: `freezed` + `json_serializable`, **generated** from `packages/schema`.
- **Server**: Node 24 + TypeScript. HTTP: `fastify`. Real-time: `socket.io`. Persistence: `better-sqlite3`. Validation: `zod`. Tests: `vitest`.
- **Schema (shared)**: `packages/schema` — Zod schemas → JSON Schema → Dart freezed sealed classes.
- **Theme tokens**: `packages/theme` — YAML → Dart `ThemeData` and TS constants.

## Critical rule: rules logic lives only on the server

All game rules — legal-action computation, scoring, deck shuffling, homework reveal — live in `server/src/engine/`. The Flutter client is a **presentation layer only**. It dispatches `GameAction`s and renders `ServerEvent` / `StateSnapshot`. To grey out a button, the client reads `state.legalActions` (server-pushed); it does not re-derive legality.

This is what makes the cross-language DRY story work. Don't break it.

## Critical rule: schema is the single source of truth

The Zod schemas in `packages/schema/src/` are the source of truth for every cross-network type. Run `pnpm gen` after any change. CI gates a clean `git diff` after regen.

```
packages/schema/src/*.ts      ← edit here
        ↓ pnpm gen
packages/schema/dist/schema.json
        ↓
client/lib/wire/*.dart        ← do not hand-edit
server runtime: imported from packages/schema directly
```

If you find yourself hand-editing a file in `client/lib/wire/`, stop. Edit the Zod schema instead.

## Common commands

```bash
make doctor                        # check toolchain (flutter, pnpm, kvm, adb, ssh-to-pi)
pnpm install                       # install all TS workspaces
pnpm gen                           # regenerate Dart wire types + theme
pnpm --filter server dev           # run server locally on :3001
pnpm --filter server test          # vitest (engine + rooms + e2e)
cd client && flutter pub get
cd client && flutter run -d chrome --dart-define=SERVER_HOST=localhost   # fastest iteration
cd client && flutter test          # widget + golden tests
scripts/run-emulator.sh            # headless bagino AVD with sane WSL flags
scripts/playtest.sh                # spin server + 4 simulated socket clients to completion
```

## Testing posture

Every change should leave the suite green. The engine has property tests — adding a new card or scoring rule means adding a property that proves it terminates and is non-negative. Visual changes ship with at least one golden test.

For end-to-end gates, `scripts/playtest.sh` plays a deterministic full game against the live server. If a server change breaks it, fix the server, not the test.

## WSL2 notes

- The AVD for this project is **`baginoapp-dewi`** — separate from any other agent's AVD on this machine. The `-dewi` suffix is the ownership tag. Use `scripts/run-emulator.sh` to launch it headless with `swiftshader_indirect` rendering — `host` GPU is flaky over WSLg.
- Inside the emulator, the WSL2 host is reachable at **`10.0.2.2`**, not `localhost`. The dev script handles this via `--dart-define`.
- KVM is available (`/dev/kvm`, `kvm` group). Don't try Hyper-V tools alongside.

## Emulator coexistence — important

There may be other AI agents on this machine running their own AVDs. **Do not touch any emulator that isn't ours.**

- Our emulator binds to **port 5582** (device ID `emulator-5582`). PID lives in `/tmp/bagina-emulator.pid`.
- `scripts/run-emulator.sh` only ever starts/checks/owns that one instance and refuses to take the port if it's already busy.
- `scripts/stop-emulator.sh` only kills our PID and our device ID.
- If you ever find yourself running `adb -s emulator-5554 emu kill`, stop. That's somebody else's.

## Pi deployment

The Pi at `333133333.xyz` runs an `nginx_dewi` reverse proxy on 80/443. The server lives behind `/bagina/` on that nginx. See `infra/pi/README.md` for the deploy flow. Do not change the existing nginx vhost set — only add a new location block.

## Trunk-based workflow

- Push to `main` triggers the APK release build (`.github/workflows/apk-release.yml`).
- PRs run lint + test + schema-drift check.
- Don't long-lived feature branches; small PRs, fast merges.

## What NOT to do

- Don't duplicate rules logic in Dart. (Repeated because it matters.)
- Don't hand-edit generated files.
- Don't add iOS, push, login, or bot work. Out of scope until v2.
- Don't introduce production observability tooling (Sentry, NewRelic). Pino logs to docker stdout is enough.
- Don't skip running tests before claiming work is done. The user explicitly asked you to test as you go.
