import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';

import { ESLint } from 'eslint';

import { fixtureFile, root } from './helpers.mjs';

const eslint = new ESLint({
  cwd: root,
  overrideConfigFile: path.join(root, 'tests/fixtures/eslint.react.config.mjs'),
});
const effective = {};
for (const file of ['case.jsx', 'case.tsx']) {
  effective[file] = await eslint.calculateConfigForFile(fixtureFile(file));
}

for (const [file, config] of Object.entries(effective)) {
  test(`react-hooks/rules-of-hooks resolve como error em ${file} sem declaração local`, () => {
    assert.equal(config.rules['react-hooks/rules-of-hooks'][0], 2);
  });

  test(`react-hooks/exhaustive-deps resolve como warn em ${file} sem declaração local`, () => {
    assert.equal(config.rules['react-hooks/exhaustive-deps'][0], 1);
  });

  test(`react/display-name resolve como warn em ${file}`, () => {
    assert.equal(config.rules['react/display-name'][0], 1);
  });

  test(`no-restricted-syntax não contém restrições de displayName em ${file}`, () => {
    assert.equal(config.rules['no-restricted-syntax'], undefined);
  });

  test(`eqeqeq é herdado pela configuração React em ${file}`, () => {
    assert.deepEqual(config.rules.eqeqeq, [2, 'always']);
  });
}
