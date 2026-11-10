// tslint:disable-next-line
import { Shape } from './shapes';

declare const maybe: string | undefined;
declare const record: { value?: string };

export const shape: Shape | undefined = undefined;
export const constructed: Map<string, number> = new Map();
export type Dict = { [key: string]: number };
export const comparison = maybe! == 'a';
export type Wrapped = string | void;
export const fallback = record.value! ?? 'fallback';
export enum Lit {
  A = 'a'.length,
}
export function over(value: string): void;
export function over(value: number): void;
export function over(value: string | number): void {
  void value;
}
