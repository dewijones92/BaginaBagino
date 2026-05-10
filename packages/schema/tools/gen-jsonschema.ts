// Export the Zod schemas to JSON Schema for downstream codegen.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { GameAction, ServerEvent } from '../src/index.js';
import {
  PublicGameState,
  PrivatePlayerView,
  TradeOffer,
  PublicPlayer,
} from '../src/state.js';
import { GameCard } from '../src/cards.js';

const out = (path: string, value: unknown) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
  console.log(`wrote ${path}`);
};

const cwd = process.cwd();
out(`${cwd}/dist/schema.json`, {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $defs: {
    GameAction: zodToJsonSchema(GameAction, { name: 'GameAction', target: 'jsonSchema2019-09' }),
    ServerEvent: zodToJsonSchema(ServerEvent, { name: 'ServerEvent', target: 'jsonSchema2019-09' }),
    PublicGameState: zodToJsonSchema(PublicGameState),
    PrivatePlayerView: zodToJsonSchema(PrivatePlayerView),
    PublicPlayer: zodToJsonSchema(PublicPlayer),
    TradeOffer: zodToJsonSchema(TradeOffer),
    GameCard: zodToJsonSchema(GameCard),
  },
});
