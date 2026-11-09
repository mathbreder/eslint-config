import assert from 'node:assert/strict';
import { test } from 'node:test';

import { eslintConfigs } from '../dist/index.js';
import { expoConfig } from '@mathbreder/eslint-config/expo';

const { baseConfig, reactNextConfig, typeCheckedConfig, defineConfig } = eslintConfigs;

const pluginRefs = (configs) => configs.flatMap((cfg) => Object.entries(cfg.plugins ?? {}));

const snapshot = (configs) => configs.map((cfg) => ({
  cfg,
  plugins: { ...(cfg.plugins ?? {}) },
  rules: JSON.stringify(cfg.rules ?? {}),
}));

const unchanged = (before, after) => before.length === after.length && before.every((item, index) => {
  const other = after[index];
  if (item.cfg !== other.cfg) return false;
  if (item.rules !== JSON.stringify(other.cfg.rules ?? {})) return false;
  const keysBefore = Object.keys(item.plugins);
  const keysAfter = Object.keys(other.cfg.plugins ?? {});
  return keysBefore.length === keysAfter.length
    && keysBefore.every((key) => item.plugins[key] === other.cfg.plugins[key]);
});

test('defineConfig continua exportado pela API pública', () => {
  assert.equal(typeof defineConfig, 'function');
});

test('composição de presets compatíveis funciona', () => {
  assert.doesNotThrow(() => defineConfig([...baseConfig, ...reactNextConfig]));
  assert.doesNotThrow(() => defineConfig([...baseConfig, ...expoConfig]));
  assert.doesNotThrow(() => defineConfig([...baseConfig, ...typeCheckedConfig, ...reactNextConfig]));
});

test('o mesmo objeto de plugin pode ser reutilizado em presets diferentes', () => {
  const tseslintFromBase = baseConfig.find((cfg) => cfg.plugins?.['@typescript-eslint'])?.plugins['@typescript-eslint'];
  const tseslintFromTypeChecked = typeCheckedConfig.find((cfg) => cfg.plugins?.['@typescript-eslint'])?.plugins['@typescript-eslint'];
  assert.ok(tseslintFromBase);
  assert.equal(tseslintFromBase, tseslintFromTypeChecked);
  const composed = defineConfig([...baseConfig, ...typeCheckedConfig]);
  const registrations = composed.filter((cfg) => cfg.plugins?.['@typescript-eslint']);
  assert.ok(registrations.every((cfg) => cfg.plugins['@typescript-eslint'] === tseslintFromBase));
});

const impostorHooksBlock = () => ({
  name: 'bloco-falso',
  plugins: { 'react-hooks': { ...reactNextConfig.find((cfg) => cfg.plugins?.['react-hooks']).plugins['react-hooks'] } },
});

test('plugins diferentes com o mesmo nome não são substituídos silenciosamente', () => {
  assert.throws(
    () => defineConfig([...baseConfig, ...reactNextConfig, impostorHooksBlock()]),
    (error) => {
      assert.match(error.message, /Plugin "react-hooks"/);
      assert.match(error.message, /em ".+" e "bloco-falso"/);
      return true;
    },
  );
});

test('a mensagem de colisão indica os dois blocos envolvidos', () => {
  assert.throws(
    () => defineConfig([...reactNextConfig, impostorHooksBlock()]),
    /registrado com implementações diferentes em ".*" e "bloco-falso"/,
  );
});

test('a composição não modifica os presets originais', () => {
  const before = [snapshot(baseConfig), snapshot(reactNextConfig), snapshot(expoConfig), snapshot(typeCheckedConfig)];
  defineConfig([...baseConfig, ...typeCheckedConfig, ...reactNextConfig]);
  defineConfig([...baseConfig, ...expoConfig]);
  const after = [baseConfig, reactNextConfig, expoConfig, typeCheckedConfig].map(snapshot);
  before.forEach((items, index) => assert.ok(unchanged(items, after[index]), `preset ${index} foi alterado`));
});

test('reutilizar um preset após outra composição mantém o mesmo resultado', () => {
  const first = defineConfig([...baseConfig, ...reactNextConfig]);
  defineConfig([...baseConfig, ...typeCheckedConfig]);
  const second = defineConfig([...baseConfig, ...reactNextConfig]);
  assert.equal(first.length, second.length);
  const namesA = pluginRefs(first).map(([name, plugin]) => [name, plugin]);
  const namesB = pluginRefs(second).map(([name, plugin]) => [name, plugin]);
  assert.deepEqual(namesA.map(([name]) => name), namesB.map(([name]) => name));
  assert.ok(namesA.every(([, plugin], index) => namesB[index][1] === plugin));
});

test('a ordem de composição não altera o conjunto de plugins efetivos', () => {
  const ab = new Map(pluginRefs(defineConfig([...baseConfig, ...reactNextConfig])));
  const ba = new Map(pluginRefs(defineConfig([...reactNextConfig, ...baseConfig])));
  assert.deepEqual([...ab.keys()].sort(), [...ba.keys()].sort());
  for (const [name, plugin] of ab) assert.equal(ba.get(name), plugin, name);
});
