import assert from 'node:assert/strict';
import path from 'node:path';

import { ESLint } from 'eslint';

const eslint = new ESLint({ cwd: process.cwd() });
const messagesOf = async (file) => {
  const [result] = await eslint.lintFiles([path.join('src', file)]);
  return result.messages;
};

const app = await messagesOf('App.tsx');
assert.ok(app.some((m) => m.ruleId === 'react-hooks/rules-of-hooks' && m.severity === 2), 'hook condicional deve ser error');
assert.ok(app.some((m) => m.ruleId === 'no-alert' && m.severity === 1), 'alert deve ser warn no preset React');

const legacy = await messagesOf('legacy.js');
assert.ok(legacy.some((m) => m.ruleId === 'no-alert'), 'confirm em .js com contexto React deve ser reportado');

console.log('OK react');
