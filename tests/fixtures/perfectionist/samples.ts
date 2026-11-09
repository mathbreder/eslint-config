export type Unsorted = 'b' | 'a' | 3 | 1;

export type Grouped = null | undefined | 'x' | 1 | { k: string };

export type Intersect = { b: string } & { a: number } & Partial<Record<string, string>>;

export type Multiline =
  | 'zeta'

  | 'alpha';

export type Objects = { z: 1; a: 2 } | { m: 3 };
