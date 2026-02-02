import { defineConfig } from 'eslint/config';
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
]);