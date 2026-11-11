import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { createRequire } from 'node:module';

import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';

import { preferPathAlias } from '../dist/index.js';

import { root } from './helpers.mjs';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const FIXTURE = path.join(root, 'tests/fixtures/path-alias');
const file = (name) => path.join(FIXTURE, 'src', name);
const BASE_PROJECT = path.join(FIXTURE, 'tsconfig.json');
const OVERLAP_PROJECT = path.join(FIXTURE, 'tsconfig.overlap.json');
const alias = (value, specifier) => ({ messageId: 'preferAlias', data: { alias: value, specifier } });

const tester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  },
});

tester.run('prefer-path-alias (casos adicionais)', preferPathAlias, {
  valid: [
    {
      code: "export const lazy = () => import('../shared/value');\n",
      filename: file('feature/dynamic.ts'),
      options: [{ project: BASE_PROJECT }],
    },
    {
      code: "import { value } from '../shared/value';\nexport const v = value;\n",
      filename: file('feature/page.ts'),
      options: [{ project: [ path.join(FIXTURE, 'tsconfig.absent.json') ] }],
    },
  ],
  invalid: [
    {
      code: "import { value } from '../shared/value';\n\nexport const Card = () => value;\n",
      filename: file('feature/card.tsx'),
      options: [{ project: BASE_PROJECT }],
      errors: [alias('@/shared/value', '../shared/value')],
      output: "import { value } from '@/shared/value';\n\nexport const Card = () => value;\n",
    },
    {
      code: "export type { Shape } from '../shared/types';\n",
      filename: file('feature/type-reexport.ts'),
      options: [{ project: BASE_PROJECT }],
      errors: [alias('@/shared/types', '../shared/types')],
      output: "export type { Shape } from '@/shared/types';\n",
    },
    {
      code: "import { value } from '../shared/value';\nexport const v = value;\n",
      filename: file('feature/page.ts'),
      options: [{ project: [ path.join(FIXTURE, 'tsconfig.absent.json'), OVERLAP_PROJECT ] }],
      errors: [alias('@shared/value', '../shared/value')],
      output: "import { value } from '@shared/value';\nexport const v = value;\n",
    },
  ],
});

describe('entrypoint CJS', () => {
  it('exporta o plugin e a regra quando carregado via require', () => {
    const requireDist = createRequire(import.meta.url);
    const cjs = requireDist(path.join(root, 'dist/index.cjs'));

    assert.equal(typeof cjs.mathbrederPlugin.rules['prefer-path-alias'].create, 'function');
    assert.equal(typeof cjs.clearPathAliasCaches, 'function');
    assert.ok(fs.existsSync(path.join(root, 'dist/index.cjs')));
  });
});
