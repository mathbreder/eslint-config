import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

/**
 * Opt-in TypeScript rules that need type information.
 * Uses `projectService`, so each file is checked against its nearest `tsconfig.json`
 * in the consuming project.
 */
export const typeCheckedConfig = defineConfig([
  {
    name: 'eslint-typescript-type-checked',
    files: [ '**/*.{ts,tsx,mts,cts}' ],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      'no-implied-eval': 'off',
      '@typescript-eslint/no-implied-eval': 'error',
      'no-throw-literal': 'off',
      '@typescript-eslint/only-throw-error': 'error',
      'prefer-promise-reject-errors': 'off',
      '@typescript-eslint/prefer-promise-reject-errors': 'error',
      'require-await': 'off',
      '@typescript-eslint/require-await': 'warn',
    },
  },
]);
