import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { test } from 'node:test';

import { ESLint, Linter } from 'eslint';

import { eslintConfigs, getEslintImportConfig } from '../dist/index.js';
import { baseConfig, fixtureFile, root } from './helpers.mjs';

const ERROR_RULES = [
  'inline-script-id',
  'no-assign-module-variable',
  'no-document-import-in-page',
  'no-duplicate-head',
  'no-head-import-in-document',
  'no-html-link-for-pages',
  'no-script-component-in-head',
];
const WARN_RULES = [
  'google-font-display',
  'google-font-preconnect',
  'next-script-for-ga',
  'no-async-client-component',
  'no-before-interactive-script-outside-document',
  'no-css-tags',
  'no-head-element',
  'no-img-element',
  'no-location-assign-relative-destination',
  'no-page-custom-font',
  'no-styled-jsx-in-document',
  'no-sync-scripts',
  'no-title-in-document-head',
  'no-typos',
  'no-unwanted-polyfillio',
];
const ALL_RULES = [...ERROR_RULES, ...WARN_RULES];

const cfg = (file) => path.join(root, 'tests/fixtures', file);
const eslintWith = (overrideConfigFile) => new ESLint({ cwd: path.join(root, 'tests/fixtures/next-app'), overrideConfigFile });
const next = eslintWith(cfg('eslint.next.config.mjs'));
const react = eslintWith(cfg('eslint.react.config.mjs'));
const expo = eslintWith(cfg('eslint.expo.config.mjs'));
const base = eslintWith(cfg('eslint.base.config.mjs'));
const appFile = (name) => path.join(root, 'tests/fixtures/next-app', name);

const effective = await next.calculateConfigForFile(appFile('pages/index.tsx'));

test('o preset Next declara 22 regras, 7 em error e 15 em warn (inclui no-location-assign-relative-destination herdada na 16.4.5)', () => {
  assert.equal(ALL_RULES.length, 22);
  assert.equal(ERROR_RULES.length, 7);
  assert.equal(WARN_RULES.length, 15);
  const configured = ALL_RULES.map((rule) => `@next/next/${rule}`).map((rule) => effective.rules[rule]?.[0]);
  assert.ok(configured.every((severity) => severity === 1 || severity === 2), 'todas as 22 regras precisam estar ativas');
  assert.equal(configured.filter((severity) => severity === 2).length, 7);
  assert.equal(configured.filter((severity) => severity === 1).length, 15);
});

for (const rule of ERROR_RULES) {
  test(`@next/next/${rule} é error`, () => {
    assert.equal(effective.rules[`@next/next/${rule}`][0], 2);
  });
}

for (const rule of WARN_RULES) {
  test(`@next/next/${rule} é warn`, () => {
    assert.equal(effective.rules[`@next/next/${rule}`][0], 1);
  });
}

test('no-html-link-for-pages usa o override error, não o warn do recommended', () => {
  assert.deepEqual(effective.rules['@next/next/no-html-link-for-pages'], [2]);
});

test('no-sync-scripts permanece warn, sem a elevação do core-web-vitals', () => {
  assert.deepEqual(effective.rules['@next/next/no-sync-scripts'], [1]);
});

test('o plugin @next/next fica registrado uma vez no config efetivo', () => {
  assert.ok(effective.plugins['@next/next']);
});

test('baseConfig isolado não ativa regras Next', async () => {
  const config = await base.calculateConfigForFile(appFile('pages/index.tsx'));
  for (const rule of ALL_RULES) assert.equal(config.rules[`@next/next/${rule}`], undefined, rule);
});

test('reactNextConfig isolado não ativa regras Next', async () => {
  const config = await react.calculateConfigForFile(appFile('pages/index.tsx'));
  for (const rule of ALL_RULES) assert.equal(config.rules[`@next/next/${rule}`], undefined, rule);
});

test('expoConfig não recebe regras Next', async () => {
  const config = await expo.calculateConfigForFile(appFile('pages/index.tsx'));
  for (const rule of ALL_RULES) assert.equal(config.rules[`@next/next/${rule}`], undefined, rule);
});

const messagesOf = async (file) => {
  const [result] = await next.lintFiles([appFile(file)]);
  return result.messages.filter((m) => m.ruleId?.startsWith('@next/next/'));
};

test('no-html-link-for-pages reporta <a> para uma página interna, em error', async () => {
  const messages = await messagesOf('pages/index.tsx');
  const link = messages.find((m) => m.ruleId === '@next/next/no-html-link-for-pages');
  assert.ok(link);
  assert.equal(link.severity, 2);
});

test('no-html-link-for-pages também é reportado em componentes', async () => {
  const messages = await messagesOf('components/Nav.tsx');
  assert.ok(messages.some((m) => m.ruleId === '@next/next/no-html-link-for-pages'));
});

test('no-img-element reporta <img> como warn', async () => {
  const img = (await messagesOf('pages/index.tsx')).find((m) => m.ruleId === '@next/next/no-img-element');
  assert.ok(img);
  assert.equal(img.severity, 1);
});

test('inline-script-id reporta Script com conteúdo inline sem id', async () => {
  const script = (await messagesOf('pages/index.tsx')).find((m) => m.ruleId === '@next/next/inline-script-id');
  assert.ok(script);
  assert.equal(script.severity, 2);
});

test('no-assign-module-variable reporta declaração de module', async () => {
  const messages = await messagesOf('lib/legacy.js');
  assert.ok(messages.some((m) => m.ruleId === '@next/next/no-assign-module-variable'));
});

test('no-sync-scripts reporta <script src> em _document, como warn', async () => {
  const sync = (await messagesOf('pages/_document.tsx')).find((m) => m.ruleId === '@next/next/no-sync-scripts');
  assert.ok(sync);
  assert.equal(sync.severity, 1);
});

test('no-head-import-in-document reporta next/head em _document', async () => {
  assert.ok((await messagesOf('pages/_document.tsx')).some((m) => m.ruleId === '@next/next/no-head-import-in-document'));
});

test('no-document-import-in-page reporta next/document em página comum', async () => {
  assert.ok((await messagesOf('pages/doc-import.tsx')).some((m) => m.ruleId === '@next/next/no-document-import-in-page'));
});

test('no-duplicate-head reporta mais de um Head em _document', async () => {
  assert.ok((await messagesOf('pages/_document.tsx')).some((m) => m.ruleId === '@next/next/no-duplicate-head'));
});

test('no-duplicate-head não é aplicada a páginas comuns', async () => {
  assert.equal((await messagesOf('pages/dup-head.tsx')).filter((m) => m.ruleId === '@next/next/no-duplicate-head').length, 0);
});

test('no-script-component-in-head reporta Script dentro de Head', async () => {
  assert.ok((await messagesOf('pages/script-in-head.tsx')).some((m) => m.ruleId === '@next/next/no-script-component-in-head'));
});

test('página sem problemas não gera regras Next', async () => {
  assert.equal((await messagesOf('pages/about.tsx')).length, 0);
});

test('settings.next.rootDir define onde o plugin procura as páginas, relativo ao diretório de execução (monorepo)', async () => {
  const monorepo = path.join(root, 'tests/fixtures/next-monorepo');
  const previous = process.cwd();
  process.chdir(monorepo);
  try {
    const withRootDir = new ESLint({ cwd: monorepo, overrideConfigFile: cfg('eslint.next-monorepo.config.mjs') });
    const withoutRootDir = new ESLint({ cwd: monorepo, overrideConfigFile: cfg('eslint.next.config.mjs') });
    const file = path.join(monorepo, 'apps/web/pages/index.tsx');
    const [a] = await withRootDir.lintFiles([file]);
    const [b] = await withoutRootDir.lintFiles([file]);
    assert.ok(a.messages.some((m) => m.ruleId === '@next/next/no-html-link-for-pages'), 'com rootDir deve reportar');
    assert.equal(b.messages.filter((m) => m.ruleId === '@next/next/no-html-link-for-pages').length, 0, 'sem rootDir não reporta');
  } finally {
    process.chdir(previous);
  }
});

test('composição baseConfig + reactNextConfig + nextConfig não tem conflito de plugin', async () => {
  const { nextConfig } = await import('@mathbreder/eslint-config/next');
  assert.ok(nextConfig.length > 0);
  assert.doesNotThrow(() => eslintConfigs.defineConfig([
    ...eslintConfigs.baseConfig,
    ...eslintConfigs.reactNextConfig,
    ...nextConfig,
  ]));
});

test('composição com importConfig mantém as regras React de hooks', () => {
  const composed = eslintConfigs.defineConfig([
    ...eslintConfigs.baseConfig,
    ...eslintConfigs.reactNextConfig,
    ...getEslintImportConfig(),
  ]);
  const linter = new Linter({ configType: 'flat' });
  const messages = linter.verify(
    'export function App({ ativo }) {\n  if (ativo) {\n    useState(0);\n  }\n  return null;\n}\n',
    composed,
    fixtureFile('case.tsx'),
  );
  assert.ok(messages.some((m) => m.ruleId === 'react-hooks/rules-of-hooks'));
});

test('o entrypoint principal não referencia o plugin do Next', () => {
  for (const file of ['dist/index.js', 'dist/index.cjs', 'dist/eslint-configs/index.js', 'dist/eslint-configs/index.cjs']) {
    assert.doesNotMatch(readFileSync(path.join(root, file), 'utf8'), /eslint-plugin-next/, file);
  }
});

test('o subpath ./next exporta nextConfig em ESM e CJS', async () => {
  const esm = await import('@mathbreder/eslint-config/next');
  assert.ok(Array.isArray(esm.nextConfig));
  const require = createRequire(import.meta.url);
  const cjs = require('@mathbreder/eslint-config/next');
  assert.ok(Array.isArray(cjs.nextConfig));
  assert.equal(cjs.nextConfig.length, esm.nextConfig.length);
});
