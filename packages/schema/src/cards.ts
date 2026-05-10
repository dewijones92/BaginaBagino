import { z } from 'zod';

export const ResourceCardKind = z.enum(['Tooth', 'Paw', 'Snout', 'Tit']);
export type ResourceCardKind = z.infer<typeof ResourceCardKind>;

export const SpecialCardKind = z.enum(['Clever', 'Brave', 'Business']);
export type SpecialCardKind = z.infer<typeof SpecialCardKind>;

export const EventCardKind = z.enum(['RainyDay', 'MarketDay', 'Wind']);
export type EventCardKind = z.infer<typeof EventCardKind>;

// One flat enum so Dart can codegen a single `CardKind` enum cleanly.
// The narrower kinds (Resource/Special/Event) above are kept as runtime
// filters and TS type guards.
export const CardKind = z.enum([
  ...ResourceCardKind.options,
  ...SpecialCardKind.options,
  ...EventCardKind.options,
]);
export type CardKind = z.infer<typeof CardKind>;

export const isResourceCardKind = (k: CardKind): k is ResourceCardKind =>
  ResourceCardKind.safeParse(k).success;
export const isSpecialCardKind = (k: CardKind): k is SpecialCardKind =>
  SpecialCardKind.safeParse(k).success;
export const isEventCardKind = (k: CardKind): k is EventCardKind =>
  EventCardKind.safeParse(k).success;

export const GameCard = z.object({
  id: z.string(),
  kind: CardKind,
});
export type GameCard = z.infer<typeof GameCard>;

export const CompletionKind = z.enum(['bagino', 'bagina']);
export type CompletionKind = z.infer<typeof CompletionKind>;

export const PartialKind = z.enum(['brood', 'latch']);
export type PartialKind = z.infer<typeof PartialKind>;

/**
 * Static card metadata — the resource yield of each card. Imported by both
 * server engine and (via codegen) the Dart client for display.
 */
export const ResourceYield = {
  Tooth: { teeth: 5 },
  Paw: { paws: 3 },
  Snout: { snouts: 1 },
  Tit: { tits: 6 },
} as const;

export const RECIPES = {
  bagino: { teeth: 15, paws: 6, snouts: 1, tits: 0 },
  bagina: { teeth: 10, paws: 9, snouts: 0, tits: 6 },
} as const;
