import type { typeB } from './type-cycle-b';

export type TypeA = { b: typeB };
