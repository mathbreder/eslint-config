import { eslintConfigs, getEslintImportConfig } from '@mathbreder/eslint-config';

export default eslintConfigs.defineConfig([
  ...eslintConfigs.baseConfig,
  ...eslintConfigs.typeCheckedConfig,
  ...getEslintImportConfig({
    project: './tsconfig.json',
    pathGroups: [{ pattern: '@app/**', group: 'internal' }],
  }),
]);
