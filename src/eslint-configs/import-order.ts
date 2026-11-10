import type { Config } from 'eslint/config';
import importPlugin from 'eslint-plugin-import';

type Severity = 'error' | 'off' | 'warn' | 0 | 1 | 2;
type ImportOrderRule = [Severity, Record<string, unknown>];

export type ImportGroup = 'builtin' | 'external' | 'index' | 'internal' | 'object' | 'parent' | 'sibling' | 'type';

export type PathGroup = { pattern: string; group: ImportGroup; position?: 'after' | 'before' };

const defaultPathGroups: PathGroup[] = [
  {
    pattern: 'react',
    group: 'external',
    position: 'before',
  },
];

export type GetEslintImportConfigOptions = {
  project?: string | string[];
  pathGroups?: PathGroup[];
  noUnresolvedIgnore?: string[];
};

export { importPlugin };

const TYPESCRIPT_IMPORT_EXTENSIONS = [ '.ts', '.cts', '.mts', '.tsx', '.js', '.jsx', '.mjs', '.cjs' ];

export const getEslintImportConfig = (opts?: GetEslintImportConfigOptions): Config[] => {
  const extraPathGroups = opts?.pathGroups ?? [];
  const noUnresolvedIgnore = opts?.noUnresolvedIgnore ?? [];

  const importOrderRule: ImportOrderRule = [
    'error',
    {
      groups: [ 'builtin', 'external', 'internal', 'parent', 'sibling', 'index' ],
      pathGroups: [
        ...defaultPathGroups,
        ...extraPathGroups,
      ],
      pathGroupsExcludedImportTypes: [ 'builtin' ],
      'newlines-between': 'always',
      alphabetize: {
        order: 'asc',
        caseInsensitive: true,
      },
    },
  ];

  const typescriptResolverOptions = opts?.project === undefined ? {} : { project: opts.project };

  return [
    {
      name: 'eslint-import-resolver',
      files: [ '**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}' ],
      plugins: {
        import: importPlugin,
      },
      settings: {
        'import/extensions': TYPESCRIPT_IMPORT_EXTENSIONS,
        'import/resolver': {
          typescript: typescriptResolverOptions,
          node: true,
        },
      },
      rules: {
      // Import order & organization
        'import/order': importOrderRule,
        'import/no-unresolved': noUnresolvedIgnore.length > 0
          ? [ 'error', { ignore: noUnresolvedIgnore } ]
          : 'error',
        'import/no-cycle': [ 'warn', { disableScc: true } ],
      },
    },
  ];
};
