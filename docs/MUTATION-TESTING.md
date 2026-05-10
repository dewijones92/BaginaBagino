# Mutation testing

We use [StrykerJS](https://stryker-mutator.io/) to measure test **strength** on the rules engine — not just whether lines were executed, but whether the suite would actually catch a regression.

Coverage gates protect against unrun code. Mutation testing protects against tests that run code but don't assert anything meaningful about it.

## Where it's wired

- Config: `server/stryker.config.json`
- Targets: `server/src/engine/*.ts` (reducer, scoring, actions, homework, deck, board)
- Runner: vitest (`@stryker-mutator/vitest-runner`)
- Reports: `server/reports/mutation/index.html` (gitignored)

We deliberately do **not** mutate schema files, transport files, or rooms/persistence — mutants there either fail to compile or trip on IO mocks. Engine code is the highest-value target.

## How to run

```bash
# One file — fastest feedback, ~30s–1m
pnpm --filter server mutation:scoring
pnpm --filter server mutation:reducer

# Whole engine — multi-minute; for nightly / pre-release
pnpm --filter server mutation

# Any subset
pnpm --filter server exec stryker run --mutate src/engine/homework.ts
```

After a run, open `server/reports/mutation/index.html` for the per-mutant view (source line + which mutants survived).

## Bar

Per [CLAUDE.md](../CLAUDE.md#mutation-testing):

- **≥80% mutation score** in the engine.
- Surviving mutants are real regression classes the suite is blind to. Don't delete them — **write a test that kills them**.
- Equivalent mutants (compiler-level identity transforms — rare) can be ignored, but mark them in the PR.

## Workflow when you have a survivor

1. Open the HTML report, click into the mutant.
2. Read what the mutation actually does — e.g. `paws -= broods` flipped to `paws += broods`.
3. Find or write the unit test that would distinguish the two behaviours. Usually that means a small focused vitest with hand-built `PublicPlayer.hand` and a precise scoring assertion, not a full-game replay.
4. Re-run the relevant `mutation:*` script; confirm it's now killed.

## CI strategy

We do **not** run Stryker on every PR — too slow (~10s–1m per file × 6 files). Options:

- **`workflow_dispatch`**: a manual GitHub Actions trigger for ad-hoc runs.
- **Nightly cron**: scheduled job that runs `pnpm --filter server mutation` and posts the score as an issue comment if it regresses.

(Neither wired yet — when added, link the workflow file here.)

## Why not the Dart client?

The Flutter side is a presentation layer (see CLAUDE.md: "rules logic lives only on the server"). Mutation tooling for Dart is also immature compared to StrykerJS. We lean on widget + golden tests for the client and concentrate mutation budget where the logic actually lives.
