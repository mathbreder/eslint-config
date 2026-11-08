import assert from 'node:assert/strict';
import { test } from 'node:test';

import { baseConfig, messagesFor, virtualFile } from './helpers.mjs';

const RULE = 'max-lines-per-function';
const functionWithStatements = (count) => {
  const body = Array.from({ length: count }, (_, index) => `  total += ${index};`);
  return ['function big() {', '  let total = 0;', ...body, '  return total;', '}', ''].join('\n');
};
const lintLines = (code, filename = virtualFile('big.ts')) => messagesFor(code, baseConfig, filename, [RULE]);

test('limite de 80 linhas: função com 60 instruções não é reportada', () => {
  assert.equal(lintLines(functionWithStatements(60)).length, 0);
});

test('limite de 80 linhas: função com mais de 80 linhas é reportada', () => {
  const messages = lintLines(functionWithStatements(85));
  assert.equal(messages.length, 1);
  assert.match(messages[0].message, /Maximum allowed is 80/);
});

test('arquivos de teste são isentos da regra', () => {
  assert.equal(lintLines(functionWithStatements(85), virtualFile('big.test.ts')).length, 0);
});
