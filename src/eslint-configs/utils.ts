import { defineConfig as defaultDefineConfig, type Config } from 'eslint/config';

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
  const configs = defaultDefineConfig(
    ...(args as Parameters<typeof defaultDefineConfig>),
  ) as Config[];
  assertNoPluginCollisions(configs);
  return configs;
};
