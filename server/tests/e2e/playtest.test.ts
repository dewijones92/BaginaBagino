import { describe, it } from 'vitest';
import { runPlaytest } from './playtest.js';

describe('e2e playtest', () => {
  it('4-player full game over real sockets reaches GameEnded', { timeout: 90_000 }, async () => {
    await runPlaytest();
  });
});
