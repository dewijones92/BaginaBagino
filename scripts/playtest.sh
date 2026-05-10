#!/usr/bin/env bash
# End-to-end playtest: spin up the server and run 4 simulated socket.io clients
# through a full deterministic game. Used as an integration gate.
#
# This depends on `pnpm --filter server run playtest` which is the entry point
# implemented in server/tests/e2e/playtest.ts.
set -euo pipefail
exec pnpm --filter server run playtest "$@"
