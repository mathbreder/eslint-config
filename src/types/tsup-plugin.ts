import type { BuildOptions } from 'esbuild';

type MaybePromise<T> = Promise<T> | T;
type ModifyEsbuildOptions = (this: unknown, options: BuildOptions) => void;

export type BuildEnd = (this: unknown, ctx: { writtenFiles: WrittenFile[]; }) => MaybePromise<void>;

export type WrittenFile = { readonly name: string; readonly size: number; };

export type TsupPlugin = {
  name: string;
  esbuildOptions?: ModifyEsbuildOptions;
  buildEnd?: BuildEnd;
};
