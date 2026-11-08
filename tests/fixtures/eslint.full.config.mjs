import { eslintConfigs, getEslintImportConfig } from '../../dist/index.js';

export default [...eslintConfigs.baseConfig, ...eslintConfigs.reactNextConfig, ...getEslintImportConfig()];
