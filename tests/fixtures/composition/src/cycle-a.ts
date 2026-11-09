import { cycleB } from './cycle-b';

export const cycleA = 1 + (cycleB ?? 0);
