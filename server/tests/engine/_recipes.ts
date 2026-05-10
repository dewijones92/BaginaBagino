import balance from '@bagina/schema/data/balance.json' with { type: 'json' };
import type { CompletionKind } from '@bagina/schema';

/**
 * Pick the cardIds that satisfy a recipe from a hand, or null if the hand
 * can't cover it. Test fixtures used to hand-inline `slice(0, 3)` for teeth
 * etc., which mirrored the recipe in seven places. This reads from the same
 * balance.json the reducer reads, so changing a recipe doesn't silently
 * break test fixtures.
 *
 * Accepts any "card-shaped" object with id + kind so it works equally for
 * engine GameCard arrays and the lighter `{id, kind: string}` views the
 * socket-level e2e tests use.
 */
export function pickRecipeCards(
  hand: ReadonlyArray<{ id: string; kind: string }>,
  what: CompletionKind,
): string[] | null {
  const recipe = balance.recipes[what] as Record<string, number>;
  const out: string[] = [];
  for (const [kind, needed] of Object.entries(recipe)) {
    const have = hand.filter((c) => c.kind === kind).slice(0, needed);
    if (have.length < needed) return null;
    out.push(...have.map((c) => c.id));
  }
  return out;
}
