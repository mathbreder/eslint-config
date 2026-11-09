import {
  eslintConfigs,
  getEslintImportConfig,
  type GetEslintImportConfigOptions,
  type ImportGroup,
  type PathGroup,
} from '@mathbreder/eslint-config';

export const opcoes: GetEslintImportConfigOptions = {
  project: './tsconfig.json',
  pathGroups: [{ pattern: '@app/**', group: 'internal' }],
};

export const grupo: ImportGroup = 'internal';
export const grupoDeCaminho: PathGroup = { pattern: '@shared/**', group: 'internal' };
export const configuracaoBase = eslintConfigs.defineConfig([...eslintConfigs.baseConfig]);
export const configuracaoImports = getEslintImportConfig(opcoes);
