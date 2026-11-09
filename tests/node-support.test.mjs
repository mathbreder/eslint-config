import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import { satisfiesNodeRange } from './consumers/node-range.mjs';
import { root } from './helpers.mjs';

const ENGINES = '^20.19.0 || ^22.13.0 || >=24.0.0';
const EXPO_RANGE = '^22.13.0 || ^24.3.0 || ^26.0.0 || >=27.0.0';
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');

test('engines do pacote é exatamente o intervalo exigido pela árvore real de dependências', () => {
  assert.equal(pkg.engines.node, ENGINES);
});

test('versões mínimas e linhas atuais suportadas são aceitas pelo engines', () => {
  for (const version of ['20.19.0', '20.20.0', '22.13.0', '22.21.1', '24.0.0', '24.22.2', '26.13.0']) {
    assert.equal(satisfiesNodeRange(version, pkg.engines.node), true, `Node ${version} deve ser suportado`);
  }
});

test('versões abaixo dos limites e o Node 23 são rejeitados pelo engines', () => {
  for (const version of ['18.18.2', '18.20.8', '20.9.0', '20.18.0', '22.0.0', '22.12.0', '23.0.0', '23.11.0']) {
    assert.equal(satisfiesNodeRange(version, pkg.engines.node), false, `Node ${version} não deve ser suportado`);
  }
});

test('o intervalo do Expo exclui 24.0 a 24.2 e o Node 25, como o eslint-plugin-expo', () => {
  for (const version of ['22.13.0', '24.3.0', '26.0.0']) {
    assert.equal(satisfiesNodeRange(version, EXPO_RANGE), true, `Expo deve aceitar ${version}`);
  }
  for (const version of ['24.0.0', '24.2.0', '25.0.0']) {
    assert.equal(satisfiesNodeRange(version, EXPO_RANGE), false, `Expo não deve aceitar ${version}`);
  }
});

test('a matriz do CI cobre os limites mínimos e as linhas atuais, sem versões não suportadas', () => {
  const matrix = read('.github', 'workflows', 'npm-publish.yml').match(/node-version:\s*\[([^\]]+)\]/)?.[1];
  assert.ok(matrix, 'matriz de consumidores não encontrada');
  const versions = matrix.split(',').map((item) => item.trim().replace(/['"]/g, ''));
  assert.deepEqual(versions, ['20.19.0', '22.13.0', '22', '24', '26']);
  const representative = { 22: '22.21.1', 24: '24.22.2', 26: '26.13.0' };
  for (const version of versions) {
    const concrete = version.includes('.') ? version : representative[version];
    assert.equal(satisfiesNodeRange(concrete, ENGINES), true, `${version} deve ser suportado`);
  }
});

test('o README documenta o intervalo de Node e não declara suporte a Node 18 ou 20.9', () => {
  const readme = read('README.md');
  assert.ok(readme.includes(ENGINES), 'README deve citar o intervalo de engines');
  assert.ok(readme.includes('## Node.js support') || readme.includes('### Node.js support'), 'seção de suporte a Node ausente');
  assert.doesNotMatch(readme, /Node 18\.18\+|Node\.js `\^18\.18/, 'README não deve declarar suporte a Node 18');
});

test('o harness exige que o pnpm execute no mesmo Node do harness antes de instalar', () => {
  const harness = read('tests', 'consumers', 'run.mjs');
  assert.match(harness, /assertPnpmRunsOnHarnessNode\(workRoot\)/);
  assert.doesNotMatch(harness, /--reporter=silent/, 'o harness não deve esconder a saída da instalação');
});
