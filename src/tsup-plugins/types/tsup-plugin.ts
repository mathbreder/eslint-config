import type { EsbuildBuildOptions } from './esbuild-subset';

type MaybePromise<T> = Promise<T> | T;
type ModifyEsbuildOptions = { bivarianceHack(this: unknown, options: EsbuildBuildOptions): void }['bivarianceHack'];

export type BuildEnd = (this: unknown, ctx: { writtenFiles: WrittenFile[] }) => MaybePromise<void>;

export type WrittenFile = { readonly name: string; readonly size: number };

export type TsupPlugin = {
  name: string;
  esbuildOptions?: ModifyEsbuildOptions;
  buildEnd?: BuildEnd;
};
