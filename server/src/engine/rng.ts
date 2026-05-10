/**
 * Tiny deterministic RNG so games are replayable from a seed.
 *
 * mulberry32: 32-bit input, integer state, fast and good enough for
 * shuffling a 60-card deck and rolling homework templates.
 */
export type Rng = {
  readonly seed: number;
  next(): number;          // [0, 1)
  int(maxExclusive: number): number;
  pick<T>(arr: readonly T[]): T;
  shuffle<T>(arr: readonly T[]): T[];
};

export function makeRng(seed: number): Rng {
  let state = seed >>> 0;
  function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function int(maxExclusive: number): number {
    if (maxExclusive <= 0) throw new Error('int: maxExclusive must be > 0');
    return Math.floor(next() * maxExclusive);
  }
  function pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('pick: empty');
    return arr[int(arr.length)]!;
  }
  function shuffle<T>(arr: readonly T[]): T[] {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(i + 1);
      const tmp = out[i]!;
      out[i] = out[j]!;
      out[j] = tmp;
    }
    return out;
  }
  return { seed, next, int, pick, shuffle };
}
