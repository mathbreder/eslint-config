import { eslintConfigs } from '@mathbreder/eslint-config';
import { viteReactRefreshConfig } from '@mathbreder/eslint-config/react-refresh-vite';

export default eslintConfigs.defineConfig([
  ...eslintConfigs.baseConfig,
  ...eslintConfigs.reactNextConfig,
  ...viteReactRefreshConfig,
]);
