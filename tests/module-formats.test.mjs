import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';

import { ESLint } from 'eslint';

import { baseConfig, fixtureFile, importConfig, messagesFor, root, virtualFile } from './helpers.mjs';

const eslint = new ESLint({
  cwd: root,
  overrideConfigFile: path.join(root, 'tests/fixtures/eslint.base.config.mjs'),
});
const effective = (file) => eslint.calculateConfigForFile(file);
const lint = (file, code, config = baseConfig) => messagesFor(code, config, file, []);
const fatal = (file, code, config = baseConfig) => lint(file, code, config).filter((message) => message.fatal);
const byRule = (file, code, rule, config = baseConfig) => messagesFor(code, config, file, [rule]);

const MJS_EXAMPLE = 'export const valor = 10;\n';
const CJS_EXAMPLE = 'module.exports = {\n  valor: 10,\n};\n';
const TS_ONLY = [
  '@typescript-eslint/no-require-imports',
  '@typescript-eslint/member-ordering',
  '@typescript-eslint/no-non-null-assertion',
  '@typescript-eslint/explicit-member-accessibility',
  '@typescript-eslint/no-floating-promises',
];

for (const name of ['exemplo.mjs', 'eslint.config.mjs']) {
  test(`${name}: parsing ESM sem erro e regras gerais ativas`, async () => {
    const file = virtualFile(name);
    assert.equal(fatal(file, MJS_EXAMPLE).length, 0);
    const config = await effective(file);
    assert.equal(config.rules['prefer-const'][0], 2);
    assert.equal(config.rules.eqeqeq[0], 2);
    assert.notEqual(config.languageOptions.sourceType, 'commonjs');
  });

  test(`${name}: regras exclusivas de TypeScript não são aplicadas`, async () => {
    const config = await effective(virtualFile(name));
    for (const rule of TS_ONLY) assert.equal(config.rules[rule], undefined, rule);
  });
}

for (const name of ['exemplo.cjs', 'postcss.config.cjs']) {
  test(`${name}: parsing CommonJS sem erro de sintaxe`, () => {
    assert.equal(fatal(virtualFile(name), CJS_EXAMPLE).length, 0);
  });

  test(`${name}: require e module.exports não geram diagnóstico de globais`, () => {
    const code = "const path = require('path');\nmodule.exports = { caminho: path.join('a', 'b') };\n";
    assert.equal(byRule(virtualFile(name), code, 'no-undef').length, 0);
  });

  test(`${name}: sourceType commonjs é aplicado`, async () => {
    const config = await effective(virtualFile(name));
    assert.equal(config.languageOptions.sourceType, 'commonjs');
    assert.equal(config.languageOptions.parserOptions.sourceType, 'script');
  });

  test(`${name}: parser TypeScript aceita import em CommonJS (limitação documentada)`, () => {
    assert.equal(fatal(virtualFile(name), "import x from 'y';\nmodule.exports = x;\n").length, 0);
  });

  test(`${name}: regras TypeScript não são aplicadas`, async () => {
    const config = await effective(virtualFile(name));
    for (const rule of TS_ONLY) assert.equal(config.rules[rule], undefined, rule);
  });
}

test('arquivos .mjs e .cjs recebem a organização de imports por import/order', () => {
  const code = "import { a } from 'zod';\nimport b from 'axios';\nexport const x = [a, b];\n";
  for (const name of ['exemplo.mjs', 'exemplo.cjs']) {
    const messages = messagesFor(code, importConfig(), fixtureFile(name), ['import/order']);
    assert.equal(messages.length, 1, name);
  }
});

test('.mts e .cts continuam com a mesma semântica TypeScript', async () => {
  for (const name of ['exemplo.mts', 'exemplo.cts']) {
    const config = await effective(virtualFile(name));
    assert.equal(config.rules['@typescript-eslint/no-require-imports'][0], 2, name);
    assert.equal(config.rules['no-undef'][0], 0, name);
  }
});
