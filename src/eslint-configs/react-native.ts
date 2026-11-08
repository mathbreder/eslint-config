import { defineConfig } from 'eslint/config';
// @ts-expect-error: eslint-config-expo does not publish type declarations for flat.js
import defaultExpoConfig from 'eslint-config-expo/flat.js';

export const expoConfig = defineConfig([
  defaultExpoConfig,
  {
    ignores: [
      'dist/*',
      'node_modules/*',
      'ios/*',
      'android/*',
      'bin/*',
      'build/*',
      'expo-env.d.ts',
      'nativewind-env.d.ts',
      'bun.lock',
      '.expo/*',
    ],
  },
  {
    name: 'expo-react-hooks-project-decision',
    files: ['**/*.{jsx,tsx}'],
    rules: {
      'react-hooks/static-components': 'off',
    },
  },
]);