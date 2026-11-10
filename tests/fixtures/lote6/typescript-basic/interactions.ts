import { Zed, Alpha } from './m';

export type Pair = { a: Zed; b: Alpha };

export function f(a: string): void;
export function g(): void {}
export function f(a: number): void;
export function f(a: string | number): void {
  void a;
}
