#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
TARGET="${1:-../../client/lib/wire/wire.dart}"
exec tsx tools/gen-dart.ts "$TARGET"
