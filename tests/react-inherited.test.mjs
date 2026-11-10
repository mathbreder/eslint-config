import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';

import { ESLint } from 'eslint';

import { fixtureFile, root } from './helpers.mjs';

const INHERITED_REACT_RULES = [
  'react/jsx-no-comment-textnodes',
  'react/jsx-no-undef',
  'react/jsx-uses-vars',
  'react/no-children-prop',
  'react/no-danger-with-children',
  'react/no-deprecated',
  'react/no-direct-mutation-state',
  'react/no-find-dom-node',
];

const eslint = new ESLint({
  cwd: root,
  overrideConfigFile: path.join(root, 'tests/fixtures/eslint.react.config.mjs'),
});

for (const file of ['case.jsx', 'case.tsx']) {
  const config = await eslint.calculateConfigForFile(fixtureFile(file));

  for (const rule of INHERITED_REACT_RULES) {
    const expectedSeverity = file === 'case.jsx' && rule === 'react/jsx-no-undef' ? 0 : 2;
    test(`${rule} resolve como ${expectedSeverity === 0 ? 'off' : 'error'} em ${file} pelo preset recommended`, () => {
      assert.equal(config.rules[rule]?.[0], expectedSeverity);
    });
  }
  if (file === 'case.jsx') {
    test('no-undef cobre componentes JSX indefinidos em case.jsx, substituindo react/jsx-no-undef', () => {
      assert.equal(config.rules['no-undef']?.[0], 2);
    });
  }
}
