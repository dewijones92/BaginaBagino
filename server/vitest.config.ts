import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      // V8 provider — fast, no instrumentation overhead.
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/index.ts',           // bootstrap; covered by e2e
        'src/config.ts',          // env loader; minimal logic
      ],
      // Rock-solid coverage rule (CLAUDE.md): the engine must stay above
      // these floors. If you drop below, write a test that explains why.
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 70,
        // Per-file floor — catches "everything's average but one file is bare".
        perFile: false,
      },
    },
  },
});
