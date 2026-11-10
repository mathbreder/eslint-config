import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import { ESLint, Linter } from 'eslint';

import { baseConfig, reactConfig, root, virtualFile } from './helpers.mjs';
import { eslintConfigs } from '../dist/index.js';
import { expoConfig } from '../dist/eslint-configs/expo.js';
import { nextConfig } from '../dist/eslint-configs/next.js';
import { defineConfig } from '../dist/eslint-configs/utils.js';

const linter = new Linter({ configType: 'flat' });
const fixtures = path.join(root, 'tests', 'fixtures', 'lote6', 'jsx-duplicates');
const fixturePath = (relative) => path.join(fixtures, relative);
const readFixture = (relative) => fs.readFileSync(fixturePath(relative), 'utf8');

const REACT_RULES = [
  'react/jsx-closing-bracket-location',
  'react/jsx-closing-tag-location',
  'react/jsx-first-prop-new-line',
  'react/jsx-newline',
];
const REMOVED_STYLISTIC = [
  '@stylistic/jsx-closing-bracket-location',
  '@stylistic/jsx-closing-tag-location',
  '@stylistic/jsx-first-prop-new-line',
  '@stylistic/jsx-newline',
];
const SCOPE = [ ...REACT_RULES, ...REMOVED_STYLISTIC ];
const SEV = { off: 0, warn: 1, error: 2 };

const nextPreset = [ ...reactConfig, ...nextConfig ];
const expoAlone = [ ...baseConfig, ...expoConfig ];
const typedPreset = [ ...baseConfig, ...eslintConfigs.typeCheckedConfig ];
const ALL_EXTS = [ 'js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx', 'mts', 'cts' ];

const effectiveRules = async (config, file) => {
  const eslint = new ESLint({ cwd: root, overrideConfig: defineConfig(config), overrideConfigFile: true });
  return (await eslint.calculateConfigForFile(file)).rules;
};
const severityOf = (rules, name) => {
  const value = rules[name];
  if (value === undefined) return 'absent';
  const severity = Array.isArray(value) ? value[0] : value;
  if (typeof severity === 'number') return severity;
  return SEV[severity] ?? 'absent';
};
const optionsOf = (rules, name) => (Array.isArray(rules[name]) ? rules[name][1] : undefined);

const scopeMessages = (config, code, file) => linter
  .verify(code, config, file)
  .filter((m) => SCOPE.includes(m.ruleId));
const fixOnce = (config, code, file) => linter.verifyAndFix(code, config, file).output;
const fixTwice = (config, code, file) => {
  const once = fixOnce(config, code, file);
  return { once, twice: fixOnce(config, once, file) };
};
const duplicatePositions = (messages) => {
  const seen = new Map();
  for (const m of messages) {
    const key = `${m.line}:${m.column}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  return [ ...seen.entries() ].filter(([ , count ]) => count > 1).map(([ key ]) => key);
};

const JSX_FILE = path.join(root, 'virtual-src', 'lote6.jsx');
const TSX_FILE = path.join(root, 'virtual-src', 'lote6.tsx');

const scenarios = [
  { id: 'jsx válido: elemento de uma linha', code: 'const e = <A p="1" />;\n', ids: [] },
  {
    id: 'tag de fechamento desalinhada',
    code: 'const e = (\n  <Painel>\n    Conteúdo\n</Painel>\n);\n',
    ids: [ 'react/jsx-closing-tag-location' ],
    fixed: 'const e = (\n  <Painel>\n    Conteúdo\n  </Painel>\n);\n',
  },
  {
    id: 'primeira propriedade na linha da tag',
    code: 'const e = <A b="1"\n  c="2" />;\n',
    ids: [ 'react/jsx-closing-bracket-location', 'react/jsx-first-prop-new-line' ],
    fixed: 'const e = (\n  <A\n    b="1"\n    c="2"\n  />\n);\n',
  },
  {
    id: 'propriedades multilinha com primeira propriedade na linha seguinte',
    code: 'const e = (\n  <A\n    b="1"\n    c="2"\n  />\n);\n',
    ids: [],
  },
  {
    id: 'linha em branco entre elementos JSX adjacentes',
    code: 'const e = (\n  <>\n    <A />\n\n    <B />\n  </>\n);\n',
    ids: [ 'react/jsx-newline' ],
    fixed: 'const e = (\n  <>\n    <A />\n    <B />\n  </>\n);\n',
  },
  { id: 'elementos adjacentes sem linha em branco', code: 'const e = (\n  <div>\n    <A />\n    <B />\n  </div>\n);\n', ids: [] },
  {
    id: 'componentes aninhados com linha em branco',
    code: 'const e = (\n  <div>\n    <section>\n      <A />\n\n      <B />\n    </section>\n  </div>\n);\n',
    ids: [ 'react/jsx-newline' ],
    fixed: 'const e = (\n  <div>\n    <section>\n      <A />\n      <B />\n    </section>\n  </div>\n);\n',
  },
  { id: 'componente self-closing', code: 'const e = <Componente />;\n', ids: [] },
  {
    id: 'argumento de chamada com /> no início da linha (alinhado com a linha da abertura)',
    code: 'render(<A\n  p="1"\n/>);\n',
    ids: [],
    fixed: 'render(<A\n  p="1"\n/>);\n',
  },
  {
    id: 'tag de fechamento dentro de argumento de chamada',
    code: 'render(<Painel>\n  Conteúdo\n    </Painel>);\n',
    ids: [ 'react/jsx-closing-tag-location' ],
    fixed: 'render(<Painel>\n  Conteúdo\n</Painel>);\n',
  },
  {
    id: 'JSX dentro de objeto literal',
    code: 'const o = { x: <A\n  p="1"\n/> };\n',
    ids: [],
    fixed: 'const o = {\n  x: <A\n    p="1"\n  />,\n};\n',
  },
  {
    id: 'JSX começando no meio da linha após ternário',
    code: 'const elemento = condicao ? <Painel\n    titulo="Exemplo"\n  >\n    Conteúdo\n  </Painel> : null;\n',
    ids: [ 'react/jsx-closing-bracket-location', 'react/jsx-closing-tag-location' ],
    fixed: 'const elemento = condicao\n  ? (\n    <Painel\n      titulo="Exemplo"\n    >\n      Conteúdo\n    </Painel>\n  )\n  : null;\n',
  },
  {
    id: 'condicional com JSX em bloco de parênteses',
    code: 'const elemento = condicao ? (\n  <Painel\n    titulo="Exemplo"\n  >\n    Conteúdo\n  </Painel>\n) : null;\n',
    ids: [],
  },
];

for (const extension of [ '.jsx', '.tsx' ]) {
  for (const scenario of scenarios) {
    test(`${scenario.id} (${extension}): diagnósticos das regras JSX removidas e React são esperados e o autofix converge`, () => {
      const file = path.join(root, 'virtual-src', `lote6${extension}`);
      const messages = scopeMessages(reactConfig, scenario.code, file);
      assert.deepEqual(messages.map((m) => m.ruleId).sort(), [ ...scenario.ids ].sort());
      assert.deepEqual(messages.filter((m) => REMOVED_STYLISTIC.includes(m.ruleId)), []);
      assert.deepEqual(duplicatePositions(messages), []);
      if (scenario.fixed !== undefined) {
        const fixed = fixTwice(reactConfig, scenario.code, file);
        assert.equal(fixed.once, scenario.fixed);
        assert.equal(fixed.twice, fixed.once, 'a segunda execução do autofix não altera o código');
        assert.deepEqual(scopeMessages(reactConfig, fixed.once, file).map((m) => m.ruleId), []);
      }
    });
  }
}

test('fixtures válidos: nenhum diagnóstico das quatro regras em .jsx e .tsx', () => {
  for (const relative of [ 'valid/elements.jsx', 'valid/elements.tsx', 'valid/closing-bracket.jsx' ]) {
    const messages = scopeMessages(reactConfig, readFixture(relative), fixturePath(relative));
    assert.deepEqual(messages.map((m) => m.ruleId), [], relative);
  }
});

test('fixtures inválidos: diagnósticos esperados e autofix estável sem resíduos', () => {
  const expected = {
    'invalid/closing-tag.jsx': [ 'react/jsx-closing-tag-location', 'react/jsx-closing-tag-location' ],
    'invalid/first-prop-and-newline.tsx': [ 'react/jsx-closing-bracket-location', 'react/jsx-first-prop-new-line', 'react/jsx-newline' ],
  };
  for (const [ relative, ids ] of Object.entries(expected)) {
    const file = fixturePath(relative);
    const messages = scopeMessages(reactConfig, readFixture(relative), file);
    assert.deepEqual(messages.map((m) => m.ruleId).sort(), [ ...ids ].sort(), relative);
    const fixed = fixTwice(reactConfig, readFixture(relative), file);
    assert.equal(fixed.twice, fixed.once, `${relative}: autofix estável`);
    assert.deepEqual(scopeMessages(reactConfig, fixed.once, file).map((m) => m.ruleId), [], `${relative}: sem resíduos`);
  }
});

test('regras React mantêm severidade e opções nos presets React e Next.js', async () => {
  const expected = {
    'react/jsx-closing-bracket-location': [ 'error', 'line-aligned' ],
    'react/jsx-closing-tag-location': [ 'error', 'line-aligned' ],
    'react/jsx-first-prop-new-line': [ 'error', 'multiline' ],
    'react/jsx-newline': [ 'error', { prevent: true } ],
  };
  for (const [ presetName, config ] of [ [ 'react', reactConfig ], [ 'next', nextPreset ] ]) {
    for (const ext of [ 'jsx', 'tsx' ]) {
      const rules = await effectiveRules(config, path.join(root, 'virtual-src', `x.${ext}`));
      for (const [ name, value ] of Object.entries(expected)) {
        assert.equal(severityOf(rules, name), SEV.error, `${presetName}/.${ext}: severidade de ${name}`);
        const actual = optionsOf(rules, name);
        if (typeof value[1] === 'object') {
          for (const [ key, option ] of Object.entries(value[1])) assert.equal(actual?.[key], option, `${name}.${key}`);
        } else {
          assert.equal(actual, value[1], `${presetName}/.${ext}: opções de ${name}`);
        }
      }
    }
  }
});

test('as quatro regras Stylistic removidas não aparecem em nenhuma composição nem extensão', async () => {
  const compositions = { base: baseConfig, react: reactConfig, next: nextPreset, expo: expoAlone, typed: typedPreset };
  for (const [ presetName, config ] of Object.entries(compositions)) {
    for (const ext of ALL_EXTS) {
      const rules = await effectiveRules(config, path.join(root, 'virtual-src', `x.${ext}`));
      for (const name of REMOVED_STYLISTIC) {
        assert.equal(severityOf(rules, name), 'absent', `${presetName}/.${ext}: ${name}`);
      }
    }
  }
});

test('expoConfig isolado não ganha regras JSX React nem Stylistic', async () => {
  const rules = await effectiveRules(expoAlone, path.join(root, 'virtual-src', 'x.tsx'));
  for (const name of [ ...REACT_RULES, ...REMOVED_STYLISTIC ]) {
    assert.equal(severityOf(rules, name), 'absent', name);
  }
});

test('regras Stylistic JSX aprovadas nos lotes anteriores permanecem ativas no preset React', async () => {
  const rules = await effectiveRules(reactConfig, path.join(root, 'virtual-src', 'x.tsx'));
  assert.equal(severityOf(rules, '@stylistic/jsx-quotes'), SEV.error);
  assert.equal(severityOf(rules, '@stylistic/jsx-wrap-multilines'), SEV.error);
  assert.equal(severityOf(rules, '@stylistic/jsx-one-expression-per-line'), SEV.warn);
  assert.equal(severityOf(rules, '@stylistic/jsx-tag-spacing'), SEV.error);
});

test('reprodução do estado anterior: reativar as regras Stylistic duplica diagnósticos na mesma posição', () => {
  const previous = [
    ...reactConfig,
    { rules: {
      '@stylistic/jsx-closing-bracket-location': 1,
      '@stylistic/jsx-closing-tag-location': 1,
      '@stylistic/jsx-first-prop-new-line': [ 'error', 'multiline' ],
      '@stylistic/jsx-newline': [ 'error', { prevent: true } ],
    } },
  ];
  const all = scopeMessages(previous, 'const e = <A b="1"\n  c="2" />;\n', JSX_FILE);
  const firstProp = all.filter((m) => m.ruleId.endsWith('jsx-first-prop-new-line'));
  assert.deepEqual(firstProp.map((m) => m.ruleId).sort(), [ '@stylistic/jsx-first-prop-new-line', 'react/jsx-first-prop-new-line' ]);
  assert.deepEqual(duplicatePositions(firstProp), [ '1:14' ]);
  const bracket = all.filter((m) => m.ruleId.endsWith('jsx-closing-bracket-location'));
  assert.deepEqual(duplicatePositions(bracket), [ '2:9' ]);

  const newline = scopeMessages(previous, 'const e = (\n  <>\n    <A />\n\n    <B />\n  </>\n);\n', TSX_FILE);
  assert.deepEqual(duplicatePositions(newline), [ '5:5' ]);
});

test('reprodução do conflito anterior: tag-aligned do Stylistic deixa resíduo que line-aligned do React aceita', () => {
  const previous = [
    ...reactConfig,
    { rules: { '@stylistic/jsx-closing-bracket-location': 1, '@stylistic/jsx-closing-tag-location': 1 } },
  ];
  const bracketCode = 'render(<A\n  p="1"\n/>);\n';
  const fixedPrevious = fixOnce(previous, bracketCode, JSX_FILE);
  const residual = scopeMessages(previous, fixedPrevious, JSX_FILE).map((m) => m.ruleId);
  assert.deepEqual(residual, [ '@stylistic/jsx-closing-bracket-location' ]);
  assert.equal(scopeMessages(reactConfig, bracketCode, JSX_FILE).length, 0);

  const tagCode = 'render(<Painel>\n  Conteúdo\n    </Painel>);\n';
  const tagResidual = scopeMessages(previous, fixOnce(previous, tagCode, JSX_FILE), JSX_FILE).map((m) => m.ruleId);
  assert.deepEqual(tagResidual, [ '@stylistic/jsx-closing-tag-location' ]);
});

test('jsx-no-undef e no-undef: o nome do componente é reportado pelas duas em .jsx, e só pelo React em .tsx', () => {
  const code = 'const App = () => (\n  <ComponenteInexistente valor={variavelInexistente} />\n);\n';
  const jsx = linter.verify(code, reactConfig, JSX_FILE).filter((m) => [ 'react/jsx-no-undef', 'no-undef' ].includes(m.ruleId));
  assert.deepEqual(jsx.map((m) => [ m.ruleId, m.column ]), [
    [ 'react/jsx-no-undef', 4 ],
    [ 'no-undef', 4 ],
    [ 'no-undef', 33 ],
  ]);
  const tsx = linter.verify(code, reactConfig, TSX_FILE).filter((m) => [ 'react/jsx-no-undef', 'no-undef' ].includes(m.ruleId));
  assert.deepEqual(tsx.map((m) => m.ruleId), [ 'react/jsx-no-undef' ]);
});

test('jsx-no-undef e no-undef permanecem ativas na configuração efetiva', async () => {
  const jsx = await effectiveRules(reactConfig, path.join(root, 'virtual-src', 'x.jsx'));
  assert.equal(severityOf(jsx, 'react/jsx-no-undef'), SEV.error);
  assert.equal(severityOf(jsx, 'no-undef'), SEV.error);
  const tsx = await effectiveRules(reactConfig, path.join(root, 'virtual-src', 'x.tsx'));
  assert.equal(severityOf(tsx, 'react/jsx-no-undef'), SEV.error);
  assert.equal(severityOf(tsx, 'no-undef'), SEV.off);
});
