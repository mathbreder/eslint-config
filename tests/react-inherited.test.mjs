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
    test(`${rule} resolve como error em ${file} pelo preset recommended`, () => {
      assert.equal(config.rules[rule]?.[0], 2);
    });
  }
}
