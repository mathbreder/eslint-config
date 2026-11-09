import { eslintConfigs } from '../../dist/index.js';
import { nextConfig } from '@mathbreder/eslint-config/next';

export default eslintConfigs.defineConfig([
  ...eslintConfigs.baseConfig,
  ...eslintConfigs.reactNextConfig,
  ...nextConfig,
  {
    settings: {
      next: {
        rootDir: 'apps/web',
      },
    },
  },
]);
