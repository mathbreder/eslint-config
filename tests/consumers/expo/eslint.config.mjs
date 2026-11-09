import { eslintConfigs } from '@mathbreder/eslint-config';
import { expoConfig } from '@mathbreder/eslint-config/expo';

export default eslintConfigs.defineConfig([
  ...eslintConfigs.baseConfig,
  ...expoConfig,
]);
