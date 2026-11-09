import assert from 'node:assert/strict';
import path from 'node:path';

import { ESLint } from 'eslint';

const eslint = new ESLint({ cwd: process.cwd() });
const lint = async (...segments) => {
  const [result] = await eslint.lintFiles([path.join(...segments)]);
  return result.messages;
};

const app = await lint('src', 'App.tsx');
assert.ok(
  app.some((m) => m.ruleId === 'react-hooks/rules-of-hooks'),
  'a regra de hooks do Expo deve ser executada',
);
assert.equal(
  app.filter((m) => m.ruleId === 'no-alert').length,
  0,
  'no-alert não deve ser imposta pelo expoConfig',
);
assert.equal(
  app.filter((m) => m.ruleId === 'import/order').length,
  0,
  `expoConfig + getEslintImportConfig deve aceitar a ordem de imports: ${JSON.stringify(app)}`,
);
assert.equal(
  app.filter((m) => m.ruleId === 'import/no-unresolved').length,
  0,
  'alias @app/util e import relativo devem resolver com o Expo composto',
);

const missing = await lint('src', 'app', 'missing-alias.ts');
assert.ok(
  missing.some((m) => m.ruleId === 'import/no-unresolved' && m.message.includes('@app/missing')),
  'alias @app/missing inexistente deve ser reportado com expoConfig + import',
);

console.log('OK expo');
