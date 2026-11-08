import assert from 'node:assert/strict';
import path from 'node:path';

import { ESLint } from 'eslint';

const eslint = new ESLint({ cwd: process.cwd() });
const [result] = await eslint.lintFiles([path.join('src', 'App.tsx')]);

assert.ok(
  result.messages.some((m) => m.ruleId === 'react-hooks/rules-of-hooks'),
  'a regra de hooks do Expo deve ser executada',
);
assert.equal(
  result.messages.filter((m) => m.ruleId === 'no-alert').length,
  0,
  'no-alert não deve ser imposta pelo expoConfig',
);

console.log('OK expo');
