import { defineConfig as defaultDefineConfig, type Config } from 'eslint/config';

import { importPlugin } from './import-order';

type PluginObject = NonNullable<Config['plugins']>[string];
type PluginLike = { meta?: { version?: string }; rules?: Record<string, { meta?: unknown }> };

const IMPORT_PLUGIN_NAME = 'import';

const ruleNames = (plugin: PluginLike): string[] => Object.keys(plugin.rules ?? {}).sort();

const ruleMetaOf = (plugin: PluginLike, name: string): string =>
  JSON.stringify(plugin.rules?.[name]?.meta ?? null);

const isEquivalentImportPlugin = (left: PluginLike, right: PluginLike): boolean => {
  const leftVersion = left.meta?.version;
  const rightVersion = right.meta?.version;
  const bothVersioned = leftVersion !== undefined && rightVersion !== undefined;
  if (bothVersioned && leftVersion !== rightVersion) return false;
  const sameRuleNames = JSON.stringify(ruleNames(left)) === JSON.stringify(ruleNames(right));
  if (!sameRuleNames) return false;
  return ruleNames(left).every((name) => ruleMetaOf(left, name) === ruleMetaOf(right, name));
};

const canonicalizeImportPlugin = (configs: Config[]): Config[] => {
  const ownPlugin = importPlugin as PluginObject & PluginLike;
  const usesOwnPlugin = configs.some((cfg) => cfg.plugins?.[IMPORT_PLUGIN_NAME] === ownPlugin);
  if (!usesOwnPlugin) return configs;
  return configs.map((cfg) => {
    const plugin = cfg.plugins?.[IMPORT_PLUGIN_NAME] as PluginLike | undefined;
    if (!plugin || plugin === ownPlugin || !isEquivalentImportPlugin(plugin, ownPlugin)) return cfg;
    return {
      ...cfg,
      plugins: { ...cfg.plugins, [IMPORT_PLUGIN_NAME]: ownPlugin },
    };
  });
};

const assertNoPluginCollisions = (configs: Config[]): void => {
  const registered = new Map<string, { plugin: unknown; configName: string }>();
  for (const [index, cfg] of configs.entries()) {
    const configName = cfg.name ?? `bloco ${index + 1} (sem nome)`;
    for (const [pluginName, plugin] of Object.entries(cfg.plugins ?? {})) {
      const previous = registered.get(pluginName);
      if (!previous) {
        registered.set(pluginName, { plugin, configName });
        continue;
      }
      if (previous.plugin !== plugin) {
        throw new Error(
          `Plugin "${pluginName}" foi registrado com implementações diferentes em "${previous.configName}" e "${configName}". `
          + 'Use apenas um desses presets no mesmo eslint.config; para React e Expo no mesmo monorepo, '
          + 'crie um eslint.config por projeto.',
        );
      }
    }
  }
};

export const defineConfig = (...args: unknown[]): Config[] => {
  const configs = canonicalizeImportPlugin(
    defaultDefineConfig(...(args as Parameters<typeof defaultDefineConfig>)) as Config[],
  );
  assertNoPluginCollisions(configs);
  return configs;
};
