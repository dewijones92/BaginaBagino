import { describe, it, expect } from 'vitest';
import { SLOTS, isPooSlot, dayOf, TOTAL_SLOTS } from '../../src/engine/board.js';

describe('board', () => {
  it('has 40 slots', () => {
    expect(TOTAL_SLOTS).toBe(40);
    expect(SLOTS).toHaveLength(40);
  });

  it('has slots from Mon..Fri only', () => {
    const days = new Set(SLOTS.map((s) => s.day));
    expect(days).toEqual(new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']));
  });

  it('marks 8 poo slots', () => {
    const poos = SLOTS.filter((s) => s.kind === 'poo');
    expect(poos.length).toBe(8);
  });

  it('helpers agree with slot data', () => {
    expect(isPooSlot(3)).toBe(true);
    expect(isPooSlot(0)).toBe(false);
    expect(dayOf(0)).toBe('Mon');
    expect(dayOf(39)).toBe('Fri');
  });
});
