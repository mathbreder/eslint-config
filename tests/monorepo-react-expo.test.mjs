import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';

import { ESLint } from 'eslint';

import { eslintConfigs, getEslintImportConfig } from '../dist/index.js';
import { root } from './helpers.mjs';

const monorepo = path.join(root, 'tests/fixtures/monorepo');
const project = (name) => {
  const cwd = path.join(monorepo, name);
  return { cwd, eslint: new ESLint({ cwd }), file: path.join(cwd, 'src', name === 'packages/shared' ? 'util.ts' : 'App.tsx') };
};
const web = project('apps/web');
const mobile = project('apps/mobile');
const shared = project('packages/shared');

const effectiveOf = async ({ eslint, file }) => eslint.calculateConfigForFile(file);

test('apps/web usa a config React do próprio projeto', async () => {
  const config = await effectiveOf(web);
  assert.equal(config.rules['react-hooks/set-state-in-effect']?.[0], 2);
  assert.equal(config.rules['react-hooks/rules-of-hooks']?.[0], 2);
});

test('apps/mobile usa o Expo 58, que aplica react-hooks 7 como o preset React', async () => {
  const config = await effectiveOf(mobile);
  assert.equal(config.rules['react-hooks/set-state-in-effect']?.[0], 2);
  assert.equal(config.rules['react-hooks/rules-of-hooks']?.[0], 2);
});

test('packages/shared recebe apenas a base, sem regras React', async () => {
  const config = await effectiveOf(shared);
  assert.equal(config.rules['react-hooks/rules-of-hooks'], undefined);
  assert.equal(config.rules['react/jsx-indent'], undefined);
  assert.equal(config.rules['prefer-const'][0], 2);
});

test('a regra de hooks é executada em apps/web e em apps/mobile', async () => {
  for (const { eslint, file } of [web, mobile]) {
    const [result] = await eslint.lintFiles([file]);
    const hooks = result.messages.filter((message) => message.ruleId === 'react-hooks/rules-of-hooks');
    assert.equal(hooks.length, 1, file);
  }
});

test('escopos de arquivo não permitem duas instâncias diferentes do mesmo plugin no mesmo array', () => {
  const webHooks = eslintConfigs.reactNextConfig.find((cfg) => cfg.plugins?.['react-hooks'])?.plugins['react-hooks'];
  const impostorHooks = { ...webHooks };
  assert.ok(webHooks && impostorHooks !== webHooks);
  assert.throws(
    () => eslintConfigs.defineConfig([
      { files: ['apps/web/**'], plugins: { 'react-hooks': webHooks } },
      { files: ['apps/mobile/**'], plugins: { 'react-hooks': impostorHooks } },
    ]),
    /Plugin "react-hooks" foi registrado com implementações diferentes/,
  );
});

test('react e Expo 58 compõem nesta instalação porque compartilham a instância de react-hooks', () => {
  const reactHooks = eslintConfigs.reactNextConfig.find((cfg) => cfg.plugins?.['react-hooks'])?.plugins['react-hooks'];
  const expoHooks = eslintConfigs.expoConfig.find((cfg) => cfg.plugins?.['react-hooks'])?.plugins['react-hooks'];
  assert.equal(reactHooks, expoHooks);
  assert.doesNotThrow(() => eslintConfigs.defineConfig([
    ...eslintConfigs.baseConfig,
    ...eslintConfigs.reactNextConfig,
    ...eslintConfigs.expoConfig,
  ]));
});

test('expoConfig com getEslintImportConfig colide no plugin import (limitação anterior, também no HEAD)', () => {
  assert.throws(
    () => eslintConfigs.defineConfig([
      ...eslintConfigs.baseConfig,
      ...eslintConfigs.expoConfig,
      ...getEslintImportConfig(),
    ]),
    /Plugin "import" foi registrado com implementações diferentes/,
  );
});
