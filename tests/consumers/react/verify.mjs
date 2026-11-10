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

const IDENTIFIER_RULES = ['no-undef', 'react/jsx-no-undef'];
const summarize = (results) => Object.fromEntries(results.map((result) => [
  path.basename(result.filePath),
  result.messages
    .filter((m) => IDENTIFIER_RULES.includes(m.ruleId) || m.fatal)
    .map((m) => ({ ruleId: m.ruleId ?? 'fatal', severity: m.severity, line: m.line })),
]));

const standalone = new ESLint({ cwd: process.cwd(), overrideConfigFile: 'eslint.standalone.config.mjs' });
const standaloneSummary = summarize(await standalone.lintFiles(['src/standalone']));
const expectedStandalone = {
  'componente-inexistente.js': [{ ruleId: 'no-undef', severity: 2, line: 1 }],
  'componente-inexistente.jsx': [{ ruleId: 'no-undef', severity: 2, line: 1 }],
  'membro.js': [{ ruleId: 'no-undef', severity: 2, line: 1 }],
  'membro.jsx': [{ ruleId: 'no-undef', severity: 2, line: 1 }],
  'variavel.js': [{ ruleId: 'no-undef', severity: 2, line: 2 }],
  'variavel.jsx': [{ ruleId: 'no-undef', severity: 2, line: 2 }],
  'local.js': [],
  'local.jsx': [],
  'importado.js': [],
  'importado.jsx': [],
  'globais.js': [],
  'globais.jsx': [],
  'eval-window.js': [],
};
assert.deepEqual(standaloneSummary, expectedStandalone, 'reactNextConfig isolado: diagnósticos de identificadores');

for (const file of ['src/standalone/componente-inexistente.js', 'src/standalone/componente-inexistente.jsx']) {
  const rules = await standalone.calculateConfigForFile(path.resolve(file));
  assert.equal(rules.languageOptions.parser.meta?.name, 'typescript-eslint/parser', `${file}: parser`);
  assert.equal(rules.rules['no-undef'][0], 2, `${file}: no-undef error`);
  assert.equal(rules.rules['react/jsx-no-undef'][0], 0, `${file}: react/jsx-no-undef off`);
  assert.ok(Object.hasOwn(rules.languageOptions.globals, 'window'), `${file}: window é declarado como global do navegador`);
}

const composed = new ESLint({ cwd: process.cwd() });
const composedSummary = summarize(await composed.lintFiles(['src/standalone']));
assert.deepEqual(composedSummary, expectedStandalone, 'baseConfig + reactNextConfig: mesmos diagnósticos, sem duplicação');
const [evalResult] = (await composed.lintFiles(['src/standalone/eval-window.js']));
assert.ok(evalResult.messages.some((m) => m.ruleId === 'no-eval' && m.severity === 2 && m.line === 1), 'window.eval deve ser reportado pelo no-eval na composição com baseConfig');

console.log('OK react');
