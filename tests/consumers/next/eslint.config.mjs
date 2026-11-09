import { eslintConfigs, getEslintImportConfig } from '@mathbreder/eslint-config';
import { nextConfig } from '@mathbreder/eslint-config/next';

export default eslintConfigs.defineConfig([
  ...eslintConfigs.baseConfig,
  ...eslintConfigs.reactNextConfig,
  ...nextConfig,
  ...getEslintImportConfig(),
]);
