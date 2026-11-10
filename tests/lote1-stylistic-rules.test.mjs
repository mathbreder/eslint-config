import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Linter } from 'eslint';

import { baseConfig, virtualFile } from './helpers.mjs';

const linter = new Linter({ configType: 'flat' });

const diagnostics = (code, filename, ruleId) => linter
  .verify(code, baseConfig, virtualFile(filename))
  .filter((message) => message.ruleId === ruleId);

const fixed = (code, filename) => linter.verifyAndFix(code, baseConfig, virtualFile(filename));

const residual = (code, filename, rules) => linter
  .verify(code, baseConfig, virtualFile(filename))
  .filter((message) => rules.includes(message.ruleId));

const NEW_RULES = [
  'arrow-body-style',
  '@stylistic/array-bracket-spacing',
  '@stylistic/arrow-parens',
  '@stylistic/arrow-spacing',
  '@stylistic/comma-style',
  '@stylistic/computed-property-spacing',
  '@stylistic/eol-last',
  '@stylistic/function-call-spacing',
];

const EXPECTED_OPTIONS = {
  'arrow-body-style': ['error', 'as-needed'],
  '@stylistic/array-bracket-spacing': ['error', 'always'],
  '@stylistic/arrow-parens': ['error', 'always'],
  '@stylistic/arrow-spacing': ['error', { before: true, after: true }],
  '@stylistic/comma-style': ['error', 'last'],
  '@stylistic/computed-property-spacing': ['error', 'never'],
  '@stylistic/eol-last': ['error', 'always'],
  '@stylistic/function-call-spacing': ['error', 'never'],
};

test('as sete regras estão configuradas com severidade error e as opções aprovadas', () => {
  const configs = baseConfig.filter((cfg) => cfg.rules);
  const rules = Object.assign({}, ...configs.map((cfg) => cfg.rules));
  for (const rule of NEW_RULES) {
    assert.deepEqual(rules[rule], EXPECTED_OPTIONS[rule], rule);
  }
});

test('nenhuma regra equivalente é registrada em duplicidade (babel/* ausente)', () => {
  const configs = baseConfig.filter((cfg) => cfg.rules);
  const rules = Object.assign({}, ...configs.map((cfg) => cfg.rules));
  for (const name of Object.keys(rules)) assert.equal(name.startsWith('babel/'), false, name);
});

test('array-bracket-spacing: exige espaço interno e aceita arrays vazios', () => {
  assert.equal(diagnostics('const a = [ 1, 2, 3 ];\n', 'arr.js', '@stylistic/array-bracket-spacing').length, 0);
  assert.equal(diagnostics('const a = [];\n', 'arr-empty.js', '@stylistic/array-bracket-spacing').length, 0);
  const bad = diagnostics('const a = [1, 2, 3];\n', 'arr-bad.js', '@stylistic/array-bracket-spacing');
  assert.equal(bad.length, 2);
  assert.equal(bad[0].severity, 2);
});

test('array-bracket-spacing: autofix adiciona os espaços e não deixa resíduos', () => {
  const { output } = fixed('const a = [1, 2, 3];\n', 'arr-fix.js');
  assert.equal(output, 'const a = [ 1, 2, 3 ];\n');
  assert.equal(residual(output, 'arr-fix.js', ['@stylistic/array-bracket-spacing']).length, 0);
});

test('array-bracket-spacing e array-bracket-newline são compatíveis em array multilinha', () => {
  const code = 'const a = [\n  1,\n  2,\n];\n';
  assert.equal(residual(code, 'interact.js', ['@stylistic/array-bracket-spacing', '@stylistic/array-bracket-newline']).length, 0);
});

test('arrow-parens: exige parênteses em todos os parâmetros de arrow function', () => {
  assert.equal(diagnostics('const f = (value) => value;\n', 'ap.js', '@stylistic/arrow-parens').length, 0);
  const bad = diagnostics('const f = value => value;\n', 'ap-bad.js', '@stylistic/arrow-parens');
  assert.equal(bad.length, 1);
  assert.equal(bad[0].severity, 2);
});

test('arrow-parens: autofix adiciona parênteses', () => {
  const { output } = fixed('const f = value => value;\n', 'ap-fix.js');
  assert.equal(output, 'const f = (value) => value;\n');
});

test('arrow-spacing: exige espaço antes e depois de =>', () => {
  assert.equal(diagnostics('const f = (v) => v;\n', 'as.js', '@stylistic/arrow-spacing').length, 0);
  assert.equal(diagnostics('const f = (v)=>v;\n', 'as-bad.js', '@stylistic/arrow-spacing').length, 2);
});

test('arrow-spacing e arrow-parens juntos em TypeScript', () => {
  const code = 'const f = (value: number): number => value * 2;\n';
  assert.equal(residual(code, 'as-ts.ts', ['@stylistic/arrow-spacing', '@stylistic/arrow-parens']).length, 0);
});

test('comma-style: exige vírgula no fim da linha, não no início da seguinte', () => {
  assert.equal(diagnostics('const a = [\n  1,\n  2\n];\n', 'cs.js', '@stylistic/comma-style').length, 0);
  const bad = diagnostics('const a = [\n  1\n  , 2\n];\n', 'cs-bad.js', '@stylistic/comma-style');
  assert.equal(bad.length, 1);
  assert.equal(bad[0].severity, 2);
});

test('comma-style e comma-dangle não contradizem a vírgula final em multilinha', () => {
  const code = 'const o = {\n  a: 1,\n  b: 2,\n};\n';
  assert.equal(residual(code, 'cs-dangle.js', ['@stylistic/comma-style', '@stylistic/comma-dangle']).length, 0);
});

test('computed-property-spacing: proíbe espaços dentro de colchetes de propriedade', () => {
  assert.equal(diagnostics('obj[key];\n', 'cp.js', '@stylistic/computed-property-spacing').length, 0);
  const bad = diagnostics('obj[ key ];\n', 'cp-bad.js', '@stylistic/computed-property-spacing');
  assert.equal(bad.length, 2);
  assert.equal(bad[0].severity, 2);
});

test('computed-property-spacing: autofix remove os espaços', () => {
  const { output } = fixed('obj[ key ];\n', 'cp-fix.js');
  assert.equal(output, 'obj[key];\n');
});

test('eol-last: exige quebra de linha no fim do arquivo', () => {
  assert.equal(diagnostics('const a = 1;\n', 'eol.js', '@stylistic/eol-last').length, 0);
  const bad = diagnostics('const a = 1;', 'eol-bad.js', '@stylistic/eol-last');
  assert.equal(bad.length, 1);
  assert.equal(bad[0].severity, 2);
});

test('eol-last: autofix adiciona a quebra e não deixa resíduos', () => {
  const { output } = fixed('const a = 1;', 'eol-fix.js');
  assert.equal(output, 'const a = 1;\n');
  assert.equal(residual(output, 'eol-fix.js', ['@stylistic/eol-last']).length, 0);
});

test('function-call-spacing: proíbe espaço entre o nome e os parênteses', () => {
  assert.equal(diagnostics('execute();\n', 'fc.js', '@stylistic/function-call-spacing').length, 0);
  const bad = diagnostics('execute ();\n', 'fc-bad.js', '@stylistic/function-call-spacing');
  assert.equal(bad.length, 1);
  assert.equal(bad[0].severity, 2);
});

test('function-call-spacing: aceita chamada genérica em TypeScript sem espaço', () => {
  const code = 'const v = parse<number>("1");\n';
  assert.equal(residual(code, 'fc-generic.ts', ['@stylistic/function-call-spacing']).length, 0);
});

test('código válido de todas as sete regras não produz nenhum diagnóstico', () => {
  const code = [
    'const values = [ 1, 2, 3 ];',
    'const double = (value) => value * 2;',
    'const key = "a";',
    'const item = values[key];',
    'const result = double(values[0]);',
    '',
  ].join('\n');
  assert.equal(residual(code, 'valid-all.js', NEW_RULES).length, 0);
});

test('o autofix das sete regras converge: nenhum diagnóstico depois da correção', () => {
  const code = 'const f = value=>value;\nconst a = [1, 2]\nconst b = f(a[ 0 ]) ;';
  const { output } = fixed(code, 'converge.js');
  assert.equal(residual(output, 'converge.js', NEW_RULES).length, 0, output);
});

test('regras já aprovadas mantêm a mesma severidade e as mesmas opções', () => {
  const configs = baseConfig.filter((cfg) => cfg.rules);
  const rules = Object.assign({}, ...configs.map((cfg) => cfg.rules));
  assert.deepEqual(rules['@stylistic/array-bracket-newline'], ['error', { multiline: true }]);
  assert.deepEqual(rules['@stylistic/array-element-newline'], ['error', 'consistent']);
  assert.deepEqual(rules['@stylistic/block-spacing'], ['error', 'always']);
  assert.deepEqual(rules['@stylistic/brace-style'], ['error', '1tbs', { allowSingleLine: true }]);
  assert.deepEqual(rules['@stylistic/comma-spacing'], ['error', { before: false, after: true }]);
  assert.deepEqual(rules['@stylistic/comma-dangle'], ['error', 'always-multiline']);
  assert.deepEqual(rules['@stylistic/dot-location'], ['error', 'property']);
});

test('JSX: arrow functions em props seguem arrow-parens e arrow-spacing', () => {
  const valid = 'const C = () => <button onClick={() => run()}>ok</button>;\n';
  assert.equal(residual(valid, 'component.jsx', ['@stylistic/arrow-parens', '@stylistic/arrow-spacing']).length, 0);
  const invalid = 'const C = () => <ul>{items.map(item => <li key={item}>{item}</li>)}</ul>;\n';
  const found = residual(invalid, 'component-bad.jsx', ['@stylistic/arrow-parens']);
  assert.equal(found.length, 1);
  assert.equal(found[0].severity, 2);
});

test('TSX: array-bracket-spacing e function-call-spacing valem em JSX com genéricos', () => {
  const code = 'const list = [ 1, 2 ];\nexport const View = () => <p>{pick<number>(list)}</p>;\n';
  assert.equal(residual(code, 'view.tsx', ['@stylistic/array-bracket-spacing', '@stylistic/function-call-spacing']).length, 0);
  const bad = 'const list = [1, 2];\n';
  assert.equal(residual(bad, 'view-bad.tsx', ['@stylistic/array-bracket-spacing']).length, 2);
});

test('TSX: eol-last e computed-property-spacing em arquivo de componente', () => {
  const bad = 'const key = "a";\nexport const View = ({ data }: { data: Record<string, string> }) => <p>{data[ key ]}</p>;';
  const found = residual(bad, 'view-eol.tsx', ['@stylistic/eol-last', '@stylistic/computed-property-spacing']);
  assert.equal(found.filter((m) => m.ruleId === '@stylistic/eol-last').length, 1);
  assert.equal(found.filter((m) => m.ruleId === '@stylistic/computed-property-spacing').length, 2);
});

test('arrow-body-style: bloco com retorno simples é reportado com severidade error', () => {
  const bad = diagnostics('const f = (v) => { return v * 2; };\n', 'abs-simple-bad.js', 'arrow-body-style');
  assert.equal(bad.length, 1);
  assert.equal(bad[0].severity, 2);
});

test('arrow-body-style: expressão simples é aceita', () => {
  assert.equal(diagnostics('const f = (v) => v * 2;\n', 'abs-simple.js', 'arrow-body-style').length, 0);
});

test('arrow-body-style: retorno de objeto literal entre parênteses é aceito', () => {
  assert.equal(diagnostics('const f = () => ({ a: 1 });\n', 'abs-object.js', 'arrow-body-style').length, 0);
});

test('arrow-body-style: bloco que retorna objeto literal sem necessidade é reportado', () => {
  const bad = diagnostics('const f = () => { return { a: 1 }; };\n', 'abs-object-bad.js', 'arrow-body-style');
  assert.equal(bad.length, 1);
  assert.equal(bad[0].severity, 2);
});

test('arrow-body-style: bloco com múltiplas instruções é aceito', () => {
  const code = 'const f = (v) => {\n  const doubled = v * 2;\n  return doubled;\n};\n';
  assert.equal(diagnostics(code, 'abs-multi.js', 'arrow-body-style').length, 0);
});

test('arrow-body-style: autofix converte retorno simples em expressão', () => {
  const { output } = fixed('const f = (v) => { return v * 2; };\n', 'abs-fix-simple.js');
  assert.equal(output, 'const f = (v) => v * 2;\n');
  assert.equal(residual(output, 'abs-fix-simple.js', ['arrow-body-style']).length, 0);
});

test('arrow-body-style: autofix mantém o objeto literal entre parênteses', () => {
  const { output } = fixed('const f = () => { return { a: 1 }; };\n', 'abs-fix-object.js');
  assert.equal(output, 'const f = () => ({ a: 1 });\n');
  assert.equal(residual(output, 'abs-fix-object.js', ['arrow-body-style']).length, 0);
});

test('arrow-body-style: autofix não altera bloco com múltiplas instruções', () => {
  const code = 'const f = (v) => {\n  const doubled = v * 2;\n  return doubled;\n};\n';
  assert.equal(residual(code, 'abs-fix-multi.js', ['arrow-body-style']).length, 0);
  const output = fixed(code, 'abs-fix-multi.js').output;
  assert.equal(output, 'const f = (v) => {\n  const doubled = v * 2;\n\n  return doubled;\n};\n');
  assert.equal(output.replace('\n\n  return', '\n  return'), code);
});
