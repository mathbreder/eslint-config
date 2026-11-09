import {
  eslintConfigs,
  fixBuildImportsPlugin,
  getEslintImportConfig,
  overrideSwcPlugin,
} from '@mathbreder/eslint-config';
import type { GetEslintImportConfigOptions, ImportGroup, PathGroup } from '@mathbreder/eslint-config';

const group: ImportGroup = 'internal';
const pathGroup: PathGroup = { pattern: '@app/**', group };
const importOptions: GetEslintImportConfigOptions = { pathGroups: [pathGroup] };

export const publicConfigs = [
  ...eslintConfigs.baseConfig,
  ...getEslintImportConfig(importOptions),
];

export const tsupPlugins = [fixBuildImportsPlugin, overrideSwcPlugin];
