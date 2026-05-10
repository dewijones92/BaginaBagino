import boardJson from '@bagina/schema/data/board.json' with { type: 'json' };
import type { Day } from '@bagina/schema';

export type SlotKind = 'start' | 'blank' | 'poo' | 'end';
export type Slot = { index: number; day: Day; kind: SlotKind };

export const SLOTS: readonly Slot[] = boardJson.slots as readonly Slot[];

export const TOTAL_SLOTS = SLOTS.length;
if (TOTAL_SLOTS !== 40) throw new Error(`board.json must have 40 slots, got ${TOTAL_SLOTS}`);

export function slotAt(index: number): Slot {
  const s = SLOTS[index];
  if (!s) throw new Error(`bad slot index: ${index}`);
  return s;
}

export function isPooSlot(index: number): boolean {
  return slotAt(index).kind === 'poo';
}

export function dayOf(index: number): Day {
  return slotAt(index).day;
}
