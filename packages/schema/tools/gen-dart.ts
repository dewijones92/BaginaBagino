/**
 * Walk our Zod schemas and emit Dart wire types as Dart 3 sealed classes
 * with hand-rolled `fromJson` / `toJson`. No build_runner needed on the
 * Dart side — the generated file is plain Dart that depends on nothing.
 *
 * Why custom (vs json_schema_to_freezed / quicktype):
 *   - we own both ends, so we can keep the output minimal and readable
 *   - discriminated unions become real Dart sealed classes with
 *     exhaustive `switch`, which is the pattern we want on the client
 *   - no extra Dart toolchain step (build_runner) and no extra deps
 */

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z, ZodTypeAny } from 'zod';

const DATA_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'data');
function loadJson<T>(name: string): T {
  return JSON.parse(readFileSync(resolve(DATA_DIR, name), 'utf-8')) as T;
}

import {
  CreateRoomAction,
  JoinRoomAction,
  LeaveRoomAction,
  SetReadyAction,
  MoveTokenAction,
  DrawCardAction,
  PlayCardAction,
  OfferTradeAction,
  RespondTradeAction,
  DeclareCompletionAction,
  EndTurnAction,
  ResyncAction,
  GameAction,
  LegalActionKind,
} from '../src/actions.js';
import {
  RoomCreatedEvent,
  RoomJoinedEvent,
  PlayerJoinedEvent,
  PlayerLeftEvent,
  PlayerReadyChangedEvent,
  GameStartedEvent,
  StateSnapshotEvent,
  TurnAdvancedEvent,
  TokenMovedEvent,
  PooAwardedEvent,
  CardDrawnEvent,
  CardPlayedEvent,
  TradeOfferedEvent,
  TradeResolvedEvent,
  CompletionDeclaredEvent,
  EventCardTriggeredEvent,
  HomeworkHintGainedEvent,
  HomeworkRevealedEvent,
  GameEndedEvent,
  ProtocolErrorEvent,
  ServerEvent,
  PlayerScore,
} from '../src/events.js';
import {
  PublicGameState,
  PrivatePlayerView,
  PublicPlayer,
  TradeOffer,
  HomeworkHint,
} from '../src/state.js';
import { GameCard } from '../src/cards.js';

// ---------------------------------------------------------------------------
// Zod introspection helpers

type Field = { name: string; type: string; optional: boolean; nullable: boolean; isList: boolean };

function unwrap(s: ZodTypeAny): { schema: ZodTypeAny; optional: boolean; nullable: boolean } {
  let optional = false;
  let nullable = false;
  let cur: ZodTypeAny = s;
  // strip Optional / Nullable / Default wrappers
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const def = cur._def;
    if (def.typeName === 'ZodOptional') {
      optional = true;
      cur = def.innerType;
      continue;
    }
    if (def.typeName === 'ZodNullable') {
      nullable = true;
      cur = def.innerType;
      continue;
    }
    if (def.typeName === 'ZodDefault') {
      cur = def.innerType;
      continue;
    }
    if (def.typeName === 'ZodEffects') {
      cur = def.schema;
      continue;
    }
    break;
  }
  return { schema: cur, optional, nullable };
}

function zodToDart(schema: ZodTypeAny, ctx: GenContext): string {
  const def = schema._def;
  switch (def.typeName) {
    case 'ZodString':
      return 'String';
    case 'ZodNumber':
      // Use int when the schema is constrained to int, else num.
      return def.checks?.some((c: any) => c.kind === 'int') ? 'int' : 'num';
    case 'ZodBoolean':
      return 'bool';
    case 'ZodEnum': {
      // Inline a name based on the values if not registered.
      const named = ctx.findEnumName(def.values);
      return named ?? `String /* enum:${def.values.join('|')} */`;
    }
    case 'ZodLiteral':
      return typeof def.value === 'string'
        ? 'String'
        : typeof def.value === 'number'
        ? 'num'
        : typeof def.value === 'boolean'
        ? 'bool'
        : 'dynamic';
    case 'ZodArray':
      return `List<${zodToDart(def.type, ctx)}>`;
    case 'ZodObject': {
      const named = ctx.findObjectName(schema);
      if (!named) {
        throw new Error(
          'Unnamed nested object encountered. Register it in NAMED_OBJECTS.',
        );
      }
      return named;
    }
    case 'ZodUnion':
    case 'ZodDiscriminatedUnion': {
      const named = ctx.findUnionName(schema);
      if (!named) {
        throw new Error(
          'Unnamed union encountered. Register it in NAMED_UNIONS.',
        );
      }
      return named;
    }
    default:
      throw new Error(`Unhandled Zod type: ${def.typeName}`);
  }
}

function objectFields(schema: z.ZodObject<any>, ctx: GenContext): Field[] {
  const shape = schema.shape;
  return Object.entries(shape).map(([name, raw]) => {
    const r = raw as ZodTypeAny;
    const { schema: inner, optional, nullable } = unwrap(r);
    const def = inner._def;
    const isList = def.typeName === 'ZodArray';
    return { name, type: zodToDart(inner, ctx), optional, nullable, isList };
  });
}

// ---------------------------------------------------------------------------
// Codegen target registry

type GenContext = {
  enums: Map<string, readonly string[]>;
  objects: Map<string, z.ZodObject<any>>;
  unions: Map<string, { schema: z.ZodTypeAny; variants: { name: string; obj: z.ZodObject<any> }[]; discriminator: string }>;
  findEnumName: (values: readonly string[]) => string | undefined;
  findObjectName: (s: ZodTypeAny) => string | undefined;
  findUnionName: (s: ZodTypeAny) => string | undefined;
};

const NAMED_ENUMS: Record<string, readonly string[]> = {
  ResourceCardKind: ['Tooth', 'Paw', 'Snout', 'Tit'],
  SpecialCardKind: ['Clever', 'Brave', 'Business'],
  EventCardKind: ['RainyDay', 'MarketDay', 'Wind'],
  Day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  PlayerColor: ['pink', 'mint', 'lavender', 'butter'],
  RoomPhase: ['lobby', 'playing', 'finished'],
  CompletionKind: ['bagino', 'bagina'],
  PartialKind: ['brood', 'latch'],
  LegalActionKind: [
    'MoveToken',
    'DrawCard',
    'PlayCard',
    'OfferTrade',
    'RespondTrade',
    'DeclareCompletion',
    'EndTurn',
  ],
  PooReason: ['slot', 'business', 'event'],
};

// CardKind is a union of three enums on the TS side. For Dart we flatten it
// to a single enum since each variant is a distinct string literal.
const FLATTENED_CARD_KIND = [
  ...NAMED_ENUMS.ResourceCardKind,
  ...NAMED_ENUMS.SpecialCardKind,
  ...NAMED_ENUMS.EventCardKind,
] as const;

const NAMED_OBJECTS: Record<string, z.ZodObject<any>> = {
  GameCard: GameCard as z.ZodObject<any>,
  PublicPlayer: PublicPlayer as z.ZodObject<any>,
  PublicGameState: PublicGameState as z.ZodObject<any>,
  PrivatePlayerView: PrivatePlayerView as z.ZodObject<any>,
  HomeworkHint: HomeworkHint as z.ZodObject<any>,
  TradeOffer: TradeOffer as z.ZodObject<any>,
  PlayerScore: PlayerScore as z.ZodObject<any>,

  // Action variants
  CreateRoomAction: CreateRoomAction as z.ZodObject<any>,
  JoinRoomAction: JoinRoomAction as z.ZodObject<any>,
  LeaveRoomAction: LeaveRoomAction as z.ZodObject<any>,
  SetReadyAction: SetReadyAction as z.ZodObject<any>,
  MoveTokenAction: MoveTokenAction as z.ZodObject<any>,
  DrawCardAction: DrawCardAction as z.ZodObject<any>,
  PlayCardAction: PlayCardAction as z.ZodObject<any>,
  OfferTradeAction: OfferTradeAction as z.ZodObject<any>,
  RespondTradeAction: RespondTradeAction as z.ZodObject<any>,
  DeclareCompletionAction: DeclareCompletionAction as z.ZodObject<any>,
  EndTurnAction: EndTurnAction as z.ZodObject<any>,
  ResyncAction: ResyncAction as z.ZodObject<any>,

  // Event variants
  RoomCreatedEvent: RoomCreatedEvent as z.ZodObject<any>,
  RoomJoinedEvent: RoomJoinedEvent as z.ZodObject<any>,
  PlayerJoinedEvent: PlayerJoinedEvent as z.ZodObject<any>,
  PlayerLeftEvent: PlayerLeftEvent as z.ZodObject<any>,
  PlayerReadyChangedEvent: PlayerReadyChangedEvent as z.ZodObject<any>,
  GameStartedEvent: GameStartedEvent as z.ZodObject<any>,
  StateSnapshotEvent: StateSnapshotEvent as z.ZodObject<any>,
  TurnAdvancedEvent: TurnAdvancedEvent as z.ZodObject<any>,
  TokenMovedEvent: TokenMovedEvent as z.ZodObject<any>,
  PooAwardedEvent: PooAwardedEvent as z.ZodObject<any>,
  CardDrawnEvent: CardDrawnEvent as z.ZodObject<any>,
  CardPlayedEvent: CardPlayedEvent as z.ZodObject<any>,
  TradeOfferedEvent: TradeOfferedEvent as z.ZodObject<any>,
  TradeResolvedEvent: TradeResolvedEvent as z.ZodObject<any>,
  CompletionDeclaredEvent: CompletionDeclaredEvent as z.ZodObject<any>,
  EventCardTriggeredEvent: EventCardTriggeredEvent as z.ZodObject<any>,
  HomeworkHintGainedEvent: HomeworkHintGainedEvent as z.ZodObject<any>,
  HomeworkRevealedEvent: HomeworkRevealedEvent as z.ZodObject<any>,
  GameEndedEvent: GameEndedEvent as z.ZodObject<any>,
  ProtocolErrorEvent: ProtocolErrorEvent as z.ZodObject<any>,
};

type UnionDef = {
  schema: z.ZodTypeAny;
  variants: { name: string; obj: z.ZodObject<any> }[];
  discriminator: string;
};

const NAMED_UNIONS: Record<string, UnionDef> = {
  GameAction: {
    schema: GameAction,
    discriminator: 'kind',
    variants: [
      { name: 'CreateRoomAction', obj: CreateRoomAction },
      { name: 'JoinRoomAction', obj: JoinRoomAction },
      { name: 'LeaveRoomAction', obj: LeaveRoomAction },
      { name: 'SetReadyAction', obj: SetReadyAction },
      { name: 'MoveTokenAction', obj: MoveTokenAction },
      { name: 'DrawCardAction', obj: DrawCardAction },
      { name: 'PlayCardAction', obj: PlayCardAction },
      { name: 'OfferTradeAction', obj: OfferTradeAction },
      { name: 'RespondTradeAction', obj: RespondTradeAction },
      { name: 'DeclareCompletionAction', obj: DeclareCompletionAction },
      { name: 'EndTurnAction', obj: EndTurnAction },
      { name: 'ResyncAction', obj: ResyncAction },
    ],
  },
  ServerEvent: {
    schema: ServerEvent,
    discriminator: 'kind',
    variants: [
      { name: 'RoomCreatedEvent', obj: RoomCreatedEvent },
      { name: 'RoomJoinedEvent', obj: RoomJoinedEvent },
      { name: 'PlayerJoinedEvent', obj: PlayerJoinedEvent },
      { name: 'PlayerLeftEvent', obj: PlayerLeftEvent },
      { name: 'PlayerReadyChangedEvent', obj: PlayerReadyChangedEvent },
      { name: 'GameStartedEvent', obj: GameStartedEvent },
      { name: 'StateSnapshotEvent', obj: StateSnapshotEvent },
      { name: 'TurnAdvancedEvent', obj: TurnAdvancedEvent },
      { name: 'TokenMovedEvent', obj: TokenMovedEvent },
      { name: 'PooAwardedEvent', obj: PooAwardedEvent },
      { name: 'CardDrawnEvent', obj: CardDrawnEvent },
      { name: 'CardPlayedEvent', obj: CardPlayedEvent },
      { name: 'TradeOfferedEvent', obj: TradeOfferedEvent },
      { name: 'TradeResolvedEvent', obj: TradeResolvedEvent },
      { name: 'CompletionDeclaredEvent', obj: CompletionDeclaredEvent },
      { name: 'EventCardTriggeredEvent', obj: EventCardTriggeredEvent },
      { name: 'HomeworkHintGainedEvent', obj: HomeworkHintGainedEvent },
      { name: 'HomeworkRevealedEvent', obj: HomeworkRevealedEvent },
      { name: 'GameEndedEvent', obj: GameEndedEvent },
      { name: 'ProtocolErrorEvent', obj: ProtocolErrorEvent },
    ],
  },
};

function buildContext(): GenContext {
  const enums = new Map<string, readonly string[]>(Object.entries(NAMED_ENUMS));
  enums.set('CardKind', FLATTENED_CARD_KIND);
  const objects = new Map<string, z.ZodObject<any>>(Object.entries(NAMED_OBJECTS));
  const unions = new Map<string, UnionDef>(Object.entries(NAMED_UNIONS));
  return {
    enums,
    objects,
    unions,
    findEnumName: (values) => {
      for (const [name, vs] of enums) {
        if (vs.length === values.length && vs.every((v, i) => v === values[i])) {
          return name;
        }
      }
      return undefined;
    },
    findObjectName: (s) => {
      for (const [name, schema] of objects) {
        if (schema === s) return name;
      }
      return undefined;
    },
    findUnionName: (s) => {
      for (const [name, def] of unions) {
        if (def.schema === s) return name;
      }
      return undefined;
    },
  };
}

// ---------------------------------------------------------------------------
// Dart emitters

function dartFieldName(name: string): string {
  // already camelCase in our schemas, just sanitise.
  return name;
}

function dartFieldDecl(f: Field): string {
  const optional = f.optional || f.nullable;
  return `  final ${f.type}${optional ? '?' : ''} ${dartFieldName(f.name)};`;
}

function dartCtorParam(f: Field): string {
  const optional = f.optional || f.nullable;
  return optional
    ? `    this.${dartFieldName(f.name)},`
    : `    required this.${dartFieldName(f.name)},`;
}

function dartFromJsonExpr(f: Field, jsonAccess: string): string {
  const accept = (expr: string) => {
    if (f.optional || f.nullable) {
      return `${jsonAccess} == null ? null : ${expr}`;
    }
    return expr;
  };

  // Lists
  if (f.isList) {
    const inner = f.type.replace(/^List<(.+)>$/, '$1');
    if (inner === 'String') return accept(`List<String>.from(${jsonAccess} as List)`);
    if (inner === 'int') return accept(`List<int>.from((${jsonAccess} as List).map((e) => (e as num).toInt()))`);
    if (inner === 'num') return accept(`List<num>.from(${jsonAccess} as List)`);
    if (inner === 'bool') return accept(`List<bool>.from(${jsonAccess} as List)`);
    // Enum or object element
    if (isEnumName(inner)) {
      return accept(`(${jsonAccess} as List).map((e) => ${inner}FromJson(e as String)).toList()`);
    }
    return accept(`(${jsonAccess} as List).map((e) => ${inner}.fromJson(e as Map<String, dynamic>)).toList()`);
  }

  // Primitives
  if (f.type === 'String') return accept(`${jsonAccess} as String`);
  if (f.type === 'int') return accept(`(${jsonAccess} as num).toInt()`);
  if (f.type === 'num') return accept(`${jsonAccess} as num`);
  if (f.type === 'bool') return accept(`${jsonAccess} as bool`);
  if (f.type === 'dynamic') return accept(jsonAccess);

  // Enum
  if (isEnumName(f.type)) {
    return accept(`${f.type}FromJson(${jsonAccess} as String)`);
  }

  // Object
  return accept(`${f.type}.fromJson(${jsonAccess} as Map<String, dynamic>)`);
}

function dartToJsonExpr(f: Field): string {
  const access = `this.${dartFieldName(f.name)}`;
  const isOpt = f.optional || f.nullable;
  const handleList = (inner: string) => {
    if (['String', 'int', 'num', 'bool'].includes(inner)) {
      return access;
    }
    if (isEnumName(inner)) {
      return `${access}${isOpt ? '?' : ''}.map((e) => ${inner}ToJson(e)).toList()`;
    }
    return `${access}${isOpt ? '?' : ''}.map((e) => e.toJson()).toList()`;
  };
  if (f.isList) {
    const inner = f.type.replace(/^List<(.+)>$/, '$1');
    return handleList(inner);
  }
  if (['String', 'int', 'num', 'bool', 'dynamic'].includes(f.type)) {
    return access;
  }
  if (isEnumName(f.type)) {
    if (isOpt) {
      return `${access} == null ? null : ${f.type}ToJson(${access}!)`;
    }
    return `${f.type}ToJson(${access})`;
  }
  if (isOpt) {
    return `${access}?.toJson()`;
  }
  return `${access}.toJson()`;
}

const ENUM_CONTEXT = new Set<string>();
function isEnumName(t: string): boolean {
  return ENUM_CONTEXT.has(t);
}

function emitEnums(ctx: GenContext): string {
  const out: string[] = [];
  for (const [name, values] of ctx.enums) {
    ENUM_CONTEXT.add(name);
    const ids = values.map((v) => identifierize(v));
    out.push(`enum ${name} {\n${ids.map((i) => `  ${i},`).join('\n')}\n}\n`);
    out.push(`${name} ${name}FromJson(String s) {`);
    out.push(`  switch (s) {`);
    values.forEach((v, i) => {
      out.push(`    case '${v}': return ${name}.${ids[i]};`);
    });
    out.push(`    default: throw StateError('Unknown ${name}: \$s');`);
    out.push(`  }`);
    out.push(`}`);
    out.push(`String ${name}ToJson(${name} v) {`);
    out.push(`  switch (v) {`);
    values.forEach((v, i) => {
      out.push(`    case ${name}.${ids[i]}: return '${v}';`);
    });
    out.push(`  }`);
    out.push(`}`);
    out.push('');
  }
  return out.join('\n');
}

function identifierize(s: string): string {
  // 'Mon' → 'mon', 'RainyDay' → 'rainyDay', 'pink' → 'pink'.
  if (!s) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function emitObject(name: string, schema: z.ZodObject<any>, ctx: GenContext): string {
  const fields = objectFields(schema, ctx);
  const out: string[] = [];
  out.push(`class ${name} {`);
  for (const f of fields) out.push(dartFieldDecl(f));
  out.push('');
  out.push(`  const ${name}({`);
  for (const f of fields) out.push(dartCtorParam(f));
  out.push(`  });`);
  out.push('');
  out.push(`  factory ${name}.fromJson(Map<String, dynamic> json) => ${name}(`);
  for (const f of fields) {
    out.push(`    ${f.name}: ${dartFromJsonExpr(f, `json['${f.name}']`)},`);
  }
  out.push(`  );`);
  out.push('');
  out.push(`  Map<String, dynamic> toJson() => {`);
  for (const f of fields) {
    out.push(`    '${f.name}': ${dartToJsonExpr(f)},`);
  }
  out.push(`  };`);
  out.push(`}`);
  out.push('');
  return out.join('\n');
}

function emitUnion(name: string, def: UnionDef, ctx: GenContext): string {
  const out: string[] = [];
  // Sealed parent
  out.push(`sealed class ${name} {`);
  out.push(`  const ${name}();`);
  out.push(`  String get kind;`);
  out.push(`  Map<String, dynamic> toJson();`);
  out.push(`  factory ${name}.fromJson(Map<String, dynamic> json) {`);
  out.push(`    final k = json['${def.discriminator}'] as String;`);
  out.push(`    switch (k) {`);
  for (const v of def.variants) {
    const lit = literalDiscriminatorValue(v.obj, def.discriminator);
    out.push(`      case '${lit}': return ${v.name}.fromJson(json);`);
  }
  out.push(`      default: throw StateError('Unknown ${name} kind: \$k');`);
  out.push(`    }`);
  out.push(`  }`);
  out.push(`}`);
  out.push('');

  // Variants: each is a class extending the sealed parent
  for (const v of def.variants) {
    const fields = objectFields(v.obj, ctx).filter((f) => f.name !== def.discriminator);
    const lit = literalDiscriminatorValue(v.obj, def.discriminator);
    const empty = fields.length === 0;
    out.push(`final class ${v.name} extends ${name} {`);
    for (const f of fields) out.push(dartFieldDecl(f));
    if (!empty) out.push('');
    if (empty) {
      out.push(`  const ${v.name}();`);
    } else {
      out.push(`  const ${v.name}({`);
      for (const f of fields) out.push(dartCtorParam(f));
      out.push(`  });`);
    }
    out.push('');
    out.push(`  @override`);
    out.push(`  String get kind => '${lit}';`);
    out.push('');
    if (empty) {
      out.push(`  factory ${v.name}.fromJson(Map<String, dynamic> _json) => const ${v.name}();`);
    } else {
      out.push(`  factory ${v.name}.fromJson(Map<String, dynamic> json) => ${v.name}(`);
      for (const f of fields) {
        out.push(`    ${f.name}: ${dartFromJsonExpr(f, `json['${f.name}']`)},`);
      }
      out.push(`  );`);
    }
    out.push('');
    out.push(`  @override`);
    out.push(`  Map<String, dynamic> toJson() => {`);
    out.push(`    '${def.discriminator}': '${lit}',`);
    for (const f of fields) {
      out.push(`    '${f.name}': ${dartToJsonExpr(f)},`);
    }
    out.push(`  };`);
    out.push(`}`);
    out.push('');
  }

  return out.join('\n');
}

function literalDiscriminatorValue(obj: z.ZodObject<any>, key: string): string {
  const shape = obj.shape;
  const f = shape[key];
  if (!f) throw new Error(`Variant missing discriminator field '${key}'`);
  const def = (f as ZodTypeAny)._def;
  if (def.typeName !== 'ZodLiteral')
    throw new Error(`Variant discriminator '${key}' is not a literal`);
  return def.value as string;
}

// ---------------------------------------------------------------------------
// Constants emitter — reads packages/schema/data/*.json and emits matching
// Dart constants so the client can use the same values without copy-paste.

type BalanceJson = {
  recipes: Record<string, Record<string, number>>;
  movesPerPlayer: number;
  slotsPerDay: number;
  days: number;
  drawCostPoo: number;
  pooPerSlot: number;
  businessCardPoo: number;
  startingHandSize: number;
  startingPoo: number;
  completionPoints: number;
  partialPoints: number;
  homeworkBonus: number;
};
type BoardJson = { slots: { index: number; kind: string; day: string }[] };

function emitConstants(): string {
  const balance = loadJson<BalanceJson>('balance.json');
  const board = loadJson<BoardJson>('board.json');
  const out: string[] = [];

  // Completion recipes: { 'bagino' | 'bagina' → { Tooth: n, Paw: n, ... } }
  // Emitted as a Dart const map keyed by CompletionKind and CardKind so the
  // client compiler enforces the same string set the server uses.
  out.push('// -- Game balance constants (from packages/schema/data/balance.json)');
  out.push('const Map<CompletionKind, Map<CardKind, int>> kRecipes = {');
  for (const [completionRaw, requirements] of Object.entries(balance.recipes)) {
    const completion = identifierize(completionRaw);
    out.push(`  CompletionKind.${completion}: {`);
    for (const [kindRaw, count] of Object.entries(requirements)) {
      const kind = identifierize(kindRaw);
      out.push(`    CardKind.${kind}: ${count},`);
    }
    out.push('  },');
  }
  out.push('};');
  out.push('');
  out.push('/// Total card count required for a completion declaration.');
  out.push('int recipeCardCount(CompletionKind k) =>');
  out.push('    kRecipes[k]!.values.fold(0, (a, b) => a + b);');
  out.push('');
  out.push(`const int kMovesPerPlayer = ${balance.movesPerPlayer};`);
  out.push(`const int kSlotsPerDay = ${balance.slotsPerDay};`);
  out.push(`const int kDays = ${balance.days};`);
  out.push(`const int kDrawCostPoo = ${balance.drawCostPoo};`);
  out.push(`const int kPooPerSlot = ${balance.pooPerSlot};`);
  out.push(`const int kStartingHandSize = ${balance.startingHandSize};`);
  out.push(`const int kStartingPoo = ${balance.startingPoo};`);
  out.push('');

  // Board layout — poo slots, total slot count, and the ordered day list.
  const pooSlots = board.slots.filter((s) => s.kind === 'poo').map((s) => s.index);
  // Preserve order of first appearance.
  const dayOrder: string[] = [];
  for (const s of board.slots) if (!dayOrder.includes(s.day)) dayOrder.push(s.day);
  out.push('// -- Board layout constants (from packages/schema/data/board.json)');
  out.push(`const List<int> kPooSlots = [${pooSlots.join(', ')}];`);
  out.push(`const int kTotalSlots = ${board.slots.length};`);
  out.push(`const List<Day> kDayOrder = [${dayOrder.map((d) => `Day.${identifierize(d)}`).join(', ')}];`);
  out.push('');

  return out.join('\n');
}

// ---------------------------------------------------------------------------
// Main

function main() {
  const ctx = buildContext();
  const out: string[] = [];
  out.push('// GENERATED FILE — do not edit by hand.');
  out.push('// Source of truth: packages/schema/src/*.ts (Zod) + packages/schema/data/*.json.');
  out.push('// Regenerate with: pnpm --filter @bagina/schema run gen');
  out.push('// ignore_for_file: type=lint');
  out.push('');

  out.push(emitEnums(ctx));

  // Objects (skip those that participate in unions — the union emitter
  // handles their fields directly to avoid duplicate Dart classes).
  const variantSet = new Set<z.ZodObject<any>>();
  for (const u of ctx.unions.values()) for (const v of u.variants) variantSet.add(v.obj);

  for (const [name, schema] of ctx.objects) {
    if (variantSet.has(schema)) continue;
    out.push(emitObject(name, schema, ctx));
  }

  for (const [name, def] of ctx.unions) {
    out.push(emitUnion(name, def, ctx));
  }

  out.push(emitConstants());

  const content = out.join('\n');
  const target = process.argv[2] ?? '../../client/lib/wire/wire.dart';
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
  console.log(`wrote ${target}`);
}

main();
