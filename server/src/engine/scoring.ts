import balance from '@bagina/schema/data/balance.json' with { type: 'json' };
import type { PlayerScore } from '@bagina/schema';
import { homeworkSatisfaction } from './homework.js';
import type { GameStateInternal } from './state.js';

const COMPLETION_POINTS = balance.completionPoints;
const PARTIAL_POINTS = balance.partialPoints;
const HOMEWORK_BONUS = balance.homeworkBonus;

/**
 * Final scores at end of game. Computes per-player breakdown.
 *
 *   completed × completionPoints
 * + broods/latches in remaining hand × partialPoints
 * + homework satisfaction × homeworkBonus
 */
export function computeScores(state: GameStateInternal): PlayerScore[] {
  return state.players.map((p) => {
    const baginos = p.completed.filter((c) => c === 'bagino').length;
    const baginas = p.completed.filter((c) => c === 'bagina').length;

    // Partial sets in remaining hand. Greedy: count how many broods (Tooth+Paw
    // pairs) and latches (Paw+Tit pairs) we can form without overlapping.
    const teeth = p.hand.filter((c) => c.kind === 'Tooth').length;
    let paws = p.hand.filter((c) => c.kind === 'Paw').length;
    const tits = p.hand.filter((c) => c.kind === 'Tit').length;

    // Broods first: any (Tooth, Paw) pair.
    const broods = Math.min(teeth, paws);
    paws -= broods;
    // Latches: (Paw, Tit) pair from leftover paws.
    const latches = Math.min(paws, tits);

    const homeworkBonus = Math.round(
      homeworkSatisfaction(state.homework, state, p.id) * HOMEWORK_BONUS,
    );

    const total =
      baginos * COMPLETION_POINTS +
      baginas * COMPLETION_POINTS +
      broods * PARTIAL_POINTS +
      latches * PARTIAL_POINTS +
      homeworkBonus;

    return {
      playerId: p.id,
      baginos,
      baginas,
      broods,
      latches,
      homeworkBonus,
      total,
    };
  });
}

export function pickWinners(scores: PlayerScore[]): string[] {
  // Empty input naturally yields []: Math.max(...[]) is -Infinity,
  // and filter over [] returns []. No explicit guard needed.
  const max = Math.max(...scores.map((s) => s.total));
  return scores.filter((s) => s.total === max).map((s) => s.playerId);
}
