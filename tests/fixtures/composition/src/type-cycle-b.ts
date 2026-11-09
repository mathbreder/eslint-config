import type { TypeA } from './type-cycle-a';

export type typeB = { a: TypeA | null };
