import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Linter } from 'eslint';
import { eslintConfigs, getEslintImportConfig } from '../dist/index.js';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const fixtureTsconfig = path.join(root, 'tests/fixtures/app/tsconfig.json');
export const fixtureFile = (name) => path.join(root, 'tests/fixtures/app/src', name);
export const virtualFile = (name) => path.join(root, 'virtual-src', name);

export const baseConfig = eslintConfigs.baseConfig;
export const reactConfig = [...eslintConfigs.baseConfig, ...eslintConfigs.reactNextConfig];
export const importConfig = (opts = {}) => [
  ...eslintConfigs.baseConfig,
  ...getEslintImportConfig({ project: fixtureTsconfig, ...opts }),
];

export const messagesFor = (code, config, filename, ruleIds) =>
  new Linter({ configType: 'flat' })
    .verify(code, config, filename)
    .filter((message) => ruleIds.includes(message.ruleId));
