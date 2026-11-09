export type EsbuildLoadArgs = { path: string };

export type EsbuildLoadResult = { contents: string };

export type EsbuildPluginBuild = {
  initialOptions: EsbuildBuildOptions;
  onLoad(
    options: { filter: RegExp },
    callback: (args: EsbuildLoadArgs) => Promise<EsbuildLoadResult>,
  ): void;
};

export type EsbuildPlugin = {
  name: string;
  setup?(build: EsbuildPluginBuild): void;
};

export type EsbuildBuildOptions = {
  keepNames?: boolean;
  plugins?: EsbuildPlugin[];
  platform?: string;
  splitting?: boolean;
};

export type TsconfigRaw = {
  [key: string]: unknown;
  compilerOptions?: {
    [option: string]: unknown;
    paths?: Record<string, string[]>;
    baseUrl?: string;
    target?: string;
  };
};
