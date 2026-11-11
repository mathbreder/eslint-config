import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { Linter, RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';

import { clearPathAliasCaches, getEslintImportConfig, mathbrederPlugin, preferPathAlias } from '../dist/index.js';

import { root } from './helpers.mjs';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const FIXTURE = path.join(root, 'tests/fixtures/path-alias');
const file = (name) => path.join(FIXTURE, 'src', name);
const BASE_PROJECT = path.join(FIXTURE, 'tsconfig.json');
const OVERLAP_PROJECT = path.join(FIXTURE, 'tsconfig.overlap.json');
const readSource = (name) => fs.readFileSync(file(name), 'utf8');
const alias = (value, specifier) => ({ messageId: 'preferAlias', data: { alias: value, specifier } });
const parserOptions = { parser: tseslint.parser, parserOptions: { ecmaVersion: 'latest', sourceType: 'module' } };

const tester = new RuleTester({ languageOptions: parserOptions });

tester.run('prefer-path-alias', preferPathAlias, {
  valid: [
    {
      code: "import { helper } from './helper';\nexport const v = helper;\n",
      filename: file('feature/local.ts'),
      options: [{ project: BASE_PROJECT }],
    },
    {
      code: "import { value } from '@/shared/value';\nexport const v = value;\n",
      filename: file('feature/aliased.ts'),
      options: [{ project: BASE_PROJECT }],
    },
    {
      code: "import { missing } from '../nope/missing';\nexport const v = missing;\n",
      filename: file('feature/absent.ts'),
      options: [{ project: BASE_PROJECT }],
    },
    {
      code: "import { util } from '../../outside/util';\nexport const v = util;\n",
      filename: file('feature/outside-user.ts'),
      options: [{ project: BASE_PROJECT }],
    },
    {
      code: "import { value } from '../shared/value';\nexport const v = value;\n",
      filename: file('feature/page.ts'),
      options: [{ project: 'tsconfig-que-nao-existe.json' }],
    },
    {
      code: "import { value } from '../shared/value';\nexport const v = value;\n",
      filename: '<text>',
    },
  ],
  invalid: [
    {
      code: "import { value } from '../shared/value';\nexport const v = value;\n",
      filename: file('feature/page.ts'),
      options: [{ project: BASE_PROJECT }],
      errors: [alias('@/shared/value', '../shared/value')],
      output: "import { value } from '@/shared/value';\nexport const v = value;\n",
    },
    {
      code: "import { value } from '../../../shared/value';\nexport const v = value;\n",
      filename: file('feature/deep/nested/view.ts'),
      options: [{ project: BASE_PROJECT }],
      errors: [alias('@/shared/value', '../../../shared/value')],
      output: "import { value } from '@/shared/value';\nexport const v = value;\n",
    },
    {
      code: "import type { Shape } from '../shared/types';\nexport type S = Shape;\n",
      filename: file('feature/page.ts'),
      options: [{ project: BASE_PROJECT }],
      errors: [alias('@/shared/types', '../shared/types')],
      output: "import type { Shape } from '@/shared/types';\nexport type S = Shape;\n",
    },
    {
      code: "export { value } from '../shared/value';\n",
      filename: file('feature/reexport.ts'),
      options: [{ project: BASE_PROJECT }],
      errors: [alias('@/shared/value', '../shared/value')],
      output: "export { value } from '@/shared/value';\n",
    },
    {
      code: "export * from '../shared/types';\n",
      filename: file('feature/reexport.ts'),
      options: [{ project: BASE_PROJECT }],
      errors: [alias('@/shared/types', '../shared/types')],
      output: "export * from '@/shared/types';\n",
    },
    {
      code: "import '../shared/value';\n",
      filename: file('feature/side-effect.ts'),
      options: [{ project: BASE_PROJECT }],
      errors: [alias('@/shared/value', '../shared/value')],
      output: "import '@/shared/value';\n",
    },
    {
      code: "import { value } from '../shared';\nexport const v = value;\n",
      filename: file('feature/indexed.ts'),
      options: [{ project: BASE_PROJECT }],
      errors: [alias('@/shared', '../shared')],
      output: "import { value } from '@/shared';\nexport const v = value;\n",
    },
    {
      code: "import { value } from '../shared/value';\nexport const v = value;\n",
      filename: file('feature/page.ts'),
      options: [{ project: OVERLAP_PROJECT }],
      errors: [alias('@shared/value', '../shared/value')],
      output: "import { value } from '@shared/value';\nexport const v = value;\n",
    },
    {
      code: 'import   {  value }   from "../shared/value" // mantem comentario\n\nexport const v = value;\n',
      filename: file('feature/page.ts'),
      options: [{ project: BASE_PROJECT }],
      errors: [alias('@/shared/value', '../shared/value')],
      output: 'import   {  value }   from "@/shared/value" // mantem comentario\n\nexport const v = value;\n',
    },
  ],
});

describe('prefer-path-alias (comportamento)', () => {
  const linter = new Linter({ configType: 'flat' });
  const config = (options) => [{
    files: [ '**/*.ts', '**/*.tsx' ],
    languageOptions: parserOptions,
    plugins: { mathbreder: mathbrederPlugin },
    rules: { 'mathbreder/prefer-path-alias': [ 'error', options ] },
  }];

  it('é determinística entre execuções e entre o cache frio e o aquecido', () => {
    const code = readSource('feature/page.ts');
    const options = { project: OVERLAP_PROJECT };

    clearPathAliasCaches();
    const cold = linter.verify(code, config(options), file('feature/page.ts')).map((m) => m.message);
    const warm = linter.verify(code, config(options), file('feature/page.ts')).map((m) => m.message);

    assert.deepEqual(cold, warm);
  });

  it('autofix é idempotente: a segunda passada não reporta nem altera nada', () => {
    const options = { project: BASE_PROJECT };
    const first = linter.verifyAndFix(readSource('feature/page.ts'), config(options), file('feature/page.ts'));

    assert.equal(first.fixed, true);
    assert.equal(first.messages.length, 0);
    assert.equal(linter.verify(first.output, config(options), file('feature/page.ts')).length, 0);
    assert.equal(linter.verifyAndFix(first.output, config(options), file('feature/page.ts')).fixed, false);
  });

  it('desempenho: centenas de imports resolvem em tempo curto graças ao cache', () => {
    const lines = Array.from({ length: 400 }, (_, index) => `import { value as v${index} } from '../shared/value';`);
    const names = lines.map((_, index) => `v${index}`).join(', ');
    const code = `${lines.join('\n')}\nexport const all = [${names}];\n`;
    const start = performance.now();
    const messages = linter.verify(code, config({ project: BASE_PROJECT }), file('feature/page.ts'));
    const elapsed = performance.now() - start;

    assert.equal(messages.length, 400);
    assert.ok(elapsed < 5000, `demorou ${Math.round(elapsed)} ms`);
  });
});

describe('getEslintImportConfig (integração)', () => {
  it('inclui o plugin interno e não contém mais import/no-relative-parent-imports', () => {
    const configs = getEslintImportConfig({ project: OVERLAP_PROJECT });
    const rules = Object.assign({}, ...configs.map((entry) => entry.rules ?? {}));

    assert.equal(rules['import/no-relative-parent-imports'], undefined);
    assert.deepEqual(rules['mathbreder/prefer-path-alias'], [ 'error', { project: OVERLAP_PROJECT } ]);
    assert.ok(configs.some((entry) => entry.plugins?.mathbreder === mathbrederPlugin));
  });

  it('a configuração publicada reporta e corrige com o alias mais específico', () => {
    const linter = new Linter({ configType: 'flat' });
    const configs = [
      ...getEslintImportConfig({ project: OVERLAP_PROJECT }),
      { files: [ '**/*.ts' ], languageOptions: parserOptions },
    ];
    const messages = linter
      .verify(readSource('feature/page.ts'), configs, file('feature/page.ts'))
      .filter((message) => message.ruleId === 'mathbreder/prefer-path-alias');

    assert.equal(messages.length, 2);
    assert.equal(messages[0].fix.text, "'@shared/value'");
  });
});
