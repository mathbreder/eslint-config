import js from '@eslint/js';
import comments from '@eslint-community/eslint-plugin-eslint-comments';
import stylistic from '@stylistic/eslint-plugin';
import { defineConfig, globalIgnores } from 'eslint/config';
import perfectionist from 'eslint-plugin-perfectionist';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const perfectionistSortTypesGroups = [
  'conditional',
  'function',
  'import',
  'intersection',
  'keyword',
  'literal',
  'named',
  'operator',
  'union',
  'nullish',
  'tuple',
  'object',
];

export const baseConfig = defineConfig([
  // Base config
  {
    name: 'eslint-js-recommended',
    ...js.configs.recommended,
  },
  // Override default ignores
  globalIgnores([
    '**/.env',
    '**/.env.*',
    '**/.specstory/**',
    '**/.vite/**',
    '**/coverage/**',
    '**/node_modules/**',
    '**/pnpm-lock.yaml',
    '**/dist/**',
    '**/.next/**',
    '**/out/**',
  ]),
  {
    name: 'eslint-base',
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      '@stylistic': stylistic,
      perfectionist,
      'eslint-comments': comments,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      // ESLint default rules
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'error',
      'no-unused-vars': ['off'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],
      'complexity': ['warn', { max: 10 }],
      'max-nested-callbacks': ['warn', { max: 3 }],
      'no-duplicate-imports': 'error',
      'func-style': ['error', 'expression'],

      // Typescript specific rules
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/no-explicit-any': 'error',

      // Perfectionist rules
      'perfectionist/sort-intersection-types': [
        'error',
        {
          'type': 'unsorted',
          'newlinesBetween': 0,
          'groups': perfectionistSortTypesGroups,
        },
      ],
      'perfectionist/sort-union-types': [
        'error',
        {
          'newlinesBetween': 0,
          'groups': perfectionistSortTypesGroups,
        },
      ],

      // Stylistic rules (general, non-JSX)
      '@stylistic/array-bracket-newline': ['error', { 'multiline': true }],
      '@stylistic/array-element-newline': ['error', 'consistent'],
      '@stylistic/block-spacing': ['error', 'always'],
      '@stylistic/brace-style': ['error', '1tbs', { 'allowSingleLine': true }],
      '@stylistic/comma-spacing': ['error', { 'before': false, 'after': true }],
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      '@stylistic/dot-location': ['error', 'property'],
      '@stylistic/indent': ['error', 2],
      '@stylistic/linebreak-style': ['error', 'unix'],
      '@stylistic/max-len': [
        'error',
        {
          'code': 100,
          'ignoreUrls': true,
          'ignoreStrings': true,
          'ignoreTemplateLiterals': true,
          'ignoreRegExpLiterals': true,
        },
      ],
      '@stylistic/no-multi-spaces': ['error'],
      '@stylistic/no-multiple-empty-lines': ['error', { 'max': 1, 'maxEOF': 1 }],
      '@stylistic/no-trailing-spaces': ['error'],
      '@stylistic/object-curly-newline': [
        'error',
        {
          'multiline': true,
          'consistent': true,
        },
      ],
      '@stylistic/object-curly-spacing': ['error', 'always'],
      '@stylistic/object-property-newline': ['error', { 'allowAllPropertiesOnSameLine': true }],
      '@stylistic/quotes': ['error', 'single'],
      '@stylistic/semi': ['error', 'always'],
      '@stylistic/space-in-parens': ['error', 'never'],

      // Require descriptions for eslint directive comments
      'eslint-comments/require-description': ['error', { 'ignore': [] }],
    },
  },
  {
    name: 'eslint-jest',
    files: [
      '**/*.{test,spec}.{ts,tsx}',
      '**/__tests__/**/*.{ts,tsx}',
      '**/tests/**/*.{ts,tsx}',
      '**/test/**/*.{ts,tsx}',
      'jest.setup.ts',
      'jest.config.ts',
    ],
    rules: {
      'max-lines-per-function': 'off',
      'complexity': 'off',
    },
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
]);