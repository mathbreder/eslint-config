import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';

import { ESLint, Linter } from 'eslint';

import { baseConfig, importConfig, reactConfig, root, virtualFile } from './helpers.mjs';
import { eslintConfigs } from '../dist/index.js';
import { expoConfig } from '../dist/eslint-configs/expo.js';
import { nextConfig } from '../dist/eslint-configs/next.js';
import { defineConfig } from '../dist/eslint-configs/utils.js';

const linter = new Linter({ configType: 'flat' });
const lote4Fixture = path.join(root, 'tests', 'fixtures', 'lote4');
const JS_EXTS = ['js', 'jsx', 'mjs', 'cjs'];
const TS_EXTS = ['ts', 'tsx', 'mts', 'cts'];
const SEV = { off: 0, warn: 1, error: 2 };

const severityOf = (rules, name) => {
  const value = rules[name];
  if (value === undefined) return 'absent';
  const severity = Array.isArray(value) ? value[0] : value;
  return SEV[severity] ?? severity;
};
const optionsOf = (rules, name) => (Array.isArray(rules[name]) ? rules[name][1] : undefined);
const effectiveAt = async (config, file) => {
  const eslint = new ESLint({ cwd: root, overrideConfig: defineConfig(config), overrideConfigFile: true });
  return (await eslint.calculateConfigForFile(path.join(root, file))).rules;
};
const typed = [...baseConfig, ...eslintConfigs.typeCheckedConfig];
const expo = defineConfig([...baseConfig, ...expoConfig]);
const next = defineConfig([...baseConfig, ...nextConfig]);

const APPROVED_BASE = {
  '@stylistic/operator-linebreak': ['error', 'before'],
  '@stylistic/padded-blocks': ['error', 'never'],
  '@stylistic/quote-props': ['warn', 'as-needed'],
  '@stylistic/rest-spread-spacing': ['error', 'never'],
  '@stylistic/semi-style': ['error', 'last'],
  '@stylistic/space-before-function-paren': ['error', { anonymous: 'always', named: 'never', asyncArrow: 'always' }],
  '@stylistic/space-before-blocks': ['error', 'always'],
  '@stylistic/space-infix-ops': ['error'],
  '@stylistic/space-unary-ops': ['error', { words: true, nonwords: false }],
  '@stylistic/switch-colon-spacing': ['error', { before: false, after: true }],
  '@stylistic/template-curly-spacing': ['error', 'never'],
  '@stylistic/template-tag-spacing': ['error', 'never'],
  '@stylistic/wrap-iife': ['error', 'inside'],
  '@stylistic/yield-star-spacing': ['error', 'after'],
  'perfectionist/sort-named-imports': ['error', { type: 'alphabetical', order: 'asc' }],
  'perfectionist/sort-named-exports': ['error', { type: 'alphabetical', order: 'asc' }],
  'prefer-promise-reject-errors': ['error'],
  'require-await': ['warn'],
};

const PRESERVED = {
  '@stylistic/object-curly-newline': ['error', { multiline: true, consistent: true }],
  '@stylistic/object-curly-spacing': ['error', 'always'],
  '@stylistic/object-property-newline': ['error', { allowAllPropertiesOnSameLine: true }],
  '@stylistic/quotes': ['error', 'single'],
  '@stylistic/space-in-parens': ['error', 'never'],
  '@stylistic/semi-spacing': ['error', { before: false, after: true }],
};

const DISCARDED = [
  'no-wrap-func', 'nonblock-statement-body-position', 'one-var-declaration-per-line', 'paths/alias',
  'simple-import-sort/exports', 'simple-import-sort/imports', 'space-after-function-name', 'space-after-keywords',
  'space-before-function-parentheses', 'space-before-keywords', 'space-in-brackets', 'space-return-throw-case',
  'space-unary-word-ops', 'standard/array-bracket-even-spacing', 'standard/computed-property-even-spacing',
  'standard/object-curly-even-spacing', 'wrap-regex', 'curly', 'no-extra-parens',
];

const assertRule = (rules, name, expected, label) => {
  const value = rules[name];
  assert.ok(value !== undefined, `${label}: ${name} deve estar configurada`);
  const severity = Array.isArray(value) ? value[0] : value;
  assert.equal(SEV[severity] ?? severity, SEV[expected[0]], `${label}: severidade de ${name}`);
  if (expected.length > 1) {
    const actual = Array.isArray(value) ? value[1] : undefined;
    for (const [key, val] of Object.entries(expected[1])) assert.deepEqual(actual?.[key], val, `${label}: ${name}.${key}`);
  }
};

test('as 18 ativações aprovadas estão na configuração efetiva de JS e TS, com severidade e opções', async () => {
  const js = await effectiveAt(baseConfig, 'probe.js');
  const ts = await effectiveAt(baseConfig, 'probe.ts');
  for (const [name, expected] of Object.entries(APPROVED_BASE)) {
    assertRule(js, name, expected, 'js');
    if (!name.startsWith('prefer-promise') && name !== 'require-await') assertRule(ts, name, expected, 'ts');
  }
});

test('require-await e prefer-promise-reject-errors: versão de core em TS sem typeCheckedConfig', async () => {
  const ts = await effectiveAt(baseConfig, 'probe.ts');
  assert.equal(severityOf(ts, 'require-await'), 1);
  assert.equal(severityOf(ts, 'prefer-promise-reject-errors'), 2);
  assert.equal(severityOf(ts, '@typescript-eslint/require-await'), 'absent');
  assert.equal(severityOf(ts, '@typescript-eslint/prefer-promise-reject-errors'), 'absent');
});

test('typeCheckedConfig substitui as versões de core por TS apenas em arquivos TS', async () => {
  for (const ext of TS_EXTS) {
    const rules = await effectiveAt(typed, `probe.${ext}`);
    assert.equal(severityOf(rules, 'require-await'), 0, ext);
    assert.equal(severityOf(rules, '@typescript-eslint/require-await'), 1, ext);
    assert.equal(severityOf(rules, 'prefer-promise-reject-errors'), 0, ext);
    assert.equal(severityOf(rules, '@typescript-eslint/prefer-promise-reject-errors'), 2, ext);
  }
  for (const ext of JS_EXTS) {
    const rules = await effectiveAt(typed, `probe.${ext}`);
    assert.equal(severityOf(rules, 'require-await'), 1, ext);
    assert.equal(severityOf(rules, '@typescript-eslint/require-await'), 'absent', ext);
  }
});

test('as seis regras preservadas mantêm severidade e opções em base, React, Next.js e Expo', async () => {
  const presets = { base: baseConfig, react: reactConfig, next, expo, typed };
  for (const [label, cfg] of Object.entries(presets)) {
    const effective = { js: await effectiveAt(cfg, 'probe.jsx'), ts: await effectiveAt(cfg, 'probe.ts') };
    for (const [name, expected] of Object.entries(PRESERVED)) {
      assertRule(effective.js, name, expected, `${label} jsx`);
      assertRule(effective.ts, name, expected, `${label} ts`);
    }
  }
});

test('as regras descartadas e as equivalentes obsoletas do core não são configuradas em nenhuma extensão', async () => {
  for (const ext of [...JS_EXTS, ...TS_EXTS]) {
    const rules = await effectiveAt(baseConfig, `probe.${ext}`);
    for (const name of DISCARDED) assert.equal(rules[name], undefined, `${name} em ${ext}`);
    for (const core of ['operator-linebreak', 'padded-blocks', 'quote-props', 'semi-style', 'space-before-function-paren', 'space-infix-ops', 'space-unary-ops', 'switch-colon-spacing', 'template-curly-spacing', 'template-tag-spacing', 'wrap-iife', 'yield-star-spacing', 'rest-spread-spacing', 'space-before-blocks']) {
      assert.equal(rules[core], undefined, `${core} (core) em ${ext}`);
    }
  }
});

test('preset React, Next.js e Expo não duplicam nem sobrepõem as ativações do lote', async () => {
  for (const [label, cfg] of Object.entries({ react: reactConfig, next, expo })) {
    const rules = await effectiveAt(cfg, 'probe.tsx');
    for (const name of Object.keys(APPROVED_BASE)) {
      if (name.startsWith('prefer-promise') || name === 'require-await') continue;
      assert.equal(severityOf(rules, name), SEV[APPROVED_BASE[name][0]], `${label}: ${name}`);
    }
  }
});

const messages = (code, file, config = baseConfig) => linter.verify(code, config, virtualFile(file));
const ruleMsgs = (code, file, ruleId, config = baseConfig) => messages(code, file, config).filter((m) => m.ruleId === ruleId);
const fixedTwice = (code, file, config = baseConfig) => {
  const once = linter.verifyAndFix(code, config, virtualFile(file)).output;
  const twice = linter.verifyAndFix(once, config, virtualFile(file)).output;
  return { once, stable: once === twice };
};

test('operator-linebreak: operador no início da linha quando é quebrado; autofix estabiliza', () => {
  assert.equal(ruleMsgs('const valido = ativo\n  && autorizado\n  && !bloqueado;\n', 'op.js', '@stylistic/operator-linebreak').length, 0);
  assert.equal(ruleMsgs('const v = ativo &&\n  b;\n', 'op-bad.js', '@stylistic/operator-linebreak').length, 1);
  const { once, stable } = fixedTwice('const v = ativo &&\n  b;\n', 'op-fix.js');
  assert.equal(once, 'const v = ativo\n  && b;\n');
  assert.ok(stable);
});

test('space-before-function-paren: anônima e async com espaço, nomeada sem espaço', () => {
  const rule = '@stylistic/space-before-function-paren';
  assert.equal(ruleMsgs('function executar() {}\nconst f = function () {};\nconst p = async (valor) => valor;\n', 'fn.js', rule).length, 0);
  assert.equal(ruleMsgs('function executar () {}\n', 'fn-named.js', rule).length, 1);
  assert.equal(ruleMsgs('const f = function() {};\n', 'fn-anon.js', rule).length, 1);
  assert.equal(ruleMsgs('const p = async(valor) => valor;\n', 'fn-async.js', rule).length, 1);
  const { once, stable } = fixedTwice('function executar () {}\nconst f = function() {};\nconst p = async(valor) => valor;\n', 'fn-fix.js');
  assert.equal(once, 'function executar() {}\nconst f = function () {};\nconst p = async (valor) => valor;\n');
  assert.ok(stable);
});

test('space-before-blocks: espaço antes de { e autofix', () => {
  assert.equal(ruleMsgs('if (ativo) {\n  executar();\n}\n', 'blk.js', '@stylistic/space-before-blocks').length, 0);
  assert.equal(ruleMsgs('if (ativo){\n  executar();\n}\n', 'blk-bad.js', '@stylistic/space-before-blocks').length, 1);
  assert.equal(fixedTwice('if (ativo){\n  executar();\n}\n', 'blk-fix.js').once, 'if (ativo) {\n  executar();\n}\n');
});

test('padded-blocks: sem linhas vazias no início do bloco e autofix', () => {
  assert.equal(ruleMsgs('if (ativo) {\n  executar();\n}\n', 'pad.js', '@stylistic/padded-blocks').length, 0);
  assert.equal(ruleMsgs('if (ativo) {\n\n  executar();\n}\n', 'pad-bad.js', '@stylistic/padded-blocks').length, 1);
  assert.equal(fixedTwice('if (ativo) {\n\n  executar();\n}\n', 'pad-fix.js').once, 'if (ativo) {\n  executar();\n}\n');
});

test('quote-props as-needed: aspas desnecessárias são avisadas com warn e removidas pelo autofix', () => {
  assert.equal(ruleMsgs("const usuario = {\n  nome: 'Ana',\n  'nome-completo': 'Ana Silva',\n};\n", 'qp.js', '@stylistic/quote-props').length, 0);
  const bad = ruleMsgs("const usuario = { 'nome': 'Ana' };\n", 'qp-bad.js', '@stylistic/quote-props');
  assert.equal(bad.length, 1);
  assert.equal(bad[0].severity, 1);
  assert.equal(fixedTwice("const usuario = { 'nome': 'Ana' };\n", 'qp-fix.js').once, "const usuario = { nome: 'Ana' };\n");
});

test('rest-spread-spacing never: ...a sem espaço', () => {
  assert.equal(ruleMsgs('f(...a);\n', 'rs.js', '@stylistic/rest-spread-spacing').length, 0);
  assert.equal(ruleMsgs('f(... a);\n', 'rs-bad.js', '@stylistic/rest-spread-spacing').length, 1);
  assert.equal(fixedTwice('f(... a);\n', 'rs-fix.js').once, 'f(...a);\n');
});

test('semi-style last: ponto e vírgula no fim da linha e autofix', () => {
  assert.equal(ruleMsgs('a();\nb();\n', 'ss.js', '@stylistic/semi-style').length, 0);
  assert.equal(ruleMsgs('a()\n;b();\n', 'ss-bad.js', '@stylistic/semi-style').length, 1);
  assert.equal(fixedTwice('a()\n;b();\n', 'ss-fix.js').once, 'a();\nb();\n');
});

test('space-infix-ops: operadores binários com espaço', () => {
  assert.equal(ruleMsgs('const total = valor + taxa;\n', 'inf.js', '@stylistic/space-infix-ops').length, 0);
  assert.equal(ruleMsgs('const total = valor+taxa;\n', 'inf-bad.js', '@stylistic/space-infix-ops').length, 1);
  assert.equal(fixedTwice('const total = valor+taxa;\n', 'inf-fix.js').once, 'const total = valor + taxa;\n');
});

test('space-unary-ops: palavras com espaço e operadores unários sem espaço', () => {
  assert.equal(ruleMsgs('const t = typeof (x);\nconst n = !x;\nconst m = -x;\n', 'un.js', '@stylistic/space-unary-ops').length, 0);
  assert.equal(ruleMsgs('const n = ! x;\n', 'un-bad.js', '@stylistic/space-unary-ops').length, 1);
  assert.equal(ruleMsgs('const t = typeof(x);\n', 'un-word.js', '@stylistic/space-unary-ops').length, 1);
  assert.equal(fixedTwice('const t = typeof(x);\n', 'un-fix.js').once, 'const t = typeof (x);\n');
});

test('switch-colon-spacing: sem espaço antes do dois-pontos de case e com espaço depois', () => {
  assert.equal(ruleMsgs('switch (x) {\n  case 1: y();\n}\n', 'sw.js', '@stylistic/switch-colon-spacing').length, 0);
  assert.equal(ruleMsgs('switch (x) {\n  case 1 : y();\n}\n', 'sw-bad.js', '@stylistic/switch-colon-spacing').length, 1);
  assert.equal(fixedTwice('switch (x) {\n  case 1 : y();\n}\n', 'sw-fix.js').once, 'switch (x) {\n  case 1: y();\n}\n');
});

test('template-curly-spacing e template-tag-spacing never: sem espaços', () => {
  assert.equal(ruleMsgs('const m = `Olá, ${nome}`;\nconst c = sql`x`;\n', 'tp.js', '@stylistic/template-curly-spacing').length, 0);
  assert.equal(ruleMsgs('const m = `Olá, ${ nome }`;\n', 'tp-bad.js', '@stylistic/template-curly-spacing').length, 2);
  assert.equal(ruleMsgs('const c = sql `x`;\n', 'tt-bad.js', '@stylistic/template-tag-spacing').length, 1);
  assert.equal(fixedTwice('const m = `Olá, ${ nome }`;\nconst c = sql `x`;\n', 'tp-fix.js').once, 'const m = `Olá, ${nome}`;\nconst c = sql`x`;\n');
});

test('wrap-iife inside: IIFE com a chamada fora dos parênteses da função', () => {
  assert.equal(ruleMsgs('(function () {\n  inicializar();\n})();\n', 'iife.js', '@stylistic/wrap-iife').length, 0);
  assert.equal(ruleMsgs('(function () {\n  inicializar();\n}());\n', 'iife-bad.js', '@stylistic/wrap-iife').length, 1);
  assert.equal(fixedTwice('(function () {\n  inicializar();\n}());\n', 'iife-fix.js').once, '(function () {\n  inicializar();\n})();\n');
});

test('yield-star-spacing after: yield* com espaço depois do asterisco', () => {
  assert.equal(ruleMsgs('function* gerar() {\n  yield* valores;\n}\n', 'ys.js', '@stylistic/yield-star-spacing').length, 0);
  assert.equal(ruleMsgs('function* gerar() {\n  yield *valores;\n}\n', 'ys-bad.js', '@stylistic/yield-star-spacing').length, 2);
  assert.equal(fixedTwice('function* gerar() {\n  yield *valores;\n}\n', 'ys-fix.js').once, 'function* gerar() {\n  yield* valores;\n}\n');
});

test('perfectionist sort-named-imports e sort-named-exports: membros em ordem alfabética sem ignorar caixa', () => {
  assert.equal(ruleMsgs("import { alpha, beta, zeta } from './util';\n", 'pi.js', 'perfectionist/sort-named-imports').length, 0);
  assert.equal(fixedTwice("import { zeta, beta, alpha } from './util';\n", 'pi-fix.js').once, "import { alpha, beta, zeta } from './util';\n");
  assert.equal(fixedTwice('export { zeta, beta, alpha };\n', 'pe-fix.js').once, 'export { alpha, beta, zeta };\n');
});

test('perfectionist preserva aliases de import e a ordenação pelo nome importado', () => {
  assert.equal(fixedTwice("import { zeta as z, alpha } from './util';\n", 'alias.js').once, "import { alpha, zeta as z } from './util';\n");
});

test('import/order continua válido após a ordenação de membros e o autofix estabiliza', () => {
  const config = [...baseConfig, ...importConfig()];
  const code = "import { zeta, beta, type Config, alpha } from './util';\nimport { useState, useEffect } from 'react';\nimport fs from 'node:fs';\n\nexport { zeta, beta, alpha };\n";
  const once = linter.verifyAndFix(code, config, virtualFile('imp.ts'));
  const twice = linter.verifyAndFix(once.output, config, virtualFile('imp.ts'));
  assert.equal(twice.output, once.output);
  assert.ok(once.output.startsWith("import fs from 'node:fs';\n\nimport { useEffect, useState } from 'react';\n\nimport { alpha, beta, type Config, zeta } from './util';\n"));
  assert.equal(once.messages.filter((m) => m.ruleId && /^(import\/order|perfectionist\/sort-named)/.test(m.ruleId)).length, 0);
});

test('prefer-promise-reject-errors (core): Promise.reject com string é reportado; Error é aceito', () => {
  assert.equal(ruleMsgs("Promise.reject('Erro');\n", 'pr-bad.js', 'prefer-promise-reject-errors').length, 1);
  assert.equal(ruleMsgs("Promise.reject(new Error('Erro'));\n", 'pr-ok.js', 'prefer-promise-reject-errors').length, 0);
});

test('require-await (core): async sem await é avisado; com await é aceito; retorno de chamada também é avisado', () => {
  assert.equal(ruleMsgs('async function f() {\n  await g();\n}\n', 'ra-ok.js', 'require-await').length, 0);
  const noAwait = ruleMsgs('async function f() {\n  return 1;\n}\n', 'ra-bad.js', 'require-await');
  assert.equal(noAwait.length, 1);
  assert.equal(noAwait[0].severity, 1);
  assert.equal(ruleMsgs('async function f() {\n  return g();\n}\n', 'ra-call.js', 'require-await').length, 1);
});

test('interação: operator-linebreak com multiline-ternary é complementar; o ternário multilinha é aceito', () => {
  assert.equal(ruleMsgs('const v = c\n  ? a\n  : b;\n', 'ot.js', '@stylistic/operator-linebreak').length, 0);
  assert.equal(ruleMsgs('const v = c\n  ? a\n  : b;\n', 'ot.js', '@stylistic/multiline-ternary').length, 0);
});

test('interação: operator-linebreak e no-mixed-operators são independentes; autofix estabiliza com aviso residual', () => {
  const code = 'const v = a &&\n  b ||\n  c;\n';
  const { once, stable } = fixedTwice(code, 'mix.js');
  assert.ok(stable);
  assert.equal(linter.verify(once, baseConfig, virtualFile('mix.js')).filter((m) => m.ruleId === '@stylistic/no-mixed-operators').length >= 1, true);
});

test('interação: padded-blocks com brace-style e max-statements-per-line não oscila', () => {
  for (const code of ['if (a) {\n\n  b();\n}\n', 'if (a) {\n\n  b();\n  c();\n}\n']) {
    const { once, stable } = fixedTwice(code, 'pad-x.js');
    assert.ok(stable);
    assert.equal(once.includes('{\n\n'), false);
  }
});

test('interação: space-before-blocks com brace-style e keyword-spacing são complementares', () => {
  assert.equal(ruleMsgs('if(a) {\n  b();\n}\n', 'sbk.js', '@stylistic/keyword-spacing').length, 1);
  assert.equal(ruleMsgs('if(a) {\n  b();\n}\n', 'sbk.js', '@stylistic/space-before-blocks').length, 0);
  assert.equal(ruleMsgs('if (a){\n  b();\n}\n', 'sbb.js', '@stylistic/brace-style').length, 0);
  assert.equal(ruleMsgs('if (a){\n  b();\n}\n', 'sbb.js', '@stylistic/space-before-blocks').length, 1);
});

test('interação: space-before-function-paren e generator-star-spacing convergem em function* gen()', () => {
  const { once, stable } = fixedTwice('function *gen () {\n  yield* v;\n}\n', 'fpgs.js');
  assert.ok(stable);
  assert.equal(once, 'function* gen() {\n  yield* v;\n}\n');
});

test('interação: space-unary-ops e no-mixed-operators não geram diagnóstico conflitante em !a && b', () => {
  assert.equal(ruleMsgs('const v = !a && b;\n', 'um.js', '@stylistic/space-unary-ops').length, 0);
});

test('interação: semi-style last com semi e semi-spacing produz a mesma forma após o autofix', () => {
  const { once, stable } = fixedTwice('a() ;\nb()\n;c();\n', 'sem.js');
  assert.ok(stable);
  assert.equal(once, 'a();\nb();\nc();\n');
});

test('interação: yield-star-spacing e generator-star-spacing não se contradizem em function* gerar', () => {
  assert.equal(ruleMsgs('function* gerar() {\n  yield* v;\n}\n', 'ys-gs.js', '@stylistic/generator-star-spacing').length, 0);
  assert.equal(ruleMsgs('function* gerar() {\n  yield* v;\n}\n', 'ys-gs.js', '@stylistic/yield-star-spacing').length, 0);
});

const typedMessages = async (file) => {
  const eslint = (config) => new ESLint({ cwd: lote4Fixture, overrideConfig: defineConfig(config), overrideConfigFile: true });
  const target = path.join(lote4Fixture, 'src', file);
  const untyped = (await eslint([...baseConfig]).lintFiles([target]))[0].messages;
  const typedResult = (await eslint(typed).lintFiles([target]))[0].messages;
  return { untyped, typed: typedResult };
};

test('TypeScript com typeCheckedConfig: require-await e prefer-promise-reject-errors do typescript-eslint', async () => {
  const { typed } = await typedMessages('async-cases.ts');
  const awaitMsgs = typed.filter((m) => m.ruleId === '@typescript-eslint/require-await').map((m) => m.line);
  assert.deepEqual(awaitMsgs, [7], 'só noAwait é reportado');
  const reject = typed.filter((m) => m.ruleId === '@typescript-eslint/prefer-promise-reject-errors').map((m) => m.line);
  assert.deepEqual(reject, [22], 'só Promise.reject com string');
  assert.equal(typed.filter((m) => m.ruleId === 'require-await' || m.ruleId === 'prefer-promise-reject-errors').length, 0, 'sem versões de core');
});

test('TypeScript sem typeCheckedConfig: o core reporta também os retornos awaitable, que a versão tipada aceita', async () => {
  const { untyped } = await typedMessages('async-cases.ts');
  const lines = untyped.filter((m) => m.ruleId === 'require-await').map((m) => m.line);
  assert.deepEqual(lines, [7, 11, 15]);
  assert.deepEqual(untyped.filter((m) => m.ruleId === 'prefer-promise-reject-errors').map((m) => m.line), [22]);
});

test('override de = com after: atribuições e aliases de tipo mantêm o = no fim da linha', () => {
  const assignment = 'export const v =\n  valor;\n';
  assert.equal(ruleMsgs(assignment, 'eq-atrib.ts', '@stylistic/operator-linebreak').length, 0);
  assert.equal(linter.verifyAndFix(assignment, baseConfig, virtualFile('eq-atrib.ts')).output, assignment);
  const union = "export type Multiline =\n  | 'alpha'\n  | 'zeta';\n";
  assert.equal(ruleMsgs(union, 'eq-uniao.ts', '@stylistic/operator-linebreak').length, 0);
  assert.equal(linter.verifyAndFix(union, baseConfig, virtualFile('eq-uniao.ts')).output, union);
  assert.equal(ruleMsgs('export type Box<T =\n  string> = T;\n', 'eq-generic.ts', '@stylistic/operator-linebreak').length, 0);
});

test('override de = com after: = no início da linha seguinte é reportado e corrigido para o fim da linha', () => {
  const code = 'export type Box<T\n  = string> = T;\n';
  const isolated = [...baseConfig, { rules: { '@stylistic/type-generic-spacing': 'off' } }];
  assert.equal(ruleMsgs(code, 'eq-bad.ts', '@stylistic/operator-linebreak', isolated).length, 1);
  const once = linter.verifyAndFix(code, isolated, virtualFile('eq-bad.ts')).output;
  assert.equal(once, 'export type Box<T =\n  string> = T;\n');
  assert.equal(linter.verifyAndFix(once, isolated, virtualFile('eq-bad.ts')).output, once);
});

test('conflito documentado: type-generic-spacing colapsa o = quebrado em genéricos e o resultado é estável', () => {
  const code = 'export type Box<T\n  = string> = T;\n';
  const first = linter.verifyAndFix(code, baseConfig, virtualFile('eq-conflito.ts')).output;
  assert.equal(first, 'export type Box<T = string> = T;\n');
  assert.equal(linter.verifyAndFix(first, baseConfig, virtualFile('eq-conflito.ts')).output, first);
  assert.equal(ruleMsgs('export type Box<T =\n  string> = T;\n', 'eq-conflito-msg.ts', '@stylistic/type-generic-spacing').length, 1);
});

test('operator-linebreak before continua valendo para operadores lógicos e condicionais', () => {
  assert.equal(ruleMsgs('const v = c\n  ? a\n  : b;\n', 'op-cond.js', '@stylistic/operator-linebreak').length, 0);
  assert.equal(ruleMsgs('const v = a\n  && b;\n', 'op-log.js', '@stylistic/operator-linebreak').length, 0);
  assert.equal(linter.verifyAndFix('const v = a &&\n  b;\n', baseConfig, virtualFile('op-log-bad.js')).output, 'const v = a\n  && b;\n');
});
