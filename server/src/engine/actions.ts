import balance from '@bagina/schema/data/balance.json' with { type: 'json' };
import type { LegalActionKind, PlayerId } from '@bagina/schema';
import type { GameStateInternal } from './state.js';

const DRAW_COST = balance.drawCostPoo;

/**
 * Per-player set of action kinds that are legal *right now*. Pushed to the
 * client with every StateSnapshot so the UI can grey out buttons without
 * re-deriving rules. The active player gets a richer set than the others.
 */
export function legalActionsFor(
  state: GameStateInternal,
  playerId: PlayerId,
): LegalActionKind[] {
  const acts = new Set<LegalActionKind>();
  if (state.phase !== 'playing') return [];

  const active = state.players[state.activePlayerIndex]!;
  const me = state.players.find((p) => p.id === playerId);
  if (!me) return [];

  // Anyone can respond to a trade addressed to them.
  if (state.pendingTrades.some((t) => t.to === playerId)) {
    acts.add('RespondTrade');
  }

  if (
    active.id === playerId &&
    me.movesRemaining > 0 &&
    !state.metadata.awaitingPostMoveAction
  ) {
    acts.add('MoveToken');
  }

  // The active player, *after* moving, has decided to spend or not. We
  // model "after move" implicitly: the reducer marks the current turn as
  // `awaitingAction = true` once movement is consumed. To keep the public
  // API simple, we expose draw/play/trade/end whenever it's the active
  // player's turn AND they've moved this tick. Movement happens first.
  if (active.id === playerId && state.metadata.awaitingPostMoveAction) {
    if (me.poo >= DRAW_COST && state.deck.length > 0) acts.add('DrawCard');
    if (me.hand.some((c) => c.kind === 'Clever' || c.kind === 'Brave' || c.kind === 'Business')) {
      acts.add('PlayCard');
    }
    if (state.players.length > 1) acts.add('OfferTrade');
    if (canDeclareCompletion(me)) acts.add('DeclareCompletion');
    acts.add('EndTurn');
  }

  return [...acts];
}

function canDeclareCompletion(p: GameStateInternal['players'][number]): boolean {
  const teeth = p.hand.filter((c) => c.kind === 'Tooth').length;
  const paws = p.hand.filter((c) => c.kind === 'Paw').length;
  const snouts = p.hand.filter((c) => c.kind === 'Snout').length;
  const tits = p.hand.filter((c) => c.kind === 'Tit').length;
  const canBagino = teeth >= 3 && paws >= 2 && snouts >= 1;
  const canBagina = teeth >= 2 && paws >= 3 && tits >= 1;
  return canBagino || canBagina;
}
