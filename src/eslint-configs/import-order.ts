import path from 'node:path';

import type { Config } from 'eslint/config';
import importPlugin from 'eslint-plugin-import';

import { getFilename as getFilenameESM } from '../runtime/get-filename.mts';

type Severity = 'error' | 'off' | 'warn' | 0 | 1 | 2;
type ImportOrderRule = [Severity, Record<string, unknown>];

type PathGroup = { pattern: string; group?: string; position?: 'after' | 'before' };

const defaultPathGroups: PathGroup[] = [
  {
    pattern: 'react',
    group: 'external',
    position: 'before',
  },
  {
    pattern: '@web/**',
    group: 'internal',
  },
  {
    pattern: '@mobile/**',
    group: 'internal',
  },
  {
    pattern: '@api/**',
    group: 'internal',
  },
  {
    pattern: '@shared/**',
    group: 'internal',
  },
  {
    pattern: '@db',
    group: 'internal',
  },
];

export type GetEslintImportConfigOptions = {
  project?: string;
  pathGroups?: PathGroup[];
};

export const getEslintImportConfig = (opts?: GetEslintImportConfigOptions): Config[] => {
  const project = opts?.project;
  const extraPathGroups = opts?.pathGroups ?? [];

  // For CJS we `require` the CJS helper; for ESM we use the static import.
  let __filename: string;
  if (typeof __filename !== 'undefined') {
    // CJS runtime

    __filename = require('../runtime/get-filename.cts').getFilename();
  } else {
    __filename = getFilenameESM();
  }

  const tsConfigPath = project || path.join(path.dirname(__filename), 'tsconfig.json');

  const importOrderRule: ImportOrderRule = [
    'error',
    {
      groups: [ 'builtin', 'external', 'internal', 'parent', 'sibling', 'index' ],
      pathGroups: [
        ...defaultPathGroups,
        ...extraPathGroups,
      ],
      'newlines-between': 'always',
      alphabetize: {
        order: 'asc',
        caseInsensitive: true,
      },
    },
  ];

  return [
    {
      name: 'eslint-import-resolver',
      files: ['**/*.{js,jsx,ts,tsx}'],
      plugins: {
        import: importPlugin,
      },
      settings: {
        'import/resolver': {
          typescript: {
            project: tsConfigPath,
          },
          node: true,
        },
      },
      rules: {
      // Import order & organization
        'import/order': importOrderRule,
        'import/no-unresolved': 'error',
        'import/no-cycle': 'warn',
      },
    },
  ];
};