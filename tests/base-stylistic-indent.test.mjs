import assert from 'node:assert/strict';
import { test } from 'node:test';

import { baseConfig, fixtureFile, messagesFor } from './helpers.mjs';

const RULE = '@stylistic/indent';
const lintIndent = (code) => messagesFor(code, baseConfig, fixtureFile('case.ts'), [RULE]);

test('ArrayExpression aceita um nível de indentação nos elementos', () => {
  assert.equal(lintIndent('export const a = [\n  1,\n  2,\n];\n').length, 0);
});

test('ArrayExpression reporta elementos com dois níveis de indentação', () => {
  assert.equal(lintIndent('export const a = [\n    1,\n];\n').length, 1);
});

test('parameters first alinha os parâmetros ao primeiro', () => {
  const aligned = `function f(a: number,\n${' '.repeat('function f('.length)}b: number) {\n  return a + b;\n}\n`;
  assert.equal(lintIndent(aligned).length, 0);
});

test('parameters first reporta parâmetro desalinhado', () => {
  assert.equal(lintIndent('function f(a: number,\n  b: number) {\n  return a + b;\n}\n').length, 1);
});

test('body com um nível reporta corpo com dois níveis', () => {
  assert.equal(lintIndent('function f() {\n    return 1;\n}\n').length, 1);
});

test('PropertyDefinition é ignorada pela regra', () => {
  const messages = lintIndent('class A {\n    value = 1;\n}\n');
  assert.equal(messages.filter((message) => message.line === 2).length, 0);
});

test('MethodDefinition continua sendo verificada', () => {
  const messages = lintIndent('class A {\n    method() {}\n}\n');
  assert.equal(messages.filter((message) => message.line === 2).length, 1);
});
