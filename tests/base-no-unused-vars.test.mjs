import assert from 'node:assert/strict';
import { test } from 'node:test';

import { baseConfig, fixtureFile, messagesFor } from './helpers.mjs';

const RULE = '@typescript-eslint/no-unused-vars';
const lintUnused = (code) => messagesFor(code, baseConfig, fixtureFile('case.ts'), [RULE]);

test('reporta parâmetro de função não utilizado', () => {
  const messages = lintUnused('export function f(a: number) {\n  return 1;\n}\n');
  assert.equal(messages.length, 1);
  assert.match(messages[0].message, /'a' is defined but never used/);
});

test('ignora parâmetro de função com prefixo _', () => {
  assert.equal(lintUnused('export function f(_a: number) {\n  return 1;\n}\n').length, 0);
});

test('reporta variável não utilizada', () => {
  const messages = lintUnused('export const f = () => {\n  const unused = 1;\n  return 2;\n};\n');
  assert.equal(messages.length, 1);
  assert.match(messages[0].message, /'unused' is assigned a value but never used/);
});

test('ignora variável não utilizada com prefixo _', () => {
  assert.equal(lintUnused('export const f = () => {\n  const _unused = 1;\n  return 2;\n};\n').length, 0);
});

test('reporta erro capturado não utilizado', () => {
  const messages = lintUnused('export function f() {\n  try {\n    return 1;\n  } catch (err) {\n    return 2;\n  }\n}\n');
  assert.equal(messages.length, 1);
  assert.match(messages[0].message, /'err' is defined but never used/);
});

test('ignora erro capturado com prefixo _', () => {
  const code = 'export function f() {\n  try {\n    return 1;\n  } catch (_err) {\n    return 2;\n  }\n}\n';
  assert.equal(lintUnused(code).length, 0);
});

test('ignora irmãos de rest property na desestruturação', () => {
  const code = 'const obj = { a: 1, b: 2, c: 3 };\nconst { a, ...others } = obj;\nexport const z = others;\n';
  assert.equal(lintUnused(code).length, 0);
});

test('mantém o reporte de propriedade não utilizada sem rest', () => {
  const messages = lintUnused('const obj = { a: 1, b: 2 };\nconst { a, b } = obj;\nexport const z = a;\n');
  assert.equal(messages.length, 1);
  assert.match(messages[0].message, /'b' is assigned a value but never used/);
});

test('a regra nativa no-unused-vars não é acionada', () => {
  const code = 'export function f(a: number) {\n  const x = 1;\n  return 1;\n}\n';
  assert.equal(messagesFor(code, baseConfig, fixtureFile('case.ts'), ['no-unused-vars']).length, 0);
});
