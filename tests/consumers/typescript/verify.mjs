import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

import { ESLint } from 'eslint';

const require = createRequire(import.meta.url);
assert.throws(() => require.resolve('esbuild'), 'esbuild não deve estar instalado neste consumidor');

const tsc = spawnSync(process.execPath, [path.join('node_modules', 'typescript', 'lib', 'tsc.js'), '--noEmit', '-p', 'tsconfig.json'], {
  encoding: 'utf8',
});
assert.equal(tsc.status, 0, `tsc falhou (skipLibCheck: false):\n${tsc.stdout}${tsc.stderr}`);

const eslint = new ESLint({ cwd: process.cwd() });
const lint = async (file) => {
  const [result] = await eslint.lintFiles([path.join('src', file)]);
  return result.messages;
};

const floating = await lint('floating.ts');
assert.ok(
  floating.some((message) => message.ruleId === '@typescript-eslint/no-floating-promises'),
  'promise solta deve ser reportada',
);

const awaited = await lint('awaited.ts');
assert.equal(awaited.filter((message) => message.severity === 2).length, 0, JSON.stringify(awaited));

const alias = await lint('alias.ts');
assert.equal(alias.filter((message) => message.ruleId === 'import/no-unresolved').length, 0, 'alias válido deve resolver');

const missing = await lint('alias-missing.ts');
assert.ok(
  missing.some((message) => message.ruleId === 'import/no-unresolved'),
  'alias inexistente deve ser reportado',
);

console.log('OK typescript');
