import type { Shape } from './shapes';

declare const maybe: string | undefined;
declare const record: { value?: string };

export const shape: Shape | undefined = undefined;
export const constructed = new Map<string, number>();
export type Dict = Record<string, number>;
export const comparison = (maybe ?? '') === 'a';
export type Wrapped = string | undefined;
export const fallback = record.value ?? 'fallback';
export enum Lit {
  A = 'a',
  B = 'b',
}
export enum Flags {
  A = 1 << 0,
  B = 1 << 1,
}
export function over(value: string): string;
export function over(value: number): number;
export function over(value: string | number): string | number {
  return value;
}
