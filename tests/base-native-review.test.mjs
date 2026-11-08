import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';

import { ESLint } from 'eslint';

import { baseConfig, fixtureFile, messagesFor, reactConfig, root } from './helpers.mjs';

const eslint = new ESLint({
  cwd: root,
  overrideConfigFile: path.join(root, 'tests/fixtures/eslint.react.config.mjs'),
});
const effectiveReact = {};
for (const file of ['case.js', 'case.jsx', 'case.ts', 'case.tsx']) {
  effectiveReact[file] = await eslint.calculateConfigForFile(fixtureFile(file));
}

for (const [file, config] of Object.entries(effectiveReact)) {
  test(`curly não é ativada pelos presets em ${file}`, () => {
    assert.equal(config.rules.curly, undefined);
  });

  test(`@stylistic/brace-style permanece ativa em ${file}`, () => {
    assert.equal(config.rules['@stylistic/brace-style'][0], 2);
  });
}

const RECOMMENDED_REACT = [
  'react/no-is-mounted',
  'react/no-render-return-value',
  'react/no-string-refs',
  'react/no-unescaped-entities',
  'react/require-render-return',
  'react/no-unknown-property',
  'react/jsx-no-target-blank',
];

for (const file of ['case.jsx', 'case.tsx']) {
  for (const rule of RECOMMENDED_REACT) {
    test(`${rule} é herdada como error em ${file}`, () => {
      assert.equal(effectiveReact[file].rules[rule]?.[0], 2);
    });
  }
}

const lint = (file, code, rule, config = baseConfig) => messagesFor(code, config, fixtureFile(file), [rule]);

test('curly aceita if sem chaves em uma linha', () => {
  const code = 'export function f(ativo) {\n  if (ativo)\n    executar();\n}\nfunction executar() {}\n';
  assert.equal(lint('case.js', code, 'curly', reactConfig).length, 0);
});

test('curly aceita if com chaves', () => {
  const code = 'export function f(ativo) {\n  if (ativo) {\n    executar();\n  }\n}\nfunction executar() {}\n';
  assert.equal(lint('case.js', code, 'curly', reactConfig).length, 0);
});

test('no-unassigned-vars reporta variável declarada e nunca atribuída', () => {
  const code = 'export function f() {\n  let x;\n  return x;\n}\n';
  assert.equal(lint('case.js', code, 'no-unassigned-vars').length, 1);
});

test('no-unassigned-vars aceita variável atribuída antes do uso', () => {
  const code = 'export function f() {\n  let x;\n  x = 1;\n  return x;\n}\n';
  assert.equal(lint('case.js', code, 'no-unassigned-vars').length, 0);
});

test('no-useless-assignment reporta atribuição que nunca é lida', () => {
  const code = 'export function f() {\n  let x = 1;\n  x = 2;\n  return x;\n}\n';
  assert.equal(lint('case.js', code, 'no-useless-assignment').length, 1);
});

test('preserve-caught-error reporta novo erro sem cause', () => {
  const code = [
    'export async function f() {',
    '  try {',
    '    await salvar();',
    '  } catch (error) {',
    "    throw new Error('Falha ao salvar');",
    '  }',
    '}',
    'async function salvar() {}',
    '',
  ].join('\n');
  assert.ok(lint('case.js', code, 'preserve-caught-error').length >= 1);
});

test('preserve-caught-error aceita novo erro com cause', () => {
  const code = [
    'export async function f() {',
    '  try {',
    '    await salvar();',
    '  } catch (error) {',
    "    throw new Error('Falha ao salvar', {",
    '      cause: error,',
    '    });',
    '  }',
    '}',
    'async function salvar() {}',
    '',
  ].join('\n');
  assert.equal(lint('case.js', code, 'preserve-caught-error').length, 0);
});

test('as três nativas novas resolvem como error em .js e .ts', async () => {
  const eslintBase = new ESLint({
    cwd: root,
    overrideConfigFile: path.join(root, 'tests/fixtures/eslint.base.config.mjs'),
  });
  for (const file of ['case.js', 'case.ts']) {
    const config = await eslintBase.calculateConfigForFile(fixtureFile(file));
    for (const rule of ['no-unassigned-vars', 'no-useless-assignment', 'preserve-caught-error']) {
      assert.equal(config.rules[rule]?.[0], 2, `${rule} em ${file}`);
    }
  }
});

test('no-multiple-empty-lines nativa não é ativada junto com a versão @stylistic', async () => {
  const config = effectiveReact['case.js'];
  assert.equal(config.rules['no-multiple-empty-lines'], undefined);
});

test('@stylistic/no-multiple-empty-lines resolve com maxBOF 0, max 1 e maxEOF 1', async () => {
  const eslintBase = new ESLint({
    cwd: root,
    overrideConfigFile: path.join(root, 'tests/fixtures/eslint.base.config.mjs'),
  });
  const config = await eslintBase.calculateConfigForFile(fixtureFile('case.js'));
  assert.deepEqual(config.rules['@stylistic/no-multiple-empty-lines'], [2, { max: 1, maxBOF: 0, maxEOF: 1 }]);
});

const mel = (code) => lint('case.js', code, '@stylistic/no-multiple-empty-lines');

test('no-multiple-empty-lines reporta linha vazia no início do arquivo', () => {
  assert.equal(mel('\nexport const a = 1;\n').length, 1);
});

test('no-multiple-empty-lines aceita uma linha vazia entre blocos', () => {
  assert.equal(mel('export const a = 1;\n\nexport const b = 2;\n').length, 0);
});

test('no-multiple-empty-lines reporta mais de uma linha vazia entre blocos', () => {
  assert.equal(mel('export const a = 1;\n\n\nexport const b = 2;\n').length, 1);
});

test('no-multiple-empty-lines reporta mais de uma linha vazia no fim do arquivo', () => {
  assert.equal(mel('export const a = 1;\n\n\n').length, 1);
});

test('no-multiple-empty-lines aceita uma linha vazia no fim do arquivo', () => {
  assert.equal(mel('export const a = 1;\n\n').length, 0);
});
