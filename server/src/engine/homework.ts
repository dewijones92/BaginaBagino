import homeworkJson from '@bagina/schema/data/homework.json' with { type: 'json' };
import type { Rng } from './rng.js';
import type { GameStateInternal } from './state.js';

export type HomeworkTemplate = {
  id: string;
  title: string;
  description: string;
  hintTopic: string;
};

export const TEMPLATES: readonly HomeworkTemplate[] =
  homeworkJson.templates as readonly HomeworkTemplate[];

export function rollHomework(rng: Rng): HomeworkTemplate {
  return rng.pick(TEMPLATES);
}

/**
 * Score a homework template against a final game state for a given player.
 * Returns a fraction in [0, 1] of how satisfied the objective is. The
 * caller multiplies by the homework bonus to award partial credit.
 */
export function homeworkSatisfaction(
  template: HomeworkTemplate,
  state: GameStateInternal,
  playerId: string,
): number {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return 0;

  switch (template.id) {
    case 'tooth-hoarder': {
      const teeth = player.hand.filter((c) => c.kind === 'Tooth').length;
      return Math.min(1, teeth / 4);
    }
    case 'two-of-a-kind': {
      const baginos = player.completed.filter((c) => c === 'bagino').length;
      const baginas = player.completed.filter((c) => c === 'bagina').length;
      return baginos >= 1 && baginas >= 1 ? 1 : 0;
    }
    case 'generous': {
      const trades = state.metadata.successfulTradesByPlayer[playerId] ?? 0;
      return Math.min(1, trades / 2);
    }
    case 'patient': {
      return state.metadata.drewOnMondayByPlayer[playerId] ? 0 : 1;
    }
    case 'spendthrift': {
      return player.poo === 0 ? 1 : 0;
    }
    default:
      return 0;
  }
}
