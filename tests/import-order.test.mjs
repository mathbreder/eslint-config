import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getEslintImportConfig } from '../dist/index.js';
import { fixtureFile, fixtureTsconfig, importConfig, messagesFor } from './helpers.mjs';

const ORDER = 'import/order';
const UNRESOLVED = 'import/no-unresolved';
const file = fixtureFile('case.ts');
const pathGroups = [{ pattern: '@app/**', group: 'internal' }];
const ghostGroups = [{ pattern: '@ghost/**', group: 'internal' }];
const orderMessages = (code, opts) => messagesFor(code, importConfig(opts), file, [ORDER]);
const unresolvedFor = (code, module, opts) =>
  messagesFor(code, importConfig(opts), file, [UNRESOLVED]).filter((message) => message.message.includes(`'${module}'`));

test('react fica antes dos demais imports externos e dos aliases internos', () => {
  const code = "import React from 'react';\n\nimport { a } from '@app/a';\n\nexport const x = [React, a];\n";
  assert.equal(orderMessages(code, { pathGroups }).length, 0);
});

test('alias interno posicionado antes de react gera erro de ordem', () => {
  const code = "import { a } from '@app/a';\nimport React from 'react';\n\nexport const x = [React, a];\n";
  assert.ok(orderMessages(code, { pathGroups }).length >= 1);
});

test('alias não resolvido no grupo internal é separado de react por linha em branco', () => {
  const code = "import React from 'react';\nimport { g } from '@ghost/x';\n\nexport const x = [React, g];\n";
  const messages = orderMessages(code, { pathGroups: ghostGroups, noUnresolvedIgnore: ['^@ghost/'] });
  assert.equal(messages.length, 1);
  assert.match(messages[0].message, /at least one empty line between import groups/);
});

test('alias não resolvido no grupo internal aceita a separação correta', () => {
  const code = "import React from 'react';\n\nimport { g } from '@ghost/x';\n\nexport const x = [React, g];\n";
  const messages = orderMessages(code, { pathGroups: ghostGroups, noUnresolvedIgnore: ['^@ghost/'] });
  assert.equal(messages.length, 0);
});

test('imports externos são ordenados alfabeticamente', () => {
  const messages = orderMessages("import z from 'zod';\nimport a from 'axios';\n\nexport const x = [z, a];\n", {});
  assert.equal(messages.length, 1);
  assert.match(messages[0].message, /`axios` import should occur before import of `zod`/);
});

test('alias declarado no tsconfig é resolvido', () => {
  assert.equal(unresolvedFor("import { a } from '@app/a';\n\nexport const x = a;\n", '@app/a').length, 0);
});

test('alias inexistente continua reportado como não resolvido', () => {
  const code = "import { m } from '@app/missing';\n\nexport const x = m;\n";
  assert.equal(unresolvedFor(code, '@app/missing').length, 1);
});

test('noUnresolvedIgnore não silencia aliases fora do padrão informado', () => {
  const code = "import { m } from '@app/missing';\nimport v from 'virtual:x';\n\nexport const x = [m, v];\n";
  const opts = { noUnresolvedIgnore: ['^virtual:'] };
  assert.equal(unresolvedFor(code, 'virtual:x', opts).length, 0);
  assert.equal(unresolvedFor(code, '@app/missing', opts).length, 1);
});

test('sem noUnresolvedIgnore, módulo virtual é reportado como não resolvido', () => {
  const code = "import v from 'virtual:x';\n\nexport const x = v;\n";
  assert.equal(unresolvedFor(code, 'virtual:x', {}).length, 1);
});

test('project aceita um array de tsconfigs', () => {
  const code = "import { a } from '@app/a';\n\nexport const x = a;\n";
  assert.equal(unresolvedFor(code, '@app/a', { project: [fixtureTsconfig] }).length, 0);
});

test('sem project, o resolver usa o tsconfig.json do diretório de execução', () => {
  const [config] = getEslintImportConfig();
  assert.deepEqual(config.settings['import/resolver'].typescript, {});
});

test('com project, o resolver recebe o caminho informado', () => {
  const [config] = getEslintImportConfig({ project: fixtureTsconfig });
  assert.equal(config.settings['import/resolver'].typescript.project, fixtureTsconfig);
});
