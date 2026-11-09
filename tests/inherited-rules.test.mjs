import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';

import { ESLint } from 'eslint';

import { fixtureFile, root } from './helpers.mjs';

const INHERITED_ERROR_RULES = [
  'no-cond-assign',
  'no-constant-condition',
  'no-duplicate-case',
  'use-isnan',
  'valid-typeof',
  'for-direction',
  'no-async-promise-executor',
  'no-case-declarations',
  'no-compare-neg-zero',
  'no-constant-binary-expression',
  'no-dupe-else-if',
  'no-empty-character-class',
  'no-empty-pattern',
  'no-empty-static-block',
  'no-ex-assign',
  'no-extra-boolean-cast',
  'no-global-assign',
  'no-invalid-regexp',
  'no-irregular-whitespace',
  'no-loss-of-precision',
  'no-misleading-character-class',
];

const eslint = new ESLint({
  cwd: root,
  overrideConfigFile: path.join(root, 'tests/fixtures/eslint.base.config.mjs'),
});
const effective = await eslint.calculateConfigForFile(fixtureFile('case.ts'));
const severityOf = (rule) => effective.rules[rule]?.[0];

for (const rule of INHERITED_ERROR_RULES) {
  test(`${rule} resolve como error no config efetivo`, () => {
    assert.equal(severityOf(rule), 2);
  });
}

test('no-unused-vars nativa permanece desativada', () => {
  assert.equal(severityOf('no-unused-vars'), 0);
});

test('@typescript-eslint/no-unused-vars resolve com as opções novas', () => {
  assert.deepEqual(effective.rules['@typescript-eslint/no-unused-vars'], [
    2,
    {
      args: 'all',
      caughtErrors: 'all',
      ignoreRestSiblings: true,
      argsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    },
  ]);
});
