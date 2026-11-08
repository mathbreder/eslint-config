import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';

import { ESLint } from 'eslint';

import { baseConfig, fixtureFile, messagesFor, root, virtualFile } from './helpers.mjs';

const ts = (code, rule, file = 'case.ts') => messagesFor(code, baseConfig, virtualFile(file), [rule]);

const eslint = new ESLint({
  cwd: root,
  overrideConfigFile: path.join(root, 'tests/fixtures/eslint.full.config.mjs'),
});
const effective = await eslint.calculateConfigForFile(virtualFile('case.ts'));

test('member-ordering resolve como warn com opções padrão', () => {
  assert.deepEqual(effective.rules['@typescript-eslint/member-ordering'], [1]);
});

test('member-ordering reporta método declarado antes do construtor', () => {
  const code = 'export class A {\n  m(): void {}\n  constructor() {\n    void 1;\n  }\n}\n';
  assert.ok(ts(code, '@typescript-eslint/member-ordering').length >= 1);
});

test('member-ordering aceita construtor antes de métodos', () => {
  const code = 'export class A {\n  constructor() {\n    void 1;\n  }\n\n  m(): void {}\n}\n';
  assert.equal(ts(code, '@typescript-eslint/member-ordering').length, 0);
});

test('member-ordering aceita sobrecargas consecutivas', () => {
  const code = [
    'export class C {',
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
  assert.equal(ts(code, '@typescript-eslint/member-ordering').length, 0);
  assert.equal(ts(code, '@typescript-eslint/adjacent-overload-signatures').length, 0);
});

test('sobrecargas separadas geram erro de adjacência, não de member-ordering', () => {
  const code = [
    'export class C {',
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
  assert.ok(ts(code, '@typescript-eslint/adjacent-overload-signatures').length >= 1);
  assert.equal(ts(code, '@typescript-eslint/member-ordering').length, 0);
});

test('implementação duplicada em classe continua detectada pela versão TS-aware', () => {
  const code = 'export class A {\n  m(): void {}\n  m(): void {}\n}\n';
  assert.equal(ts(code, '@typescript-eslint/no-dupe-class-members').length, 1);
});

test('sobrecargas de método não são tratadas como duplicidade', () => {
  const code = 'export class A {\n  m(v: string): void;\n  m(v: number): void;\n  m(v: string | number): void {\n    void v;\n  }\n}\n';
  assert.equal(ts(code, '@typescript-eslint/no-dupe-class-members').length, 0);
});

test('no-empty-function resolve como warn com overrideMethods e decoratedFunctions', () => {
  assert.deepEqual(effective.rules['@typescript-eslint/no-empty-function'], [
    1,
    { allow: ['overrideMethods', 'decoratedFunctions'] },
  ]);
});

test('no-empty-function reporta construtor vazio', () => {
  assert.ok(ts('export class A {\n  constructor() {}\n}\n', '@typescript-eslint/no-empty-function').length >= 1);
});

test('no-empty-function reporta função vazia comum', () => {
  assert.equal(ts('export function vazia(): void {}\n', '@typescript-eslint/no-empty-function').length, 1);
});

test('no-empty-function aceita método sobrescrito intencionalmente vazio', () => {
  const code = 'class Base {\n  m(): void {\n    void 1;\n  }\n}\n\nexport class Sub extends Base {\n  override m(): void {}\n}\n';
  assert.equal(ts(code, '@typescript-eslint/no-empty-function').length, 0);
});

test('no-empty-function aceita método com decorator vazio', () => {
  const code = 'function Marca(): MethodDecorator {\n  return () => undefined;\n}\n\nexport class A {\n  @Marca()\n  m(): void {}\n}\n';
  assert.equal(ts(code, '@typescript-eslint/no-empty-function').length, 0);
});

test('no-empty-function fica desligada em arquivos de teste', () => {
  const code = 'export const mock = () => {};\n';
  assert.equal(ts(code, '@typescript-eslint/no-empty-function', 'case.test.ts').length, 0);
});

test('no-empty-function também é reportada para callback vazio fora de teste', () => {
  assert.ok(ts('export const f = (cb: () => void) => cb;\nexport const g = f(() => {});\n', '@typescript-eslint/no-empty-function').length >= 1);
});

test('a nativa no-empty-function não está ativa', () => {
  assert.equal(effective.rules['no-empty-function'], undefined);
});

test('no-duplicate-imports reporta import default e nomeado do mesmo módulo', () => {
  const code = "import a from 'modulo';\nimport { b } from 'modulo';\nexport const x = [a, b];\n";
  assert.equal(ts(code, 'no-duplicate-imports').length, 1);
});

test('no-duplicate-imports reporta import type e import de valor do mesmo módulo', () => {
  const code = "import type { A } from 'modulo';\nimport { b } from 'modulo';\nexport const x: A | typeof b = b;\n";
  assert.equal(ts(code, 'no-duplicate-imports').length, 1);
});

test('no-duplicate-imports não reporta reexportação do mesmo módulo', () => {
  const code = "export { a } from 'modulo';\nimport { b } from 'modulo';\nexport const x = b;\n";
  assert.equal(ts(code, 'no-duplicate-imports').length, 0);
});

test('import/no-duplicates não é ativada, mantendo no-duplicate-imports', () => {
  assert.equal(effective.rules['import/no-duplicates'], undefined);
  assert.equal(effective.rules['no-duplicate-imports'][0], 2);
});

const RETIRED_OR_DUPLICATED = [
  '@typescript-eslint/ban-types',
  '@typescript-eslint/indent',
  '@typescript-eslint/no-var-requires',
  '@typescript-eslint/no-empty-interface',
  'no-extra-semi',
  'prettier/prettier',
  'perfectionist/sort-imports',
  '@dword-design/import-alias/prefer-alias',
  'no-restricted-globals',
];
for (const rule of RETIRED_OR_DUPLICATED) {
  test(`${rule} não é ativada`, () => {
    assert.equal(effective.rules[rule], undefined);
  });
}

test('nenhum preset adiciona restrições de $ ou jQuery globalmente', async () => {
  const eslintExpo = new ESLint({
    cwd: root,
    overrideConfigFile: path.join(root, 'tests/fixtures/eslint.expo.config.mjs'),
  });
  const expo = await eslintExpo.calculateConfigForFile(fixtureFile('case.tsx'));
  assert.equal(expo.rules['no-restricted-globals'], undefined);
});
