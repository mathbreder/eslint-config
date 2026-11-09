import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';

import { ESLint } from 'eslint';

import { baseConfig, fixtureFile, importConfig, messagesFor, reactConfig, root } from './helpers.mjs';

const eslint = new ESLint({
  cwd: root,
  overrideConfigFile: path.join(root, 'tests/fixtures/eslint.full.config.mjs'),
});
const effective = async (file) => eslint.calculateConfigForFile(fixtureFile(file));

const TS_RULES = {
  '@typescript-eslint/array-type': ['warn', { default: 'array-simple' }],
  '@typescript-eslint/consistent-type-assertions': 'warn',
  '@typescript-eslint/no-empty-object-type': 'error',
  '@typescript-eslint/prefer-for-of': 'warn',
  '@typescript-eslint/prefer-function-type': 'warn',
  '@typescript-eslint/explicit-member-accessibility': [
    'warn',
    { accessibility: 'explicit', overrides: { constructors: 'no-public' } },
  ],
};
const TS_ONLY = Object.keys(TS_RULES);

const expectedFor = (value) => {
  if (typeof value === 'string') return [value === 'warn' ? 1 : 2];
  const [severity, ...options] = value;
  return [severity === 'warn' ? 1 : 2, ...options];
};

for (const file of ['case.ts', 'case.tsx', 'case.mts', 'case.cts']) {
  test(`${file}: regras TypeScript do lote têm a severidade e as opções aprovadas`, async () => {
    const config = await effective(file);
    for (const [rule, value] of Object.entries(TS_RULES)) {
      assert.deepEqual(config.rules[rule], expectedFor(value), rule);
    }
  });
}

for (const file of ['case.js', 'case.jsx']) {
  test(`${file}: regras exclusivas de TypeScript do lote não são aplicadas`, async () => {
    const config = await effective(file);
    for (const rule of TS_ONLY) {
      assert.equal(config.rules[rule], undefined, rule);
    }
  });
}

test('no-inferrable-types não é ativada, então let com anotação explícita é aceita', async () => {
  const config = await effective('case.ts');
  assert.equal(config.rules['@typescript-eslint/no-inferrable-types'], undefined);
  const code = "export let a: number = 1;\nexport let nome: string = 'João';\nexport let ativo: boolean = true;\n";
  assert.equal(messagesFor(code, baseConfig, fixtureFile('case.ts'), ['@typescript-eslint/no-inferrable-types']).length, 0);
});

const lint = (file, code, rule, config = baseConfig) => messagesFor(code, config, fixtureFile(file), [rule]);

test('array-type aceita string[] e readonly string[]', () => {
  const code = 'export type Nomes = string[];\nexport type R = readonly string[];\n';
  assert.equal(lint('case.ts', code, '@typescript-eslint/array-type').length, 0);
});

test('array-type aceita Array com união complexa', () => {
  const code = 'export type Valores = Array<string | number>;\n';
  assert.equal(lint('case.ts', code, '@typescript-eslint/array-type').length, 0);
});

test('array-type reporta Array<string> como tipo simples', () => {
  assert.equal(lint('case.ts', 'export type Nomes = Array<string>;\n', '@typescript-eslint/array-type').length, 1);
});

test('array-type reporta (string | number)[] como tipo complexo', () => {
  assert.equal(lint('case.ts', 'export type Valores = (string | number)[];\n', '@typescript-eslint/array-type').length, 1);
});

test('array-type reporta ReadonlyArray<string> e aceita readonly string[]', () => {
  assert.equal(lint('case.ts', 'export type R = ReadonlyArray<string>;\n', '@typescript-eslint/array-type').length, 1);
  assert.equal(lint('case.ts', 'export type R = readonly string[];\n', '@typescript-eslint/array-type').length, 0);
});

test('array-type aceita arrays aninhados na forma string[][]', () => {
  assert.equal(lint('case.ts', 'export type M = string[][];\n', '@typescript-eslint/array-type').length, 0);
});

test('array-type reporta Array<Array<string>>', () => {
  assert.ok(lint('case.ts', 'export type M = Array<Array<string>>;\n', '@typescript-eslint/array-type').length >= 1);
});

test('consistent-type-assertions aceita as em TSX', () => {
  const code = 'type Usuario = { nome: string };\nexport const valor: unknown = {};\nexport const usuario = valor as Usuario;\n';
  assert.equal(lint('case.tsx', code, '@typescript-eslint/consistent-type-assertions').length, 0);
});

test('consistent-type-assertions reporta a sintaxe <T> em TypeScript', () => {
  const code = 'type Usuario = { nome: string };\nexport const valor: unknown = {};\nexport const usuario = <Usuario>valor;\n';
  assert.ok(lint('case.ts', code, '@typescript-eslint/consistent-type-assertions').length >= 1);
});

test('consistent-type-assertions aceita as em literal de objeto', () => {
  assert.equal(lint('case.ts', 'export const o = { a: 1 } as { a: number };\n', '@typescript-eslint/consistent-type-assertions').length, 0);
});

test('no-empty-object-type reporta interface vazia', () => {
  assert.equal(lint('case.ts', 'export interface Vazia {}\n', '@typescript-eslint/no-empty-object-type').length, 1);
});

test('no-empty-object-type reporta interface vazia que apenas estende outra', () => {
  const code = 'export interface Base {\n  a: number;\n}\nexport interface Ext extends Base {}\n';
  assert.ok(lint('case.ts', code, '@typescript-eslint/no-empty-object-type').length >= 1);
});

test('no-empty-object-type aceita interface que estende e acrescenta membros', () => {
  const code = 'export interface Base {\n  a: number;\n}\nexport interface Ext extends Base {\n  b: string;\n}\n';
  assert.equal(lint('case.ts', code, '@typescript-eslint/no-empty-object-type').length, 0);
});

test('no-empty-object-type reporta o tipo {} vazio', () => {
  assert.equal(lint('case.ts', 'export type V = {};\n', '@typescript-eslint/no-empty-object-type').length, 1);
});

test('no-empty-interface (obsoleta) não é ativada', async () => {
  const config = await effective('case.ts');
  assert.equal(config.rules['@typescript-eslint/no-empty-interface'], undefined);
});

test('prefer-for-of reporta laço indexado usado apenas para acessar elementos', () => {
  const code = 'declare const itens: string[];\nfor (let i = 0; i < itens.length; i++) {\n  console.log(itens[i]);\n}\n';
  assert.ok(lint('case.ts', code, '@typescript-eslint/prefer-for-of').length >= 1);
});

test('prefer-for-of aceita for...of', () => {
  const code = 'declare const itens: string[];\nfor (const item of itens) {\n  console.log(item);\n}\n';
  assert.equal(lint('case.ts', code, '@typescript-eslint/prefer-for-of').length, 0);
});

test('prefer-for-of aceita laço quando o índice é necessário', () => {
  const code = 'declare const itens: string[];\nfor (let i = 0; i < itens.length; i++) {\n  console.log(i, itens[i]);\n}\n';
  assert.equal(lint('case.ts', code, '@typescript-eslint/prefer-for-of').length, 0);
});

test('prefer-function-type reporta interface com apenas uma assinatura de chamada', () => {
  const code = 'export interface Callback {\n  (valor: string): void;\n}\n';
  assert.ok(lint('case.ts', code, '@typescript-eslint/prefer-function-type').length >= 1);
});

test('prefer-function-type aceita o tipo de função preferido', () => {
  assert.equal(lint('case.ts', 'export type Callback = (valor: string) => void;\n', '@typescript-eslint/prefer-function-type').length, 0);
});

test('prefer-function-type aceita interface com propriedades adicionais', () => {
  const code = 'export interface Cb {\n  (valor: string): void;\n  id: number;\n}\n';
  assert.equal(lint('case.ts', code, '@typescript-eslint/prefer-function-type').length, 0);
});

test('prefer-function-type aceita múltiplas assinaturas de chamada', () => {
  const code = 'export interface Cb {\n  (valor: string): void;\n  (valor: number): void;\n}\n';
  assert.equal(lint('case.ts', code, '@typescript-eslint/prefer-function-type').length, 0);
});

test('prefer-function-type reporta interface genérica com uma assinatura', () => {
  const code = 'export interface Cb<T> {\n  (valor: T): void;\n}\n';
  assert.ok(lint('case.ts', code, '@typescript-eslint/prefer-function-type').length >= 1);
});

const MEMBER = '@typescript-eslint/explicit-member-accessibility';

test('explicit-member-accessibility aceita constructor sem public', () => {
  const code = 'export class Usuario {\n  constructor(nome: string) {\n    void nome;\n  }\n}\n';
  assert.equal(lint('case.ts', code, MEMBER).length, 0);
});

test('explicit-member-accessibility reporta public constructor', () => {
  assert.equal(lint('case.ts', 'export class U {\n  public constructor() {}\n}\n', MEMBER).length, 1);
});

test('explicit-member-accessibility reporta propriedade sem modificador', () => {
  assert.equal(lint('case.ts', 'export class U {\n  nome: string = "";\n}\n', MEMBER).length, 1);
});

test('explicit-member-accessibility reporta método sem modificador', () => {
  assert.equal(lint('case.ts', 'export class U {\n  obter(): string {\n    return "";\n  }\n}\n', MEMBER).length, 1);
});

test('explicit-member-accessibility reporta accessor sem modificador', () => {
  assert.equal(lint('case.ts', 'export class U {\n  get nome(): string {\n    return "";\n  }\n}\n', MEMBER).length, 1);
});

test('explicit-member-accessibility reporta parameter property sem modificador', () => {
  assert.equal(lint('case.ts', 'export class U {\n  constructor(readonly nome: string) {}\n}\n', MEMBER).length, 1);
});

test('explicit-member-accessibility aceita o exemplo preferido com private e public', () => {
  const code = [
    'export class Usuario {',
    '  private nome: string;',
    '',
    '  constructor(nome: string) {',
    '    this.nome = nome;',
    '  }',
    '',
    '  public obterNome(): string {',
    '    return this.nome;',
    '  }',
    '}',
    '',
  ].join('\n');
  assert.equal(lint('case.ts', code, MEMBER).length, 0);
});

test('explicit-member-accessibility aceita modificadores em TSX', () => {
  const code = 'export class Usuario {\n  private nome: string;\n\n  constructor(nome: string) {\n    this.nome = nome;\n  }\n\n  public obterNome(): string {\n    return this.nome;\n  }\n}\n';
  assert.equal(lint('case.tsx', code, MEMBER).length, 0);
});

test('regras TypeScript do lote não geram erro de parsing em arquivo .js', () => {
  const code = 'export class A {\n  m() {\n    return [1];\n  }\n}\n';
  const fatal = messagesFor(code, baseConfig, fixtureFile('case.js'), []).filter((m) => m.fatal);
  assert.equal(fatal.length, 0);
});

test('perfectionist/sort-imports não está ativa e import/order continua ativa', async () => {
  const config = await effective('case.ts');
  assert.equal(config.rules['perfectionist/sort-imports'], undefined);
  assert.equal(config.rules['import/order'][0], 2);
});

test('configuração completa aceita um componente com modificadores e tipos do lote', () => {
  const code = [
    'export interface Props {',
    '  itens: string[];',
    '}',
    '',
    'export class Lista {',
    '  private total: number;',
    '',
    '  constructor(total: number) {',
    '    this.total = total;',
    '  }',
    '',
    '  public contar(): number {',
    '    return this.total;',
    '  }',
    '}',
    '',
  ].join('\n');
  const errors = messagesFor(code, reactConfig, fixtureFile('case.tsx'), []).filter((m) => m.severity === 2);
  assert.equal(errors.length, 0);
});
