import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';

import { ESLint } from 'eslint';

import { baseConfig, fixtureFile, messagesFor, root } from './helpers.mjs';

const ADDED_RULES = [
  'prefer-rest-params',
  'prefer-spread',
  '@typescript-eslint/no-misused-new',
  '@typescript-eslint/triple-slash-reference',
  '@typescript-eslint/no-extra-non-null-assertion',
  '@typescript-eslint/no-wrapper-object-types',
];

const INHERITED_RULES = [
  'no-prototype-builtins',
  'no-regex-spaces',
  'no-self-assign',
  'no-shadow-restricted-names',
  'no-sparse-arrays',
  'no-unsafe-finally',
  'no-unused-labels',
  'no-unused-private-class-members',
  'no-useless-backreference',
  'no-useless-catch',
  'no-useless-escape',
  'no-unexpected-multiline',
  'no-unreachable',
];

const eslint = new ESLint({
  cwd: root,
  overrideConfigFile: path.join(root, 'tests/fixtures/eslint.base.config.mjs'),
});
const effectiveJs = await eslint.calculateConfigForFile(fixtureFile('case.js'));
const effectiveTs = await eslint.calculateConfigForFile(fixtureFile('case.ts'));

for (const rule of ADDED_RULES) {
  test(`${rule} resolve como error em .js e .ts`, () => {
    assert.equal(effectiveJs.rules[rule]?.[0], 2);
    assert.equal(effectiveTs.rules[rule]?.[0], 2);
  });
}

test('no-unsafe-optional-chaining resolve com disallowArithmeticOperators: true', () => {
  assert.deepEqual(effectiveJs.rules['no-unsafe-optional-chaining'], [2, { disallowArithmeticOperators: true }]);
  assert.deepEqual(effectiveTs.rules['no-unsafe-optional-chaining'], [2, { disallowArithmeticOperators: true }]);
});

for (const rule of INHERITED_RULES) {
  test(`${rule} continua herdada como error`, () => {
    assert.equal(effectiveJs.rules[rule]?.[0], 2);
  });
}

const lintRule = (kind, code, rule) =>
  messagesFor(code, baseConfig, fixtureFile(kind === 'js' ? 'case.js' : 'case.ts'), [rule]);

test('prefer-rest-params reporta uso de arguments', () => {
  const code = 'export function f() {\n  return arguments[0];\n}\n';
  assert.equal(lintRule('js', code, 'prefer-rest-params').length, 1);
});

test('prefer-rest-params aceita parâmetros rest', () => {
  const code = 'export function f(...args) {\n  return args[0];\n}\n';
  assert.equal(lintRule('js', code, 'prefer-rest-params').length, 0);
});

test('prefer-spread reporta apply com undefined como thisArg', () => {
  const code = 'export const m = (f, a) => f.apply(undefined, a);\n';
  assert.equal(lintRule('js', code, 'prefer-spread').length, 1);
});

test('prefer-spread aceita spread', () => {
  const code = 'export const m = (f, a) => f(...a);\n';
  assert.equal(lintRule('js', code, 'prefer-spread').length, 0);
});

test('no-misused-new reporta construct signature em interface', () => {
  const code = 'export interface I {\n  new (): I;\n}\n';
  assert.equal(lintRule('ts', code, '@typescript-eslint/no-misused-new').length, 1);
});

test('no-misused-new reporta método chamado new em classe', () => {
  const code = 'export class C {\n  new(): C;\n}\n';
  assert.equal(lintRule('ts', code, '@typescript-eslint/no-misused-new').length, 1);
});

test('no-misused-new aceita constructor em classe', () => {
  const code = 'export class C {\n  constructor() {}\n}\n';
  assert.equal(lintRule('ts', code, '@typescript-eslint/no-misused-new').length, 0);
});

test('triple-slash-reference reporta diretiva de referência', () => {
  const code = '/// <reference path="./types.d.ts" />\nexport const x = 1;\n';
  assert.equal(lintRule('ts', code, '@typescript-eslint/triple-slash-reference').length, 1);
});

test('triple-slash-reference aceita código sem diretiva', () => {
  const code = 'export const x = 1;\n';
  assert.equal(lintRule('ts', code, '@typescript-eslint/triple-slash-reference').length, 0);
});

test('no-extra-non-null-assertion reporta !! redundante', () => {
  const code = 'declare const b: string | undefined;\nexport const a = b!!;\n';
  assert.equal(lintRule('ts', code, '@typescript-eslint/no-extra-non-null-assertion').length, 1);
});

test('no-extra-non-null-assertion aceita um único !', () => {
  const code = 'declare const b: string | undefined;\nexport const a = b!;\n';
  assert.equal(lintRule('ts', code, '@typescript-eslint/no-extra-non-null-assertion').length, 0);
});

test('no-wrapper-object-types reporta o tipo String', () => {
  const code = 'export let s: String = \'x\';\n';
  assert.equal(lintRule('ts', code, '@typescript-eslint/no-wrapper-object-types').length, 1);
});

test('no-wrapper-object-types aceita o tipo primitivo string', () => {
  const code = 'export let s: string = \'x\';\n';
  assert.equal(lintRule('ts', code, '@typescript-eslint/no-wrapper-object-types').length, 0);
});

const UNSAFE_OPTIONAL_CHAINING_INVALID = [
  'export const total = usuario?.saldo * 2;\n',
  'export const desconto = produto?.preco - 10;\n',
  'export const resultado = +objeto?.valor;\n',
];
const UNSAFE_OPTIONAL_CHAINING_VALID = [
  'export const total = (usuario?.saldo ?? 0) * 2;\n',
  'export const desconto = (produto?.preco ?? 0) - 10;\n',
  'export const resultado = +(objeto?.valor ?? 0);\n',
];

for (const [index, code] of UNSAFE_OPTIONAL_CHAINING_INVALID.entries()) {
  test(`no-unsafe-optional-chaining reporta aritmética sem fallback (exemplo ${index + 1}) em .js`, () => {
    assert.equal(lintRule('js', code, 'no-unsafe-optional-chaining').length, 1);
  });
  test(`no-unsafe-optional-chaining reporta aritmética sem fallback (exemplo ${index + 1}) em .ts`, () => {
    assert.equal(lintRule('ts', code, 'no-unsafe-optional-chaining').length, 1);
  });
}

for (const [index, code] of UNSAFE_OPTIONAL_CHAINING_VALID.entries()) {
  test(`no-unsafe-optional-chaining aceita fallback explícito (exemplo ${index + 1}) em .js`, () => {
    assert.equal(lintRule('js', code, 'no-unsafe-optional-chaining').length, 0);
  });
  test(`no-unsafe-optional-chaining aceita fallback explícito (exemplo ${index + 1}) em .ts`, () => {
    assert.equal(lintRule('ts', code, 'no-unsafe-optional-chaining').length, 0);
  });
}

test('sem disallowArithmeticOperators, a aritmética com optional chaining não é reportada', () => {
  const relaxed = [...baseConfig, {
    files: ['**/*.{js,ts}'],
    rules: { 'no-unsafe-optional-chaining': ['error', { disallowArithmeticOperators: false }] },
  }];
  const messages = messagesFor(UNSAFE_OPTIONAL_CHAINING_INVALID[0], relaxed, fixtureFile('case.js'), ['no-unsafe-optional-chaining']);
  assert.equal(messages.length, 0);
});
