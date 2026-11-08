import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';

import { ESLint } from 'eslint';

import { baseConfig, fixtureFile, messagesFor, root } from './helpers.mjs';

const ADDED_TS_RULES = [
  '@typescript-eslint/ban-ts-comment',
  '@typescript-eslint/no-array-constructor',
  '@typescript-eslint/no-duplicate-enum-values',
  '@typescript-eslint/no-non-null-asserted-optional-chain',
  '@typescript-eslint/no-unsafe-declaration-merging',
  '@typescript-eslint/no-unsafe-function-type',
  '@typescript-eslint/no-unused-expressions',
  '@typescript-eslint/prefer-as-const',
  '@typescript-eslint/prefer-namespace-keyword',
];
const NATIVE_REPLACED_BY_TS = ['no-array-constructor', 'no-unused-expressions', 'no-unused-vars'];

const eslint = new ESLint({
  cwd: root,
  overrideConfigFile: path.join(root, 'tests/fixtures/eslint.base.config.mjs'),
});
const effective = {};
for (const file of ['case.js', 'case.jsx', 'case.ts', 'case.tsx']) {
  effective[file] = await eslint.calculateConfigForFile(fixtureFile(file));
}

for (const rule of ADDED_TS_RULES) {
  test(`${rule} resolve como error em .js, .jsx, .ts e .tsx`, () => {
    for (const config of Object.values(effective)) {
      assert.equal(config.rules[rule]?.[0], 2, rule);
    }
  });
}

test('ban-ts-comment resolve com minimumDescriptionLength: 10', () => {
  assert.deepEqual(effective['case.ts'].rules['@typescript-eslint/ban-ts-comment'], [2, { minimumDescriptionLength: 10 }]);
});

test('eqeqeq resolve como error com always em todos os tipos de arquivo', () => {
  for (const config of Object.values(effective)) {
    assert.deepEqual(config.rules.eqeqeq, [2, 'always']);
  }
});

test('nativas substituídas por regras TypeScript não ficam ativas', () => {
  for (const config of Object.values(effective)) {
    for (const rule of NATIVE_REPLACED_BY_TS) {
      assert.ok(!config.rules[rule] || config.rules[rule][0] === 0, `${rule} ativa`);
    }
  }
});

const lint = (kind, code, rule) =>
  messagesFor(code, baseConfig, fixtureFile(kind === 'js' ? 'case.js' : 'case.ts'), [rule]);
const parseErrors = (kind, code) =>
  messagesFor(code, baseConfig, fixtureFile(kind === 'js' ? 'case.js' : 'case.ts'), [])
    .filter((message) => message.fatal);

test('ban-ts-comment reporta @ts-ignore', () => {
  const code = 'export const a = 1;\n// @ts-ignore\nexport const b: number = \'x\';\n';
  assert.equal(lint('ts', code, '@typescript-eslint/ban-ts-comment').length, 1);
});

test('ban-ts-comment reporta descrição abaixo de 10 caracteres', () => {
  const code = 'export const a = 1;\n// @ts-expect-error: todo\nexport const b: number = \'x\';\n';
  assert.equal(lint('ts', code, '@typescript-eslint/ban-ts-comment').length, 1);
});

test('ban-ts-comment aceita @ts-expect-error com descrição suficiente', () => {
  const code = 'export const a = 1;\n// @ts-expect-error: explicit reason for the mismatch\nexport const b: number = \'x\';\n';
  assert.equal(lint('ts', code, '@typescript-eslint/ban-ts-comment').length, 0);
});

test('no-array-constructor reporta new Array com múltiplos argumentos', () => {
  assert.equal(lint('ts', 'export const a = new Array(1, 2, 3);\n', '@typescript-eslint/no-array-constructor').length, 1);
});

test('no-array-constructor aceita new Array(n) com um único argumento', () => {
  assert.equal(lint('ts', 'export const a = new Array(3);\n', '@typescript-eslint/no-array-constructor').length, 0);
});

test('no-array-constructor aceita literal de array', () => {
  assert.equal(lint('ts', 'export const a = [1, 2, 3];\n', '@typescript-eslint/no-array-constructor').length, 0);
});

test('no-duplicate-enum-values reporta valores repetidos', () => {
  const code = 'export enum E {\n  A = 1,\n  B = 1,\n}\n';
  assert.equal(lint('ts', code, '@typescript-eslint/no-duplicate-enum-values').length, 1);
});

test('no-duplicate-enum-values aceita valores distintos', () => {
  const code = 'export enum E {\n  A = 1,\n  B = 2,\n}\n';
  assert.equal(lint('ts', code, '@typescript-eslint/no-duplicate-enum-values').length, 0);
});

test('no-non-null-asserted-optional-chain reporta ! aplicado logo após optional chaining', () => {
  const code = 'declare const a: { b?: { c: number } } | undefined;\nexport const x = a?.b!;\n';
  assert.equal(lint('ts', code, '@typescript-eslint/no-non-null-asserted-optional-chain').length, 1);
});

test('no-unsafe-declaration-merging reporta interface mesclada com classe nas duas declarações', () => {
  const code = 'export interface Foo {\n  x: number;\n}\nexport class Foo {}\n';
  assert.equal(lint('ts', code, '@typescript-eslint/no-unsafe-declaration-merging').length, 2);
});

test('no-unsafe-function-type reporta o tipo Function', () => {
  assert.equal(lint('ts', 'export let f: Function;\n', '@typescript-eslint/no-unsafe-function-type').length, 1);
});

test('no-unused-expressions reporta expressão sem efeito', () => {
  const code = 'declare const a: number;\na;\n';
  assert.equal(lint('ts', code, '@typescript-eslint/no-unused-expressions').length, 1);
});

test('no-unused-expressions aceita atribuição', () => {
  const code = 'declare const a: number;\nexport const x = a;\n';
  assert.equal(lint('ts', code, '@typescript-eslint/no-unused-expressions').length, 0);
});

test('prefer-as-const reporta asserção de literal', () => {
  assert.equal(lint('ts', 'export const c = \'x\' as \'x\';\n', '@typescript-eslint/prefer-as-const').length, 1);
});

test('prefer-as-const aceita as const', () => {
  assert.equal(lint('ts', 'export const c = \'x\' as const;\n', '@typescript-eslint/prefer-as-const').length, 0);
});

test('prefer-namespace-keyword reporta module com identificador', () => {
  assert.equal(lint('ts', 'export namespace Foo {}\nexport module Bar {}\n', '@typescript-eslint/prefer-namespace-keyword').length, 1);
});

test('prefer-namespace-keyword aceita namespace', () => {
  assert.equal(lint('ts', 'export namespace Foo {}\n', '@typescript-eslint/prefer-namespace-keyword').length, 0);
});

test('eqeqeq reporta == null em .js', () => {
  assert.equal(lint('js', 'export function f(value) {\n  if (value == null) {}\n}\n', 'eqeqeq').length, 1);
});

test('eqeqeq aceita comparação estrita com null e undefined em .js', () => {
  const code = 'export function f(value) {\n  if (value === null || value === undefined) {}\n}\n';
  assert.equal(lint('js', code, 'eqeqeq').length, 0);
});

test('regras TypeScript não causam erro de parsing em arquivo .js', () => {
  const code = 'export const a = [1];\nexport const b = new Map();\nexport const c = a?.[0];\n';
  assert.equal(parseErrors('js', code).length, 0);
});
