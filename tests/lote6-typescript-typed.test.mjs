import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';

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

const converge = async (dir, file, config = typed) => {
  const filePath = path.join(dir, 'src', file);
  const original = fs.readFileSync(filePath, 'utf8');
  const warnings = [];
  const onWarning = (warning) => warnings.push(warning.name);
  process.on('warning', onWarning);
  try {
    const eslint = new ESLint({ cwd: dir, fix: true, overrideConfigFile: true, overrideConfig: defineConfig(config) });
    const [first] = await eslint.lintText(original, { filePath });
    const firstOutput = first.output ?? original;
    const [second] = await eslint.lintText(firstOutput, { filePath });
    const secondOutput = second.output ?? firstOutput;
    await new Promise((resolve) => setImmediate(resolve));
    return {
      original,
      firstOutput,
      secondOutput,
      firstChanged: firstOutput !== original,
      converged: secondOutput === firstOutput,
      remaining: second.messages,
      circularWarnings: warnings.filter((name) => name === 'ESLintCircularFixesWarning').length,
    };
  } finally {
    process.off('warning', onWarning);
  }
};

test('convergência: a segunda passagem recebe a saída da primeira e não altera o código corrigido', async () => {
  const run = await converge(strictDir, 'invalid.ts');
  assert.notEqual(run.firstOutput, run.original, 'a primeira passagem deve modificar o código');
  assert.equal(run.secondOutput, run.firstOutput, 'a segunda passagem deve produzir a mesma saída');
  assert.equal(run.converged, true);
  assert.equal(run.circularWarnings, 0, 'sem ESLintCircularFixesWarning');
  assert.notEqual(run.firstOutput, run.original, 'a comparação não usa o original nas duas execuções');
});

test('convergência: os diagnósticos restantes correspondem a regras sem autofix', async () => {
  const run = await converge(strictDir, 'invalid.ts');
  const fixable = run.remaining.filter((m) => m.fix).map((m) => m.ruleId);
  assert.deepEqual(fixable, [], 'nenhum diagnóstico restante deve ter autofix');
  const suggestionsApplied = run.secondOutput.includes('pick(\'a\')') && !run.secondOutput.includes('pick<string>');
  assert.ok(suggestionsApplied, 'correções aplicadas');
  assert.ok(run.remaining.some((m) => m.ruleId === '@typescript-eslint/prefer-find'), 'sugestões não são aplicadas');
});

test('convergência: o mecanismo detecta uma saída que ainda pode ser modificada por outra passagem', async () => {
  const growing = {
    files: [ '**/*.ts' ],
    languageOptions: { parser: tseslint.parser },
    plugins: {
      control: {
        rules: {
          grow: {
            meta: { fixable: 'code' },
            create(context) {
              return {
                Program(node) {
                  if (context.sourceCode.text.length > 0) {
                    context.report({
                      node,
                      message: 'sempre pode acrescentar',
                      fix: (fixer) => fixer.insertTextAfterRange([ 0, context.sourceCode.text.length ], '/*x*/'),
                    });
                  }
                },
              };
            },
          },
        },
      },
    },
    rules: { 'control/grow': 'error' },
  };
  const run = await converge(strictDir, 'invalid.ts', [ growing ]);
  assert.equal(run.firstChanged, true, 'a regra de controle modifica a primeira passagem');
  assert.equal(run.converged, false, 'a verificação de convergência deve reprovar uma saída que ainda muda');
});

test('autofix do projeto estrito: correções seguras aplicadas e a segunda passagem não altera o código', async () => {
  const run = await converge(strictDir, 'invalid.ts');
  const output = run.secondOutput;
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

const normalize = (id) => id.replace('@typescript-eslint/', '');
const pairKey = (a, b) => [ a, b ].map(normalize).sort().join('|');
const RAW_LEGITIMATE_OVERLAPS = [
  [ 'no-explicit-any|no-redundant-type-constituents','o any em uma união é o proibido (no-explicit-any) e também o que torna os outros tipos redundantes' ],
  [ 'no-base-to-string|restrict-plus-operands', 'um objeto concatenado com string: uma regra pede toString, a outra reprova o operando' ],
  [ 'prefer-template|restrict-plus-operands', 'concatenação com operando inválido: prefer-template sugere template, restrict-plus-operands reprova o operando' ],
  [ 'no-base-to-string|prefer-template', 'concatenação de objeto: prefer-template oferece correção, no-base-to-string reprova a conversão implícita' ],
  [ 'no-base-to-string|restrict-template-expressions', 'expressão de template com objeto: as duas regras reprovam a mesma expressão por motivos diferentes' ],
  [ 'no-unnecessary-type-parameters|no-unused-vars', 'parâmetro de tipo usado uma vez (regra tipada) e variável de tipo sem uso (regra base)' ],
  [ 'no-confusing-void-expression|@stylistic/array-bracket-spacing','expressão void dentro de outra expressão, e espaçamento de colchete (regra de formatação)' ],
  [ 'no-confusing-non-null-assertion|no-non-null-assertion', 'asserção não nula em comparação (tipada) e a proibição geral de asserção não nula' ],
  [ 'no-non-null-assertion|no-non-null-asserted-nullish-coalescing', 'asserção não nula no operando de ??: a proibição geral e a regra específica para ??' ],
  [ 'no-floating-promises|no-unused-expressions', 'promessa solta: no-unused-expressions reprova a instrução, no-floating-promises reprova a promessa' ],
  [ 'adjacent-overload-signatures|unified-signatures', 'overload não adjacente (regra base) e overload que poderia ser unificado (regra tipada): condições distintas' ],
];
const LEGITIMATE_OVERLAPS = new Map(RAW_LEGITIMATE_OVERLAPS.map(([ key, reason ]) => [ key.split('|').sort().join('|'), reason ]));

const samePointPairs = (messages) => {
  const found = [];
  const rules = messages.filter((m) => m.ruleId);
  for (let i = 0; i < rules.length; i++) {
    for (let j = i + 1; j < rules.length; j++) {
      const a = rules[i];
      const b = rules[j];
      if (a.ruleId === b.ruleId || a.line !== b.line || a.column !== b.column) continue;
      found.push({
        key: [ normalize(a.ruleId), normalize(b.ruleId) ].sort().join('|'),
        line: a.line,
        fixA: Boolean(a.fix),
        fixB: Boolean(b.fix),
        sameMessage: a.message === b.message,
      });
    }
  }
  return found;
};

const containmentPairs = (messages) => {
  const found = [];
  const rules = messages.filter((m) => m.ruleId && m.endLine === m.line);
  const contains = (outer, inner) => outer.column <= inner.column && inner.endColumn <= outer.endColumn;
  for (let i = 0; i < rules.length; i++) {
    for (let j = i + 1; j < rules.length; j++) {
      const a = rules[i];
      const b = rules[j];
      if (a.ruleId === b.ruleId || a.line !== b.line || b.endLine !== b.line) continue;
      if (!contains(a, b) && !contains(b, a)) continue;
      found.push({ key: pairKey(a.ruleId, b.ruleId), line: a.line, fixA: Boolean(a.fix), fixB: Boolean(b.fix) });
    }
  }
  return found;
};

const sameRuleDuplicates = (messages) => {
  const keys = messages.filter((m) => m.ruleId).map((m) => `${m.ruleId}|${m.line}|${m.column}|${m.endLine}|${m.endColumn}|${m.message}`);
  return keys.filter((key, index) => keys.indexOf(key) !== index);
};

test('auditoria: nenhuma regra repete um diagnóstico idêntico (mesma regra, mesma posição, mesma mensagem)', async () => {
  for (const file of [ 'invalid.ts', 'interactions.ts' ]) {
    const result = await lintProject(strictDir, file);
    assert.deepEqual(sameRuleDuplicates(result.messages), [], file);
  }
});

test('auditoria: cada par de regras diferentes no mesmo ponto é legítimo, documentado e sem conflito de autofix', async () => {
  const pairs = [
    ...samePointPairs((await lintProject(strictDir, 'invalid.ts')).messages),
    ...samePointPairs((await lintProject(strictDir, 'interactions.ts')).messages),
  ];
  const unclassified = pairs.filter((pair) => !LEGITIMATE_OVERLAPS.has(pair.key)).map((pair) => `${pair.key}@${pair.line}`);
  assert.deepEqual(unclassified, [], 'par não documentado');
  const conflicts = pairs.filter((pair) => pair.fixA && pair.fixB).map((pair) => `${pair.key}@${pair.line}`);
  assert.deepEqual(conflicts, [], 'dois autofixes no mesmo ponto podem conflitar');
});

test('auditoria: cada sobreposição documentada aparece no fixture, para que a lista não fique desatualizada', async () => {
  const strict = samePointPairs((await lintProject(strictDir, 'invalid.ts')).messages).map((pair) => pair.key);
  const interactions = samePointPairs((await lintProject(strictDir, 'interactions.ts')).messages).map((pair) => pair.key);
  const basicFile = path.join(root, 'tests', 'fixtures', 'lote6', 'typescript-basic', 'interactions.ts');
  const linter = new (await import('eslint')).Linter({ configType: 'flat' });
  const basicMessages = linter.verify(fs.readFileSync(basicFile, 'utf8'), baseConfig, basicFile);
  const basic = [ ...samePointPairs(basicMessages), ...containmentPairs(basicMessages) ].map((pair) => pair.key);
  const observed = new Set([ ...strict, ...interactions, ...basic ]);
  const stale = [ ...LEGITIMATE_OVERLAPS.keys() ].filter((key) => !observed.has(key));
  assert.deepEqual(stale, [], 'sobreposição documentada que não ocorre mais');
});

test('auditoria: as regras de promessas e unsafe não se sobrepõem a outras regras no mesmo ponto, exceto nos pares documentados', async () => {
  const focus = new Set([ 'no-floating-promises', 'no-misused-promises', 'require-await', 'return-await', 'no-unnecessary-type-assertion', 'no-unsafe-assignment', 'no-unsafe-return', 'restrict-plus-operands', 'restrict-template-expressions' ]);
  const pairs = samePointPairs((await lintProject(strictDir, 'invalid.ts')).messages);
  const involved = pairs.filter((pair) => pair.key.split('|').some((name) => focus.has(name)));
  for (const pair of involved) assert.ok(LEGITIMATE_OVERLAPS.has(pair.key), pair.key);
  assert.ok(involved.length > 0, 'a verificação deve encontrar sobreposições reais nesse grupo');
});

test('auditoria: sobreposição conhecida de overloads é reconhecida como legítima, sem autofix', async () => {
  const basicFile = path.join(root, 'tests', 'fixtures', 'lote6', 'typescript-basic', 'interactions.ts');
  const linter = new (await import('eslint')).Linter({ configType: 'flat' });
  const pairs = containmentPairs(linter.verify(fs.readFileSync(basicFile, 'utf8'), baseConfig, basicFile));
  const overload = pairs.find((pair) => pair.key === 'adjacent-overload-signatures|unified-signatures');
  assert.ok(overload, 'sobreposição observada: unified-signatures contido no intervalo de adjacent-overload-signatures, na mesma linha');
  assert.equal(overload.line, 7);
  assert.equal(overload.fixA || overload.fixB, false, 'nenhuma das duas oferece autofix');
  assert.ok(LEGITIMATE_OVERLAPS.has(overload.key));
});

const typedCounts = async (config) => {
  const result = await lintProject(strictDir, 'invalid.ts', { config });
  const counts = new Map();
  for (const m of result.messages) {
    if (m.ruleId?.startsWith('@typescript-eslint/')) counts.set(normalize(m.ruleId), (counts.get(normalize(m.ruleId)) ?? 0) + 1);
  }
  return counts;
};
const coverageFailures = (counts) => TYPED_NAMES.filter((name) => (counts.get(name) ?? 0) === 0);
let enabledTypedCounts;
for (const [ name ] of TYPED) {
  test(`mutação ${name}: a asserção de cobertura da suíte falha, e só para essa regra, quando a regra é desligada`, async () => {
    enabledTypedCounts ??= await typedCounts(typed);
    assert.deepEqual(coverageFailures(enabledTypedCounts), [], 'com a configuração real, todas as quarenta regras disparam');
    const mutated = await typedCounts([ ...typed, { rules: { [`@typescript-eslint/${name}`]: 'off' } } ]);
    assert.deepEqual(coverageFailures(mutated), [ name ], 'a suíte deve detectar a ausência exatamente dessa regra');
  });
}
