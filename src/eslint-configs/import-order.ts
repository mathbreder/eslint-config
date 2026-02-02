import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Config } from 'eslint/config';
import importPlugin from 'eslint-plugin-import';

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
  // Determine filename at runtime for both ESM and CJS without triggering build-time
  // warnings. We access `import.meta.url` and `__filename` via `eval` so the
  // bundler doesn't statically detect them when producing CJS output.
  const __filename = (() => {
    try {
      // ESM: use import.meta.url via eval to avoid static analysis warnings
      // eslint-disable-next-line no-eval
      const metaUrl = eval('import.meta.url') as string;
      return fileURLToPath(metaUrl);
    } catch {
      try {
        // CJS: __filename is a local var; access it via eval
        // eslint-disable-next-line no-eval
        return eval('__filename') as string;
      } catch {
        // Fallback to process cwd (last resort)
        return path.join(process.cwd(), 'index.js');
      }
    }
  })();

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