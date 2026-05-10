/**
 * Read tokens.yaml and emit:
 *   - client/lib/theme/tokens.dart
 *   - packages/theme/dist/tokens.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import YAML from 'yaml';

type Tokens = {
  palette: Record<string, string>;
  radii: Record<string, number>;
  elevation: Record<string, number>;
  durations_ms: Record<string, number>;
  springs: Record<string, { mass: number; stiffness: number; damping: number }>;
  type_scale: Record<string, { size: number; weight: number; line: number; letter: number }>;
};

const here = resolve(process.cwd());
const yamlPath = resolve(here, 'tokens.yaml');
const tokens = YAML.parse(readFileSync(yamlPath, 'utf8')) as Tokens;

// ---- Dart ------------------------------------------------------------------
function camel(s: string): string {
  return s.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase());
}
function pascal(s: string): string {
  const c = camel(s);
  return c.charAt(0).toUpperCase() + c.slice(1);
}
function hexToARGB(hex: string): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) throw new Error(`bad hex: ${hex}`);
  return `0xFF${h.toUpperCase()}`;
}

const dart: string[] = [];
dart.push('// GENERATED FILE — do not edit by hand.');
dart.push('// Source: packages/theme/tokens.yaml');
dart.push('// Regenerate with: pnpm --filter @bagina/theme run gen');
dart.push("// ignore_for_file: type=lint");
// Material re-exports SpringDescription from physics, so a single import suffices.
dart.push("import 'package:flutter/material.dart';");
dart.push('');
dart.push('class BaginaPalette {');
for (const [name, hex] of Object.entries(tokens.palette)) {
  dart.push(`  static const ${camel(name)} = Color(${hexToARGB(hex)});`);
}
dart.push('}');
dart.push('');

dart.push('class BaginaRadii {');
for (const [name, n] of Object.entries(tokens.radii)) {
  dart.push(`  static const ${camel(name)} = ${n}.0;`);
}
dart.push('}');
dart.push('');

dart.push('class BaginaElevation {');
for (const [name, n] of Object.entries(tokens.elevation)) {
  dart.push(`  static const ${camel(name)} = ${n}.0;`);
}
dart.push('}');
dart.push('');

dart.push('class BaginaDurations {');
for (const [name, ms] of Object.entries(tokens.durations_ms)) {
  dart.push(`  static const ${camel(name)} = Duration(milliseconds: ${ms});`);
}
dart.push('}');
dart.push('');

dart.push('class BaginaSprings {');
for (const [name, s] of Object.entries(tokens.springs)) {
  dart.push(
    `  static const ${camel(name)} = SpringDescription(mass: ${s.mass}, stiffness: ${s.stiffness}.0, damping: ${s.damping}.0);`,
  );
}
dart.push('}');
dart.push('');

dart.push('class BaginaTypeScale {');
for (const [name, ts] of Object.entries(tokens.type_scale)) {
  dart.push(
    `  static const ${camel(name)} = TextStyle(fontSize: ${ts.size}.0, fontWeight: FontWeight.w${ts.weight}, height: ${(ts.line / ts.size).toFixed(3)}, letterSpacing: ${ts.letter});`,
  );
}
dart.push('}');
dart.push('');

const dartTarget = resolve(here, '../../client/lib/theme/tokens.dart');
mkdirSync(dirname(dartTarget), { recursive: true });
writeFileSync(dartTarget, dart.join('\n'));
console.log(`wrote ${dartTarget}`);

// ---- TS --------------------------------------------------------------------
const ts: string[] = [];
ts.push('// GENERATED FILE — do not edit by hand.');
ts.push('// Source: packages/theme/tokens.yaml');
ts.push('export const tokens = ' + JSON.stringify(tokens, null, 2) + ' as const;');
ts.push('export type Tokens = typeof tokens;');

const tsTarget = resolve(here, 'dist/tokens.ts');
mkdirSync(dirname(tsTarget), { recursive: true });
writeFileSync(tsTarget, ts.join('\n'));
console.log(`wrote ${tsTarget}`);
