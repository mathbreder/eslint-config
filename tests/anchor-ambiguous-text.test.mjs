import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';

import { ESLint, Linter } from 'eslint';

import { baseConfig, reactConfig, root, virtualFile } from './helpers.mjs';
import { eslintConfigs } from '../dist/index.js';

const RULE = 'jsx-a11y/anchor-ambiguous-text';
const linter = new Linter({ configType: 'flat' });

const ambiguous = (code, filename = 'link.tsx', config = reactConfig) => linter
  .verify(code, config, virtualFile(filename))
  .filter((message) => message.ruleId === RULE);

const anchor = (text) => `export const L = () => <a href="/destino">${text}</a>;\n`;

test('textos genéricos em português são avisados em TSX', () => {
  for (const text of ['clique aqui', 'aqui', 'clique', 'um link', 'saiba mais', 'leia mais', 'veja mais', 'mais']) {
    assert.equal(ambiguous(anchor(text), 'pt.tsx').length, 1, text);
  }
});

test('textos genéricos em inglês são avisados em TSX', () => {
  for (const text of ['click here', 'here', 'link', 'a link', 'learn more', 'read more', 'more', 'click']) {
    assert.equal(ambiguous(anchor(text), 'en.tsx').length, 1, text);
  }
});

test('as expressões padrão do plugin continuam sendo avisadas', () => {
  for (const text of ['click here', 'here', 'link', 'a link', 'learn more']) {
    assert.equal(ambiguous(anchor(text), 'defaults.tsx').length, 1, text);
  }
});

test('variações de maiúsculas, espaços e pontuação padrão são avisadas', () => {
  const variants = [
    'Clique Aqui',
    'CLIQUE AQUI',
    '  clique   aqui  ',
    'clique aqui.',
    'clique aqui!',
    'CLICK HERE!!!',
    'Learn More?',
    'Saiba mais;',
  ];
  for (const text of variants) {
    assert.equal(ambiguous(anchor(text), 'variants.tsx').length, 1, JSON.stringify(text));
  }
});

test('limitação documentada: pontuação fora da lista padrão do plugin não é removida', () => {
  assert.equal(ambiguous(anchor('clique aqui…'), 'limit.tsx').length, 0);
  assert.equal(ambiguous(anchor('clique aqui -'), 'limit-dash.tsx').length, 0);
});

test('textos descritivos não geram aviso', () => {
  for (const text of ['Leia o guia de instalação completo', 'Relatório anual de 2026', 'Documentação da API', 'Política de privacidade']) {
    assert.equal(ambiguous(anchor(text), 'descriptive.tsx').length, 0, text);
  }
});

test('aria-label descritivo sobrepõe um texto genérico e não gera aviso', () => {
  const code = 'export const L = () => <a href="/r" aria-label="Relatório anual de 2026">aqui</a>;\n';
  assert.equal(ambiguous(code, 'aria-desc.tsx').length, 0);
});

test('aria-label genérico é avisado mesmo com texto descritivo no conteúdo', () => {
  const code = 'export const L = () => <a href="/r" aria-label="Clique aqui">Relatório anual de 2026</a>;\n';
  assert.equal(ambiguous(code, 'aria-generic.tsx').length, 1);
});

test('a severidade efetiva é warn em JSX e TSX', () => {
  const jsx = ambiguous(anchor('clique aqui'), 'severity.jsx');
  const tsx = ambiguous(anchor('clique aqui'), 'severity.tsx');
  assert.equal(jsx.length, 1);
  assert.equal(jsx[0].severity, 1);
  assert.equal(tsx.length, 1);
  assert.equal(tsx[0].severity, 1);
});

test('a lista efetiva preserva as expressões padrão e acrescenta as genéricas', async () => {
  const eslint = new ESLint({ cwd: root, overrideConfig: eslintConfigs.defineConfig([...eslintConfigs.baseConfig, ...eslintConfigs.reactNextConfig]), overrideConfigFile: true });
  const eff = await eslint.calculateConfigForFile(path.join(root, 'probe.tsx'));
  const [severity, options] = eff.rules[RULE];
  assert.equal(severity, 1);
  for (const word of ['click here', 'here', 'link', 'a link', 'learn more']) assert.ok(options.words.includes(word), word);
  for (const word of ['clique aqui', 'saiba mais', 'read more']) assert.ok(options.words.includes(word), word);
  assert.equal(new Set(options.words).size, options.words.length, 'sem expressões duplicadas');
});

test('a regra não é ativada globalmente no baseConfig', () => {
  assert.equal(ambiguous(anchor('clique aqui'), 'base-only.tsx', baseConfig).length, 0);
});
