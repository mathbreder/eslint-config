import fs from 'fs';
import path from 'path';

import swc, { type JscConfig, type JscTarget } from '@swc/core';
import { type BuildOptions, type Plugin as EsbuildPlugin, type PluginBuild, type TsconfigRaw } from 'esbuild';

import type { TsupPlugin } from '../types/tsup-plugin';

export type OverrideSwcOptions = BuildOptions & {
  tsConfigPath?: string;
};

type JscConfigParams = {
  isTs: boolean;
  paths: Record<string, string[]>;
  target: string;
  baseUrl: string;
};

const getJscConfig = ({ paths, ...params }: JscConfigParams): JscConfig => ({
  parser: {
    syntax: params.isTs ? 'typescript' : 'ecmascript',
    decorators: true,
  },
  transform: {
    legacyDecorator: true,
    decoratorMetadata: true,
  },
  baseUrl: path.resolve(process.cwd(), params.baseUrl),
  paths,
  keepClassNames: true,
  target: (String(params.target)).toLowerCase() as JscTarget,
});

const removeJsonTrailingComma = (jsonString: string): string => {
  return jsonString.replace(/,(\s*(?:}|]))/g, '$1');
};

const getTsConfigContent = (tsConfigPath: string): TsconfigRaw => {
  try {
    const filePath = path.resolve(process.cwd(), tsConfigPath);
    const content = fs.readFileSync(filePath, 'utf8');
    const cleanedContent = removeJsonTrailingComma(content);
    return JSON.parse(cleanedContent);
  } catch (e) {
    console.error(e);
    return {};
  }
};

const transformSwc = (filePath: string, jsc: JscConfig) =>
  swc.transformFile(filePath, {
    jsc,
    sourceMaps: true,
    configFile: false,
    swcrc: false,
  });

const getSwcPlugin = (options: BuildOptions) => {
  return options.plugins?.find((p: EsbuildPlugin) => p.name === 'swc');
};

const getCode = (swcOutput: swc.Output, sourcePath: string) => {
  const returnData = { contents: swcOutput.code };
  if (swcOutput.map) {
    const map: { sources: string[] } = JSON.parse(swcOutput.map);
    map.sources = map.sources.map(
      (source) => path.isAbsolute(source)
        ? path.relative(path.dirname(sourcePath), source)
        : source);
    returnData.contents += '//# sourceMappingURL=data:application/json;base64,'
      + Buffer.from(JSON.stringify(map)).toString('base64');
  }
  return returnData;
};

const onLoad = async (build: PluginBuild, tsConfig: TsconfigRaw) => {
  const filter = /\.[jt]sx?$/;
  build.onLoad({ filter }, async (args) => {
    const isTs = /\.tsx?$/.test(args.path);
    const compilerOptions = tsConfig.compilerOptions || {};
    const jsc = getJscConfig({
      isTs,
      paths: compilerOptions.paths || {},
      target: compilerOptions.target || 'es2022',
      baseUrl: compilerOptions.baseUrl || '.',
    });
    const result = await transformSwc(args.path, jsc);
    return getCode(result, args.path);
  });
};

const newSwcPluginSetup = (build: PluginBuild) => {
  const options: OverrideSwcOptions = build.initialOptions;
  const tsConfigPath = options.tsConfigPath || 'tsconfig.json';
  const tsConfig: TsconfigRaw = getTsConfigContent(tsConfigPath);
  console.error('Loaded tsconfig for override-swc:', tsConfigPath);
  build.initialOptions.keepNames = true;
  onLoad(build, tsConfig);
};

const setup = (options: BuildOptions) => {
  const plugin = getSwcPlugin(options);
  if (!plugin) return;
  plugin.setup = newSwcPluginSetup;
};

export const overrideSwcPlugin: TsupPlugin = {
  name: 'override-swc',
  esbuildOptions: setup,
};
