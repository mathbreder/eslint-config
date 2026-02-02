import { eslintConfigs, getEslintImportConfig } from './dist/index.js';

/**
 * Base ESLint configuration for all projects
 * Includes: TypeScript, imports, stylistic, perfectionist
 */
export const baseConfig = eslintConfigs.defineConfig([
  ...eslintConfigs.baseConfig,
  getEslintImportConfig()
]);

export default baseConfig;
