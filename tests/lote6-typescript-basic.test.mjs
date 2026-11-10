import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import { ESLint, Linter } from 'eslint';

import { baseConfig, root } from './helpers.mjs';
import { defineConfig } from '../dist/eslint-configs/utils.js';

const linter = new Linter({ configType: 'flat' });
const fixtures = path.join(root, 'tests', 'fixtures', 'lote6', 'typescript-basic');
const fixturePath = (name) => path.join(fixtures, name);
const readFixture = (name) => fs.readFileSync(fixturePath(name), 'utf8');
const SEV = { off: 0, warn: 1, error: 2 };
const TS_EXTS = [ 'ts', 'tsx', 'mts', 'cts' ];
const NON_TS_EXTS = [ 'js', 'jsx', 'mjs', 'cjs' ];

const BASIC = [
  { rule: 'ban-tslint-comment', severity: 'error', options: undefined, fixable: true },
  { rule: 'consistent-generic-constructors', severity: 'warn', options: 'constructor', fixable: true },
  { rule: 'consistent-indexed-object-style', severity: 'warn', options: 'record', fixable: true },
  {
    rule: 'consistent-type-imports', severity: 'warn',
    options: { prefer: 'type-imports', fixStyle: 'inline-type-imports' }, fixable: true,
  },
  { rule: 'no-confusing-non-null-assertion', severity: 'error', options: undefined, fixable: false },
  { rule: 'no-invalid-void-type', severity: 'error', options: undefined, fixable: false },
  { rule: 'no-non-null-asserted-nullish-coalescing', severity: 'error', options: undefined, fixable: false },
  { rule: 'prefer-literal-enum-member', severity: 'warn', options: { allowBitwiseExpressions: true }, fixable: false },
  { rule: 'unified-signatures', severity: 'warn', options: undefined, fixable: false },
];

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
const fileOf = (name) => path.join(root, 'virtual-src', name);
const ruleLines = (code, file, rule) => linter.verify(code, baseConfig, file)
  .filter((m) => m.ruleId === `@typescript-eslint/${rule}`);

for (const entry of BASIC) {
  test(`${entry.rule}: existe, tem severidade ${entry.severity} e está restrita a TypeScript`, async () => {
    for (const ext of TS_EXTS) {
      const rules = await effectiveRules(baseConfig, fileOf(`x.${ext}`));
      const name = `@typescript-eslint/${entry.rule}`;
      assert.equal(severityOf(rules, name), SEV[entry.severity], `.${ext}: severidade`);
      if (entry.options !== undefined) {
        const actual = optionsOf(rules, name);
        if (typeof entry.options === 'string') assert.equal(actual, entry.options, `.${ext}: opção`);
        else assert.deepEqual(actual, entry.options, `.${ext}: opções`);
      }
    }
    for (const ext of NON_TS_EXTS) {
      const rules = await effectiveRules(baseConfig, fileOf(`x.${ext}`));
      assert.equal(severityOf(rules, `@typescript-eslint/${entry.rule}`), 'absent', `.${ext}: não aplicada`);
    }
  });
}

test('fixture inválido: cada uma das nove regras reporta exatamente o caso esperado', () => {
  const code = readFixture('invalid.ts');
  const file = fixturePath('invalid.ts');
  const messages = linter.verify(code, baseConfig, file)
    .filter((m) => BASIC.some((b) => m.ruleId === `@typescript-eslint/${b.rule}`));
  const found = messages.map((m) => `${m.ruleId.replace('@typescript-eslint/', '')}@${m.line}`);
  assert.deepEqual(found.sort(), [
    'ban-tslint-comment@1',
    'consistent-generic-constructors@8',
    'consistent-indexed-object-style@9',
    'consistent-type-imports@2',
    'no-confusing-non-null-assertion@10',
    'no-invalid-void-type@11',
    'no-non-null-asserted-nullish-coalescing@12',
    'prefer-literal-enum-member@14',
    'unified-signatures@17',
  ].sort());
});

test('fixture válido: nenhuma das nove regras reporta', () => {
  const file = fixturePath('valid.ts');
  const messages = linter.verify(readFixture('valid.ts'), baseConfig, file)
    .filter((m) => BASIC.some((b) => m.ruleId === `@typescript-eslint/${b.rule}`));
  assert.deepEqual(messages.map((m) => `${m.ruleId}@${m.line}`), []);
});

test('autofix de consistent-type-imports usa import inline com type, e converge', () => {
  const file = fixturePath('invalid.ts');
  const once = linter.verifyAndFix(readFixture('invalid.ts'), baseConfig, file).output;
  assert.ok(once.startsWith("import { type Shape } from './shapes';\n"));
  assert.equal(linter.verifyAndFix(once, baseConfig, file).output, once);
});

test('autofix de consistent-generic-constructors e consistent-indexed-object-style converge para as formas aprovadas', () => {
  const file = fixturePath('invalid.ts');
  const once = linter.verifyAndFix(readFixture('invalid.ts'), baseConfig, file).output;
  assert.ok(once.includes('export const constructed = new Map<string, number>();'));
  assert.ok(once.includes('export type Dict = Record<string, number>;'));
});

test('ban-tslint-comment: reporta o comentário tslint como erro e o autofix o remove', () => {
  const code = '// tslint:disable-next-line\nexport const value = 1;\n';
  assert.equal(ruleLines(code, fileOf('ban.ts'), 'ban-tslint-comment').length, 1);
  assert.equal(linter.verifyAndFix(code, baseConfig, fileOf('ban.ts')).output, 'export const value = 1;\n');
});

test('regras de sugestão: no-non-null-asserted-nullish-coalescing e unified-signatures oferecem sugestões', () => {
  const code = "declare const record: { value?: string };\nexport const fallback = record.value! ?? 'x';\n";
  const [message] = linter.verify(code, baseConfig, fileOf('suggest.ts')).filter((m) => m.ruleId === '@typescript-eslint/no-non-null-asserted-nullish-coalescing');
  assert.ok(message, 'reportada');
  assert.ok(message.suggestions?.length > 0, 'com sugestão');
  assert.equal(linter.verifyAndFix(code, baseConfig, fileOf('suggest.ts')).output, code, 'sem autofix');
});

test('interação: consistent-type-imports e perfectionist/sort-named-imports corrigem juntos em uma passagem', () => {
  const file = fixturePath('interactions.ts');
  const messages = linter.verify(readFixture('interactions.ts'), baseConfig, file);
  assert.ok(messages.some((m) => m.ruleId === '@typescript-eslint/consistent-type-imports'));
  assert.ok(messages.some((m) => m.ruleId === 'perfectionist/sort-named-imports'));
  const once = linter.verifyAndFix(readFixture('interactions.ts'), baseConfig, file).output;
  assert.ok(once.startsWith("import { type Alpha, type Zed } from './m';\n"));
  assert.equal(linter.verifyAndFix(once, baseConfig, file).output, once);
});

test('interação: unified-signatures e adjacent-overload-signatures se sobrepõem na mesma linha, sem conflito de autofix', () => {
  const file = fixturePath('interactions.ts');
  const messages = linter.verify(readFixture('interactions.ts'), baseConfig, file);
  const lineOf = (rule) => messages.filter((m) => m.ruleId === rule).map((m) => m.line);
  assert.deepEqual(lineOf('@typescript-eslint/adjacent-overload-signatures'), [ 7 ]);
  assert.deepEqual(lineOf('@typescript-eslint/unified-signatures'), [ 7 ]);
  const once = linter.verifyAndFix(readFixture('interactions.ts'), baseConfig, file).output;
  assert.equal(linter.verifyAndFix(once, baseConfig, file).output, once, 'estável');
});

test('interação: no-duplicate-imports continua reportando import type + import { type } do mesmo módulo, sem fusão automática', () => {
  const code = "import { type A } from './m';\nimport type { B } from './m';\nexport type P = A | B;\n";
  const messages = linter.verify(code, baseConfig, fileOf('dup.ts'));
  assert.ok(messages.some((m) => m.ruleId === 'no-duplicate-imports'));
  assert.equal(linter.verifyAndFix(code, baseConfig, fileOf('dup.ts')).output.includes("import type { B } from './m';"), true);
});

test('preservação: preferências existentes de tipos continuam ativas', async () => {
  const rules = await effectiveRules(baseConfig, fileOf('x.ts'));
  assert.equal(severityOf(rules, '@typescript-eslint/consistent-type-definitions'), SEV.error);
  assert.deepEqual(optionsOf(rules, '@typescript-eslint/consistent-type-definitions'), 'type');
  assert.equal(severityOf(rules, '@typescript-eslint/no-non-null-assertion'), SEV.warn);
  assert.equal(severityOf(rules, '@typescript-eslint/array-type'), SEV.warn);
});

test('escopo TypeScript: a regra básica não é reportada em .js, mesmo com o mesmo código', () => {
  const code = "import { type A } from './m';\nexport const v = 1;\n";
  const messages = linter.verify(code, baseConfig, fileOf('scope.js')).filter((m) => (m.ruleId ?? '').startsWith('@typescript-eslint/consistent-type-imports'));
  assert.deepEqual(messages, []);
});

test('ESLint carrega a configuração e aplica as regras em arquivos reais sem projectService', async () => {
  const eslint = new ESLint({ cwd: root, overrideConfig: defineConfig(baseConfig), overrideConfigFile: true });
  const [result] = await eslint.lintText(readFixture('invalid.ts'), { filePath: fixturePath('invalid.ts') });
  assert.equal(result.messages.filter((m) => m.fatal).length, 0);
  assert.ok(result.messages.some((m) => m.ruleId === '@typescript-eslint/consistent-type-imports'));
});
