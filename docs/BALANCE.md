# Balance

Tunable values. The defaults below mirror your math; expect playtesting to move them.

## Deck composition (default)

| Card     | Count | Source / reason |
|----------|-------|-----------------|
| Tooth    | 18    | 4×Bagino-required (12) × 1.5 cushion |
| Paw      | 18    | 4×max-required (12) × 1.5 cushion |
| Tit      | 6     | 4×Bagina-required (4) × 1.5 cushion |
| Snout    | 6     | 4×Bagino-required (4) × 1.5 cushion |
| Clever   | 2     | rare, strong |
| Brave    | 3     | uncommon |
| Business | 4     | one-shot poo boost |
| Event    | 5     | shared shifts |
| **Total**| **62**| |

At 4 players × 40 turns = 160 turns max, of which ~40-60 will be card draws (constrained by poo). Deck size is comfortable but won't drain trivially.

## Costs

| Action       | Cost     |
|--------------|----------|
| Move         | free     |
| Draw a card  | 3 poo    |

## Scoring (default)

- `x = 10` points per completed bagino or bagina.
- `x/2 = 5` points per unused brood/latch at end of game.
- Homework satisfied: `+10` points (or proportional partial bonus).

## Board

40 slots laid as a circle. 8 per day, days marked Mon→Fri. Poo slots are placed at slots 3, 7, 12, 16, 21, 25, 30, 34 (one or two per day, evenly distributed).

## Open balance questions

1. **Is 3 poo per draw the right cost?** Higher = scarcer cards = slower games. Lower = trivial card economy. Tune after first playtest.
2. **Are events too punishing or too forgettable?** Initial set is mild. Add stronger swings later if play is too samey.
3. **Should homework templates be weighted by difficulty?** "Spendthrift" is harder than "Generous". Maybe.
4. **Brood/Latch threshold**: 2 cards is intentionally lenient so first-time players don't end with 0. Consider 3-card variants for advanced mode.
5. **Trading**: server currently treats all consensual trades as legal. Consider banning post-Friday trades or capping per turn if abuse emerges.

## Test scenarios committed to the engine

- `seeded-fast-bagino`: a deterministic 4-player game where P1 finishes a bagino on turn 12. Used in `engine` tests as a smoke check.
- `seeded-trade-spiral`: triggers all event card types at least once.
- `seeded-event-flood`: deck deliberately stacked with events to verify per-player effect application.
