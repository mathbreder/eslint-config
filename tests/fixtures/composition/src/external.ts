import { resolve } from 'node:path';

import type { Config } from 'eslint';

export const externos = [resolve('.'), null as Config | null];
