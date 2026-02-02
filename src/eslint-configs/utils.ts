import { defineConfig as defaultDefineConfig, type Config } from 'eslint/config';

const cleanPlugins = (configs: Config[]): Config[] => {
  const pluginsUsed: string[] = [];
  for (const cfg of configs) {
    if (cfg.plugins) {
      for (const pluginName of Object.keys(cfg.plugins)) {
        if (!pluginsUsed.includes(pluginName)) {
          pluginsUsed.push(pluginName);
        } else {
          // Remove duplicate plugin
          delete cfg.plugins[pluginName];
        }
      }
    }
  }
  return configs;
};

export const defineConfig = (...args: any[]): Config[] => {
  const configs = (defaultDefineConfig as any)(...args) as Config[];
  return cleanPlugins(configs);
};