import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';

import { ESLint, Linter } from 'eslint';

import { baseConfig, reactConfig, root, virtualFile } from './helpers.mjs';
import { eslintConfigs } from '../dist/index.js';
import { expoConfig } from '../dist/eslint-configs/expo.js';
import { defineConfig } from '../dist/eslint-configs/utils.js';

const linter = new Linter({ configType: 'flat' });
const fixtures = path.join(root, 'tests', 'fixtures', 'lote3');
const JS_EXTS = ['js', 'jsx', 'mjs', 'cjs'];
const TS_EXTS = ['ts', 'tsx', 'mts', 'cts'];
const SEV = { off: 0, warn: 1, error: 2 };
const severityOf = (rules, name) => {
  const value = rules[name];
  if (value === undefined) return 'absent';
  const severity = Array.isArray(value) ? value[0] : value;
  return SEV[severity] ?? severity;
};
const effectiveAt = async (config, file) => {
  const eslint = new ESLint({ cwd: root, overrideConfig: defineConfig(config), overrideConfigFile: true });
  return (await eslint.calculateConfigForFile(path.join(root, file))).rules;
};
const typed = [...baseConfig, ...eslintConfigs.typeCheckedConfig];
const expo = [...baseConfig, ...expoConfig];

const EVAL_FORMS = {
  direct: "eval('x');",
  window: "window.eval('x');",
  globalThis: "globalThis.eval('x');",
  global: "global.eval('x');",
  bracket: "window['eval']('x');",
  alias: 'const f = eval;',
};

const evalLines = (code, file, config) => linter
  .verify(code, config, virtualFile(file))
  .filter((message) => message.ruleId === 'no-eval')
  .length;

test('no-eval sem globais de navegador: globalThis, global, eval direto e alias são reportados; window não', () => {
  for (const ext of [...JS_EXTS, ...TS_EXTS]) {
    assert.equal(evalLines(EVAL_FORMS.direct, `a.${ext}`, baseConfig), 1, `direct ${ext}`);
    assert.equal(evalLines(EVAL_FORMS.globalThis, `a.${ext}`, baseConfig), 1, `globalThis ${ext}`);
    assert.equal(evalLines(EVAL_FORMS.global, `a.${ext}`, baseConfig), 1, `global ${ext}`);
    assert.equal(evalLines(EVAL_FORMS.alias, `a.${ext}`, baseConfig), 1, `alias ${ext}`);
    assert.equal(evalLines(EVAL_FORMS.window, `a.${ext}`, baseConfig), 0, `window ${ext}`);
    assert.equal(evalLines(EVAL_FORMS.bracket, `a.${ext}`, baseConfig), 0, `bracket ${ext}`);
  }
});

test('no-eval com window declarada pelo preset React: reportado apenas em .jsx e .tsx', () => {
  for (const ext of ['jsx', 'tsx']) {
    assert.equal(evalLines(EVAL_FORMS.window, `a.${ext}`, reactConfig), 1, `window ${ext}`);
    assert.equal(evalLines(EVAL_FORMS.bracket, `a.${ext}`, reactConfig), 1, `bracket ${ext}`);
  }
  for (const ext of ['js', 'ts']) {
    assert.equal(evalLines(EVAL_FORMS.window, `a.${ext}`, reactConfig), 0, `window ${ext}`);
  }
});

test('no-eval com o preset Expo: window é reportado em todas as extensões', () => {
  for (const ext of [...JS_EXTS, ...TS_EXTS]) {
    assert.equal(evalLines(EVAL_FORMS.window, `a.${ext}`, expo), 1, `window ${ext}`);
  }
});

test('no-eval em typeCheckedConfig: window depende de global declarada, não do tipo de verificação', async () => {
  const eslint = (config) => new ESLint({ cwd: fixtures, overrideConfig: defineConfig(config), overrideConfigFile: true });
  const files = [path.join(fixtures, 'src', 'eval-window.ts'), path.join(fixtures, 'src', 'eval-view.tsx')];
  const lines = async (config) => (await eslint(config).lintFiles(files))
    .map((result) => [path.basename(result.filePath), result.messages.filter((m) => m.ruleId === 'no-eval').map((m) => m.line)]);
  assert.deepEqual(await lines([...baseConfig]), [['eval-window.ts', [5]], ['eval-view.tsx', []]]);
  assert.deepEqual(await lines(typed), [['eval-window.ts', [5]], ['eval-view.tsx', []]]);
  assert.deepEqual(await lines([...reactConfig, ...eslintConfigs.typeCheckedConfig]), [['eval-window.ts', [5]], ['eval-view.tsx', [2]]]);
});

const FORMAT_CASES = {
  oneLineIf: 'if (ativo) { executar(); }\n',
  multilineIf: 'if (ativo) {\n  executar();\n}\n',
  twoStatements: 'if (ativo) { executar(); outraFuncao(); }\n',
  oneLineFunction: 'function executar() { return true; }\n',
  oneLineArrow: 'const executar = () => { return true; };\n',
};
const formatRules = /^(@stylistic\/brace-style|@stylistic\/max-statements-per-line|arrow-body-style)$/;
const formatMessages = (code, file) => linter.verify(code, baseConfig, virtualFile(file)).filter((m) => formatRules.test(m.ruleId ?? ''));

test('brace-style aceita bloco em linha que max-statements-per-line rejeita, sem autofix em nenhum dos dois', () => {
  const oneLine = formatMessages(FORMAT_CASES.oneLineIf, 'a.js');
  assert.deepEqual(oneLine.map((m) => m.ruleId), ['@stylistic/max-statements-per-line']);
  assert.equal(formatMessages(FORMAT_CASES.twoStatements, 'b.js').map((m) => m.ruleId).join(), '@stylistic/max-statements-per-line');
  assert.equal(formatMessages(FORMAT_CASES.oneLineFunction, 'c.js').map((m) => m.ruleId).join(), '@stylistic/max-statements-per-line');
  assert.equal(linter.verifyAndFix(FORMAT_CASES.oneLineIf, baseConfig, virtualFile('d.js')).output, FORMAT_CASES.oneLineIf);
  assert.equal(linter.verifyAndFix(FORMAT_CASES.twoStatements, baseConfig, virtualFile('e.js')).output, FORMAT_CASES.twoStatements);
});

test('a forma multilinha satisfaz as duas regras, então não há incompatibilidade técnica', () => {
  assert.equal(formatMessages(FORMAT_CASES.multilineIf, 'f.js').length, 0);
});

test('arrow-body-style resolve sozinho o max-statements-per-line e o autofix estabiliza em uma passada', () => {
  const first = linter.verifyAndFix(FORMAT_CASES.oneLineArrow, baseConfig, virtualFile('g.js'));
  assert.equal(first.output, 'const executar = () => true;\n');
  assert.equal(formatMessages(first.output, 'g.js').length, 0);
  assert.equal(linter.verifyAndFix(first.output, baseConfig, virtualFile('g.js')).output, first.output);
});

test('o autofix repetido não oscila em nenhum caso de formatação', () => {
  for (const [name, code] of Object.entries(FORMAT_CASES)) {
    const once = linter.verifyAndFix(code, baseConfig, virtualFile(`${name}.js`)).output;
    const twice = linter.verifyAndFix(once, baseConfig, virtualFile(`${name}.js`)).output;
    assert.equal(twice, once, name);
  }
});

const ARRAY_CASES = {
  'new Array()': 'const itens = new Array();\n',
  'new Array(1, 2, 3)': 'const itens = new Array(1, 2, 3);\n',
  'Array(1, 2, 3)': 'const itens = Array(1, 2, 3);\n',
};

test('no-array-constructor: a regra TypeScript é a única ativa em todas as extensões, sem duplicação', () => {
  for (const [name, code] of Object.entries(ARRAY_CASES)) {
    for (const ext of [...JS_EXTS, ...TS_EXTS]) {
      const found = linter.verify(code, baseConfig, virtualFile(`arr.${ext}`)).filter((m) => /array-constructor/.test(m.ruleId ?? ''));
      assert.deepEqual(found.map((m) => m.ruleId), ['@typescript-eslint/no-array-constructor'], `${name} em ${ext}`);
      assert.equal(found[0].severity, 2, `${name} em ${ext}`);
    }
  }
});

test('no-array-constructor: new Array(10), com um único argumento numérico, é aceito pela regra TypeScript', () => {
  for (const ext of [...JS_EXTS, ...TS_EXTS]) {
    assert.equal(linter.verify('const itens = new Array(10);\n', baseConfig, virtualFile(`arr-len.${ext}`)).filter((m) => /array-constructor/.test(m.ruleId ?? '')).length, 0, ext);
  }
});

test('configuração efetiva sem typeCheckedConfig: por extensão, quem está ativo e com quais severidades', async () => {
  for (const ext of JS_EXTS) {
    const rules = await effectiveAt(baseConfig, `probe.${ext}`);
    assert.equal(severityOf(rules, 'no-implied-eval'), 2, ext);
    assert.equal(severityOf(rules, 'no-throw-literal'), 2, ext);
    assert.equal(severityOf(rules, 'no-use-before-define'), 1, ext);
    assert.equal(severityOf(rules, 'no-useless-constructor'), 1, ext);
    assert.equal(severityOf(rules, '@typescript-eslint/no-array-constructor'), 2, ext);
    assert.equal(severityOf(rules, '@typescript-eslint/no-use-before-define'), 'absent', ext);
    assert.equal(severityOf(rules, '@typescript-eslint/no-useless-constructor'), 'absent', ext);
    assert.equal(severityOf(rules, '@typescript-eslint/no-empty-function'), 'absent', ext);
  }
  for (const ext of TS_EXTS) {
    const rules = await effectiveAt(baseConfig, `probe.${ext}`);
    assert.equal(severityOf(rules, 'no-implied-eval'), 2, ext);
    assert.equal(severityOf(rules, 'no-throw-literal'), 2, ext);
    assert.equal(severityOf(rules, '@typescript-eslint/no-implied-eval'), 'absent', ext);
    assert.equal(severityOf(rules, '@typescript-eslint/only-throw-error'), 'absent', ext);
    assert.equal(severityOf(rules, 'no-use-before-define'), 0, ext);
    assert.equal(severityOf(rules, '@typescript-eslint/no-use-before-define'), 1, ext);
    assert.equal(severityOf(rules, 'no-useless-constructor'), 0, ext);
    assert.equal(severityOf(rules, '@typescript-eslint/no-useless-constructor'), 1, ext);
    assert.equal(severityOf(rules, 'no-array-constructor'), 0, ext);
    assert.equal(severityOf(rules, '@typescript-eslint/no-array-constructor'), 2, ext);
    assert.equal(severityOf(rules, '@typescript-eslint/no-empty-function'), 1, ext);
    assert.equal(severityOf(rules, '@typescript-eslint/no-floating-promises'), 'absent', `sem tipos ${ext}`);
  }
});

test('typeCheckedConfig: troca core por versões com tipos apenas em arquivos TS, sem projectService na configuração padrão', async () => {
  const defaultTs = await new ESLint({ cwd: root, overrideConfig: defineConfig(baseConfig), overrideConfigFile: true }).calculateConfigForFile(path.join(root, 'probe.ts'));
  assert.equal(defaultTs.languageOptions.parserOptions?.projectService, undefined);
  for (const ext of TS_EXTS) {
    const rules = await effectiveAt(typed, `probe.${ext}`);
    assert.equal(severityOf(rules, 'no-implied-eval'), 0, ext);
    assert.equal(severityOf(rules, '@typescript-eslint/no-implied-eval'), 2, ext);
    assert.equal(severityOf(rules, 'no-throw-literal'), 0, ext);
    assert.equal(severityOf(rules, '@typescript-eslint/only-throw-error'), 2, ext);
    assert.equal(severityOf(rules, '@typescript-eslint/no-floating-promises'), 2, ext);
  }
  for (const ext of JS_EXTS) {
    const rules = await effectiveAt(typed, `probe.${ext}`);
    assert.equal(severityOf(rules, 'no-implied-eval'), 2, ext);
    assert.equal(severityOf(rules, '@typescript-eslint/no-implied-eval'), 'absent', ext);
  }
});

test('no-use-before-define e no-useless-constructor (TS): funções, interfaces, aliases e construtores com TypeScript', () => {
  const ts = (code, file) => linter.verify(code, baseConfig, virtualFile(file)).filter((m) => ['@typescript-eslint/no-use-before-define', '@typescript-eslint/no-useless-constructor'].includes(m.ruleId));
  assert.equal(ts('run();\nexport function run(): void {}\n', 'f1.ts').length, 0, 'função depois do uso');
  assert.equal(ts('let x: Foo;\nexport interface Foo { a: number }\n', 'f2.ts').length, 0, 'interface');
  assert.equal(ts('let x: Bar;\nexport type Bar = number;\n', 'f3.ts').length, 0, 'alias de tipo');
  assert.equal(ts('export const x = new C();\nexport class C {}\n', 'f4.ts').length, 1, 'classe');
  assert.equal(ts('export class A {\n  protected constructor() {}\n}\n', 'f5.ts').length, 0, 'construtor protegido');
  assert.equal(ts('export class A {\n  constructor(private readonly x: number) {}\n}\n', 'f6.ts').length, 0, 'propriedade de parâmetro');
  assert.equal(ts('export class A {}\nexport class B extends A {\n  constructor(...args: unknown[]) {\n    super(...args);\n  }\n}\n', 'f7.ts').length, 1, 'só chama super');
});

test('TS: diagnósticos de no-use-before-define e no-useless-constructor não são duplicados com as versões de core', () => {
  const code = 'export class A {}\nexport class B extends A {\n  constructor(x: number) {\n    super(x);\n  }\n}\nexport const v = new C();\nexport class C {}\n';
  const ids = linter.verify(code, baseConfig, virtualFile('dup.ts')).map((m) => m.ruleId).filter((id) => ['no-use-before-define', 'no-useless-constructor', '@typescript-eslint/no-use-before-define', '@typescript-eslint/no-useless-constructor'].includes(id));
  assert.deepEqual(ids.sort(), ['@typescript-eslint/no-use-before-define', '@typescript-eslint/no-useless-constructor']);
});

test('no-empty-function (TS): o override de testes vale em tests/, __tests__/, test/, .spec. e .test.', async () => {
  for (const file of ['tests/a.ts', 'src/__tests__/a.ts', 'src/test/a.ts', 'src/a.spec.tsx', 'src/a.test.ts']) {
    assert.equal(severityOf(await effectiveAt(baseConfig, file), '@typescript-eslint/no-empty-function'), 0, file);
  }
  const app = await effectiveAt(baseConfig, 'src/a.ts');
  assert.equal(severityOf(app, '@typescript-eslint/no-empty-function'), 1);
  assert.deepEqual(app['@typescript-eslint/no-empty-function'][1], { allow: ['overrideMethods', 'decoratedFunctions'] });
});

test('preset Expo: sem duplicação, versão TypeScript em warn e core de construtor desligado em TS', async () => {
  const rules = await effectiveAt(expo, 'probe.tsx');
  assert.equal(severityOf(rules, 'no-useless-constructor'), 0);
  assert.equal(severityOf(rules, '@typescript-eslint/no-useless-constructor'), 1);
  assert.equal(severityOf(rules, 'no-array-constructor'), 0);
  assert.equal(severityOf(rules, '@typescript-eslint/no-array-constructor'), 2);
  assert.equal(severityOf(rules, 'no-implied-eval'), 2);
  assert.equal(severityOf(rules, 'no-throw-literal'), 2);
  const code = 'class A {}\nclass B extends A {\n  constructor(x) {\n    super(x);\n  }\n}\nconst v = new Array(1, 2);\nthrow "x";\n';
  const ids = linter.verify(code, expo, virtualFile('expo.tsx')).map((m) => m.ruleId);
  assert.equal(ids.filter((id) => id === '@typescript-eslint/no-useless-constructor').length, 1);
  assert.equal(ids.filter((id) => id === '@typescript-eslint/no-array-constructor').length, 1);
  assert.equal(ids.filter((id) => id === 'no-throw-literal').length, 1);
});
