import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';

import { ESLint } from 'eslint';

import { eslintConfigs, getEslintImportConfig } from '../dist/index.js';
import { expoConfig } from '@mathbreder/eslint-config/expo';
import { root } from './helpers.mjs';

const { defineConfig, baseConfig } = eslintConfigs;
const cycleApp = path.join(root, 'tests', 'fixtures', 'cycle-app');
const composition = path.join(root, 'tests', 'fixtures', 'composition');

const standalone = (cwd) => defineConfig([...baseConfig, ...getEslintImportConfig({ project: path.join(cwd, 'tsconfig.json') })]);
const withExpo = (cwd) => defineConfig([...baseConfig, ...expoConfig, ...getEslintImportConfig({ project: path.join(cwd, 'tsconfig.json') })]);

const lint = async (cwd, configs, file) => {
  const eslint = new ESLint({ cwd, overrideConfig: configs, overrideConfigFile: true });
  const [result] = await eslint.lintFiles([path.join(cwd, 'src', file)]);
  return result.messages;
};
const cycles = (messages) => messages.filter((m) => m.ruleId === 'import/no-cycle');

test('ciclo entre dois arquivos .ts é reportado pelo preset sozinho', async () => {
  assert.equal(cycles(await lint(cycleApp, standalone(cycleApp), 'a.ts')).length, 1);
});

test('ciclo entre .ts e .tsx é reportado pelo preset sozinho', async () => {
  assert.equal(cycles(await lint(cycleApp, standalone(cycleApp), 'tsx-a.tsx')).length, 1);
});

test('ciclo TypeScript é reportado com expoConfig, sem crash do resolver', async () => {
  assert.equal(cycles(await lint(cycleApp, withExpo(cycleApp), 'a.ts')).length, 1);
  assert.equal(cycles(await lint(composition, withExpo(composition), 'cycle-a.ts')).length, 1);
});

test('imports sem extensão explícita (./b) são resolvidos para o arquivo .ts', async () => {
  const messages = await lint(cycleApp, standalone(cycleApp), 'a.ts');
  assert.equal(messages.filter((m) => m.ruleId === 'import/no-unresolved').length, 0, JSON.stringify(messages));
});

test('imports exclusivamente de tipos não geram ciclo', async () => {
  assert.equal(cycles(await lint(composition, standalone(composition), 'type-cycle-a.ts')).length, 0);
  assert.equal(cycles(await lint(composition, withExpo(composition), 'type-cycle-b.ts')).length, 0);
});

test('aliases TypeScript e imports relativos não geram falso positivo de ciclo', async () => {
  for (const file of ['aliases.ts', 'relative.ts', 'external.ts', 'helpers.ts', 'type-only.ts']) {
    assert.equal(cycles(await lint(composition, standalone(composition), file)).length, 0, file);
    assert.equal(cycles(await lint(composition, withExpo(composition), file)).length, 0, file);
  }
});

test('aliases TypeScript resolvem sem falha do resolver', async () => {
  const messages = await lint(composition, standalone(composition), 'aliases.ts');
  assert.equal(messages.filter((m) => m.ruleId === 'import/no-unresolved').length, 0, JSON.stringify(messages));
});

test('import/no-cycle mantém severidade warn e disableScc na configuração efetiva', async () => {
  const eslint = new ESLint({ cwd: cycleApp, overrideConfig: standalone(cycleApp), overrideConfigFile: true });
  const effective = await eslint.calculateConfigForFile(path.join(cycleApp, 'src', 'a.ts'));
  assert.equal(effective.rules['import/no-cycle'][0], 1);
  assert.equal(effective.rules['import/no-cycle'][1].disableScc, true);
});
