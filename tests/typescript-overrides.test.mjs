import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';

import { ESLint } from 'eslint';

import { baseConfig, fixtureFile, messagesFor, reactConfig, root } from './helpers.mjs';

const eslint = new ESLint({
  cwd: root,
  overrideConfigFile: path.join(root, 'tests/fixtures/eslint.base.config.mjs'),
});
const effective = async (file) => eslint.calculateConfigForFile(fixtureFile(file));
const TS_FILES = ['case.ts', 'case.tsx', 'case.mts', 'case.cts'];
const JS_FILES = ['case.js', 'case.jsx'];
const TS_OFF = ['no-dupe-class-members', 'no-redeclare', 'no-undef', 'no-array-constructor', 'no-unused-expressions'];

for (const file of TS_FILES) {
  test(`${file}: nativas substituídas por TypeScript estão desligadas`, async () => {
    const config = await effective(file);
    for (const rule of TS_OFF) {
      assert.ok(!config.rules[rule] || config.rules[rule][0] === 0, `${rule} ativa em ${file}`);
    }
  });

  test(`${file}: TS-aware no-dupe-class-members e regras novas estão ativas`, async () => {
    const config = await effective(file);
    assert.equal(config.rules['@typescript-eslint/no-dupe-class-members'][0], 2);
    assert.equal(config.rules['@typescript-eslint/adjacent-overload-signatures'][0], 2);
    assert.equal(config.rules['@typescript-eslint/no-non-null-assertion'][0], 1);
    assert.equal(config.rules['@typescript-eslint/no-require-imports'][0], 2);
  });
}

for (const file of JS_FILES) {
  test(`${file}: nativas de proteção continuam ativas em JavaScript`, async () => {
    const config = await effective(file);
    assert.equal(config.rules['no-dupe-class-members'][0], 2);
    assert.equal(config.rules['no-redeclare'][0], 2);
    assert.equal(config.rules['no-undef'][0], 2);
  });

  test(`${file}: regras exclusivas de TypeScript não são aplicadas`, async () => {
    const config = await effective(file);
    assert.equal(config.rules['@typescript-eslint/no-non-null-assertion'], undefined);
    assert.equal(config.rules['@typescript-eslint/no-require-imports'], undefined);
  });
}

test('.mts e .cts recebem a configuração base', async () => {
  for (const file of ['case.mts', 'case.cts']) {
    const config = await effective(file);
    assert.equal(config.rules['prefer-const'][0], 2);
    assert.equal(config.rules['@typescript-eslint/no-unused-vars'][0], 2);
  }
});

const lint = (file, code, config = baseConfig) => messagesFor(code, config, fixtureFile(file), []);
const byRule = (file, code, rule, config = baseConfig) =>
  messagesFor(code, config, fixtureFile(file), [rule]);

test('no-undef é desligada em TypeScript', () => {
  const messages = byRule('case.ts', 'export const x: Missing = 1;\n', 'no-undef');
  assert.equal(messages.length, 0);
});

test('no-undef continua reportando variável inexistente em JavaScript', () => {
  const messages = byRule('case.js', 'export const x = missing;\n', 'no-undef');
  assert.equal(messages.length, 1);
});

test('no-redeclare nativa não reporta redeclaração em TypeScript', () => {
  const messages = byRule('case.ts', 'export function f(): void;\nexport function f(): void {}\n', 'no-redeclare');
  assert.equal(messages.length, 0);
});

test('no-dupe-class-members nativa não é aplicada em TypeScript', () => {
  const messages = byRule('case.ts', 'export class A {\n  m(): void {}\n  m(): void {}\n}\n', 'no-dupe-class-members');
  assert.equal(messages.length, 0);
});

test('duplicidade real de método é reportada em TypeScript pela versão TS-aware', () => {
  const code = 'export class A {\n  m(): void {}\n  m(): void {}\n}\n';
  assert.equal(byRule('case.ts', code, '@typescript-eslint/no-dupe-class-members').length, 1);
});

test('duplicidade real de método é reportada em JavaScript pela nativa', () => {
  const code = 'export class A {\n  m() {}\n  m() {}\n}\n';
  assert.equal(byRule('case.js', code, 'no-dupe-class-members').length, 1);
});

test('sobrecargas de método consecutivas são aceitas', () => {
  const code = [
    'export class Conversor {',
    '  converter(value: string): string;',
    '  converter(value: number): string;',
    '  converter(value: string | number): string {',
    '    return String(value);',
    '  }',
    '',
    '  limpar(): void {}',
    '}',
    '',
  ].join('\n');
  assert.equal(byRule('case.ts', code, '@typescript-eslint/no-dupe-class-members').length, 0);
  assert.equal(byRule('case.ts', code, '@typescript-eslint/adjacent-overload-signatures').length, 0);
});

test('sobrecargas de método separadas por outro membro são reportadas', () => {
  const code = [
    'export class Conversor {',
    '  converter(value: string): string;',
    '',
    '  limpar(): void {}',
    '',
    '  converter(value: number): string;',
    '  converter(value: string | number): string {',
    '    return String(value);',
    '  }',
    '}',
    '',
  ].join('\n');
  assert.ok(byRule('case.ts', code, '@typescript-eslint/adjacent-overload-signatures').length >= 1);
});

test('sobrecargas de interface consecutivas são aceitas', () => {
  const code = 'export interface Conversor {\n  converter(value: string): string;\n  converter(value: number): string;\n}\n';
  assert.equal(byRule('case.ts', code, '@typescript-eslint/adjacent-overload-signatures').length, 0);
});

test('sobrecargas de função consecutivas são aceitas', () => {
  const code = [
    'export function converter(value: string): string;',
    'export function converter(value: number): string;',
    'export function converter(value: string | number): string {',
    '  return String(value);',
    '}',
    '',
  ].join('\n');
  assert.equal(byRule('case.ts', code, '@typescript-eslint/adjacent-overload-signatures').length, 0);
});

test('sobrecargas de função separadas são reportadas', () => {
  const code = [
    'export function converter(value: string): string;',
    'export const limpo = 1;',
    'export function converter(value: number): string;',
    'export function converter(value: string | number): string {',
    '  return String(value);',
    '}',
    '',
  ].join('\n');
  assert.ok(byRule('case.ts', code, '@typescript-eslint/adjacent-overload-signatures').length >= 1);
});

test('adjacent-overload-signatures não tem autofix', () => {
  const code = [
    'export function converter(value: string): string;',
    'export const limpo = 1;',
    'export function converter(value: number): string;',
    'export function converter(value: string | number): string {',
    '  return String(value);',
    '}',
    '',
  ].join('\n');
  const [message] = byRule('case.ts', code, '@typescript-eslint/adjacent-overload-signatures');
  assert.equal(message.fix, undefined);
});

test('no-non-null-assertion reporta uso do operador ! como warn', () => {
  const code = 'declare const usuario: { nome: string } | undefined;\nexport const nome = usuario!.nome;\n';
  const messages = byRule('case.ts', code, '@typescript-eslint/no-non-null-assertion');
  assert.equal(messages.length, 1);
  assert.equal(messages[0].severity, 1);
});

test('no-extra-non-null-assertion continua reportando !! como error', () => {
  const code = 'declare const usuario: { nome: string } | undefined;\nexport const nome = usuario!!.nome;\n';
  const messages = byRule('case.ts', code, '@typescript-eslint/no-extra-non-null-assertion');
  assert.equal(messages.length, 1);
  assert.equal(messages[0].severity, 2);
});

test('no-require-imports reporta require em TypeScript', () => {
  const code = "export const modulo = require('./module');\n";
  assert.equal(byRule('case.ts', code, '@typescript-eslint/no-require-imports').length, 1);
});

test('no-require-imports aceita import em TypeScript', () => {
  const code = "import modulo from './module';\nexport const x = modulo;\n";
  assert.equal(byRule('case.ts', code, '@typescript-eslint/no-require-imports').length, 0);
});

const withAllowList = [...baseConfig, {
  files: ['**/*.{ts,tsx}'],
  rules: {
    '@typescript-eslint/no-require-imports': ['error', { allow: ['\\.(png|jpg|svg|json)$'] }],
  },
}];

test('allow aceita require de padrões informados pelo projeto', () => {
  const code = "export const logo = require('./logo.png');\n";
  assert.equal(byRule('case.ts', code, '@typescript-eslint/no-require-imports', withAllowList).length, 0);
});

test('allow mantém require fora dos padrões informados como erro', () => {
  const code = "export const modulo = require('./module');\n";
  assert.equal(byRule('case.ts', code, '@typescript-eslint/no-require-imports', withAllowList).length, 1);
});

test('eqeqeq reporta a == b', () => {
  assert.equal(byRule('case.js', 'export const r = a == b;\n', 'eqeqeq').length, 1);
});

test('eqeqeq reporta a != b', () => {
  assert.equal(byRule('case.js', 'export const r = a != b;\n', 'eqeqeq').length, 1);
});

test('eqeqeq aceita a === b', () => {
  assert.equal(byRule('case.js', 'export const r = a === b;\n', 'eqeqeq').length, 0);
});

test('eqeqeq aceita a !== b', () => {
  assert.equal(byRule('case.js', 'export const r = a !== b;\n', 'eqeqeq').length, 0);
});

test('eqeqeq reporta valor == null', () => {
  assert.equal(byRule('case.js', 'export function f(valor) {\n  if (valor == null) {}\n}\n', 'eqeqeq').length, 1);
});

test('configuração completa de React e TypeScript aceita um componente de sobrecargas válido', () => {
  const code = [
    'export interface ConversorProps {',
    '  value: string;',
    '}',
    '',
    'export class Conversor {',
    '  converter(value: string): string;',
    '  converter(value: number): string;',
    '  converter(value: string | number): string {',
    '    return String(value);',
    '  }',
    '}',
    '',
  ].join('\n');
  assert.equal(lint('case.tsx', code, reactConfig).length, 0);
});

test('a configuração completa não produz erros em componente sem nome e com displayName explícito', () => {
  const code = 'const Foo = () => <div />;\nFoo.displayName = \'Foo\';\nexport default Foo;\n';
  const messages = lint('case.tsx', code, reactConfig).filter((message) => message.severity === 2);
  assert.equal(messages.length, 0);
});

test('alias é resolvido em .mts e alias inexistente é reportado em .mts', async () => {
  const { importConfig } = await import('./helpers.mjs');
  const resolved = messagesFor("import { a } from '@app/a';\nexport const x = a;\n", importConfig(), fixtureFile('case.mts'), ['import/no-unresolved']);
  const missing = messagesFor("import { m } from '@app/missing';\nexport const x = m;\n", importConfig(), fixtureFile('case.mts'), ['import/no-unresolved']);
  assert.equal(resolved.length, 0);
  assert.equal(missing.length, 1);
});
