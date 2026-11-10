import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import { ESLint } from 'eslint';

import { baseConfig, root } from './helpers.mjs';
import { eslintConfigs } from '../dist/index.js';
import { defineConfig } from '../dist/eslint-configs/utils.js';

const typed = [ ...baseConfig, ...eslintConfigs.typeCheckedConfig ];
const typedRoot = path.join(root, 'tests', 'fixtures', 'lote6', 'typescript-typed');
const strictDir = path.join(typedRoot, 'strict');
const looseDir = path.join(typedRoot, 'loose');
const SEV = { off: 0, warn: 1, error: 2 };
const TS_EXTS = [ 'ts', 'tsx', 'mts', 'cts' ];
const NON_TS_EXTS = [ 'js', 'jsx', 'mjs', 'cjs' ];

const TYPED = [
  ['no-array-delete', 'error'], ['no-base-to-string', 'warn'], ['no-duplicate-type-constituents', 'error'],
  ['no-for-in-array', 'error'], ['no-misused-promises', 'warn'], ['no-redundant-type-constituents', 'warn'],
  ['no-unnecessary-type-assertion', 'warn'], ['no-unsafe-assignment', 'error'], ['no-unsafe-call', 'error'],
  ['no-unsafe-enum-comparison', 'error'], ['no-unsafe-member-access', 'error'], ['no-unsafe-return', 'error'],
  ['no-unsafe-unary-minus', 'error'], ['restrict-plus-operands', 'error'], ['restrict-template-expressions', 'warn'],
  ['unbound-method', 'error'], ['consistent-type-exports', 'warn'], ['no-confusing-void-expression', 'warn'],
  ['no-deprecated', 'warn'], ['no-generated-empty-object-type', 'warn'], ['no-meaningless-void-operator', 'warn'],
  ['no-misused-spread', 'error'], ['no-mixed-enums', 'error'], ['no-unnecessary-template-expression', 'warn'],
  ['no-unnecessary-type-arguments', 'warn'], ['no-unnecessary-type-conversion', 'warn'],
  ['no-unnecessary-type-parameters', 'warn'], ['no-unsafe-enum-assignment', 'error'], ['prefer-find', 'warn'],
  ['prefer-includes', 'warn'], ['prefer-optional-chain', 'warn'], ['prefer-readonly', 'warn'],
  ['prefer-reduce-type-parameter', 'warn'], ['prefer-return-this-type', 'warn'],
  ['prefer-string-starts-ends-with', 'warn'], ['related-getter-setter-pairs', 'error'],
  ['require-array-sort-compare', 'error'], ['return-await', 'warn'], ['switch-exhaustiveness-check', 'error'],
  ['use-unknown-in-catch-callback-variable', 'warn'],
];
const OPTIONS = {
  'require-array-sort-compare': { ignoreStringArrays: true },
  'no-confusing-void-expression': { ignoreArrowShorthand: true },
  'return-await': 'error-handling-correctness-only',
};
const TYPED_ONLY_OPTIONS = { 'no-confusing-void-expression': { ignoreArrowShorthand: true } };
const TYPED_NAMES = TYPED.map(([ name ]) => name);

const effectiveRules = async (config, file) => {
  const eslint = new ESLint({ cwd: root, overrideConfig: defineConfig(config), overrideConfigFile: true });
  return (await eslint.calculateConfigForFile(file)).rules;
};
const severityOf = (rules, name) => {
  const value = rules[name];
  if (value === undefined) return 'absent';
  const severity = Array.isArray(value) ? value[0] : value;
  return typeof severity === 'number' ? severity : SEV[severity] ?? 'absent';
};
const optionsOf = (rules, name) => (Array.isArray(rules[name]) ? rules[name][1] : undefined);

const lintProject = async (dir, file, { fix = false, config = typed } = {}) => {
  const eslint = new ESLint({ cwd: dir, fix, overrideConfigFile: true, overrideConfig: defineConfig(config) });
  if (!fix) {
    const [result] = await eslint.lintFiles([ path.join('src', file) ]);
    return result;
  }
  const filePath = path.join(dir, 'src', file);
  const [result] = await eslint.lintText(fs.readFileSync(filePath, 'utf8'), { filePath });
  return result;
};
const newTypedHits = (messages) => messages
  .filter((m) => m.ruleId?.startsWith('@typescript-eslint/') && TYPED_NAMES.includes(m.ruleId.replace('@typescript-eslint/', '')));
const pairsOf = (messages) => messages.map((m) => `${m.ruleId}@${m.line}:${m.column}`);

for (const [ name, severity ] of TYPED) {
  test(`${name}: restrita ao preset typeCheckedConfig, severidade ${severity}, e ausente do baseConfig`, async () => {
    const id = `@typescript-eslint/${name}`;
    for (const ext of TS_EXTS) {
      const rules = await effectiveRules(typed, path.join(root, 'virtual-src', `x.${ext}`));
      assert.equal(severityOf(rules, id), SEV[severity], `.${ext}: severidade`);
      if (OPTIONS[name] !== undefined) {
        assert.deepEqual(optionsOf(rules, id), OPTIONS[name], `.${ext}: opções`);
      }
    }
    for (const ext of NON_TS_EXTS) {
      const rules = await effectiveRules(typed, path.join(root, 'virtual-src', `x.${ext}`));
      assert.equal(severityOf(rules, id), 'absent', `.${ext}: fora de escopo`);
    }
    for (const ext of TS_EXTS) {
      const base = await effectiveRules(baseConfig, path.join(root, 'virtual-src', `x.${ext}`));
      assert.equal(severityOf(base, id), 'absent', `baseConfig .${ext}: não ativada automaticamente`);
    }
  });
}

test('typeCheckedConfig: contém exatamente as quarenta regras e usa projectService', async () => {
  assert.equal(TYPED.length, 40);
  const eslint = new ESLint({ cwd: root, overrideConfig: defineConfig(typed), overrideConfigFile: true });
  const config = await eslint.calculateConfigForFile(path.join(root, 'virtual-src', 'x.ts'));
  assert.equal(config.languageOptions.parserOptions.projectService, true);
  assert.equal(severityOf(config.rules, '@typescript-eslint/no-unsafe-call'), SEV.error);
  const withoutTyped = await effectiveRules(baseConfig, path.join(root, 'virtual-src', 'x.ts'));
  const activeWithout = TYPED_NAMES.filter((name) => severityOf(withoutTyped, `@typescript-eslint/${name}`) !== 'absent');
  assert.deepEqual(activeWithout, []);
});

test('fixture válido, projeto estrito: nenhuma das quarenta regras reporta', async () => {
  const result = await lintProject(strictDir, 'valid.ts');
  assert.equal(result.messages.filter((m) => m.fatal).length, 0, 'sem erro fatal');
  assert.deepEqual(pairsOf(newTypedHits(result.messages)), []);
});

test('fixture válido, projeto frouxo (strictNullChecks desligado): nenhuma das quarenta regras reporta', async () => {
  const result = await lintProject(looseDir, 'valid.ts');
  assert.equal(result.messages.filter((m) => m.fatal).length, 0, 'sem erro fatal');
  assert.deepEqual(pairsOf(newTypedHits(result.messages)), []);
});

test('fixture inválido, projeto estrito: cada uma das quarenta regras dispara ao menos uma vez', async () => {
  const result = await lintProject(strictDir, 'invalid.ts');
  assert.equal(result.messages.filter((m) => m.fatal).length, 0, 'sem erro fatal');
  const fired = new Set(newTypedHits(result.messages).map((m) => m.ruleId.replace('@typescript-eslint/', '')));
  assert.deepEqual(TYPED_NAMES.filter((name) => !fired.has(name)), []);
});

test('fixture inválido, projeto frouxo (strictNullChecks desligado): cada uma das quarenta regras dispara ao menos uma vez', async () => {
  const result = await lintProject(looseDir, 'invalid.ts');
  assert.equal(result.messages.filter((m) => m.fatal).length, 0, 'sem erro fatal');
  const fired = new Set(newTypedHits(result.messages).map((m) => m.ruleId.replace('@typescript-eslint/', '')));
  assert.deepEqual(TYPED_NAMES.filter((name) => !fired.has(name)), []);
});

test('sem diagnósticos duplicados: nenhuma regra tipada repete a mesma posição', async () => {
  const result = await lintProject(strictDir, 'invalid.ts');
  const keys = newTypedHits(result.messages).map((m) => `${m.ruleId}:${m.line}:${m.column}`);
  assert.deepEqual(keys.filter((key, index) => keys.indexOf(key) !== index), []);
});

test('autofix do projeto estrito: correções seguras aplicadas e a segunda passagem não altera o código', async () => {
  const once = await lintProject(strictDir, 'invalid.ts', { fix: true });
  const output = once.output ?? fs.readFileSync(path.join(strictDir, 'src', 'invalid.ts'), 'utf8');
  for (const expected of [
    'export const pickedString = pick(\'a\');',
    'export const included = numbers.includes(1);',
    'export const chained = maybe?.length;',
    'export const startsWithA = text.startsWith(\'a\');',
    'export const sameType = text;',
    'export const reduced = numbers.reduce<number[]>(',
    'export type { Only as Exported };',
    'private readonly value = 1;',
  ]) {
    assert.ok(output.includes(expected), `autofix deve produzir: ${expected}`);
  }
  assert.ok(output.includes("export const unsafeAssignment: string = JSON.parse('1');"), 'regras unsafe não são corrigidas automaticamente');
  const twice = await lintProject(strictDir, 'invalid.ts', { fix: true });
  assert.equal(twice.output ?? output, output, 'a segunda passagem não altera o código');
});

test('prefer-find oferece apenas sugestão para filter(...)[0], sem autofix', async () => {
  const result = await lintProject(strictDir, 'invalid.ts');
  const [message] = result.messages.filter((m) => m.ruleId === '@typescript-eslint/prefer-find');
  assert.equal(message.line, 70);
  assert.equal(message.fix, undefined);
  assert.deepEqual(message.suggestions.map((s) => s.desc), [ 'Use .find(...) instead of .filter(...)[0].' ]);
});

test('autofix: regras sem correção automática continuam reportando depois da correção', async () => {
  const once = await lintProject(strictDir, 'invalid.ts', { fix: true });
  const remaining = new Set(newTypedHits(once.messages).map((m) => m.ruleId.replace('@typescript-eslint/', '')));
  assert.ok(remaining.has('no-unsafe-assignment'));
  assert.ok(remaining.has('no-misused-promises'));
  assert.ok(remaining.has('switch-exhaustiveness-check'));
});

test('interação: no-floating-promises e no-misused-promises reportam problemas distintos nas linhas esperadas', async () => {
  const result = await lintProject(strictDir, 'interactions.ts');
  const lines = (rule) => result.messages.filter((m) => m.ruleId === `@typescript-eslint/${rule}`).map((m) => m.line);
  assert.deepEqual(lines('no-floating-promises'), [ 4 ]);
  assert.deepEqual(lines('no-misused-promises'), [ 6 ]);
});

test('interação: return-await (error-handling-correctness-only) e require-await não reportam funções assíncronas corretas', async () => {
  const result = await lintProject(strictDir, 'interactions.ts');
  const awaitHits = result.messages.filter((m) => [ '@typescript-eslint/return-await', '@typescript-eslint/require-await' ].includes(m.ruleId));
  assert.deepEqual(awaitHits.map((m) => `${m.ruleId}@${m.line}`), []);
});

test('TypeScript sem strictNullChecks: o preset carrega e as regras tipadas são aplicadas', async () => {
  const eslint = new ESLint({ cwd: looseDir, overrideConfigFile: true, overrideConfig: defineConfig(typed) });
  const config = await eslint.calculateConfigForFile(path.join(looseDir, 'src', 'invalid.ts'));
  assert.equal(severityOf(config.rules, '@typescript-eslint/no-unsafe-assignment'), SEV.error);
  assert.equal(config.languageOptions.parserOptions.projectService, true);
});

test('preservação: as regras unsafe já aprovadas nos lotes anteriores mantêm a severidade', async () => {
  const rules = await effectiveRules(typed, path.join(root, 'virtual-src', 'x.ts'));
  assert.equal(severityOf(rules, '@typescript-eslint/no-floating-promises'), SEV.error);
  assert.equal(severityOf(rules, '@typescript-eslint/no-implied-eval'), SEV.error);
  assert.equal(severityOf(rules, '@typescript-eslint/only-throw-error'), SEV.error);
  assert.equal(severityOf(rules, '@typescript-eslint/prefer-promise-reject-errors'), SEV.error);
  assert.equal(severityOf(rules, '@typescript-eslint/require-await'), SEV.warn);
});
