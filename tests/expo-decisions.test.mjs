import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';

import { ESLint } from 'eslint';

import { root, virtualFile } from './helpers.mjs';

const expo = new ESLint({
  cwd: root,
  overrideConfigFile: path.join(root, 'tests/fixtures/eslint.expo.config.mjs'),
});

for (const file of ['case.jsx', 'case.tsx']) {
  test(`expoConfig mantém react-hooks/static-components desligada em ${file} (decisão do projeto)`, async () => {
    const config = await expo.calculateConfigForFile(virtualFile(file));
    assert.equal(config.rules['react-hooks/static-components'][0], 0);
  });

  test(`expoConfig aplica as regras de react-hooks 7 em ${file}`, async () => {
    const config = await expo.calculateConfigForFile(virtualFile(file));
    assert.equal(config.rules['react-hooks/set-state-in-effect'][0], 2);
    assert.equal(config.rules['react-hooks/rules-of-hooks'][0], 2);
    assert.equal(config.rules['react-hooks/exhaustive-deps'][0], 1);
  });
}
