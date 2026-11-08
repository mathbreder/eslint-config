import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';

import { ESLint } from 'eslint';

import { baseConfig, fixtureFile, messagesFor, reactConfig, root } from './helpers.mjs';

const DIALOGS = "export function f() {\n  alert('Mensagem');\n  confirm('Deseja continuar?');\n  prompt('Digite seu nome');\n}\n";

const react = new ESLint({ cwd: root, overrideConfigFile: path.join(root, 'tests/fixtures/eslint.react.config.mjs') });
const expo = new ESLint({ cwd: root, overrideConfigFile: path.join(root, 'tests/fixtures/eslint.expo.config.mjs') });
const plain = new ESLint({ cwd: root, overrideConfigFile: path.join(root, 'tests/fixtures/eslint.base.config.mjs') });

for (const file of ['case.jsx', 'case.tsx']) {
  test(`no-alert resolve como warn no preset React em ${file}`, async () => {
    const config = await react.calculateConfigForFile(fixtureFile(file));
    assert.deepEqual(config.rules['no-alert'], [1]);
  });

  test(`alert, confirm e prompt são reportados como warn em ${file}`, () => {
    const messages = messagesFor(DIALOGS, reactConfig, fixtureFile(file), ['no-alert']);
    assert.equal(messages.length, 3);
    assert.ok(messages.every((message) => message.severity === 1));
  });
}

test('no-alert não é introduzida pelo baseConfig isolado', async () => {
  const config = await plain.calculateConfigForFile(fixtureFile('case.tsx'));
  assert.equal(config.rules['no-alert'], undefined);
  assert.equal(messagesFor(DIALOGS, baseConfig, fixtureFile('case.js'), ['no-alert']).length, 0);
});

test('expoConfig mantém o comportamento independente e não recebe no-alert', async () => {
  const config = await expo.calculateConfigForFile(fixtureFile('case.tsx'));
  assert.equal(config.rules['no-alert'], undefined);
});

const HOOKS_EXPECTED = {
  'react-hooks/config': 2,
  'react-hooks/error-boundaries': 2,
  'react-hooks/gating': 2,
  'react-hooks/globals': 2,
  'react-hooks/immutability': 2,
  'react-hooks/incompatible-library': 1,
  'react-hooks/preserve-manual-memoization': 2,
  'react-hooks/purity': 2,
  'react-hooks/refs': 2,
  'react-hooks/set-state-in-effect': 2,
  'react-hooks/set-state-in-render': 2,
  'react-hooks/unsupported-syntax': 1,
  'react-hooks/use-memo': 2,
  'react-hooks/component-hook-factories': 2,
  'react-hooks/rules-of-hooks': 2,
  'react-hooks/exhaustive-deps': 1,
};

for (const file of ['case.jsx', 'case.tsx']) {
  const config = await react.calculateConfigForFile(fixtureFile(file));

  for (const [rule, severity] of Object.entries(HOOKS_EXPECTED)) {
    test(`${rule} herdada com severidade ${severity} em ${file}`, () => {
      assert.equal(config.rules[rule]?.[0], severity);
    });
  }

  test(`react-hooks/static-components segue a decisão anterior (off) em ${file}`, () => {
    assert.equal(config.rules['react-hooks/static-components'][0], 0);
  });

  const A11Y = [
    'jsx-a11y/alt-text',
    'jsx-a11y/aria-props',
    'jsx-a11y/aria-proptypes',
    'jsx-a11y/aria-unsupported-elements',
    'jsx-a11y/role-has-required-aria-props',
    'jsx-a11y/role-supports-aria-props',
  ];
  for (const rule of A11Y) {
    test(`${rule} herdada como error sem opções customizadas em ${file}`, () => {
      assert.deepEqual(config.rules[rule], [2]);
    });
  }
}

test('nenhuma regra de componente customizado de acessibilidade é fixada globalmente', async () => {
  const config = await react.calculateConfigForFile(fixtureFile('case.tsx'));
  assert.equal(config.rules['jsx-a11y/alt-text'].length, 1);
});
