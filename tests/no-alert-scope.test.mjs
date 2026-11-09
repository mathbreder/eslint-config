import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';

import { ESLint } from 'eslint';

import { baseConfig, fixtureFile, messagesFor, reactConfig, root, virtualFile } from './helpers.mjs';

const DIALOGS = "export function f() {\n  alert('Mensagem');\n  confirm('Continuar?');\n  prompt('Nome?');\n}\n";

const react = new ESLint({ cwd: root, overrideConfigFile: path.join(root, 'tests/fixtures/eslint.react.config.mjs') });
const expo = new ESLint({ cwd: root, overrideConfigFile: path.join(root, 'tests/fixtures/eslint.expo.config.mjs') });
const plain = new ESLint({ cwd: root, overrideConfigFile: path.join(root, 'tests/fixtures/eslint.base.config.mjs') });

for (const name of ['exemplo.js', 'componente.jsx', 'servico.ts', 'pagina.tsx']) {
  test(`no-alert é warn no preset React para ${name}`, async () => {
    const config = await react.calculateConfigForFile(virtualFile(name));
    assert.deepEqual(config.rules['no-alert'], [1]);
  });

  test(`alert, confirm e prompt são reportados em ${name}`, () => {
    const messages = messagesFor(DIALOGS, reactConfig, virtualFile(name), ['no-alert']);
    assert.equal(messages.length, 3);
    assert.ok(messages.every((message) => message.severity === 1));
  });
}

for (const name of ['exemplo.mjs', 'exemplo.cjs']) {
  test(`no-alert não se aplica a ${name} no preset React`, async () => {
    const config = await react.calculateConfigForFile(virtualFile(name));
    assert.equal(config.rules['no-alert'], undefined);
  });
}

test('baseConfig isolado não habilita no-alert em nenhum tipo de arquivo', async () => {
  for (const name of ['exemplo.js', 'componente.jsx', 'servico.ts', 'pagina.tsx']) {
    const config = await plain.calculateConfigForFile(virtualFile(name));
    assert.equal(config.rules['no-alert'], undefined, name);
  }
  assert.equal(messagesFor(DIALOGS, baseConfig, virtualFile('exemplo.js'), ['no-alert']).length, 0);
});

test('expoConfig não recebe no-alert automaticamente', async () => {
  const config = await expo.calculateConfigForFile(virtualFile('pagina.tsx'));
  assert.equal(config.rules['no-alert'], undefined);
});

test('o bloco de no-alert não repete regras JSX do bloco react-jsx', async () => {
  const config = await react.calculateConfigForFile(fixtureFile('case.tsx'));
  assert.equal(config.rules['react/jsx-indent'][0], 2);
  assert.equal(config.rules['no-alert'][0], 1);
});
