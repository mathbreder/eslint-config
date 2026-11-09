const assert = require('node:assert/strict');

const { ESLint } = require('eslint');
const pkg = require('@mathbreder/eslint-config');
const refresh = require('@mathbreder/eslint-config/react-refresh-vite');

assert.equal(typeof pkg.eslintConfigs.baseConfig, 'object');
assert.equal(typeof pkg.getEslintImportConfig, 'function');
assert.ok(Array.isArray(refresh.viteReactRefreshConfig));

(async () => {
  const eslint = new ESLint({
    cwd: process.cwd(),
    overrideConfigFile: true,
    overrideConfig: pkg.eslintConfigs.baseConfig,
  });

  const [result] = await eslint.lintText('module.exports = { valor: 10 };\n', { filePath: 'sample.cjs' });
  assert.equal(result.messages.length, 0, JSON.stringify(result.messages));

  const [invalid] = await eslint.lintText('var valor = 10;\nmodule.exports = valor;\n', { filePath: 'sample.cjs' });
  assert.ok(invalid.messages.some((message) => message.ruleId === 'no-var'));

  console.log('OK node-cjs');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
