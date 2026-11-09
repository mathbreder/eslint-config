import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fixtureFile, messagesFor, reactConfig } from './helpers.mjs';

const RULE = 'react/display-name';
const file = fixtureFile('case.tsx');
const lintDisplayName = (code) => messagesFor(code, reactConfig, file, [RULE]);

test('componente nomeado por const não gera aviso', () => {
  assert.equal(lintDisplayName('const Foo = () => <div />;\nexport default Foo;\n').length, 0);
});

test('componente de função nomeada não gera aviso', () => {
  assert.equal(lintDisplayName('export default function Page() {\n  return <div />;\n}\n').length, 0);
});

test('exportação default anônima gera aviso de displayName', () => {
  const messages = lintDisplayName('export default () => <div />;\n');
  assert.equal(messages.length, 1);
  assert.equal(messages[0].severity, 1);
});

test('exportação default anônima em arrow não gera erro de function-component-definition', () => {
  const messages = messagesFor('export default () => <div />;\n', reactConfig, file, ['react/function-component-definition']);
  assert.equal(messages.length, 0);
});

test('memo com componente anônimo gera aviso', () => {
  const code = "import { memo } from 'react';\nexport const M = memo(() => <div />);\n";
  assert.equal(lintDisplayName(code).length, 1);
});

test('memo com função nomeada não gera aviso', () => {
  const code = "import { memo } from 'react';\nexport const M = memo(function Named() {\n  return <div />;\n});\n";
  assert.equal(lintDisplayName(code).length, 0);
});

test('forwardRef com função interna nomeada não gera aviso', () => {
  const code = "import { forwardRef } from 'react';\nexport const I = forwardRef(function Input(props, ref) {\n  return <input ref={ref} {...props} />;\n});\n";
  assert.equal(lintDisplayName(code).length, 0);
});

test('forwardRef com arrow interna gera aviso mesmo com variável nomeada', () => {
  const code = "import { forwardRef } from 'react';\nconst Input = forwardRef((props, ref) => <input ref={ref} {...props} />);\nexport default Input;\n";
  assert.equal(lintDisplayName(code).length, 1);
});

test('atribuição explícita de displayName é aceita', () => {
  const code = 'const C = () => <div />;\nC.displayName = \'Custom\';\nexport default C;\n';
  assert.equal(lintDisplayName(code).length, 0);
});

test('createContext não exige displayName', () => {
  const code = "import { createContext } from 'react';\nexport const Ctx = createContext(null);\n";
  assert.equal(lintDisplayName(code).length, 0);
});

test('a restrição antiga de no-restricted-syntax sobre displayName não existe mais', () => {
  const code = 'const C = () => <div />;\nC.displayName = \'Custom\';\nexport default C;\n';
  const messages = messagesFor(code, reactConfig, file, ['no-restricted-syntax']);
  assert.equal(messages.length, 0);
});
