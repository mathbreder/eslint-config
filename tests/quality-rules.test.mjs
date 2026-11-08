import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';

import { ESLint, Linter } from 'eslint';

import { baseConfig, fixtureFile, messagesFor, root } from './helpers.mjs';

const lint = (code, rule, file = 'case.js') => messagesFor(code, baseConfig, fixtureFile(file), [rule]);

const eslint = new ESLint({
  cwd: root,
  overrideConfigFile: path.join(root, 'tests/fixtures/eslint.base.config.mjs'),
});
const effective = await eslint.calculateConfigForFile(fixtureFile('case.js'));

const EXPECTED_WARN = {
  'max-depth': 'warn',
  'no-else-return': 'warn',
  'no-nested-ternary': 'warn',
  'no-useless-return': 'warn',
  'object-shorthand': 'warn',
  'prefer-template': 'warn',
};
for (const [rule, severity] of Object.entries(EXPECTED_WARN)) {
  test(`${rule} resolve como ${severity} no config efetivo`, () => {
    assert.equal(effective.rules[rule][0], 1);
  });
}

test('max-params resolve como warn com max 5', () => {
  assert.deepEqual(effective.rules['max-params'], [1, { max: 5 }]);
});

const nested = (levels) => {
  const open = Array.from({ length: levels }, () => 'if (a) {').join('\n');
  const close = Array.from({ length: levels }, () => '}').join('\n');
  return `export function f(a) {\n${open}\nreturn 1;\n${close}\n}\n`;
};

test('max-depth aceita quatro níveis de aninhamento', () => {
  assert.equal(lint(nested(4), 'max-depth').length, 0);
});

test('max-depth reporta cinco níveis de aninhamento', () => {
  assert.equal(lint(nested(5), 'max-depth').length, 1);
});

const withParams = (count) => {
  const params = Array.from({ length: count }, (_, index) => `p${index}`).join(', ');
  return `export function f(${params}) {\n  return ${count};\n}\n`;
};

test('max-params aceita cinco parâmetros', () => {
  assert.equal(lint(withParams(5), 'max-params').length, 0);
});

test('max-params reporta seis parâmetros', () => {
  assert.equal(lint(withParams(6), 'max-params').length, 1);
});

test('no-else-return reporta else depois de return', () => {
  const code = 'export function f(a) {\n  if (a) {\n    return 1;\n  } else {\n    return 2;\n  }\n}\n';
  assert.equal(lint(code, 'no-else-return').length, 1);
});

test('no-else-return aceita if com return seguido de retorno final', () => {
  const code = 'export function f(a) {\n  if (a) {\n    return 1;\n  }\n  return 2;\n}\n';
  assert.equal(lint(code, 'no-else-return').length, 0);
});

test('no-nested-ternary reporta ternário aninhado', () => {
  assert.equal(lint('export function f(a, b) {\n  return a ? 1 : b ? 2 : 3;\n}\n', 'no-nested-ternary').length, 1);
});

test('no-nested-ternary aceita ternário simples', () => {
  assert.equal(lint('export function f(a) {\n  return a ? 1 : 2;\n}\n', 'no-nested-ternary').length, 0);
});

test('no-useless-return reporta return vazio no fim da função', () => {
  assert.equal(lint('export function f() {\n  return;\n}\n', 'no-useless-return').length, 1);
});

test('no-useless-return aceita função sem return redundante', () => {
  assert.equal(lint('export function f() {\n  void 1;\n}\n', 'no-useless-return').length, 0);
});

test('object-shorthand reporta propriedade com mesmo nome da variável', () => {
  assert.equal(lint('export function f(a) {\n  return { a: a };\n}\n', 'object-shorthand').length, 1);
});

test('object-shorthand aceita sintaxe abreviada', () => {
  assert.equal(lint('export function f(a) {\n  return { a };\n}\n', 'object-shorthand').length, 0);
});

test('object-shorthand reporta método declarado como função', () => {
  assert.equal(lint('export const o = {\n  m: function () {\n    return 1;\n  },\n};\n', 'object-shorthand').length, 1);
});

test('prefer-template reporta concatenação de string com variável', () => {
  assert.equal(lint("export function f(b) {\n  return 'a' + b;\n}\n", 'prefer-template').length, 1);
});

test('prefer-template aceita template literal', () => {
  assert.equal(lint('export function f(b) {\n  return `a${b}`;\n}\n', 'prefer-template').length, 0);
});

test('@stylistic/no-extra-semi reporta ponto e vírgula duplicado', () => {
  assert.equal(lint('export const valor = 10;;\n', '@stylistic/no-extra-semi').length, 1);
});

test('@stylistic/no-extra-semi aceita ponto e vírgula único', () => {
  assert.equal(lint('export const valor = 10;\n', '@stylistic/no-extra-semi').length, 0);
});

test('@stylistic/semi continua exigindo ponto e vírgula', () => {
  assert.equal(lint('export const valor = 10\n', '@stylistic/semi').length, 1);
});

test('a correção automática de ponto e vírgula converge sem alternar formatos', () => {
  const linter = new Linter({ configType: 'flat' });
  const { output } = linter.verifyAndFix('export const valor = 10;;\n', baseConfig, { filename: fixtureFile('case.js') });
  assert.equal(output, 'export const valor = 10;\n');
  const remaining = messagesFor(output, baseConfig, fixtureFile('case.js'), ['@stylistic/semi', '@stylistic/no-extra-semi']);
  assert.equal(remaining.length, 0);
});

test('a configuração base não ativa no-alert', () => {
  assert.equal(effective.rules['no-alert'], undefined);
  assert.equal(lint("export function f() {\n  alert('Mensagem');\n}\n", 'no-alert').length, 0);
});
