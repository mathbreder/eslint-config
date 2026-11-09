import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import { Linter } from 'eslint';

import { eslintConfigs } from '../dist/index.js';
import { root } from './helpers.mjs';

const RULES = ['perfectionist/sort-union-types', 'perfectionist/sort-intersection-types'];
const file = path.join(root, 'tests', 'fixtures', 'perfectionist', 'samples.ts');
const code = fs.readFileSync(file, 'utf8');
const linter = new Linter({ configType: 'flat' });

const EXPECTED_FIXED = [
  "export type Unsorted = 'a' | 'b' | 1 | 3;",
  '',
  "export type Grouped = 'x' | 1 | null | undefined | { k: string };",
  '',
  'export type Intersect = Partial<Record<string, string>> & { b: string } & { a: number };',
  '',
  'export type Multiline =',
  '  | \'alpha\'',
  '  | \'zeta\';',
  '',
  'export type Objects = { m: 3 } | { z: 1; a: 2 };',
  '',
].join('\n');

test('perfectionist está instalado na linha 4 e a peer declara ^4.15.0', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  assert.equal(require('eslint-plugin-perfectionist/package.json').version, '4.15.0');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.peerDependencies['eslint-plugin-perfectionist'], '^4.15.0');
});

test('sort-union-types e sort-intersection-types permanecem com severidade error', () => {
  const config = linter.verify('export type X = 1 | 0;', eslintConfigs.baseConfig, file);
  assert.ok(config.some((m) => m.ruleId === 'perfectionist/sort-union-types' && m.severity === 2));
});

test('diagnósticos das duas regras são os mesmos da linha 5 (quantidade, linha, coluna e severidade)', () => {
  const diagnostics = linter.verify(code, eslintConfigs.baseConfig, file).filter((m) => RULES.includes(m.ruleId));
  assert.equal(diagnostics.length, 7);
  assert.deepEqual(
    diagnostics.map((m) => [m.ruleId, m.line, m.column, m.severity]),
    [
      ['perfectionist/sort-union-types', 1, 30, 2],
      ['perfectionist/sort-union-types', 1, 40, 2],
      ['perfectionist/sort-union-types', 3, 42, 2],
      ['perfectionist/sort-intersection-types', 5, 57, 2],
      ['perfectionist/sort-union-types', 10, 5, 2],
      ['perfectionist/sort-union-types', 10, 5, 2],
      ['perfectionist/sort-union-types', 12, 40, 2],
    ],
  );
});

test('a correção automática produz a mesma saída de antes da migração', () => {
  const { output, messages } = linter.verifyAndFix(code, eslintConfigs.baseConfig, file);
  assert.equal(output, EXPECTED_FIXED);
  assert.equal(messages.filter((m) => RULES.includes(m.ruleId)).length, 0);
});

test('a ordenação de union e intersection aceita o resultado já ordenado', () => {
  const sorted = `${EXPECTED_FIXED}`;
  const messages = linter.verify(sorted, eslintConfigs.baseConfig, file).filter((m) => RULES.includes(m.ruleId));
  assert.equal(messages.length, 0);
});
