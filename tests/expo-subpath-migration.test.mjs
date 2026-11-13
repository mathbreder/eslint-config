import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { test } from 'node:test';

import { eslintConfigs } from '../dist/index.js';
import { root } from './helpers.mjs';

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const dist = (...parts) => path.join(root, 'dist', ...parts);
const requireFromRoot = createRequire(path.join(root, 'package.json'));

const RELATIVE_IMPORT = /(?:from\s+|import\s*\(\s*|require\s*\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g;

const reachableFrom = (entry) => {
  const seen = new Set();
  const queue = [entry];
  while (queue.length > 0) {
    const current = queue.pop();
    if (seen.has(current) || !fs.existsSync(current)) continue;
    seen.add(current);
    const source = fs.readFileSync(current, 'utf8');
    for (const match of source.matchAll(RELATIVE_IMPORT)) {
      queue.push(path.resolve(path.dirname(current), match[1]));
    }
  }
  return [...seen];
};

test('o barrel eslintConfigs não expõe mais expoConfig (migração para o subpath)', () => {
  assert.equal('expoConfig' in eslintConfigs, false);
  assert.equal(eslintConfigs.expoConfig, undefined);
});

test('eslintConfigs continua expondo os presets do entry principal', () => {
  for (const name of ['baseConfig', 'reactNextConfig', 'typeCheckedConfig', 'getEslintImportConfig', 'defineConfig']) {
    assert.ok(name in eslintConfigs, `${name} deve continuar exportado`);
  }
});

test('o subpath ./expo está declarado com condições import e require apontando para arquivos construídos', () => {
  const entry = pkg.exports['./expo'];
  assert.ok(entry, 'exports["./expo"] deve existir');
  assert.equal(entry.import.default, './dist/eslint-configs/expo.js');
  assert.equal(entry.import.types, './dist/eslint-configs/expo.d.ts');
  assert.equal(entry.require.default, './dist/eslint-configs/expo.cjs');
  assert.equal(entry.require.types, './dist/eslint-configs/expo.d.cts');
  for (const file of [entry.import.default, entry.import.types, entry.require.default, entry.require.types]) {
    assert.ok(fs.existsSync(path.join(root, file)), `${file} deve existir após o build`);
  }
});

test('@mathbreder/eslint-config/expo entrega expoConfig em ESM e CommonJS, com a mesma forma', async () => {
  const esm = await import('@mathbreder/eslint-config/expo');
  const cjs = requireFromRoot('@mathbreder/eslint-config/expo');
  assert.ok(Array.isArray(esm.expoConfig));
  assert.ok(Array.isArray(cjs.expoConfig));
  assert.equal(esm.expoConfig.length, cjs.expoConfig.length);
});

test('o subpath ./expo mantém a decisão de react-hooks/static-components desligada em jsx/tsx', async () => {
  const { expoConfig } = await import('@mathbreder/eslint-config/expo');
  const decision = expoConfig.find((cfg) => cfg.name === 'expo-react-hooks-project-decision');
  assert.ok(decision);
  assert.equal(decision.rules['react-hooks/static-components'], 'off');
});

test('o grafo de imports do entry principal (ESM e CJS) não alcança eslint-config-expo', () => {
  for (const entry of [dist('index.js'), dist('index.cjs')]) {
    const modules = reachableFrom(entry);
    assert.ok(modules.length > 1, `${entry} deve referenciar módulos internos`);
    for (const file of modules) {
      const source = fs.readFileSync(file, 'utf8');
      assert.equal(source.includes('eslint-config-expo'), false, `${path.relative(root, file)} não deve carregar eslint-config-expo`);
    }
  }
});

test('eslint-config-expo é peer opcional, então não é instalada automaticamente com o pacote', () => {
  assert.equal(pkg.peerDependenciesMeta['eslint-config-expo'].optional, true);
  assert.ok(pkg.peerDependencies['eslint-config-expo'], 'a peer continua declarada para quem usa o subpath');
});

test('a versão do pacote é 0.1.1, a release que corrige a publicação no npm', () => {
  assert.equal(pkg.version, '0.1.1');
});
