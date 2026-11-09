import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Linter } from 'eslint';

import { baseConfig, reactConfig, virtualFile } from './helpers.mjs';

const linter = new Linter({ configType: 'flat' });

const messages = (code, filename, config = baseConfig) => linter.verify(code, config, virtualFile(filename));
const ruleMessages = (code, filename, ruleId, config = baseConfig) => messages(code, filename, config).filter((m) => m.ruleId === ruleId);
const fixed = (code, filename, config = baseConfig) => linter.verifyAndFix(code, config, virtualFile(filename));
const residual = (code, filename, rules, config = baseConfig) => messages(code, filename, config).filter((m) => rules.includes(m.ruleId));

const NEW_RULES = [
  '@stylistic/function-call-argument-newline',
  '@stylistic/function-paren-newline',
  '@stylistic/generator-star-spacing',
  '@stylistic/key-spacing',
  '@stylistic/keyword-spacing',
  '@stylistic/max-statements-per-line',
];

const EXPECTED = {
  '@stylistic/function-call-argument-newline': ['error', 'consistent'],
  '@stylistic/function-paren-newline': ['error', 'multiline-arguments'],
  '@stylistic/generator-star-spacing': ['error', 'after'],
  '@stylistic/key-spacing': ['error', { beforeColon: false, afterColon: true }],
  '@stylistic/keyword-spacing': ['error', { before: true, after: true }],
  '@stylistic/max-statements-per-line': ['error', { max: 1 }],
};

const effectiveRules = () => Object.assign({}, ...baseConfig.filter((cfg) => cfg.rules).map((cfg) => cfg.rules));

test('as seis regras estão ativas com severidade error e as opções aprovadas', () => {
  const rules = effectiveRules();
  for (const rule of NEW_RULES) assert.deepEqual(rules[rule], EXPECTED[rule], rule);
});

test('as regras legadas e as específicas de framework não são ativadas por este lote', () => {
  const rules = effectiveRules();
  for (const rule of ['generator-star', 'indent-legacy', 'implicit-arrow-linebreak', 'lines-around-comment', 'i18next/no-literal-string']) {
    assert.equal(rules[rule], undefined, rule);
  }
});

test('function-call-argument-newline: argumentos na mesma linha ou um por linha são aceitos', () => {
  assert.equal(ruleMessages('foo(a, b);\n', 'fcan.js', '@stylistic/function-call-argument-newline').length, 0);
  assert.equal(ruleMessages('foo(\n  a,\n  b,\n);\n', 'fcan-multi.js', '@stylistic/function-call-argument-newline').length, 0);
});

test('function-call-argument-newline: quebras inconsistentes entre argumentos são reportadas', () => {
  const bad = ruleMessages('foo(a, b,\n  c);\n', 'fcan-bad.js', '@stylistic/function-call-argument-newline');
  assert.equal(bad.length, 1);
  assert.equal(bad[0].severity, 2);
});

test('function-paren-newline: argumentos multilinha exigem quebra após ( e antes de )', () => {
  assert.equal(ruleMessages('foo(\n  a,\n  b,\n);\n', 'fpn.js', '@stylistic/function-paren-newline').length, 0);
  const bad = ruleMessages('foo(a,\n  b);\n', 'fpn-bad.js', '@stylistic/function-paren-newline');
  assert.equal(bad.length, 2, 'falta quebra após ( e antes de )');
  assert.deepEqual(bad.map((m) => m.message), ["Expected newline after '('.", "Expected newline before ')'."]);
  assert.equal(bad[0].severity, 2);
});

test('function-paren-newline: autofix adiciona a quebra antes de )', () => {
  const { output } = fixed('foo(\n  a,\n  b);\n', 'fpn-fix.js');
  assert.equal(output, 'foo(\n  a,\n  b,\n);\n');
  assert.equal(residual(output, 'fpn-fix.js', ['@stylistic/function-paren-newline']).length, 0);
});

test('function-call-argument-newline e function-paren-newline convergem juntas após autofix', () => {
  const code = 'foo(a, b);\nbar(\n  c,\n  d);\nbaz(e,\n  f);\n';
  const { output } = fixed(code, 'fcan-fpn.js');
  assert.equal(residual(output, 'fcan-fpn.js', ['@stylistic/function-call-argument-newline', '@stylistic/function-paren-newline']).length, 0, output);
});

test('generator-star-spacing: exige o espaço depois de * em generators', () => {
  assert.equal(ruleMessages('function* gen() { yield 1; }\n', 'gss.js', '@stylistic/generator-star-spacing').length, 0);
  const bad = ruleMessages('function *gen() { yield 1; }\n', 'gss-bad.js', '@stylistic/generator-star-spacing');
  assert.equal(bad.length, 2, 'espaço antes do * é proibido e espaço depois é exigido na opção after');
  assert.deepEqual(bad.map((m) => m.message), ['Unexpected space before *.', 'Missing space after *.']);
  assert.equal(bad[0].severity, 2);
});

test('generator-star-spacing: autofix ajusta o espaço do asterisco', () => {
  const { output } = fixed('function *gen() { yield 1; }\n', 'gss-fix.js');
  assert.equal(output, 'function* gen() { yield 1; }\n');
  assert.equal(residual(output, 'gss-fix.js', ['@stylistic/generator-star-spacing']).length, 0);
});

test('key-spacing: chave: valor, sem espaço antes e com espaço depois do dois-pontos', () => {
  assert.equal(ruleMessages('const o = { a: 1, [k]: 2 };\n', 'ks.js', '@stylistic/key-spacing').length, 0);
  assert.equal(ruleMessages('const o = { a : 1 };\n', 'ks-before.js', '@stylistic/key-spacing').length, 1);
  assert.equal(ruleMessages('const o = { a:1 };\n', 'ks-after.js', '@stylistic/key-spacing').length, 1);
});

test('key-spacing: autofix produz chave: valor', () => {
  const { output } = fixed('const o = { a : 1, b:2 };\n', 'ks-fix.js');
  assert.equal(output, 'const o = { a: 1, b: 2 };\n');
});

test('keyword-spacing: exige espaço antes e depois de if, else, try e catch', () => {
  const valid = 'if (a) {\n  b();\n} else {\n  c();\n}\ntry {\n  d();\n} catch (e) {\n  f();\n}\n';
  assert.equal(ruleMessages(valid, 'kws.js', '@stylistic/keyword-spacing').length, 0);
  assert.ok(ruleMessages('if(a) {\n  b();\n}\n', 'kws-if.js', '@stylistic/keyword-spacing').length >= 1);
  assert.ok(ruleMessages('try {\n  d();\n}catch (e) {\n  f();\n}\n', 'kws-catch.js', '@stylistic/keyword-spacing').length >= 1);
});

test('keyword-spacing: autofix corrige if, else e catch sem alterar o significado', () => {
  const { output } = fixed('if(a){b();}else{c();}\n', 'kws-fix.js');
  assert.equal(residual(output, 'kws-fix.js', ['@stylistic/keyword-spacing']).length, 0, output);
});

test('max-statements-per-line: uma instrução por linha', () => {
  assert.equal(ruleMessages('const a = 1;\nconst b = 2;\n', 'msl.js', '@stylistic/max-statements-per-line').length, 0);
  const bad = ruleMessages('const a = 1; const b = 2;\n', 'msl-bad.js', '@stylistic/max-statements-per-line');
  assert.equal(bad.length, 1);
  assert.equal(bad[0].severity, 2);
});

test('CONFLITO DOCUMENTADO: max-statements-per-line rejeita o if de uma linha que brace-style aceita', () => {
  const code = 'if (a) { b(); }\n';
  assert.equal(residual(code, 'msl-brace.js', ['@stylistic/brace-style']).length, 0, 'brace-style aceita o bloco em linha (allowSingleLine)');
  const msl = residual(code, 'msl-brace.js', ['@stylistic/max-statements-per-line']);
  assert.equal(msl.length, 1, 'max-statements-per-line conta o if e o b(); como 2 instruções na linha');
  assert.equal(msl[0].message, 'This line has 2 statements. Maximum allowed is 1.');
});

test('CONFLITO DOCUMENTADO: a regra não é reescrita sozinha, então o autofix não resolve o conflito', () => {
  const code = 'if (a) { b(); }\n';
  assert.equal(fixed(code, 'msl-brace-fix.js').output, code);
});

test('max-statements-per-line: bloco com duas instruções numa linha é reportado e não é reescrito sozinho', () => {
  const code = 'if (a) { b(); c(); }\n';
  assert.equal(residual(code, 'msl-two.js', ['@stylistic/max-statements-per-line']).length, 1);
  assert.equal(fixed(code, 'msl-two.js').output, code);
});

test('keyword-spacing e block-spacing juntas em bloco de uma linha', () => {
  assert.equal(residual('if (a) { b(); }\n', 'kws-block.js', ['@stylistic/keyword-spacing', '@stylistic/block-spacing']).length, 0);
});

test('key-spacing com object-curly-spacing e object-property-newline', () => {
  assert.equal(residual('const o = { a: 1, b: 2 };\n', 'ks-obj.js', ['@stylistic/key-spacing', '@stylistic/object-curly-spacing', '@stylistic/object-property-newline']).length, 0);
});

test('código válido das seis regras não produz diagnóstico', () => {
  const code = [
    'function* gen(values) {',
    '  yield* values;',
    '}',
    'const config = { mode: "fast", [key]: 1 };',
    'if (config.mode) {',
    '  run(',
    '    config,',
    '    gen,',
    '  );',
    '}',
    '',
  ].join('\n');
  assert.equal(residual(code, 'valid-lote2.js', NEW_RULES).length, 0, JSON.stringify(messages(code, 'valid-lote2.js')));
});

test('TypeScript: as seis regras funcionam em .ts e .tsx', () => {
  const code = 'export function* values(items: number[]): Generator<number> {\n  yield* items;\n}\nexport const config: { mode: string } = { mode: "fast" };\n';
  assert.equal(residual(code, 'lote2.ts', NEW_RULES).length, 0);
  assert.equal(residual(code, 'lote2.tsx', NEW_RULES, reactConfig).length, 0);
});

test('indent é preservada: 2 espaços e a mesma configuração', () => {
  const rules = effectiveRules();
  assert.equal(rules['@stylistic/indent'][0], 'error');
  assert.equal(rules['@stylistic/indent'][1], 2);
  assert.equal(ruleMessages('function f() {\n    return 1;\n}\n', 'indent-bad.js', '@stylistic/indent').length >= 1, true);
});

test('linebreak-style é preservada: unix', () => {
  assert.deepEqual(effectiveRules()['@stylistic/linebreak-style'], ['error', 'unix']);
  assert.equal(ruleMessages('const a = 1;\r\n', 'crlf.js', '@stylistic/linebreak-style').length, 1);
});

test('jsx-quotes: prefer-double em JSX e TSX', () => {
  const jsx = 'export const View = () => <a title="ok">texto</a>;\n';
  assert.equal(ruleMessages(jsx, 'view.jsx', '@stylistic/jsx-quotes', reactConfig).length, 0);
  const bad = "export const View = () => <a title='no'>texto</a>;\n";
  assert.equal(ruleMessages(bad, 'view-bad.jsx', '@stylistic/jsx-quotes', reactConfig).length, 1);
  assert.equal(ruleMessages(bad, 'view-bad.tsx', '@stylistic/jsx-quotes', reactConfig).length, 1);
});
