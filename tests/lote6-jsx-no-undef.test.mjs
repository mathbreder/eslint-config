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

const linter = new Linter({ configType: 'flat' });
const fixtures = path.join(root, 'tests', 'fixtures', 'lote6', 'jsx-no-undef');
const RULES = [ 'no-undef', 'react/jsx-no-undef' ];
const SEV = { off: 0, warn: 1, error: 2 };
const virtual = (name) => path.join(root, 'virtual-src', name);

const reactNext = reactConfig;
const nextPreset = [ ...reactConfig, ...nextConfig ];
const expoAlone = [ ...baseConfig, ...expoConfig ];
const reactPlusExpo = [ ...reactConfig, ...expoConfig ];
const typedPreset = [ ...baseConfig, ...eslintConfigs.typeCheckedConfig ];
const previousState = [ ...reactConfig, { rules: { 'react/jsx-no-undef': 'error' } } ];
const withoutReact = [ ...reactConfig, { rules: { 'react/jsx-no-undef': 'off' } } ];
const withoutNative = [ ...reactConfig, { rules: { 'no-undef': 'off' } } ];

const CASES = [
  {
    id: 'componente JSX inexistente',
    code: 'const App = () => <ComponenteInexistente />;\n',
    js: [ [ 'no-undef', 1, 20 ] ],
    tsx: [ [ 'react/jsx-no-undef', 1, 20 ] ],
  },
  {
    id: 'variável JavaScript inexistente dentro de JSX',
    code: 'const App = () => (\n  <div>{variavelInexistente}</div>\n);\n',
    js: [ [ 'no-undef', 2, 9 ] ],
    tsx: [],
  },
  {
    id: 'componente importado',
    code: "import { Painel } from './Painel';\nconst App = () => <Painel />;\n",
    js: [],
    tsx: [],
  },
  {
    id: 'componente local',
    code: 'const Painel = () => <div />;\nconst App = () => <Painel />;\n',
    js: [],
    tsx: [],
  },
  {
    id: 'membro de UI indefinido',
    code: 'const App = () => <UI.Button />;\n',
    js: [ [ 'no-undef', 1, 20 ] ],
    tsx: [ [ 'react/jsx-no-undef', 1, 20 ] ],
  },
  {
    id: 'membro de UI importado',
    code: "import { UI } from './ui';\nconst App = () => <UI.Button />;\n",
    js: [],
    tsx: [],
  },
  {
    id: 'elemento HTML nativo',
    code: 'const App = () => <section />;\n',
    js: [],
    tsx: [],
  },
  {
    id: 'fragment com componente local',
    code: 'const Painel = () => <div />;\nconst App = () => <><Painel /></>;\n',
    js: [],
    tsx: [],
  },
  {
    id: 'membro profundo indefinido',
    code: 'const App = () => <Painel.Item.Corpo />;\n',
    js: [ [ 'no-undef', 1, 20 ] ],
    tsx: [ [ 'react/jsx-no-undef', 1, 20 ] ],
  },
  {
    id: 'propriedade opcional com componente indefinido',
    code: 'const App = ({ extra }) => <Painel valor={extra?.valor} />;\n',
    js: [ [ 'no-undef', 1, 29 ] ],
    tsx: [ [ 'react/jsx-no-undef', 1, 29 ] ],
  },
  {
    id: 'componente definido em escopo aninhado',
    code: 'function externa() {\n  const Interno = () => <div />;\n  return () => <Interno />;\n}\n',
    js: [],
    tsx: [],
  },
  {
    id: 'componente indefinido em escopo aninhado',
    code: 'function externa() {\n  return () => <Inexistente />;\n}\n',
    js: [ [ 'no-undef', 2, 17 ] ],
    tsx: [ [ 'react/jsx-no-undef', 2, 17 ] ],
  },
  {
    id: 'variável externa válida',
    code: 'const v = 1;\nconst App = () => <div>{v}</div>;\n',
    js: [],
    tsx: [],
  },
  {
    id: 'expressão JavaScript indefinida',
    code: 'const App = () => <div>{ComponenteEmExpressao}</div>;\n',
    js: [ [ 'no-undef', 1, 25 ] ],
    tsx: [],
  },
  {
    id: 'key com variável indefinida',
    code: 'const App = () => <Painel key={chave} />;\n',
    js: [ [ 'no-undef', 1, 20 ], [ 'no-undef', 1, 32 ] ],
    tsx: [ [ 'react/jsx-no-undef', 1, 20 ] ],
  },
  {
    id: 'componente global declarado',
    code: '/* global Global */\nconst App = () => <Global />;\n',
    js: [],
    tsx: [ [ 'react/jsx-no-undef', 2, 20 ] ],
  },
];

const messagesOf = (config, code, file) => linter.verify(code, config, file)
  .filter((m) => RULES.includes(m.ruleId))
  .map((m) => [ m.ruleId, m.line, m.column ]);
const duplicatePositions = (list) => {
  const seen = new Map();
  for (const [ , line, column ] of list) seen.set(`${line}:${column}`, (seen.get(`${line}:${column}`) ?? 0) + 1);
  return [ ...seen.entries() ].filter(([ , count ]) => count > 1).map(([ key ]) => key);
};
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

for (const extension of [ 'js', 'jsx', 'tsx' ]) {
  for (const item of CASES) {
    test(`${item.id} (.${extension}): diagnósticos esperados sem duplicação`, () => {
      const expected = extension === 'tsx' ? item.tsx : item.js;
      const messages = messagesOf(reactNext, item.code, virtual(`lote6-no-undef.${extension}`));
      assert.deepEqual(messages, expected);
      assert.deepEqual(duplicatePositions(messages), []);
    });
  }
}

test('estado anterior reproduzido: componente inexistente é reportado duas vezes em .js e .jsx', () => {
  for (const extension of [ 'js', 'jsx' ]) {
    const messages = messagesOf(previousState, 'const App = () => <ComponenteInexistente />;\n', virtual(`lote6-prev.${extension}`));
    assert.deepEqual(messages.map(([ id ]) => id).sort(), [ 'no-undef', 'react/jsx-no-undef' ], extension);
    assert.deepEqual(duplicatePositions(messages), [ '1:20' ], extension);
  }
  assert.equal(messagesOf(previousState, 'const App = () => <ComponenteInexistente />;\n', virtual('lote6-prev.tsx')).length, 1);
});

test('desligar no-undef em JavaScript perderia a detecção de variáveis inexistentes', () => {
  const code = 'const App = () => (\n  <div>{variavelInexistente}</div>\n);\n';
  assert.deepEqual(messagesOf(withoutNative, code, virtual('lote6-alt.js')), []);
  assert.deepEqual(messagesOf(reactNext, code, virtual('lote6-alt.js')), [ [ 'no-undef', 2, 9 ] ]);
});

test('desligar react/jsx-no-undef em TSX perderia a detecção de componentes inexistentes', () => {
  const code = 'const App = () => <ComponenteInexistente />;\n';
  assert.deepEqual(messagesOf(withoutReact, code, virtual('lote6-alt.tsx')), []);
  assert.deepEqual(messagesOf(reactNext, code, virtual('lote6-alt.tsx')), [ [ 'react/jsx-no-undef', 1, 20 ] ]);
});

test('fixtures: componentes definidos não geram diagnósticos em .jsx e .tsx', () => {
  for (const name of [ 'defined-components.jsx', 'defined-components.tsx' ]) {
    const code = fs.readFileSync(path.join(fixtures, name), 'utf8');
    assert.deepEqual(messagesOf(reactNext, code, path.join(fixtures, name)), [], name);
  }
});

test('fixtures: componentes e variáveis indefinidos são reportados uma única vez em .jsx e .js', () => {
  for (const name of [ 'undefined-components.jsx', 'undefined-components.js' ]) {
    const code = fs.readFileSync(path.join(fixtures, name), 'utf8');
    const messages = messagesOf(reactNext, code, path.join(fixtures, name));
    assert.deepEqual(messages.map(([ id, line ]) => `${id}@${line}`), [
      'no-undef@3', 'no-undef@4', 'no-undef@5', 'no-undef@5',
    ], name);
    assert.deepEqual(duplicatePositions(messages), [], name);
  }
});

test('fixture TSX: componentes indefinidos são reportados por react/jsx-no-undef, e a variável não', () => {
  const name = 'undefined-components.tsx';
  const code = fs.readFileSync(path.join(fixtures, name), 'utf8');
  const messages = messagesOf(reactNext, code, path.join(fixtures, name));
  assert.deepEqual(messages.map(([ id, line ]) => `${id}@${line}`), [
    'react/jsx-no-undef@3', 'react/jsx-no-undef@4', 'react/jsx-no-undef@5',
  ]);
});

test('configuração efetiva React: react/jsx-no-undef fica off somente em .js e .jsx', async () => {
  for (const extension of [ 'js', 'jsx' ]) {
    const rules = await effectiveRules(reactNext, virtual(`x.${extension}`));
    assert.equal(severityOf(rules, 'react/jsx-no-undef'), SEV.off, extension);
    assert.equal(severityOf(rules, 'no-undef'), SEV.error, extension);
  }
  for (const extension of [ 'tsx', 'ts', 'mjs', 'cjs', 'mts', 'cts' ]) {
    const rules = await effectiveRules(reactNext, virtual(`x.${extension}`));
    assert.equal(severityOf(rules, 'react/jsx-no-undef'), SEV.error, extension);
  }
  const tsx = await effectiveRules(reactNext, virtual('x.tsx'));
  assert.equal(severityOf(tsx, 'no-undef'), SEV.off);
});

test('composição Next.js documentada tem o mesmo resultado do preset React', async () => {
  for (const extension of [ 'js', 'jsx', 'tsx' ]) {
    const react = await effectiveRules(reactNext, virtual(`x.${extension}`));
    const next = await effectiveRules(nextPreset, virtual(`x.${extension}`));
    assert.equal(severityOf(next, 'react/jsx-no-undef'), severityOf(react, 'react/jsx-no-undef'), extension);
    assert.equal(severityOf(next, 'no-undef'), severityOf(react, 'no-undef'), extension);
  }
});

test('baseConfig e typeCheckedConfig não ganham react/jsx-no-undef', async () => {
  for (const config of [ baseConfig, typedPreset ]) {
    for (const extension of [ 'js', 'jsx', 'tsx' ]) {
      const rules = await effectiveRules(config, virtual(`x.${extension}`));
      assert.equal(severityOf(rules, 'react/jsx-no-undef'), 'absent', extension);
    }
  }
});

test('limitação residual: expoConfig isolado mantém a duplicação em .js e .jsx, sem alteração do preset', async () => {
  for (const extension of [ 'js', 'jsx' ]) {
    const rules = await effectiveRules(expoAlone, virtual(`x.${extension}`));
    assert.equal(severityOf(rules, 'react/jsx-no-undef'), SEV.error, extension);
    assert.equal(severityOf(rules, 'no-undef'), SEV.error, extension);
  }
  const messages = messagesOf(expoAlone, 'const App = () => <ComponenteInexistente />;\n', virtual('lote6-expo.js'));
  assert.equal(messages.length, 2);
});

test('limitação residual: react e expo no mesmo array reativam react/jsx-no-undef em .js e .jsx', async () => {
  for (const extension of [ 'js', 'jsx' ]) {
    const rules = await effectiveRules(reactPlusExpo, virtual(`x.${extension}`));
    assert.equal(severityOf(rules, 'react/jsx-no-undef'), SEV.error, extension);
  }
});

test('limitação residual: .mjs e .cjs com JSX mantêm a duplicação, porque a correção é restrita a .js e .jsx', () => {
  for (const extension of [ 'mjs', 'cjs' ]) {
    const messages = messagesOf(reactNext, 'const App = () => <ComponenteInexistente />;\n', virtual(`lote6-residual.${extension}`));
    assert.deepEqual(messages.map(([ id ]) => id).sort(), [ 'no-undef', 'react/jsx-no-undef' ], extension);
  }
});

test('expo: no-undef permanece ativa em .mts e .cts, fora do escopo de JSX', async () => {
  const rules = await effectiveRules(expoAlone, virtual('x.mts'));
  assert.equal(severityOf(rules, 'no-undef'), SEV.error);
});

const reactIsolated = eslintConfigs.reactNextConfig;
const COMPONENT = 'const App = () => <ComponenteInexistente />;\n';
const VARIABLE = 'const App = () => (\n  <div>{variavelInexistente}</div>\n);\n';
const MEMBER = 'const App = () => <UI.Button />;\n';
const LOCAL = 'const Painel = () => <div />;\nconst App = () => <Painel />;\n';

test('react isolado (sem baseConfig): nenhuma regra detecta componente inexistente em .js e .jsx', () => {
  for (const extension of [ 'js', 'jsx' ]) {
    assert.deepEqual(messagesOf(reactIsolated, COMPONENT, virtual(`lote6-iso.${extension}`)), [], extension);
    assert.deepEqual(messagesOf(reactIsolated, MEMBER, virtual(`lote6-iso.${extension}`)), [], extension);
  }
});

test('react isolado (sem baseConfig): nenhuma regra detecta variável inexistente em .js e .jsx', () => {
  for (const extension of [ 'js', 'jsx' ]) {
    assert.deepEqual(messagesOf(reactIsolated, VARIABLE, virtual(`lote6-iso.${extension}`)), [], extension);
  }
});

test('react isolado: componente inexistente em .tsx continua reportado por react/jsx-no-undef', () => {
  assert.deepEqual(messagesOf(reactIsolated, COMPONENT, virtual('lote6-iso.tsx')), [ [ 'react/jsx-no-undef', 1, 20 ] ]);
});

test('react isolado: a regra react/jsx-no-undef está off em .js e .jsx, por causa do override de deduplicação', async () => {
  for (const extension of [ 'js', 'jsx' ]) {
    const rules = await effectiveRules(reactIsolated, virtual(`x.${extension}`));
    assert.equal(severityOf(rules, 'react/jsx-no-undef'), SEV.off, extension);
    assert.equal(severityOf(rules, 'no-undef'), 'absent', extension);
  }
});

test('baseConfig + reactNextConfig (composição recomendada): componente e variável são reportados uma vez em .js e .jsx', () => {
  const recommended = [ ...baseConfig, ...reactConfig ];
  for (const extension of [ 'js', 'jsx' ]) {
    assert.deepEqual(messagesOf(recommended, COMPONENT, virtual(`lote6-rec.${extension}`)), [ [ 'no-undef', 1, 20 ] ], extension);
    assert.deepEqual(messagesOf(recommended, VARIABLE, virtual(`lote6-rec.${extension}`)), [ [ 'no-undef', 2, 9 ] ], extension);
    assert.deepEqual(messagesOf(recommended, MEMBER, virtual(`lote6-rec.${extension}`)), [ [ 'no-undef', 1, 20 ] ], extension);
  }
});

test('baseConfig isolado detecta componente e variável inexistentes em .js e .jsx, por no-undef', () => {
  for (const extension of [ 'js', 'jsx' ]) {
    assert.deepEqual(messagesOf(baseConfig, COMPONENT, virtual(`lote6-base.${extension}`)), [ [ 'no-undef', 1, 20 ] ], extension);
    assert.deepEqual(messagesOf(baseConfig, VARIABLE, virtual(`lote6-base.${extension}`)), [ [ 'no-undef', 2, 9 ] ], extension);
  }
});

test('componentes importados, locais e elementos nativos não são reportados em nenhuma composição', () => {
  const compositions = [ reactIsolated, baseConfig, [ ...baseConfig, ...reactConfig ], expoAlone ];
  const imported = "import { Painel } from './Painel';\nconst App = () => <Painel />;\n";
  const native = 'const App = () => <section />;\n';
  for (const config of compositions) {
    for (const code of [ imported, LOCAL, native ]) {
      assert.deepEqual(messagesOf(config, code, virtual('lote6-ok.jsx')), []);
    }
  }
});

test('expoConfig isolado detecta componente e variável inexistentes em .js e .jsx, com a duplicação preservada', () => {
  for (const extension of [ 'js', 'jsx' ]) {
    assert.deepEqual(messagesOf(expoAlone, COMPONENT, virtual(`lote6-expo-cov.${extension}`)), [
      [ 'react/jsx-no-undef', 1, 20 ],
      [ 'no-undef', 1, 20 ],
    ], extension);
    assert.deepEqual(messagesOf(expoAlone, VARIABLE, virtual(`lote6-expo-cov.${extension}`)), [ [ 'no-undef', 2, 9 ] ], extension);
  }
});

test('reactNextConfig isolado e baseConfig + reactNextConfig diferem somente em .js e .jsx', async () => {
  for (const extension of [ 'mjs', 'cjs', 'ts', 'tsx' ]) {
    const isolated = await effectiveRules(reactIsolated, virtual(`x.${extension}`));
    const recommended = await effectiveRules([ ...baseConfig, ...reactConfig ], virtual(`x.${extension}`));
    assert.equal(severityOf(isolated, 'react/jsx-no-undef'), severityOf(recommended, 'react/jsx-no-undef'), extension);
  }
});
