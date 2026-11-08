import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';

import { ESLint } from 'eslint';

import { eslintConfigs } from '../dist/index.js';
import { viteReactRefreshConfig } from '../dist/eslint-configs/react-refresh-vite.js';
import { fixtureFile, messagesFor, reactConfig, root } from './helpers.mjs';

const RULE = 'react-refresh/only-export-components';
const viteConfig = [...reactConfig, ...viteReactRefreshConfig];
const lintRefresh = (code, config = viteConfig, file = 'case.tsx') =>
  messagesFor(code, config, fixtureFile(file), [RULE]);

test('o preset Vite é exportado pelo subpath do pacote', async () => {
  const subpath = await import('@mathbreder/eslint-config/react-refresh-vite');
  assert.ok(Array.isArray(subpath.viteReactRefreshConfig));
});

test('o preset Vite não é reexportado pelo namespace eslintConfigs', () => {
  assert.equal(eslintConfigs.viteReactRefreshConfig, undefined);
});

test('componente exportado por função nomeada é aceito', () => {
  assert.equal(lintRefresh('export function App() {\n  return <div />;\n}\n').length, 0);
});

test('componente exportado por const arrow é aceito', () => {
  assert.equal(lintRefresh('export const App = () => <div />;\n').length, 0);
});

test('exportação de função auxiliar junto com componente gera warn', () => {
  const code = 'export const App = () => <div />;\nexport function helper() {\n  return 1;\n}\n';
  const messages = lintRefresh(code);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].severity, 1);
});

test('exportação de objeto não constante junto com componente gera warn', () => {
  const code = 'export const config = { a: 1 };\nexport const App = () => <div />;\n';
  assert.equal(lintRefresh(code).length, 1);
});

test('constante primitiva exportada é aceita com allowConstantExport', () => {
  const code = 'export const LIMIT = 10;\nexport const App = () => <div />;\n';
  assert.equal(lintRefresh(code).length, 0);
});

test('a regra não se aplica a arquivos .ts sem JSX', () => {
  const code = 'export const config = { a: 1 };\nexport function helper() {\n  return 1;\n}\n';
  assert.equal(lintRefresh(code, viteConfig, 'case.ts').length, 0);
});

test('projetos que não selecionam o preset não recebem a regra', async () => {
  const eslint = new ESLint({
    cwd: root,
    overrideConfigFile: path.join(root, 'tests/fixtures/eslint.react.config.mjs'),
  });
  const config = await eslint.calculateConfigForFile(fixtureFile('case.tsx'));
  assert.equal(config.rules[RULE], undefined);
  const code = 'export const config = { a: 1 };\nexport const App = () => <div />;\n';
  assert.equal(lintRefresh(code, reactConfig).length, 0);
});

test('expoConfig não ativa a regra automaticamente', async () => {
  const eslint = new ESLint({
    cwd: root,
    overrideConfigFile: path.join(root, 'tests/fixtures/eslint.expo.config.mjs'),
  });
  const config = await eslint.calculateConfigForFile(fixtureFile('case.tsx'));
  assert.equal(config.rules[RULE], undefined);
});
