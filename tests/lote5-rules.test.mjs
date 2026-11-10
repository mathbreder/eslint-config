import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import { ESLint, Linter } from 'eslint';
import ts from 'typescript';

import { baseConfig, reactConfig, root, virtualFile } from './helpers.mjs';
import { eslintConfigs } from '../dist/index.js';
import { expoConfig } from '../dist/eslint-configs/expo.js';
import { nextConfig } from '../dist/eslint-configs/next.js';
import { defineConfig } from '../dist/eslint-configs/utils.js';

const linter = new Linter({ configType: 'flat' });
const fixtures = path.join(root, 'tests', 'fixtures', 'lote5');
const fixturePath = (relative) => path.join(fixtures, relative);
const readFixture = (relative) => fs.readFileSync(fixturePath(relative), 'utf8');

const ALL_EXTS = [ 'js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx', 'mts', 'cts' ];
const TS_EXTS = [ 'ts', 'tsx', 'mts', 'cts' ];
const JSX_EXTS = [ 'jsx', 'tsx' ];
const SEV = { off: 0, warn: 1, error: 2 };

const compositions = {
  base: baseConfig,
  react: reactConfig,
  next: [ ...reactConfig, ...nextConfig ],
  expo: [ ...baseConfig, ...expoConfig ],
  typed: [ ...baseConfig, ...eslintConfigs.typeCheckedConfig ],
};
const lintingCompositions = { base: compositions.base, react: compositions.react, next: compositions.next, expo: compositions.expo };

const MEMBER_OPTIONS = {
  multiline: { delimiter: 'semi', requireLast: true },
  singleline: { delimiter: 'semi', requireLast: false },
};

const ACTIVATIONS = [
  {
    rule: '@stylistic/indent-binary-ops', severity: 'warn', options: 2, exts: ALL_EXTS,
    presets: [ 'base', 'react', 'next', 'expo', 'typed' ],
  },
  {
    rule: '@stylistic/padding-line-between-statements', severity: 'warn',
    options: { blankLine: 'always', prev: '*', next: 'return' }, exts: ALL_EXTS,
    presets: [ 'base', 'react', 'next', 'expo', 'typed' ],
  },
  {
    rule: '@stylistic/member-delimiter-style', severity: 'error', options: MEMBER_OPTIONS, exts: TS_EXTS,
    presets: [ 'base', 'react', 'next', 'expo', 'typed' ],
  },
  {
    rule: '@stylistic/type-generic-spacing', severity: 'error', options: undefined, exts: TS_EXTS,
    presets: [ 'base', 'react', 'next', 'expo', 'typed' ],
  },
  {
    rule: '@stylistic/type-named-tuple-spacing', severity: 'error', options: undefined, exts: TS_EXTS,
    presets: [ 'base', 'react', 'next', 'expo', 'typed' ],
  },
  {
    rule: '@stylistic/jsx-one-expression-per-line', severity: 'warn', options: { allow: 'single-line' }, exts: JSX_EXTS,
    presets: [ 'react', 'next' ],
  },
  {
    rule: '@stylistic/jsx-tag-spacing', severity: 'error',
    options: { closingSlash: 'never', beforeSelfClosing: 'always', afterOpening: 'never', beforeClosing: 'allow' },
    exts: JSX_EXTS, presets: [ 'react', 'next' ],
  },
];

const NEW_RULE_NAMES = ACTIVATIONS.map((activation) => activation.rule);

const effectiveRules = async (config, file) => {
  const eslint = new ESLint({ cwd: root, overrideConfig: defineConfig(config), overrideConfigFile: true });
  return (await eslint.calculateConfigForFile(file)).rules;
};
const severityOf = (rules, name) => {
  const value = rules[name];
  if (value === undefined) return 'absent';
  const severity = Array.isArray(value) ? value[0] : value;
  return SEV[severity] ?? severity;
};
const optionsOf = (rules, name) => (Array.isArray(rules[name]) ? rules[name][1] : undefined);
const assertPartial = (actual, expected, label) => {
  if (expected !== null && typeof expected === 'object') {
    for (const [ key, value ] of Object.entries(expected)) assertPartial(actual?.[key], value, `${label}.${key}`);
    return;
  }
  assert.equal(actual, expected, label);
};

const lint = (config, code, filePath) => linter.verify(code, config, filePath);
const messagesOf = (config, code, filePath, ruleId) => lint(config, code, filePath).filter((m) => m.ruleId === ruleId);
const fixOnce = (config, code, filePath) => linter.verifyAndFix(code, config, filePath).output;
const fixTwice = (config, code, filePath) => {
  const once = fixOnce(config, code, filePath);
  return { once, twice: fixOnce(config, once, filePath) };
};
const duplicates = (messages) => {
  const seen = new Map();
  for (const m of messages) {
    const key = `${m.ruleId}:${m.line}:${m.column}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  return [ ...seen.entries() ].filter(([ , count ]) => count > 1).map(([ key ]) => key);
};
const typeSignature = (code) => {
  const sourceFile = ts.createSourceFile('signature.ts', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const signature = [];
  const visit = (node) => {
    signature.push(ts.SyntaxKind[node.kind]);
    if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) signature.push(node.text);
    node.forEachChild(visit);
  };
  visit(sourceFile);
  return signature;
};

const TSFILE = 'virtual-src/regra.ts';
const JSFILE = 'virtual-src/regra.js';
const TSXFILE = 'virtual-src/regra.tsx';
const JSXFILE = 'virtual-src/regra.jsx';
const fileOf = (name) => path.join(root, name);

for (const activation of ACTIVATIONS) {
  test(`${activation.rule}: severidade e opções efetivas em todas as composições`, async () => {
    for (const [ presetName, config ] of Object.entries(compositions)) {
      for (const ext of ALL_EXTS) {
        const rules = await effectiveRules(config, fileOf(`virtual-src/regra.${ext}`));
        const expectedSeverity = activation.presets.includes(presetName) && activation.exts.includes(ext)
          ? SEV[activation.severity]
          : 'absent';
        const label = `${presetName}/.${ext}`;
        assert.equal(severityOf(rules, activation.rule), expectedSeverity, `${label}: severidade`);
        if (expectedSeverity !== 'absent' && activation.options !== undefined) {
          assertPartial(optionsOf(rules, activation.rule), activation.options, `${label}: opções`);
        }
      }
    }
  });
}

test('indent-binary-ops: válido com continuação de 2 espaços, também em TypeScript', () => {
  assert.equal(messagesOf(baseConfig, 'const total = a\n  + b;\n', fileOf(JSFILE), '@stylistic/indent-binary-ops').length, 0);
  assert.equal(messagesOf(baseConfig, 'const total: number = a\n  + b;\n', fileOf(TSFILE), '@stylistic/indent-binary-ops').length, 0);
});

test('indent-binary-ops: inválido é reportado como aviso e corrigido para 2 espaços', () => {
  const code = 'const total = a\n      + b;\n';
  const messages = messagesOf(baseConfig, code, fileOf(JSFILE), '@stylistic/indent-binary-ops');
  assert.equal(messages.length, 1);
  assert.equal(messages[0].severity, 1);
  assert.equal(messages[0].line, 2);
  assert.equal(fixOnce(baseConfig, code, fileOf(JSFILE)), 'const total = a\n  + b;\n');
});

test('indent-binary-ops: autofix estabiliza em várias linhas e dentro de função', () => {
  const multi = fixTwice(baseConfig, 'const t = a\n    + b\n    + c;\n', fileOf(JSFILE));
  assert.equal(multi.once, 'const t = a\n  + b\n  + c;\n');
  assert.equal(multi.twice, multi.once);
  const inFunction = fixTwice(baseConfig, 'function f(a, b) {\n  return a\n      + b;\n}\n', fileOf(JSFILE));
  assert.equal(inFunction.once, 'function f(a, b) {\n  return a\n    + b;\n}\n');
  assert.equal(inFunction.twice, inFunction.once);
});

test('indent-binary-ops: não duplica diagnósticos', () => {
  const messages = lint(baseConfig, 'function f(a, b) {\n  return a\n      + b;\n}\n', fileOf(JSFILE));
  assert.deepEqual(duplicates(messages.filter((m) => m.ruleId === '@stylistic/indent-binary-ops')), []);
});

test('indent-binary-ops: aplicada em JavaScript e TypeScript', () => {
  const code = 'const total = a\n      + b;\n';
  for (const name of [ 'regra.js', 'regra.ts', 'regra.mjs', 'regra.cts' ]) {
    assert.equal(messagesOf(baseConfig, code, fileOf(`virtual-src/${name}`), '@stylistic/indent-binary-ops').length, 1, name);
  }
});

test('indent-binary-ops: interação com indent e operator-linebreak resolve no mesmo autofix', () => {
  const nested = 'const t = (\n    a\n      + b\n);\n';
  const messages = lint(baseConfig, nested, fileOf(JSFILE));
  assert.equal(messages.filter((m) => m.ruleId === '@stylistic/indent').length, 1);
  assert.equal(messages.filter((m) => m.ruleId === '@stylistic/indent-binary-ops').length, 1);
  const fixed = fixTwice(baseConfig, nested, fileOf(JSFILE));
  assert.equal(fixed.once, 'const t = (\n  a\n  + b\n);\n');
  assert.equal(lint(baseConfig, fixed.once, fileOf(JSFILE)).filter((m) => m.ruleId?.includes('indent')).length, 0);
  assert.equal(fixed.twice, fixed.once);

  const operatorFirst = fixTwice(baseConfig, 'const t = a +\n      b;\n', fileOf(JSFILE));
  assert.equal(operatorFirst.once, 'const t = a\n  + b;\n');
  assert.equal(operatorFirst.twice, operatorFirst.once);
});

test('indent-binary-ops: no-mixed-operators continua reportando sem diagnóstico duplicado de indentação', () => {
  const code = 'const t = a + b * c\n  - d;\n';
  const messages = lint(baseConfig, code, fileOf(JSFILE));
  assert.equal(messages.filter((m) => m.ruleId === '@stylistic/indent-binary-ops').length, 0);
  assert.equal(messages.filter((m) => m.ruleId === '@stylistic/no-mixed-operators').length, 2);
});

test('padding-line-between-statements: válido com linha em branco antes do return', () => {
  const code = 'function f(v) {\n  const x = v;\n\n  return x;\n}\n';
  assert.equal(messagesOf(baseConfig, code, fileOf(JSFILE), '@stylistic/padding-line-between-statements').length, 0);
});

test('padding-line-between-statements: inválido é reportado como aviso e corrigido', () => {
  const code = 'function f(v) {\n  const x = v;\n  return x;\n}\n';
  const messages = messagesOf(baseConfig, code, fileOf(JSFILE), '@stylistic/padding-line-between-statements');
  assert.equal(messages.length, 1);
  assert.equal(messages[0].severity, 1);
  assert.equal(messages[0].line, 3);
  assert.equal(fixOnce(baseConfig, code, fileOf(JSFILE)), 'function f(v) {\n  const x = v;\n\n  return x;\n}\n');
});

test('padding-line-between-statements: não exige linha em branco entre declarações comuns nem para return inicial', () => {
  const declarations = 'function f() {\n  const a = 1;\n  const b = 2;\n\n  return a + b;\n}\n';
  assert.equal(messagesOf(baseConfig, declarations, fileOf(JSFILE), '@stylistic/padding-line-between-statements').length, 0);
  const first = 'function f() {\n  return 1;\n}\n';
  assert.equal(messagesOf(baseConfig, first, fileOf(JSFILE), '@stylistic/padding-line-between-statements').length, 0);
});

test('padding-line-between-statements: retorno condicional e comentário recebem a linha antes do bloco de retorno', () => {
  const conditional = 'function f(a) {\n  if (a) {\n    return 1;\n  }\n  return 2;\n}\n';
  assert.equal(fixOnce(baseConfig, conditional, fileOf(JSFILE)), 'function f(a) {\n  if (a) {\n    return 1;\n  }\n\n  return 2;\n}\n');
  const withComment = 'function f(v) {\n  const x = v;\n  // motivo\n  return x;\n}\n';
  const fixed = fixTwice(baseConfig, withComment, fileOf(JSFILE));
  assert.equal(fixed.once, 'function f(v) {\n  const x = v;\n\n  // motivo\n  return x;\n}\n');
  assert.equal(fixed.twice, fixed.once);
});

test('padding-line-between-statements: interação com max-statements-per-line converge sem diagnósticos restantes', () => {
  const code = 'function f(v) { const x = v; return x; }\n';
  const messages = lint(baseConfig, code, fileOf(JSFILE));
  assert.equal(messages.filter((m) => m.ruleId === '@stylistic/max-statements-per-line').length, 1);
  assert.equal(messages.filter((m) => m.ruleId === '@stylistic/padding-line-between-statements').length, 1);
  const fixed = fixTwice(baseConfig, code, fileOf(JSFILE));
  assert.equal(fixed.once, 'function f(v) {\n  const x = v;\n\n  return x;\n}\n');
  assert.equal(fixed.twice, fixed.once);
});

test('padding-line-between-statements: interação com padded-blocks remove o espaço do início e mantém o bloco', () => {
  const code = 'function f() {\n\n  const a = 1;\n  return a;\n}\n';
  const messages = lint(baseConfig, code, fileOf(JSFILE));
  assert.equal(messages.filter((m) => m.ruleId === '@stylistic/padded-blocks').length, 1);
  assert.equal(messages.filter((m) => m.ruleId === '@stylistic/padding-line-between-statements').length, 1);
  const fixed = fixTwice(baseConfig, code, fileOf(JSFILE));
  assert.equal(fixed.once, 'function f() {\n  const a = 1;\n\n  return a;\n}\n');
  assert.equal(fixed.twice, fixed.once);
});

test('padding-line-between-statements: aplica-se dentro de switch e em geradores', () => {
  const sw = 'function f(a) {\n  switch (a) {\n    case 1:\n      x();\n      return 1;\n    default:\n      return 0;\n  }\n}\n';
  assert.equal(messagesOf(baseConfig, sw, fileOf(JSFILE), '@stylistic/padding-line-between-statements').length, 1);
  const gen = 'function* g() {\n  yield 1;\n  return 2;\n}\n';
  assert.equal(fixOnce(baseConfig, gen, fileOf(JSFILE)), 'function* g() {\n  yield 1;\n\n  return 2;\n}\n');
});

test('padding-line-between-statements: não duplica diagnósticos e funciona em TypeScript', () => {
  const code = 'function f(v: number) {\n  const x = v;\n  return x;\n}\n';
  const messages = lint(baseConfig, code, fileOf(TSFILE));
  assert.deepEqual(duplicates(messages.filter((m) => m.ruleId === '@stylistic/padding-line-between-statements')), []);
  assert.equal(messagesOf(baseConfig, code, fileOf(TSFILE), '@stylistic/padding-line-between-statements').length, 1);
});

test('member-delimiter-style: válido com ponto e vírgula em interfaces, tipos e assinaturas', () => {
  const code = readFixture('valid/members.ts');
  assert.equal(messagesOf(baseConfig, code, fixturePath('valid/members.ts'), '@stylistic/member-delimiter-style').length, 0);
  assert.equal(messagesOf(baseConfig, 'type P = { a: string; b: number };\n', fileOf(TSFILE), '@stylistic/member-delimiter-style').length, 0);
});

test('member-delimiter-style: vírgulas e último membro sem ponto e vírgula são reportados como erro', () => {
  const code = 'type R = {\n  sucesso: boolean,\n  mensagem: string\n};\n';
  const messages = messagesOf(baseConfig, code, fileOf(TSFILE), '@stylistic/member-delimiter-style');
  assert.equal(messages.length, 2);
  assert.equal(messages[0].severity, 2);
  assert.equal(fixOnce(baseConfig, code, fileOf(TSFILE)), 'type R = {\n  sucesso: boolean;\n  mensagem: string;\n};\n');
});

test('member-delimiter-style: linha única sem ponto e vírgula final, e autofix remove o separador final', () => {
  assert.equal(
    fixOnce(baseConfig, 'type P = { a: string; b: number; };\n', fileOf(TSFILE)),
    'type P = { a: string; b: number };\n',
  );
  assert.equal(
    fixOnce(baseConfig, 'type P = { a: string, b: number };\n', fileOf(TSFILE)),
    'type P = { a: string; b: number };\n',
  );
});

test('member-delimiter-style: autofix estabiliza e preserva o significado dos tipos', () => {
  const code = 'type R = {\n  sucesso: boolean,\n  mensagem: string\n};\n';
  const fixed = fixTwice(baseConfig, code, fileOf(TSFILE));
  assert.equal(fixed.twice, fixed.once);
  assert.deepEqual(typeSignature(fixed.once), typeSignature(code));
});

test('member-delimiter-style: interface com vírgulas gera o erro do delimitador e mantém a preferência por type', () => {
  const messages = lint(baseConfig, readFixture('invalid/members.ts'), fixturePath('invalid/members.ts'));
  assert.equal(messages.filter((m) => m.ruleId === '@stylistic/member-delimiter-style').length, 3);
  assert.equal(messages.filter((m) => m.ruleId === '@typescript-eslint/consistent-type-definitions').length, 1);
  const fixed = fixOnce(baseConfig, 'export interface Usuario {\n  nome: string,\n  idade: number\n}\n', fileOf(TSFILE));
  assert.equal(fixed, 'export type Usuario = {\n  nome: string;\n  idade: number;\n};\n');
});

test('member-delimiter-style: não duplica com semi e key-spacing, e cada regra corrige o seu próprio problema', () => {
  const semiCode = 'type A = {\n  a: string;\n  b: number\n};\nconst x = 1\n';
  const semiMessages = lint(baseConfig, semiCode, fileOf(TSFILE));
  assert.equal(semiMessages.filter((m) => m.ruleId === '@stylistic/member-delimiter-style').length, 1);
  assert.equal(semiMessages.filter((m) => m.ruleId === '@stylistic/semi').length, 1);
  assert.equal(fixOnce(baseConfig, semiCode, fileOf(TSFILE)), 'type A = {\n  a: string;\n  b: number;\n};\nconst x = 1;\n');

  const spacingCode = 'type A = {\n  a : string;\n  b:number;\n};\n';
  const spacingMessages = lint(baseConfig, spacingCode, fileOf(TSFILE));
  assert.equal(spacingMessages.filter((m) => m.ruleId === '@stylistic/member-delimiter-style').length, 0);
  assert.equal(spacingMessages.filter((m) => m.ruleId === '@stylistic/key-spacing').length, 2);
  const fixed = fixTwice(baseConfig, spacingCode, fileOf(TSFILE));
  assert.equal(fixed.once, 'type A = {\n  a: string;\n  b: number;\n};\n');
  assert.equal(fixed.twice, fixed.once);
});

test('member-delimiter-style: aplicada somente a TypeScript (.ts, .tsx, .mts, .cts)', () => {
  const code = 'type P = { a: string, b: number };\n';
  for (const name of [ 'regra.ts', 'regra.tsx', 'regra.mts', 'regra.cts' ]) {
    assert.equal(messagesOf(baseConfig, code, fileOf(`virtual-src/${name}`), '@stylistic/member-delimiter-style').length, 1, name);
  }
});

test('type-generic-spacing: válido com genéricos sem espaço interno', () => {
  const code = readFixture('valid/generics.ts');
  assert.equal(messagesOf(baseConfig, code, fixturePath('valid/generics.ts'), '@stylistic/type-generic-spacing').length, 0);
});

test('type-generic-spacing: espaços internos são reportados como erro e corrigidos', () => {
  const messages = messagesOf(baseConfig, 'type Mapa = Map< string , number >;\n', fileOf(TSFILE), '@stylistic/type-generic-spacing');
  assert.equal(messages.length, 2);
  assert.equal(messages[0].severity, 2);
  assert.equal(fixOnce(baseConfig, 'type Mapa = Map< string , number >;\n', fileOf(TSFILE)), 'type Mapa = Map<string, number>;\n');
});

test('type-generic-spacing: funções genéricas são corrigidas e a versão limpa fica estável', () => {
  const fixed = fixTwice(baseConfig, readFixture('invalid/generics.ts'), fixturePath('invalid/generics.ts'));
  assert.ok(fixed.once.includes('export function identidade<T>(valor: T): T {'));
  assert.ok(fixed.once.includes('export type Mapa = Map<string, number>;'));
  assert.equal(messagesOf(baseConfig, fixed.once, fixturePath('invalid/generics.ts'), '@stylistic/type-generic-spacing').length, 0);
  assert.equal(fixed.twice, fixed.once);
});

test('type-generic-spacing: parsing em TSX aceita <T,> e corrige Array< string >', () => {
  const tsx = 'export const Caixa = <T,>(props: { valor: T }) => <div>{String(props.valor)}</div>;\n';
  const messages = lint(baseConfig, tsx, fileOf(TSXFILE));
  assert.equal(messages.filter((m) => m.fatal).length, 0);
  assert.equal(messages.filter((m) => m.ruleId === '@stylistic/type-generic-spacing').length, 0);
  const fixed = fixTwice(baseConfig, 'const mapa: Map< string, number > = new Map();\n', fileOf(TSXFILE));
  assert.equal(fixed.once, 'const mapa: Map<string, number> = new Map();\n');
  assert.equal(fixed.twice, fixed.once);
});

test('type-generic-spacing: aplicada somente a TypeScript', () => {
  const code = 'type Mapa = Map< string , number >;\n';
  for (const name of [ 'regra.ts', 'regra.mts', 'regra.cts' ]) {
    assert.ok(messagesOf(baseConfig, code, fileOf(`virtual-src/${name}`), '@stylistic/type-generic-spacing').length > 0, name);
  }
});

test('type-named-tuple-spacing: válido com rótulos, opcionais e rest elements', () => {
  const code = readFixture('valid/tuples.ts');
  assert.equal(messagesOf(baseConfig, code, fixturePath('valid/tuples.ts'), '@stylistic/type-named-tuple-spacing').length, 0);
});

test('type-named-tuple-spacing: espaçamento incorreto no rótulo é corrigido e o significado não muda', () => {
  const code = 'type Coordenadas = [latitude:number, longitude : number];\n';
  const messages = messagesOf(baseConfig, code, fileOf(TSFILE), '@stylistic/type-named-tuple-spacing');
  assert.equal(messages.length, 2);
  const fixed = fixTwice(baseConfig, code, fileOf(TSFILE));
  assert.equal(fixed.once, 'type Coordenadas = [latitude: number, longitude: number];\n');
  assert.equal(fixed.twice, fixed.once);
  assert.deepEqual(typeSignature(fixed.once), typeSignature(code));
});

test('type-named-tuple-spacing: funciona dentro de type literal e não é reportado pelo key-spacing', () => {
  const code = 'type R = {\n  resultado: [sucesso:boolean, mensagem?:string];\n};\n';
  const messages = lint(baseConfig, code, fileOf(TSFILE));
  assert.equal(messages.filter((m) => m.ruleId === '@stylistic/type-named-tuple-spacing').length, 2);
  assert.equal(messages.filter((m) => m.ruleId === '@stylistic/key-spacing').length, 0);
  assert.equal(fixOnce(baseConfig, code, fileOf(TSFILE)), 'type R = {\n  resultado: [sucesso: boolean, mensagem?: string];\n};\n');
});

test('type-named-tuple-spacing: fixture inválido gera diagnósticos e autofix estável', () => {
  const fixed = fixTwice(baseConfig, readFixture('invalid/tuples.ts'), fixturePath('invalid/tuples.ts'));
  assert.ok(fixed.once.includes('[latitude: number, longitude: number]'));
  assert.ok(fixed.once.includes('[ok: boolean, mensagem?: string]'));
  assert.equal(messagesOf(baseConfig, fixed.once, fixturePath('invalid/tuples.ts'), '@stylistic/type-named-tuple-spacing').length, 0);
  assert.equal(fixed.twice, fixed.once);
});

test('type-named-tuple-spacing: aplicada somente a TypeScript', () => {
  const code = 'type C = [latitude:number];\n';
  for (const name of [ 'regra.ts', 'regra.tsx', 'regra.mts', 'regra.cts' ]) {
    assert.equal(messagesOf(baseConfig, code, fileOf(`virtual-src/${name}`), '@stylistic/type-named-tuple-spacing').length, 1, name);
  }
});

test('jsx-one-expression-per-line: válido com expressões em uma linha e com filhos em linhas separadas', () => {
  const cases = [
    'const a = <p>Olá {nome}</p>;\n',
    'const a = <p>{a} {b}</p>;\n',
    'const a = (\n  <p>\n    Olá, {nome}!\n  </p>\n);\n',
    'const a = (\n  <p>\n    {a}\n    {b}\n  </p>\n);\n',
    'const a = <><A />{b}</>;\n',
  ];
  for (const code of cases) {
    assert.equal(messagesOf(reactConfig, code, fileOf(JSXFILE), '@stylistic/jsx-one-expression-per-line').length, 0, code);
  }
});

test('jsx-one-expression-per-line: expressões na linha da abertura são reportadas como aviso e separadas', () => {
  const code = 'const a = <p>{a}\n  {b}</p>;\n';
  const messages = messagesOf(reactConfig, code, fileOf(JSXFILE), '@stylistic/jsx-one-expression-per-line');
  assert.equal(messages.length, 2);
  assert.equal(messages[0].severity, 1);
  const fixed = fixTwice(reactConfig, code, fileOf(JSXFILE));
  assert.equal(fixed.once, 'const a = (\n  <p>\n    {a}\n    {b}\n  </p>\n);\n');
  assert.equal(messagesOf(reactConfig, fixed.once, fileOf(JSXFILE), '@stylistic/jsx-one-expression-per-line').length, 0);
  assert.equal(fixed.twice, fixed.once);
});

test('jsx-one-expression-per-line: expressões juntas entre tags de uma tag multilinha são separadas na linha da abertura', () => {
  const code = 'const a = (\n  <p>{a} {b}\n  </p>\n);\n';
  assert.equal(messagesOf(reactConfig, code, fileOf(JSXFILE), '@stylistic/jsx-one-expression-per-line').length, 1);
  const fixed = fixTwice(reactConfig, code, fileOf(JSXFILE));
  assert.equal(fixed.once, 'const a = (\n  <p>\n    {a} {b}\n  </p>\n);\n');
  assert.equal(fixed.twice, fixed.once);
});

test('jsx-one-expression-per-line: aplicada somente a JSX e TSX dentro do preset React', () => {
  const code = 'const a = <p>{a}\n  {b}</p>;\n';
  assert.equal(messagesOf(reactConfig, code, fileOf('virtual-src/regra.js'), '@stylistic/jsx-one-expression-per-line').length, 0);
  assert.equal(messagesOf(reactConfig, code, fileOf(TSXFILE), '@stylistic/jsx-one-expression-per-line').length, 2);
  assert.equal(messagesOf(baseConfig, code, fileOf(JSXFILE), '@stylistic/jsx-one-expression-per-line').length, 0);
});

test('jsx-tag-spacing: válido com Componente /> e fechamentos sem espaço extra', () => {
  for (const code of [ 'const a = <Componente />;\n', 'const a = <div></div >;\n' ]) {
    assert.equal(messagesOf(reactConfig, code, fileOf(JSXFILE), '@stylistic/jsx-tag-spacing').length, 0, code);
  }
});

test('jsx-tag-spacing: espaço após < e ausência de espaço antes de /> são corrigidos', () => {
  const afterOpening = fixTwice(reactConfig, 'const a = < Componente />;\n', fileOf(JSXFILE));
  assert.equal(afterOpening.once, 'const a = <Componente />;\n');
  assert.equal(afterOpening.twice, afterOpening.once);
  const beforeSelfClosing = fixTwice(reactConfig, 'const a = <Componente/>;\n', fileOf(JSXFILE));
  assert.equal(beforeSelfClosing.once, 'const a = <Componente />;\n');
  assert.equal(beforeSelfClosing.twice, beforeSelfClosing.once);
});

test('jsx-tag-spacing: barra de fechamento com espaço é reportada como erro e corrigida', () => {
  const code = 'const a = <div>x</ div>;\n';
  const messages = messagesOf(reactConfig, code, fileOf(JSXFILE), '@stylistic/jsx-tag-spacing');
  assert.equal(messages.length, 1);
  assert.equal(messages[0].severity, 2);
  assert.equal(fixOnce(reactConfig, code, fileOf(JSXFILE)), 'const a = <div>x</div>;\n');
});

test('jsx-tag-spacing: tags multilinha permanecem válidas e o fechamento movido por closing-bracket-location é aceito', () => {
  assert.equal(messagesOf(reactConfig, 'const a = (\n  <A\n    prop="1"\n  />\n);\n', fileOf(JSXFILE), '@stylistic/jsx-tag-spacing').length, 0);
  const code = 'const a = (\n  <A\n    prop="1"\n    other="2" />\n);\n';
  assert.equal(messagesOf(reactConfig, code, fileOf(JSXFILE), '@stylistic/jsx-tag-spacing').length, 0);
  const fixed = fixTwice(reactConfig, code, fileOf(JSXFILE));
  assert.equal(fixed.once, 'const a = (\n  <A\n    prop="1"\n    other="2"\n  />\n);\n');
  assert.equal(fixed.twice, fixed.once);
});

test('jsx-tag-spacing: interação com jsx-indent-props reporta apenas a indentação das props', () => {
  const code = 'const a = (\n  <A\n      prop="1"\n  />\n);\n';
  const messages = lint(reactConfig, code, fileOf(JSXFILE));
  assert.equal(messages.filter((m) => m.ruleId === 'react/jsx-indent-props').length, 1);
  assert.equal(messages.filter((m) => m.ruleId === '@stylistic/jsx-tag-spacing').length, 0);
  const fixed = fixTwice(reactConfig, code, fileOf(JSXFILE));
  assert.equal(fixed.once, 'const a = (\n  <A\n    prop="1"\n  />\n);\n');
  assert.equal(fixed.twice, fixed.once);
});

test('jsx-tag-spacing: aplicada somente a JSX e TSX dentro do preset React', () => {
  const code = 'const a = <Componente/>;\n';
  assert.equal(messagesOf(reactConfig, code, fileOf(JSXFILE), '@stylistic/jsx-tag-spacing').length, 1);
  assert.equal(messagesOf(reactConfig, code, fileOf(TSXFILE), '@stylistic/jsx-tag-spacing').length, 1);
  assert.equal(messagesOf(reactConfig, code, fileOf('virtual-src/regra.js'), '@stylistic/jsx-tag-spacing').length, 0);
  assert.equal(messagesOf(baseConfig, code, fileOf(JSXFILE), '@stylistic/jsx-tag-spacing').length, 0);
});

test('fixtures válidos do Lote 5 não produzem diagnósticos das sete regras', () => {
  const cases = [
    [ 'valid/members.ts', baseConfig ],
    [ 'valid/generics.ts', baseConfig ],
    [ 'valid/tuples.ts', baseConfig ],
    [ 'valid/flow.js', baseConfig ],
    [ 'valid/components.tsx', reactConfig ],
  ];
  for (const [ relative, config ] of cases) {
    const messages = lint(config, readFixture(relative), fixturePath(relative)).filter((m) => NEW_RULE_NAMES.includes(m.ruleId));
    assert.deepEqual(messages.map((m) => m.ruleId), [], relative);
  }
});

test('fixtures inválidos do Lote 5 corrigem-se de forma estável sem diagnósticos restantes', () => {
  const cases = [
    [ 'invalid/members.ts', baseConfig ],
    [ 'invalid/generics.ts', baseConfig ],
    [ 'invalid/tuples.ts', baseConfig ],
    [ 'invalid/flow.js', baseConfig ],
    [ 'invalid/components.tsx', reactConfig ],
  ];
  for (const [ relative, config ] of cases) {
    const fixed = fixTwice(config, readFixture(relative), fixturePath(relative));
    assert.equal(fixed.twice, fixed.once, `${relative} estabiliza`);
    const left = lint(config, fixed.once, fixturePath(relative)).filter((m) => NEW_RULE_NAMES.includes(m.ruleId));
    assert.deepEqual(left.map((m) => m.ruleId), [], `${relative} sem diagnósticos restantes`);
  }
});

test('fixture inválido de fluxo: padding e indent-binary-ops corrigem juntos sem conflito', () => {
  const fixed = fixTwice(baseConfig, readFixture('invalid/flow.js'), fixturePath('invalid/flow.js'));
  assert.equal(fixed.once, 'export function soma(a, b) {\n  const total = a\n    + b;\n\n  return total;\n}\n');
  assert.equal(fixed.twice, fixed.once);
});

test('nenhuma das sete regras gera diagnósticos duplicados nos fixtures em todas as composições', () => {
  const cases = [
    [ 'invalid/members.ts', 'base' ],
    [ 'invalid/generics.ts', 'base' ],
    [ 'invalid/tuples.ts', 'base' ],
    [ 'invalid/flow.js', 'base' ],
    [ 'invalid/components.tsx', 'react' ],
    [ 'invalid/components.tsx', 'next' ],
  ];
  for (const [ relative, presetName ] of cases) {
    const messages = lint(lintingCompositions[presetName], readFixture(relative), fixturePath(relative));
    assert.deepEqual(duplicates(messages.filter((m) => NEW_RULE_NAMES.includes(m.ruleId))), [], `${relative} em ${presetName}`);
  }
});

test('interação de cobertura: key-spacing cobre dois-pontos em membros de tipo, mas não anotações de variáveis e parâmetros', async () => {
  const covered = [
    'type A = { a : string };\n',
    'class C {\n  a : number = 1;\n}\n',
    'type M = { [k : string] : number };\n',
  ];
  for (const code of covered) {
    assert.ok(messagesOf(baseConfig, code, fileOf(TSFILE), '@stylistic/key-spacing').length > 0, code);
  }
  const notCovered = [
    'const x : number = 1;\n',
    'function f(a : number) : void {\n}\n',
    'type F = (a : string) => void;\n',
    'type A = { a ?: string };\n',
    'type M = {\n  m (): void;\n};\n',
  ];
  for (const code of notCovered) {
    assert.equal(messagesOf(baseConfig, code, fileOf(TSFILE), '@stylistic/key-spacing').length, 0, code);
  }
  assert.equal(severityOf(await effectiveRules(baseConfig, fileOf(TSFILE)), '@stylistic/type-annotation-spacing'), 'absent');
});

test('type-annotation-spacing continua desligada e sem regra equivalente em outros plugins', async () => {
  for (const [ presetName, config ] of Object.entries(compositions)) {
    const rules = await effectiveRules(config, fileOf(TSFILE));
    assert.equal(severityOf(rules, '@stylistic/type-annotation-spacing'), 'absent', presetName);
    assert.equal(severityOf(rules, '@typescript-eslint/member-delimiter-style'), 'absent', presetName);
    assert.equal(severityOf(rules, 'react/jsx-tag-spacing'), 'absent', presetName);
    assert.equal(severityOf(rules, 'react/jsx-one-expression-per-line'), 'absent', presetName);
  }
});

test('conflito documentado: type-generic-spacing colapsa o = quebrado em genéricos, com saída estável', () => {
  const code = 'export type Box<T\n  = string> = T;\n';
  const first = fixOnce(baseConfig, code, fileOf('virtual-src/eq.ts'));
  assert.equal(first, 'export type Box<T = string> = T;\n');
  assert.equal(fixOnce(baseConfig, first, fileOf('virtual-src/eq.ts')), first);
  const isolated = [ ...baseConfig, { rules: { '@stylistic/type-generic-spacing': 'off' } } ];
  assert.equal(fixOnce(isolated, code, fileOf('virtual-src/eq.ts')), 'export type Box<T =\n  string> = T;\n');
  assert.equal(messagesOf(baseConfig, 'export type Box<T =\n  string> = T;\n', fileOf('virtual-src/eq.ts'), '@stylistic/type-generic-spacing').length, 1);
});

test('preservação: regras dos Lotes 1 a 4 mantêm severidade e opções nas composições', async () => {
  const preserved = [
    [ '@stylistic/quotes', 'error', 'single' ],
    [ '@stylistic/semi', 'error', 'always' ],
    [ '@stylistic/indent', 'error', 2, {
      ArrayExpression: 1,
      ignoredNodes: [ 'PropertyDefinition' ],
      FunctionDeclaration: { parameters: 'first', body: 1 },
      FunctionExpression: { parameters: 'first', body: 1 },
    } ],
    [ '@stylistic/operator-linebreak', 'error', 'before', { overrides: { '=': 'after' } } ],
    [ '@stylistic/max-statements-per-line', 'error', { max: 1 } ],
    [ '@stylistic/brace-style', 'error', '1tbs', { allowSingleLine: true } ],
    [ '@stylistic/array-bracket-spacing', 'error', 'always' ],
    [ '@stylistic/padded-blocks', 'error', 'never' ],
    [ 'arrow-body-style', 'error', 'as-needed' ],
    [ 'no-eval', 'error' ],
    [ 'perfectionist/sort-named-imports', 'error', { type: 'alphabetical', order: 'asc' } ],
    [ 'perfectionist/sort-named-exports', 'error', { type: 'alphabetical', order: 'asc' } ],
  ];
  const rules = await effectiveRules(compositions.react, fileOf(TSXFILE));
  for (const [ name, severity, ...rest ] of preserved) {
    assert.equal(severityOf(rules, name), SEV[severity], `${name}: severidade`);
    rest.forEach((expected, index) => {
      const actual = rules[name][index + 1];
      if (typeof expected === 'object') {
        for (const [ key, value ] of Object.entries(expected)) {
          assert.deepEqual(actual?.[key], value, `${name}: ${key}`);
        }
      } else {
        assert.equal(actual, expected, `${name}: opção ${index + 1}`);
      }
    });
  }
});

test('preservação: globais do baseConfig não ganham window e nenhum namespace antigo é registrado', async () => {
  const eslint = new ESLint({ cwd: root, overrideConfig: defineConfig(baseConfig), overrideConfigFile: true });
  const computed = await eslint.calculateConfigForFile(fileOf(JSFILE));
  assert.equal(Object.prototype.hasOwnProperty.call(computed.languageOptions.globals, 'window'), false);
  const plugins = Object.keys(computed.plugins ?? {});
  for (const forbidden of [ '@stylistic/js', 'babel', '@babel', 'blitz', '@blitz', 'paths', 'simple-import-sort', 'standard' ]) {
    assert.equal(plugins.includes(forbidden), false, forbidden);
  }
});

test('preservação: JSX já existente continua com a mesma severidade no preset React', async () => {
  const rules = await effectiveRules(compositions.react, fileOf(JSXFILE));
  assert.equal(severityOf(rules, '@stylistic/jsx-quotes'), SEV.error);
  assert.equal(severityOf(rules, '@stylistic/jsx-wrap-multilines'), SEV.error);
  assert.equal(severityOf(rules, 'react/jsx-indent-props'), SEV.error);
  assert.equal(severityOf(rules, 'react/jsx-curly-spacing'), SEV.error);
});
