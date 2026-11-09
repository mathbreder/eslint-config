import { eslintConfigs, getEslintImportConfig } from '@mathbreder/eslint-config';
import { expoConfig } from '@mathbreder/eslint-config/expo';

export default eslintConfigs.defineConfig([
  ...eslintConfigs.baseConfig,
  ...expoConfig,
  ...getEslintImportConfig({
    project: './tsconfig.json',
    pathGroups: [{ pattern: '@app/**', group: 'internal' }],
    noUnresolvedIgnore: ['^react$', '^react-native$'],
  }),
]);
