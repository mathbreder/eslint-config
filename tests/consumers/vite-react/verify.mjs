import assert from 'node:assert/strict';
import path from 'node:path';

import { ESLint } from 'eslint';

const eslint = new ESLint({ cwd: process.cwd() });
const messagesOf = async (file) => {
  const [result] = await eslint.lintFiles([path.join('src', file)]);
  return result.messages.filter((m) => m.ruleId === 'react-refresh/only-export-components');
};

const page = await messagesOf('Page.tsx');
assert.equal(page.length, 1, 'objeto não constante exportado junto de componente deve gerar warn');
assert.equal(page[0].severity, 1);

const ok = await messagesOf('Ok.tsx');
assert.equal(ok.length, 0, 'constante primitiva exportada deve ser aceita');

console.log('OK vite-react');
