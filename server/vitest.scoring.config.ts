import { defineConfig } from 'vitest/config';

// Vitest config used only by `pnpm mutation:scoring`. Restricts test discovery
// to the focused scoring unit tests, so Stryker's per-mutant test budget
// collapses from ~80 (full multi-turn games) to ~30 (hand-built fixtures).
//
// See docs/MUTATION-TESTING.md.
export default defineConfig({
  test: {
    include: ['tests/engine/scoring.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.stryker-tmp/**'],
  },
});
