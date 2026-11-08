import { eslintConfigs } from '../../../../../dist/index.js';

export default eslintConfigs.defineConfig([
  ...eslintConfigs.baseConfig,
  ...eslintConfigs.expoConfig,
]);
