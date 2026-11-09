import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';

import { ESLint } from 'eslint';

import { eslintConfigs, getEslintImportConfig } from '../dist/index.js';
import { expoConfig } from '@mathbreder/eslint-config/expo';
import { root } from './helpers.mjs';

const { defineConfig, baseConfig } = eslintConfigs;
const compositionCwd = path.join(root, 'tests', 'fixtures', 'composition');
const project = path.join(compositionCwd, 'tsconfig.json');
const fileOf = (name) => path.join(compositionCwd, 'src', name);

const standaloneConfig = (opts = {}) => defineConfig([...baseConfig, ...getEslintImportConfig({ project, ...opts })]);
const composedConfig = (opts = {}) => defineConfig([...baseConfig, ...expoConfig, ...getEslintImportConfig({ project, ...opts })]);

const lintFile = async (configs, name) => {
  const eslint = new ESLint({ cwd: compositionCwd, overrideConfig: configs, overrideConfigFile: true });
  const [result] = await eslint.lintFiles([fileOf(name)]);
  return result.messages;
};
const PRESET_IMPORT_RULES = ['import/order', 'import/no-unresolved', 'import/no-cycle'];
const importMessages = (messages) => messages.filter((m) => PRESET_IMPORT_RULES.includes(m.ruleId));
const ruleIds = (messages) => messages.map((m) => m.ruleId);

test('baseConfig + getEslintImportConfig resolve aliases TypeScript sem import/no-unresolved', async () => {
  const messages = await lintFile(standaloneConfig(), 'aliases.ts');
  assert.equal(ruleIds(messages).includes('import/no-unresolved'), false, JSON.stringify(messages));
});

test('baseConfig + expoConfig constrói e lint roda sem erro', async () => {
  const configs = defineConfig([...baseConfig, ...expoConfig]);
  const messages = await lintFile(configs, 'relative.ts');
  assert.ok(Array.isArray(messages));
});

test('baseConfig + expoConfig + getEslintImportConfig compõe sem colisão e resolve aliases', async () => {
  const messages = await lintFile(composedConfig(), 'aliases.ts');
  assert.equal(ruleIds(messages).includes('import/no-unresolved'), false, JSON.stringify(messages));
});

test('imports relativos e externos (incluindo import type) não geram erro de import com Expo', async () => {
  assert.equal(importMessages(await lintFile(composedConfig(), 'relative.ts')).length, 0);
  assert.equal(importMessages(await lintFile(composedConfig(), 'external.ts')).length, 0);
});

test('import não resolvido é reportado com Expo e aceito quando declarado em noUnresolvedIgnore', async () => {
  const reported = await lintFile(composedConfig(), 'unresolved.ts');
  assert.equal(reported.filter((m) => m.ruleId === 'import/no-unresolved').length, 1);
  const accepted = await lintFile(composedConfig({ noUnresolvedIgnore: ['^@ghost/'] }), 'unresolved.ts');
  assert.equal(accepted.filter((m) => m.ruleId === 'import/no-unresolved').length, 0);
});

test('import/order continua sendo aplicado com Expo', async () => {
  const messages = await lintFile(composedConfig(), 'order.ts');
  assert.ok(messages.some((m) => m.ruleId === 'import/order'), JSON.stringify(messages));
});

test('type-only import não gera ciclo nem erro de import com Expo', async () => {
  assert.equal(importMessages(await lintFile(composedConfig(), 'type-only.ts')).length, 0);
});

test('ciclo real é detectado com Expo sem crash do import/no-cycle', async () => {
  const messages = await lintFile(composedConfig(), 'cycle-a.ts');
  assert.equal(messages.filter((m) => m.ruleId === 'import/no-cycle').length, 1, JSON.stringify(messages));
});

test('a composição com Expo reporta os mesmos imports que o preset sozinho, exceto ciclos', async () => {
  const names = ['aliases.ts', 'relative.ts', 'external.ts', 'unresolved.ts', 'order.ts', 'type-only.ts', 'helpers.ts'];
  for (const name of names) {
    const standalone = importMessages(await lintFile(standaloneConfig(), name)).map((m) => `${m.ruleId}:${m.line}:${m.message}`);
    const composed = importMessages(await lintFile(composedConfig(), name)).map((m) => `${m.ruleId}:${m.line}:${m.message}`);
    assert.deepEqual(composed, standalone, `diferença em ${name}`);
  }
});

test('a composição usa uma única instância de plugin import', () => {
  const configs = composedConfig();
  const instances = new Set(configs.filter((cfg) => cfg.plugins?.import).map((cfg) => cfg.plugins.import));
  assert.equal(instances.size, 1);
});

test('a instância única é a do próprio pacote, que resolve pelo resolver TypeScript declarado', () => {
  const configs = composedConfig();
  const [instance] = [...new Set(configs.filter((cfg) => cfg.plugins?.import).map((cfg) => cfg.plugins.import))];
  const ownInstance = getEslintImportConfig({ project })[0].plugins.import;
  assert.equal(instance, ownInstance);
});

test('expoConfig sozinho mantém a própria instância de import (sem substituição)', () => {
  const expoInstance = expoConfig.find((cfg) => cfg.plugins?.import)?.plugins.import;
  const composed = defineConfig([...baseConfig, ...expoConfig]);
  assert.equal(composed.find((cfg) => cfg.plugins?.import)?.plugins.import, expoInstance);
});

test('defineConfig não muda os presets: o bloco do Expo continua com a instância original', () => {
  const expoInstance = expoConfig.find((cfg) => cfg.plugins?.import)?.plugins.import;
  composedConfig();
  assert.equal(expoConfig.find((cfg) => cfg.plugins?.import)?.plugins.import, expoInstance);
});

test('no-cycle com disableScc preserva o resultado do cálculo padrão de SCC', async () => {
  const cycleApp = path.join(root, 'tests', 'fixtures', 'cycle-app');
  const extensions = ['.ts', '.cts', '.mts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
  const count = async (noCycleOptions) => {
    const configs = defineConfig([
      ...baseConfig,
      { settings: { 'import/extensions': extensions } },
      ...getEslintImportConfig({ project: path.join(cycleApp, 'tsconfig.json') }),
      { rules: { 'import/no-cycle': noCycleOptions } },
    ]);
    const eslint = new ESLint({ cwd: cycleApp, overrideConfig: configs, overrideConfigFile: true });
    const [result] = await eslint.lintFiles([path.join(cycleApp, 'src', 'a.ts')]);
    return result.messages.filter((m) => m.ruleId === 'import/no-cycle').length;
  };
  assert.equal(await count(['warn', { disableScc: true }]), await count(['warn', {}]));
  assert.equal(await count(['warn', { disableScc: true }]), 1);
});

test('monorepo: app Expo com getEslintImportConfig lint sem crash e sem erro de ordem', async () => {
  const mobileCwd = path.join(root, 'tests', 'fixtures', 'monorepo', 'apps', 'mobile');
  const configs = defineConfig([...baseConfig, ...expoConfig, ...getEslintImportConfig()]);
  const eslint = new ESLint({ cwd: mobileCwd, overrideConfig: configs, overrideConfigFile: true });
  const [result] = await eslint.lintFiles([path.join(mobileCwd, 'src', 'App.tsx')]);
  assert.equal(result.messages.filter((m) => m.ruleId === 'import/order').length, 0, JSON.stringify(result.messages));
});
