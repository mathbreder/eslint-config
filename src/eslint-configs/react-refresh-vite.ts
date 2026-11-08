import { defineConfig } from 'eslint/config';
import { reactRefresh } from 'eslint-plugin-react-refresh';

/**
 * Opt-in React Refresh rules for Vite + React projects.
 * Import from `@mathbreder/eslint-config/react-refresh-vite`; it is not part of `eslintConfigs`,
 * so the optional `eslint-plugin-react-refresh` dependency is only loaded when requested.
 */
export const viteReactRefreshConfig = defineConfig([
  {
    name: 'react-refresh-vite',
    files: ['**/*.{jsx,tsx}'],
    plugins: {
      'react-refresh': reactRefresh.plugin,
    },
    rules: {
      'react-refresh/only-export-components': [
        'warn',
        {
          allowConstantExport: true,
        },
      ],
    },
  },
]);
