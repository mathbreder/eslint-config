import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fixtureFile, messagesFor, reactConfig } from './helpers.mjs';

const RULE = 'react/jsx-indent';
const file = fixtureFile('case.tsx');
const lintJsxIndent = (code, config = reactConfig) => messagesFor(code, config, file, [RULE]);

const logicalCorrect = [
  'export const C = ({ ok }: { ok: boolean }) => (',
  '  <div>',
  '    {ok && (',
  '      <span>a</span>',
  '    )}',
  '  </div>',
  ');',
  '',
].join('\n');

const logicalWrong = [
  'export const C = ({ ok }: { ok: boolean }) => (',
  '  <div>',
  '    {ok && (',
  '    <span>a</span>',
  '    )}',
  '  </div>',
  ');',
  '',
].join('\n');

const ternaryCorrect = [
  'export const C = ({ ok }: { ok: boolean }) => (',
  '  <div>',
  '    {ok',
  '      ? <span>a</span>',
  '      : <b>b</b>}',
  '  </div>',
  ');',
  '',
].join('\n');

test('indentLogicalExpressions aceita indentação de expressão && em JSX', () => {
  assert.equal(lintJsxIndent(logicalCorrect).length, 0);
});

test('indentLogicalExpressions reporta indentação incorreta dentro de &&', () => {
  assert.ok(lintJsxIndent(logicalWrong).length >= 1);
});

test('indentLogicalExpressions aceita ternário em JSX', () => {
  assert.equal(lintJsxIndent(ternaryCorrect).length, 0);
});

test('sem indentLogicalExpressions, a indentação dentro de && não é verificada', () => {
  const withoutOption = [
    ...reactConfig,
    { files: ['**/*.{jsx,tsx}'], rules: { 'react/jsx-indent': ['error', 2] } },
  ];
  assert.equal(lintJsxIndent(logicalWrong, withoutOption).length, 0);
});
