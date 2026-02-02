import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Config } from 'eslint/config';
import importPlugin from 'eslint-plugin-import';
import { getFilename as getFilenameESM } from '../runtime/get-filename.mts';

type Severity = 'error' | 'off' | 'warn' | 0 | 1 | 2;
type ImportOrderRule = [Severity, Record<string, unknown>];

const importOrderRule: ImportOrderRule = [
  'error',
  {
    groups: [ 'builtin', 'external', 'internal', 'parent', 'sibling', 'index' ],
    pathGroups: [
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
      {
        pattern: '@match-move/**',
        group: 'internal',
      },
    ],
    'newlines-between': 'always',
    alphabetize: {
      order: 'asc',
      caseInsensitive: true,
    },
  },
];

export const getEslintImportConfig = (project?: string): Config[] => {
  // For CJS we `require` the CJS helper; for ESM we use the static import.
  let __filename: string;
  if (typeof __filename !== 'undefined') {
    // CJS runtime
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    __filename = require('../runtime/get-filename.cts').getFilename();
  } else {
    __filename = getFilenameESM();
  }

  const tsConfigPath = project || path.join(path.dirname(__filename), 'tsconfig.json');
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