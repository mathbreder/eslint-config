import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';

import { ESLint } from 'eslint';

import { eslintConfigs } from '../dist/index.js';
import { root } from './helpers.mjs';

const RULE = '@typescript-eslint/no-floating-promises';
const typed = new ESLint({
  cwd: root,
  overrideConfigFile: path.join(root, 'tests/fixtures/eslint.typechecked.config.mjs'),
});
const plain = new ESLint({
  cwd: root,
  overrideConfigFile: path.join(root, 'tests/fixtures/eslint.base.config.mjs'),
});
const fixture = (name) => path.join(root, 'tests/fixtures/app/src/typed', `${name}.ts`);
const floatingIn = async (linter, file) => {
  const [result] = await linter.lintFiles([file]);
  return result.messages.filter((message) => message.ruleId === RULE);
};

test('typeCheckedConfig é exportado pela API pública de eslintConfigs', () => {
  assert.ok(Array.isArray(eslintConfigs.typeCheckedConfig));
});

test('no-floating-promises resolve como error com o preset type-checked', async () => {
  const config = await typed.calculateConfigForFile(fixture('floating'));
  assert.equal(config.rules[RULE][0], 2);
  assert.equal(config.languageOptions.parserOptions.projectService, true);
});

test('no-floating-promises não está no baseConfig isolado', async () => {
  const config = await plain.calculateConfigForFile(fixture('floating'));
  assert.equal(config.rules[RULE], undefined);
});

test('promise chamada sem tratamento é reportada', async () => {
  assert.equal((await floatingIn(typed, fixture('floating'))).length, 1);
});

test('promise aguardada com await é aceita', async () => {
  assert.equal((await floatingIn(typed, fixture('awaited'))).length, 0);
});

test('promise retornada é aceita', async () => {
  assert.equal((await floatingIn(typed, fixture('returned'))).length, 0);
});

test('promise tratada com catch é aceita', async () => {
  assert.equal((await floatingIn(typed, fixture('caught'))).length, 0);
});

test('promise marcada com void é aceita por padrão', async () => {
  assert.equal((await floatingIn(typed, fixture('voided'))).length, 0);
});

test('then sem tratamento de rejeição é reportada', async () => {
  assert.equal((await floatingIn(typed, fixture('then-without-rejection'))).length, 1);
});

test('mesmo código passa sem o preset, porque a regra não está ativa', async () => {
  assert.equal((await floatingIn(plain, fixture('floating'))).length, 0);
});

test('projetos com tsconfig diferentes são resolvidos na mesma execução', async () => {
  const [secondApp, firstApp] = await typed.lintFiles([
    path.join(root, 'tests/fixtures/second-app/src/floating.ts'),
    fixture('floating'),
  ]);
  assert.equal(secondApp.messages.filter((message) => message.ruleId === RULE).length, 1);
  assert.equal(firstApp.messages.filter((message) => message.ruleId === RULE).length, 1);
});

test('arquivo fora de qualquer tsconfig gera erro de configuração, não é ignorado', async () => {
  const [result] = await typed.lintFiles([path.join(root, 'tests/fixtures/orphan/floating.ts')]);
  const fatal = result.messages.filter((message) => message.fatal);
  assert.equal(fatal.length, 1);
  assert.match(fatal[0].message, /was not found by the project service/);
});
