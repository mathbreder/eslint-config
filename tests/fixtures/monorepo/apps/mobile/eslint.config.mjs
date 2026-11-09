import { eslintConfigs } from '../../../../../dist/index.js';
import { expoConfig } from '@mathbreder/eslint-config/expo';

export default eslintConfigs.defineConfig([
  ...eslintConfigs.baseConfig,
  ...expoConfig,
]);
