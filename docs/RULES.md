# Bagino Bagina — canonical rules

> Authoritative version. The server engine implements these. If the engine and this doc diverge, the engine is right and the doc must be updated.

## Goal

Be the player who finishes the week with the most points by:

1. Completing **bagino**(s) and/or **bagina**(s) from cards in your hand, and
2. Satisfying the hidden **homework** objective set at the start of the game.

## Players & length

- Two to four players.
- Game lasts one in-game week, **Monday to Friday**.
- Each day has 8 slots on the board, so the board is 40 slots long.
- Each player makes exactly **40 moves** across the game.

## Setup

1. Each player picks a token and a starting position on Monday slot 1.
2. Shuffle the deck (composition under "Cards" below).
3. Deal each player a starting hand of 3 cards (free).
4. Each player starts with 0 poo tokens.
5. The server picks a random **homework** template and seals it. It is not revealed until end of Friday. Cards (Clever, Brave) can peek at or modify it during the game.

## Turn structure

A player's turn is: **Move → resolve slot → optional action → end turn.**

1. **Move**: advance your token forward by 1 slot. (Always 1 — there's no dice. The strategy is in *when* you spend, not *how far* you go.)
2. **Resolve slot**:
   - If the new slot is a **poo slot**: gain 2 poo tokens.
   - Otherwise: nothing.
3. **Optional action** — pick up to one of:
   - **Draw a card** for 3 poo tokens (uniform cost). The card comes from the top of the face-down deck.
   - **Play a special card** from your hand (Clever, Brave, Business — see below).
   - **Initiate a trade** with another player. Trade is voluntary on both sides; cards and/or poo can be exchanged. Server validates that both players consent.
4. **End turn.** The next player begins.

## Cards

### Resource cards

| Card  | Provides    | Count in deck |
|-------|-------------|---------------|
| Tooth | 5 teeth     | 18            |
| Paw   | 3 paws      | 18            |
| Snout | 1 snout     | 6             |
| Tit   | 6 tits      | 6             |

### Special cards (sprinkled in deck, low frequency)

- **Clever** — peek at the homework objective AND change it to a different randomly drawn template. (Strong, rare.)
- **Brave** — peek at the homework objective without changing it.
- **Business** — gain 5 poo tokens immediately on draw.

### Event cards

Drawn alongside resources but resolved immediately for *all* players. First-pass list (subject to playtesting):

- **Rainy Day** — every player gains 1 poo.
- **Market Day** — every player may discard 1 card to draw a replacement free.
- **Wind** — every player loses 1 random poo (min 0).

## Completing a bagino / bagina

A player declares completion at end of their turn (free action) by spending the cards from their hand:

- **Bagino** = 3 Tooth + 2 Paw + 1 Snout (consumes those 6 cards).
- **Bagina** = 2 Tooth + 3 Paw + 1 Tit (consumes those 6 cards).

A player may complete multiple baginos/baginas during the game.

## Partial sets — broods and latches

If a player ends Friday with cards that don't form a full bagino/bagina, partial credit is given:

- **Brood** = any 2 of {Tooth, Paw} (worth half a bagino).
- **Latch** = any 2 of {Paw, Tit} (worth half a bagina).

## Scoring

Let `x` = points awarded for a complete bagino or bagina. (Default: 10. Tunable in `packages/schema/data/balance.json`.)

| Achievement | Points |
|---|---|
| Each completed bagino | x |
| Each completed bagina | x |
| Each unused brood | x / 2 |
| Each unused latch | x / 2 |
| Homework satisfied | bonus (template-defined, default = x) |
| Homework partially satisfied | proportional partial bonus |

## Homework templates (initial set)

The homework objective is a hidden constraint that grants bonus points if satisfied. Templates:

1. **Tooth Hoarder** — finish with at least 4 unused Tooth cards in hand.
2. **Two of a Kind** — complete at least 1 bagino *and* at least 1 bagina.
3. **Generous** — initiate at least 2 successful trades.
4. **Patient** — don't draw any cards in the first day (Monday).
5. **Spendthrift** — end the game with 0 poo tokens.

Templates are randomly selected at setup. Clever cards can re-roll the template.

## End of game

When the last player completes their 40th move (end of Friday), the homework is revealed and final scores are computed. Highest score wins. Ties are broken by:

1. Most baginos+baginas completed.
2. Most poo tokens remaining.
3. Shared victory.

## Open balance questions

Tracked in [BALANCE.md](./BALANCE.md). Subject to playtesting.
