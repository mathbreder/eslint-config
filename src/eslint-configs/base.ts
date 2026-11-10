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
    files: [ '**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}' ],
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
      'arrow-body-style': [ 'error', 'as-needed' ],
      'no-unused-vars': [ 'off' ],
      'no-console': [ 'warn', { allow: [ 'warn', 'error' ] } ],
      'no-debugger': 'error',
      'max-lines-per-function': [ 'warn', { max: 80, skipBlankLines: true, skipComments: true } ],
      complexity: [ 'warn', { max: 10 } ],
      'max-nested-callbacks': [ 'warn', { max: 3 } ],
      'no-duplicate-imports': 'error',
      'func-style': [ 'error', 'expression' ],
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'no-unsafe-optional-chaining': [ 'error', { disallowArithmeticOperators: true } ],
      eqeqeq: [ 'error', 'always' ],
      'max-depth': 'warn',
      'max-params': [
        'warn',
        {
          max: 5,
        },
      ],
      'no-else-return': 'warn',
      'no-nested-ternary': 'warn',
      'no-useless-return': 'warn',
      'object-shorthand': 'warn',
      'prefer-template': 'warn',
      'no-unassigned-vars': 'error',
      'no-useless-assignment': 'error',
      'preserve-caught-error': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-throw-literal': 'error',
      'no-use-before-define': [ 'warn', { functions: false, classes: true, variables: true } ],
      'no-useless-constructor': 'warn',
      'prefer-promise-reject-errors': 'error',
      'require-await': 'warn',

      // Typescript specific rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          caughtErrors: 'all',
          ignoreRestSiblings: true,
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/consistent-type-definitions': [ 'error', 'type' ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-misused-new': 'error',
      '@typescript-eslint/triple-slash-reference': 'error',
      '@typescript-eslint/no-extra-non-null-assertion': 'error',
      '@typescript-eslint/no-wrapper-object-types': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          minimumDescriptionLength: 10,
        },
      ],
      '@typescript-eslint/no-array-constructor': 'error',
      '@typescript-eslint/no-duplicate-enum-values': 'error',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'error',
      '@typescript-eslint/no-unsafe-declaration-merging': 'error',
      '@typescript-eslint/no-unsafe-function-type': 'error',
      '@typescript-eslint/no-unused-expressions': 'error',
      '@typescript-eslint/prefer-as-const': 'error',
      '@typescript-eslint/prefer-namespace-keyword': 'error',

      // Perfectionist rules
      'perfectionist/sort-intersection-types': [
        'error',
        {
          type: 'unsorted',
          newlinesBetween: 0,
          groups: perfectionistSortTypesGroups,
        },
      ],
      'perfectionist/sort-union-types': [
        'error',
        {
          newlinesBetween: 0,
          groups: perfectionistSortTypesGroups,
        },
      ],

      'perfectionist/sort-named-imports': [
        'error',
        {
          type: 'alphabetical',
          order: 'asc',
        },
      ],
      'perfectionist/sort-named-exports': [
        'error',
        {
          type: 'alphabetical',
          order: 'asc',
        },
      ],

      // Stylistic rules (general, non-JSX)
      '@stylistic/array-bracket-newline': [ 'error', { multiline: true } ],
      '@stylistic/array-bracket-spacing': [ 'error', 'always' ],
      '@stylistic/array-element-newline': [ 'error', 'consistent' ],
      '@stylistic/arrow-parens': [ 'error', 'always' ],
      '@stylistic/arrow-spacing': [ 'error', { before: true, after: true } ],
      '@stylistic/block-spacing': [ 'error', 'always' ],
      '@stylistic/brace-style': [ 'error', '1tbs', { allowSingleLine: true } ],
      '@stylistic/comma-spacing': [ 'error', { before: false, after: true } ],
      '@stylistic/comma-dangle': [ 'error', 'always-multiline' ],
      '@stylistic/comma-style': [ 'error', 'last' ],
      '@stylistic/computed-property-spacing': [ 'error', 'never' ],
      '@stylistic/dot-location': [ 'error', 'property' ],
      '@stylistic/indent': [
        'error',
        2,
        {
          ArrayExpression: 1,
          ignoredNodes: [ 'PropertyDefinition' ],
          FunctionDeclaration: {
            parameters: 'first',
            body: 1,
          },
          FunctionExpression: {
            parameters: 'first',
            body: 1,
          },
        },
      ],
      '@stylistic/linebreak-style': [ 'error', 'unix' ],
      '@stylistic/max-len': [
        'error',
        {
          code: 100,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true,
        },
      ],
      '@stylistic/no-multi-spaces': [ 'error' ],
      '@stylistic/no-multiple-empty-lines': [ 'error', { max: 1, maxBOF: 0, maxEOF: 1 } ],
      '@stylistic/no-trailing-spaces': [ 'error' ],
      '@stylistic/object-curly-newline': [
        'error',
        {
          multiline: true,
          consistent: true,
        },
      ],
      '@stylistic/object-curly-spacing': [ 'error', 'always' ],
      '@stylistic/object-property-newline': [ 'error', { allowAllPropertiesOnSameLine: true } ],
      '@stylistic/quotes': [ 'error', 'single' ],
      '@stylistic/semi': [ 'error', 'always' ],
      '@stylistic/no-extra-semi': 'error',
      '@stylistic/space-in-parens': [ 'error', 'never' ],
      '@stylistic/eol-last': [ 'error', 'always' ],
      '@stylistic/function-call-spacing': [ 'error', 'never' ],
      '@stylistic/function-call-argument-newline': [ 'error', 'consistent' ],
      '@stylistic/function-paren-newline': [ 'error', 'multiline-arguments' ],
      '@stylistic/generator-star-spacing': [ 'error', 'after' ],
      '@stylistic/key-spacing': [ 'error', { beforeColon: false, afterColon: true } ],
      '@stylistic/keyword-spacing': [ 'error', { before: true, after: true } ],
      '@stylistic/max-statements-per-line': [ 'error', { max: 1 } ],
      '@stylistic/multiline-ternary': [ 'error', 'always-multiline' ],
      '@stylistic/new-parens': [ 'error', 'always' ],
      '@stylistic/no-floating-decimal': 'error',
      '@stylistic/no-mixed-operators': 'warn',
      '@stylistic/no-tabs': 'error',
      '@stylistic/no-whitespace-before-property': 'error',
      '@stylistic/semi-spacing': [ 'error', { before: false, after: true } ],
      '@stylistic/operator-linebreak': [
        'error',
        'before',
        {
          overrides: {
            '=': 'after',
          },
        },
      ],
      '@stylistic/padded-blocks': [ 'error', 'never' ],
      '@stylistic/quote-props': [ 'warn', 'as-needed' ],
      '@stylistic/rest-spread-spacing': [ 'error', 'never' ],
      '@stylistic/semi-style': [ 'error', 'last' ],
      '@stylistic/space-before-function-paren': [ 'error', { anonymous: 'always', named: 'never', asyncArrow: 'always' } ],
      '@stylistic/space-before-blocks': [ 'error', 'always' ],
      '@stylistic/space-infix-ops': 'error',
      '@stylistic/space-unary-ops': [ 'error', { words: true, nonwords: false } ],
      '@stylistic/switch-colon-spacing': [ 'error', { before: false, after: true } ],
      '@stylistic/template-curly-spacing': [ 'error', 'never' ],
      '@stylistic/template-tag-spacing': [ 'error', 'never' ],
      '@stylistic/wrap-iife': [ 'error', 'inside' ],
      '@stylistic/yield-star-spacing': [ 'error', 'after' ],

      // Require descriptions for eslint directive comments
      'eslint-comments/require-description': [ 'error', { ignore: [] } ],
    },
  },
  {
    name: 'eslint-commonjs',
    files: [ '**/*.cjs' ],
    languageOptions: {
      sourceType: 'commonjs',
      parserOptions: {
        sourceType: 'script',
      },
    },
  },
  {
    name: 'eslint-typescript',
    files: [ '**/*.{ts,tsx,mts,cts}' ],
    rules: {
      // Replaced by TypeScript checks: the compiler handles declarations, types and overloads
      'no-dupe-class-members': 'off',
      'no-redeclare': 'off',
      'no-undef': 'off',
      'no-array-constructor': 'off',
      'no-unused-expressions': 'off',
      'no-use-before-define': 'off',
      'no-useless-constructor': 'off',

      '@typescript-eslint/no-use-before-define': [ 'warn', { functions: false, classes: true, variables: true } ],
      '@typescript-eslint/no-useless-constructor': 'warn',
      '@typescript-eslint/no-dupe-class-members': 'error',
      '@typescript-eslint/adjacent-overload-signatures': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/array-type': [
        'warn',
        {
          default: 'array-simple',
        },
      ],
      '@typescript-eslint/consistent-type-assertions': 'warn',
      '@typescript-eslint/no-empty-object-type': 'error',
      '@typescript-eslint/prefer-for-of': 'warn',
      '@typescript-eslint/prefer-function-type': 'warn',
      '@typescript-eslint/member-ordering': 'warn',
      '@typescript-eslint/no-empty-function': [ 'warn', { allow: [ 'overrideMethods', 'decoratedFunctions' ] } ],
      '@typescript-eslint/explicit-member-accessibility': [
        'warn',
        {
          accessibility: 'explicit',
          overrides: {
            constructors: 'no-public',
          },
        },
      ],
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
      complexity: 'off',
      '@typescript-eslint/no-empty-function': 'off',
    },
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
]);
