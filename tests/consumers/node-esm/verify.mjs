import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

import { ESLint } from 'eslint';
import * as pkg from '@mathbreder/eslint-config';

const require = createRequire(import.meta.url);
assert.throws(
  () => require.resolve('eslint-config-expo'),
  'eslint-config-expo não deve ser instalada pelo entry principal (peer opcional)',
);
assert.equal(pkg.eslintConfigs.expoConfig, undefined, 'expoConfig deve estar apenas em @mathbreder/eslint-config/expo');

assert.equal(typeof pkg.eslintConfigs.baseConfig, 'object');
assert.equal(typeof pkg.getEslintImportConfig, 'function');
assert.equal(typeof pkg.eslintConfigs.defineConfig, 'function');

const eslint = new ESLint({ cwd: process.cwd() });

const invalid = await eslint.lintText('var valor = 10;\n', { filePath: 'sample.js' });
assert.ok(invalid[0].messages.some((message) => message.ruleId === 'no-var'), 'no-var deve reportar var');

const valid = await eslint.lintText('export const valor = 10;\n', { filePath: 'sample-valid.mjs' });
assert.equal(valid[0].messages.length, 0, JSON.stringify(valid[0].messages));

console.log('OK node-esm');
