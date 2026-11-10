import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';

import { overrideSwcPlugin } from '../dist/index.js';
import { root } from './helpers.mjs';

const tsconfig = path.join(root, 'tests', 'fixtures', 'lote4', 'tsconfig.json');
const source = path.join(root, 'tests', 'fixtures', 'lote4', 'src', 'swc-source.ts');

const setupWith = () => {
  const swcPlugin = { name: 'swc', setup: undefined };
  const options = { plugins: [swcPlugin], tsConfigPath: tsconfig };
  overrideSwcPlugin.esbuildOptions(options);
  const registered = [];
  const build = {
    initialOptions: { tsConfigPath: tsconfig },
    onLoad: (opts, callback) => registered.push({ opts, callback }),
  };
  const returned = swcPlugin.setup(build);
  return { returned, registered };
};

test('o setup do plugin registra o onLoad de forma síncrona e não retorna Promise', () => {
  const { returned, registered } = setupWith();
  assert.equal(returned, undefined);
  assert.equal(registered.length, 1);
  assert.deepEqual(registered[0].opts, { filter: /\.[jt]sx?$/ });
});

test('o callback registrado transforma TypeScript de forma assíncrona e remove os tipos', async () => {
  const { registered } = setupWith();
  const result = registered[0].callback({ path: source });
  assert.ok(result instanceof Promise);
  const output = await result;
  assert.match(output.contents, /export const soma = \(a, b\)=>a \+ b;/);
  assert.doesNotMatch(output.contents, /: number/);
  assert.match(output.contents, /sourceMappingURL=data:application\/json;base64,/);
});
