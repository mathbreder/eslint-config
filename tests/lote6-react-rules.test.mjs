import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import { ESLint, Linter } from 'eslint';

import { baseConfig, reactConfig, root } from './helpers.mjs';
import { eslintConfigs } from '../dist/index.js';
import { expoConfig } from '../dist/eslint-configs/expo.js';
import { nextConfig } from '../dist/eslint-configs/next.js';
import { defineConfig } from '../dist/eslint-configs/utils.js';

const RULE = 'react/no-unsafe';
const linter = new Linter({ configType: 'flat' });
const fixtures = path.join(root, 'tests', 'fixtures', 'lote6', 'react');
const readFixture = (name) => fs.readFileSync(path.join(fixtures, name), 'utf8');
const SEV = { off: 0, warn: 1, error: 2 };

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
const noUnsafe = (config, code, file) => linter.verify(code, config, file).filter((m) => m.ruleId === RULE);

const COMPOSITIONS = {
  'React isolado': eslintConfigs.reactNextConfig,
  'Base + React': reactConfig,
  'Base + React + Next': [ ...reactConfig, ...nextConfig ],
  'Base + React + Expo': [ ...reactConfig, ...expoConfig ],
};

const NOT_ACTIVE = (severity) => severity === SEV.off || severity === 'absent';

test('react/no-unsafe: severidade warn e checkAliases true nos arquivos JSX/TSX do React isolado, Base + React e Next', async () => {
  for (const [ name, config ] of Object.entries(COMPOSITIONS)) {
    if (name === 'Base + React + Expo') continue;
    for (const ext of [ 'jsx', 'tsx' ]) {
      const rules = await effectiveRules(config, path.join(root, 'virtual-src', `x.${ext}`));
      assert.equal(severityOf(rules, RULE), SEV.warn, `${name} .${ext}: severidade`);
      assert.deepEqual(optionsOf(rules, RULE), { checkAliases: true }, `${name} .${ext}: opções`);
    }
  }
});

test('react/no-unsafe em Base + React + Expo: o bloco do expoConfig define a regra como off depois do preset React', async () => {
  for (const ext of [ 'jsx', 'tsx' ]) {
    const rules = await effectiveRules(COMPOSITIONS['Base + React + Expo'], path.join(root, 'virtual-src', `x.${ext}`));
    assert.equal(severityOf(rules, RULE), SEV.off, `.${ext}`);
  }
});

test('react/no-unsafe: não é ativada fora do preset React (baseConfig, Expo isolado, Base + Expo e Base + Type Checked)', async () => {
  const outside = {
    'baseConfig': baseConfig,
    'Expo isolado': expoConfig,
    'Base + Expo': [ ...baseConfig, ...expoConfig ],
    'Base + Type Checked': [ ...baseConfig, ...eslintConfigs.typeCheckedConfig ],
  };
  for (const [ name, config ] of Object.entries(outside)) {
    for (const ext of [ 'jsx', 'tsx', 'js', 'ts' ]) {
      const rules = await effectiveRules(config, path.join(root, 'virtual-src', `x.${ext}`));
      assert.ok(NOT_ACTIVE(severityOf(rules, RULE)), `${name} .${ext}: não ativa`);
    }
  }
});

test('react/no-unsafe: em .js, .mjs, .cjs e .ts o preset React não a ativa, porque ela é restrita a JSX e TSX', async () => {
  for (const ext of [ 'js', 'mjs', 'cjs', 'ts' ]) {
    const rules = await effectiveRules(reactConfig, path.join(root, 'virtual-src', `x.${ext}`));
    assert.ok(NOT_ACTIVE(severityOf(rules, RULE)), `.${ext}`);
  }
});

test('react/no-unsafe: métodos inseguros e aliases UNSAFE_ são reportados como aviso no JSX', () => {
  const file = path.join(fixtures, 'invalid.jsx');
  const messages = noUnsafe(reactConfig, readFixture('invalid.jsx'), file);
  assert.deepEqual(messages.map((m) => `${m.line}:${m.severity}`), [ '4:1', '6:1' ]);
  assert.ok(messages[0].message.includes('UNSAFE_componentWillMount'));
  assert.ok(messages[1].message.includes('componentWillReceiveProps'));
});

test('react/no-unsafe: componentes de classe válidos e componentes funcionais não são reportados', () => {
  const messages = noUnsafe(reactConfig, readFixture('valid.jsx'), path.join(fixtures, 'valid.jsx'));
  assert.deepEqual(messages, []);
});

test('react/no-unsafe: o mesmo código inválido em .tsx é reportado da mesma forma', () => {
  const messages = noUnsafe(reactConfig, readFixture('invalid.jsx'), path.join(root, 'virtual-src', 'x.tsx'));
  assert.deepEqual(messages.map((m) => m.line), [ 4, 6 ]);
});

test('react/no-unsafe: com checkAliases false só o método UNSAFE_ é reportado; com true o nome legado sem prefixo também é', () => {
  const withoutAliases = [ ...reactConfig, { rules: { [RULE]: [ 'warn', { checkAliases: false } ] } } ];
  const off = noUnsafe(withoutAliases, readFixture('invalid.jsx'), path.join(fixtures, 'invalid.jsx'));
  assert.deepEqual(off.map((m) => m.line), [ 4 ]);
  assert.ok(off[0].message.includes('UNSAFE_componentWillMount'));
  const on = noUnsafe(reactConfig, readFixture('invalid.jsx'), path.join(fixtures, 'invalid.jsx'));
  assert.deepEqual(on.map((m) => m.line), [ 4, 6 ]);
  assert.ok(on[1].message.includes('componentWillReceiveProps'));
});

test('react/no-unsafe: não é confundida com as regras react/no-unsafe-* nem com as regras TypeScript no-unsafe-*', async () => {
  const rules = await effectiveRules(reactConfig, path.join(root, 'virtual-src', 'x.tsx'));
  assert.equal(severityOf(rules, 'react/no-unsafe-call'), 'absent');
  assert.equal(severityOf(rules, RULE), SEV.warn);
  assert.equal(severityOf(rules, '@typescript-eslint/no-unsafe-call'), 'absent', 'sem typeCheckedConfig');
});

test('preservação: as correções JSX dos lotes anteriores continuam ativas', async () => {
  const rules = await effectiveRules(reactConfig, path.join(root, 'virtual-src', 'x.tsx'));
  assert.equal(severityOf(rules, 'react/jsx-no-undef'), SEV.error);
  assert.equal(severityOf(rules, '@stylistic/jsx-closing-bracket-location'), 'absent');
  assert.equal(severityOf(rules, '@stylistic/jsx-tag-spacing'), SEV.error);
});

test('ESLint carrega react/no-unsafe a partir da configuração completa com o fixture', async () => {
  const eslint = new ESLint({ cwd: root, overrideConfig: defineConfig(reactConfig), overrideConfigFile: true });
  const [result] = await eslint.lintText(readFixture('invalid.jsx'), { filePath: path.join(fixtures, 'invalid.jsx') });
  assert.equal(result.messages.filter((m) => m.fatal).length, 0);
  assert.equal(result.messages.filter((m) => m.ruleId === RULE).length, 2);
});

test('mutação react/no-unsafe: a asserção de cobertura do fixture (linhas 4 e 6) falha quando a regra é desligada', () => {
  const code = readFixture('invalid.jsx');
  const file = path.join(fixtures, 'invalid.jsx');
  const lines = (config) => noUnsafe(config, code, file).map((m) => m.line);
  assert.deepEqual(lines(reactConfig), [ 4, 6 ], 'com a configuração real, as duas linhas são reportadas');
  const off = [ ...reactConfig, { rules: { [RULE]: 'off' } } ];
  assert.deepEqual(lines(off), [], 'a suíte deve detectar a ausência da regra');
});
