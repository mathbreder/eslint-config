import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';

import { ESLint, Linter } from 'eslint';

import { baseConfig, reactConfig, root, virtualFile } from './helpers.mjs';
import { eslintConfigs } from '../dist/index.js';

const linter = new Linter({ configType: 'flat' });

const run = (code, filename, ruleIds, config = baseConfig) => linter
  .verify(code, config, virtualFile(filename))
  .filter((message) => ruleIds.includes(message.ruleId));
const one = (code, filename, ruleId, config = baseConfig) => run(code, filename, [ruleId], config);
const fixed = (code, filename, config = baseConfig) => linter.verifyAndFix(code, config, virtualFile(filename));
const effective = () => Object.assign({}, ...baseConfig.filter((cfg) => cfg.rules).map((cfg) => cfg.rules));

const STYLISTIC_APPROVED = {
  '@stylistic/multiline-ternary': ['error', 'always-multiline'],
  '@stylistic/new-parens': ['error', 'always'],
  '@stylistic/no-floating-decimal': 'error',
  '@stylistic/no-tabs': 'error',
  '@stylistic/no-whitespace-before-property': 'error',
  '@stylistic/semi-spacing': ['error', { before: false, after: true }],
  '@stylistic/no-mixed-operators': 'warn',
};

const CORE_APPROVED = {
  'no-eval': 'error',
  'no-implied-eval': 'error',
  'no-throw-literal': 'error',
  'no-use-before-define': ['warn', { functions: false, classes: true, variables: true }],
  'no-useless-constructor': 'warn',
};

const SEVERITY = { off: 0, warn: 1, error: 2 };
const normalize = (value) => {
  const parts = Array.isArray(value) ? value : [value];
  return [SEVERITY[parts[0]] ?? parts[0], ...parts.slice(1)];
};
const effectiveAt = async (file) => {
  const eslint = new ESLint({ cwd: root, overrideConfig: eslintConfigs.defineConfig([...eslintConfigs.baseConfig]), overrideConfigFile: true });
  return (await eslint.calculateConfigForFile(path.join(root, file))).rules;
};

test('as regras aprovadas têm a severidade e as opções aprovadas na configuração efetiva de JS', async () => {
  const rules = await effectiveAt('probe.js');
  for (const [name, expected] of Object.entries({ ...STYLISTIC_APPROVED, ...CORE_APPROVED })) {
    const actual = normalize(rules[name]);
    const want = normalize(expected);
    assert.equal(actual[0], want[0], `${name}: severidade`);
    if (want.length > 1) {
      for (const key of Object.keys(want[1])) assert.deepEqual(actual[1][key], want[1][key], `${name}: ${key}`);
    }
  }
});

test('as regras TypeScript das regras de core são configuradas e as de core são desligadas em arquivos TS', () => {
  const ts = Object.assign({}, ...baseConfig.filter((cfg) => cfg.name === 'eslint-typescript').map((cfg) => cfg.rules));
  assert.equal(ts['no-use-before-define'], 'off');
  assert.equal(ts['no-useless-constructor'], 'off');
  assert.deepEqual(ts['@typescript-eslint/no-use-before-define'], ['warn', { functions: false, classes: true, variables: true }]);
  assert.equal(ts['@typescript-eslint/no-useless-constructor'], 'warn');
});

test('regras preservadas continuam com o comportamento aprovado, na configuração efetiva de cada tipo de arquivo', async () => {
  const js = await effectiveAt('probe.js');
  const ts = await effectiveAt('probe.ts');
  assert.equal(normalize(js['@stylistic/no-multi-spaces'])[0], 2);
  assert.equal(normalize(js['@stylistic/no-trailing-spaces'])[0], 2);
  assert.equal(normalize(js['no-new-native-nonconstructor'])[0], 2);
  assert.equal(js['@stylistic/indent'][1], 2);
  assert.deepEqual(normalize(js['@stylistic/linebreak-style']), [2, 'unix']);
  assert.equal(normalize(ts['@typescript-eslint/no-array-constructor'])[0], 2);
  assert.equal(normalize(ts['no-array-constructor'])[0], 0, 'o core fica desligado em TS');
  assert.equal(normalize(ts['@typescript-eslint/no-empty-function'])[0], 1);
  assert.deepEqual(ts['@typescript-eslint/no-empty-function'][1], { allow: ['overrideMethods', 'decoratedFunctions'] });
});

test('regras legadas e removidas não são configuradas por este lote', () => {
  const rules = effective();
  for (const name of ['no-spaced-func', 'no-space-before-semi', 'no-comma-dangle', 'no-new-symbol', 'no-reserved-keys', 'no-arrow-condition', 'no-confusing-arrow', 'newline-per-chained-call', 'no-extra-parens', 'no-mixed-spaces-and-tabs']) {
    assert.equal(rules[name], undefined, name);
    assert.equal(rules[`@stylistic/${name}`], undefined, `@stylistic/${name}`);
  }
});

test('@stylistic/multiline-ternary: ternário multilinha com quebras consistentes é aceito', () => {
  assert.equal(one('const v = c\n  ? a\n  : b;\n', 'mt.js', '@stylistic/multiline-ternary').length, 0);
});

test('@stylistic/multiline-ternary: ternário multilinha sem quebra consistente é reportado e corrigido', () => {
  const code = 'const v = c ? a\n  : b;\n';
  assert.equal(one(code, 'mt-bad.js', '@stylistic/multiline-ternary').length, 1);
  assert.equal(one(fixed(code, 'mt-fix.js').output, 'mt-fix.js', '@stylistic/multiline-ternary').length, 0);
});

test('@stylistic/new-parens: new exige parênteses e o autofix os adiciona', () => {
  assert.equal(one('const m = new Map();\n', 'np.js', '@stylistic/new-parens').length, 0);
  assert.equal(one('const m = new Map;\n', 'np-bad.js', '@stylistic/new-parens').length, 1);
  assert.equal(fixed('const m = new Map;\n', 'np-fix.js').output, 'const m = new Map();\n');
});

test('@stylistic/no-floating-decimal: exige 0.5 e rejeita .5', () => {
  assert.equal(one('const a = 0.5;\n', 'fd.js', '@stylistic/no-floating-decimal').length, 0);
  assert.equal(one('const a = .5;\n', 'fd-bad.js', '@stylistic/no-floating-decimal').length, 1);
  assert.equal(fixed('const a = .5;\n', 'fd-fix.js').output, 'const a = 0.5;\n');
});

test('@stylistic/no-tabs: tabulação na indentação é rejeitada e corrigida', () => {
  assert.equal(one('const a = 1;\n', 'tab.js', '@stylistic/no-tabs').length, 0);
  assert.equal(one('\tconst a = 1;\n', 'tab-bad.js', '@stylistic/no-tabs').length, 1);
  assert.equal(fixed('\tconst a = 1;\n', 'tab-fix.js').output, 'const a = 1;\n');
});

test('no-mixed-spaces-and-tabs: a mistura de espaços e tabulações é rejeitada por no-tabs', () => {
  assert.ok(one('  \tconst a = 1;\n', 'mixed.js', '@stylistic/no-tabs').length >= 1);
});

test('@stylistic/no-whitespace-before-property: espaço antes da propriedade é rejeitado e corrigido', () => {
  assert.equal(one('const r = obj.prop;\n', 'wbp.js', '@stylistic/no-whitespace-before-property').length, 0);
  assert.equal(one('const r = obj .prop;\n', 'wbp-bad.js', '@stylistic/no-whitespace-before-property').length, 1);
  assert.equal(fixed('const r = obj .prop;\n', 'wbp-fix.js').output, 'const r = obj.prop;\n');
});

test('@stylistic/semi-spacing: sem espaço antes de ; e com espaço depois em for', () => {
  assert.equal(one('for (let i = 0; i < 1; i++) {}\n', 'ss.js', '@stylistic/semi-spacing').length, 0);
  assert.equal(one('a() ;\n', 'ss-bad.js', '@stylistic/semi-spacing').length, 1);
  assert.equal(fixed('a() ;\n', 'ss-fix.js').output, 'a();\n');
});

test('@stylistic/no-mixed-operators: operadores misturados são avisados com severidade warn', () => {
  const found = one('const z = a && b || c;\n', 'mo.js', '@stylistic/no-mixed-operators');
  assert.ok(found.length >= 1);
  assert.equal(found[0].severity, 1);
  assert.equal(one('const z = (a && b) || c;\n', 'mo-ok.js', '@stylistic/no-mixed-operators').length, 0);
});

test('no-eval: eval direto, referência e chamada indireta são proibidos', () => {
  assert.equal(one("eval('x');\n", 'ev.js', 'no-eval').length, 1);
  assert.equal(one('const f = eval;\n', 'ev-ref.js', 'no-eval').length, 1);
  assert.equal(one("(0, eval)('x');\n", 'ev-indirect.js', 'no-eval').length, 1);
});

test('no-eval: LIMITAÇÃO documentada: window.eval não é reportado pela regra de core', () => {
  assert.equal(one("window.eval('x');\n", 'ev-window.js', 'no-eval').length, 0);
});

test('no-implied-eval: timers com string são proibidos e com função são aceitos', () => {
  assert.equal(one("setTimeout('run()', 1);\n", 'ie.js', 'no-implied-eval').length, 1);
  assert.equal(one("setInterval('run()', 1);\n", 'ie-int.js', 'no-implied-eval').length, 1);
  assert.equal(one('setTimeout(() => run(), 1);\n', 'ie-ok.js', 'no-implied-eval').length, 0);
});

test('no-implied-eval também é aplicado em TypeScript sem informações de tipos', () => {
  assert.equal(one("setTimeout('run()', 1);\n", 'ie.ts', 'no-implied-eval').length, 1);
});

test('no-throw-literal: lançar string, número, null ou objeto literal é proibido', () => {
  assert.equal(one("throw 'Erro';\n", 'tl.js', 'no-throw-literal').length, 1);
  assert.equal(one('throw 42;\n', 'tl-num.js', 'no-throw-literal').length, 1);
  assert.equal(one('throw null;\n', 'tl-null.js', 'no-throw-literal').length, 1);
  assert.equal(one('throw {};\n', 'tl-obj.js', 'no-throw-literal').length, 1);
});

test('no-throw-literal: lançar Error é aceito, em JS e TS', () => {
  assert.equal(one("throw new Error('Erro');\n", 'tl-ok.js', 'no-throw-literal').length, 0);
  assert.equal(one("throw new Error('Erro');\n", 'tl-ok.ts', 'no-throw-literal').length, 0);
  assert.equal(one("throw 'Erro';\n", 'tl-bad.ts', 'no-throw-literal').length, 1);
});

test('no-use-before-define (JS): variável e classe usadas antes da declaração são avisadas com warn', () => {
  const variable = one('console.log(v);\nconst v = 1;\n', 'ubd-var.js', 'no-use-before-define');
  assert.equal(variable.length, 1);
  assert.equal(variable[0].severity, 1);
  assert.equal(one('const x = new C();\nclass C {}\n', 'ubd-class.js', 'no-use-before-define').length, 1);
});

test('no-use-before-define (JS): função declarada depois do uso é aceita', () => {
  assert.equal(one('run();\nfunction run() {}\n', 'ubd-fn.js', 'no-use-before-define').length, 0);
});

test('no-use-before-define (TS): variável, classe e enum usadas antes da declaração são avisadas', () => {
  assert.equal(one('console.log(v);\nconst v = 1;\n', 'ubd-var.ts', '@typescript-eslint/no-use-before-define').length, 1);
  assert.equal(one('const x = new C();\nclass C {}\n', 'ubd-class.ts', '@typescript-eslint/no-use-before-define').length, 1);
  assert.equal(one('const x = E.A;\nenum E { A }\n', 'ubd-enum.ts', '@typescript-eslint/no-use-before-define').length, 1);
});

test('no-use-before-define (TS): interface usada antes é aceita e a versão de core fica desligada em TS', () => {
  assert.equal(one('let x: Foo;\ninterface Foo { a: number }\n', 'ubd-iface.ts', '@typescript-eslint/no-use-before-define').length, 0);
  assert.equal(one('console.log(v);\nconst v = 1;\n', 'ubd-core-ts.ts', 'no-use-before-define').length, 0);
});

test('no-useless-constructor (JS): construtor vazio e construtor que só chama super são avisados', () => {
  assert.equal(one('class A {\n  constructor() {}\n}\n', 'ulc.js', 'no-useless-constructor').length, 1);
  const onlySuper = 'class A {}\nclass B extends A {\n  constructor(x) {\n    super(x);\n  }\n}\n';
  assert.equal(one(onlySuper, 'ulc-super.js', 'no-useless-constructor').length, 1);
});

test('@typescript-eslint/no-useless-constructor: parameter properties, modificador privado e construtor com lógica são aceitos', () => {
  assert.equal(one('class A {\n  constructor(private x: number) {}\n}\n', 'ulc-prop.ts', '@typescript-eslint/no-useless-constructor').length, 0);
  assert.equal(one('class A {\n  private constructor() {}\n}\n', 'ulc-priv.ts', '@typescript-eslint/no-useless-constructor').length, 0);
  assert.equal(one('class A {\n  constructor() {\n    this.x = 1;\n  }\n  x = 0;\n}\n', 'ulc-logic.ts', '@typescript-eslint/no-useless-constructor').length, 0);
});

test('@typescript-eslint/no-useless-constructor: construtor que só chama super é avisado em TS e o core fica desligado', () => {
  const code = 'class A {}\nclass B extends A {\n  constructor(x: number) {\n    super(x);\n  }\n}\n';
  const found = one(code, 'ulc-super.ts', '@typescript-eslint/no-useless-constructor');
  assert.equal(found.length, 1);
  assert.equal(found[0].severity, 1);
  assert.equal(one(code, 'ulc-core-ts.ts', 'no-useless-constructor').length, 0);
});

test('preservação: no-array-constructor TS é error e o core fica desligado em TS', () => {
  assert.equal(one('const a = new Array(1, 2);\n', 'arr.ts', '@typescript-eslint/no-array-constructor').length, 1);
  assert.equal(one('const a = new Array(1, 2);\n', 'arr-core.ts', 'no-array-constructor').length, 0);
});

test('preservação: no-empty-function TS é warn e não afeta arquivos de teste', () => {
  assert.equal(one('export const f = () => {};\n', 'empty.ts', '@typescript-eslint/no-empty-function').length, 1);
  assert.equal(one('export const f = () => {};\n', 'empty.test.ts', '@typescript-eslint/no-empty-function').length, 0);
});

test('preservação: no-multi-spaces, no-trailing-spaces e no-new-native-nonconstructor continuam em error', () => {
  assert.equal(one('const a  = 1;\n', 'ms.js', '@stylistic/no-multi-spaces').length, 1);
  assert.equal(one('const a = 1; \n', 'ts.js', '@stylistic/no-trailing-spaces').length, 1);
  assert.equal(one('new Symbol("x");\n', 'nn.js', 'no-new-native-nonconstructor').length, 1);
});

test('interação: multiline-ternary e no-nested-ternary sobre ternário aninhado', () => {
  const code = 'const v = a ? b : c ? d : e;\n';
  assert.equal(run(code, 'nest.js', ['no-nested-ternary']).length, 1);
});

test('interação: no-whitespace-before-property aceita a quebra de linha da cadeia que dot-location permite', () => {
  const code = 'const r = obj\n  .prop;\n';
  assert.equal(run(code, 'chain.js', ['@stylistic/no-whitespace-before-property', '@stylistic/dot-location']).length, 0);
});

test('interação: semi-spacing não duplica a diagnose de semi quando falta o ponto e vírgula', () => {
  const found = run('const a = 1\n', 'semi.js', ['@stylistic/semi', '@stylistic/semi-spacing']);
  assert.equal(found.filter((m) => m.ruleId === '@stylistic/semi').length, 1);
  assert.equal(found.filter((m) => m.ruleId === '@stylistic/semi-spacing').length, 0);
});

test('interação: no-mixed-operators e no-extra-parens (desligada) não produzem diagnóstico de parênteses', () => {
  assert.equal(run('const z = (a && b) || c;\n', 'parens.js', ['@stylistic/no-extra-parens', '@stylistic/no-mixed-operators']).length, 0);
});

test('código válido de todas as regras deste lote não produz diagnóstico', () => {
  const code = [
    'const value = 0.5;',
    'const map = new Map();',
    'const label = value > 0',
    '  ? "positivo"',
    '  : "outro";',
    'function run() {',
    '  return label;',
    '}',
    'run();',
    '',
  ].join('\n');
  assert.equal(run(code, 'valid-lote3.js', [...Object.keys(STYLISTIC_APPROVED), ...Object.keys(CORE_APPROVED)]).length, 0);
});

test('JSX/TSX: as regras deste lote também se aplicam a componentes', () => {
  const code = 'export const View = () => {\n  return <p>{value .toString()}</p>;\n};\n';
  assert.equal(run(code, 'view.tsx', ['@stylistic/no-whitespace-before-property'], reactConfig).length, 1);
});

test('typeCheckedConfig: throw de string usa @typescript-eslint/only-throw-error e desliga o core', async () => {
  const cwd = path.join(root, 'tests', 'fixtures', 'lote3');
  const configs = eslintConfigs.defineConfig([...eslintConfigs.baseConfig, ...eslintConfigs.typeCheckedConfig]);
  const [result] = await new ESLint({ cwd, overrideConfig: configs, overrideConfigFile: true }).lintFiles([path.join(cwd, 'src', 'throw.ts')]);
  const ids = result.messages.map((m) => m.ruleId);
  assert.ok(ids.includes('@typescript-eslint/only-throw-error'), JSON.stringify(ids));
  assert.equal(ids.includes('no-throw-literal'), false, 'a versão de core não deve duplicar o diagnóstico');
  assert.equal(result.messages.find((m) => m.ruleId === '@typescript-eslint/only-throw-error').severity, 2);
});

test('typeCheckedConfig: setTimeout com string usa @typescript-eslint/no-implied-eval e desliga o core', async () => {
  const cwd = path.join(root, 'tests', 'fixtures', 'lote3');
  const configs = eslintConfigs.defineConfig([...eslintConfigs.baseConfig, ...eslintConfigs.typeCheckedConfig]);
  const [result] = await new ESLint({ cwd, overrideConfig: configs, overrideConfigFile: true }).lintFiles([path.join(cwd, 'src', 'implied.ts')]);
  const ids = result.messages.map((m) => m.ruleId);
  assert.ok(ids.includes('@typescript-eslint/no-implied-eval'), JSON.stringify(ids));
  assert.equal(ids.includes('no-implied-eval'), false, 'a versão de core não deve duplicar o diagnóstico');
});

test('sem typeCheckedConfig: a versão de core de throw continua ativa e a de tipos não é aplicada', async () => {
  const cwd = path.join(root, 'tests', 'fixtures', 'lote3');
  const configs = eslintConfigs.defineConfig([...eslintConfigs.baseConfig]);
  const [result] = await new ESLint({ cwd, overrideConfig: configs, overrideConfigFile: true }).lintFiles([path.join(cwd, 'src', 'throw.ts')]);
  const ids = result.messages.map((m) => m.ruleId);
  assert.ok(ids.includes('no-throw-literal'));
  assert.equal(ids.includes('@typescript-eslint/only-throw-error'), false);
});

test('typeCheckedConfig: throw de Error é aceito com verificação de tipos', async () => {
  const cwd = path.join(root, 'tests', 'fixtures', 'lote3');
  const configs = eslintConfigs.defineConfig([...eslintConfigs.baseConfig, ...eslintConfigs.typeCheckedConfig]);
  const [result] = await new ESLint({ cwd, overrideConfig: configs, overrideConfigFile: true }).lintFiles([path.join(cwd, 'src', 'clean.ts')]);
  assert.equal(result.messages.filter((m) => ['@typescript-eslint/only-throw-error', 'no-throw-literal'].includes(m.ruleId)).length, 0);
});
