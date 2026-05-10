# Bagino Bagina — repo guide for Claude Code

This repo is a monorepo for **Bagino Bagina**, a turn-based multiplayer board game. Flutter Android client, Node + TS server on a Raspberry Pi, shared schema codegen so both sides stay in lockstep.

## Tone

UK English everywhere — UI copy, comments, commit messages, docs. The product is meant to feel **cute, bouncy, cozy AND goofy/rude/fun**: warm pastels and springy physics on the visual side, but the writing leans cheeky, daft, slightly rude — think Exploding Kittens or Cards Against Humanity, not Animal Crossing. Pun-heavy. Embrace that the game uses words like *tit*, *snout*, *poo*, *bagino*, *bagina*. Don't sand off the edges.

Examples:
- Button: "Draw a card" → "Grab one (3 poo)"
- Error: "Not enough poo to draw" → "Skint! Need more poo."
- Empty hand: "No cards in hand" → "Your hand is suspiciously empty."
- Winner: "You won!" → "You absolute legend."

When in doubt, err goofy. Rounded corners and a daft turn of phrase, not corporate cuteness.

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
pnpm test:coverage                 # server tests with coverage thresholds (CI runs this too)
cd client && flutter pub get
cd client && flutter run -d chrome --dart-define=SERVER_HOST=localhost   # fastest iteration
cd client && flutter test          # widget + golden tests
scripts/run-emulator.sh            # headless bagino AVD with sane WSL flags
scripts/playtest.sh                # spin server + 4 simulated socket clients to completion
scripts/dev-public-tunnel.sh up    # expose this laptop's :8888 + :3001 at https://333133333.xyz/bagina-dev/
```

## Public URLs

- **https://333133333.xyz/bagina/** — production. Static Flutter web bundle on Pi nginx; socket.io proxied to `bagina-server` container. APK clients also point here.
- **https://333133333.xyz/bagina-dev/** — live dev URL forwarded to dewi's laptop via SSH reverse tunnel. Up only while `scripts/dev-public-tunnel.sh up` has been run AND the laptop's `flutter run -d web-server` is alive. 502s when laptop is offline; that's expected.
  - Both `/bagina-dev/socket.io/` (port 3001) and the Flutter web bundle (port 8888) are forwarded. Edit code locally, refresh the public tab.
  - Backed by an nft INPUT-chain allow rule on the Pi (`bagina-dev-firewall.service`) and an nginx partial in `dot-files`.

## Testing posture — rock-solid coverage, no exceptions

Every change ships with proof. This is a project rule, not a suggestion.

- **Bug fixes start with a failing regression test.** Reproduce the bug as a vitest, watch it fail, then fix the code, watch it pass. If you can't write the regression test, you don't understand the bug yet.
- **New behaviour ships with happy-path + error-path tests.** Every guard you write (`if (!active) return error`) needs a test that exercises the rejection.
- **Engine reducer changes** (`server/src/engine/*`) get focused unit tests in `server/tests/engine/`. Use property tests in `property.test.ts` for invariants (deck conservation, score non-negativity, termination). Keep the engine suite under 3s total.
- **Schema changes** are exercised by `pnpm gen` — CI gates a clean `git diff` after regen.
- **UI changes** ship with at least one widget or golden test. Keep them fast — no full-app launches per test.
- **If a regression slipped through, write the test that would have caught it _before_ landing the fix.** Otherwise you're paying for the bug twice.
- **Don't pad coverage.** Each test pins a behaviour worth defending, not a line of code worth counting.

The engine has property tests — adding a new card or scoring rule means adding a property that proves it terminates and is non-negative. Visual changes ship with at least one golden test.

For end-to-end gates, `scripts/playtest.sh` plays a deterministic full game against the live server. If a server change breaks it, fix the server, not the test.

## WSL2 notes

- The AVD for this project is **`baginoapp-dewi`** — separate from any other agent's AVD on this machine. The `-dewi` suffix is the ownership tag. Use `scripts/run-emulator.sh` to launch it headless with `swiftshader_indirect` rendering — `host` GPU is flaky over WSLg.
- Inside the emulator, the WSL2 host is reachable at **`10.0.2.2`**, not `localhost`. The dev script handles this via `--dart-define`.
- KVM is available (`/dev/kvm`, `kvm` group). Don't try Hyper-V tools alongside.

## Emulator coexistence — important

There may be other AI agents on this machine running their own AVDs. **Do not touch any emulator that isn't ours.**

- Our emulator binds to **port 5582** (device ID `emulator-5582`). PID lives in `/tmp/bagina-emulator.pid`.
- `scripts/run-emulator.sh` only ever starts/checks/owns that one instance and refuses to take the port if it's already busy.
- Default is **windowed (GUI visible via WSLg)** — Dewi wants to see what's happening, not just trust screenshots. Set `BAGINA_EMU_HEADLESS=1` only if you have a clear reason (e.g., CI).
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
