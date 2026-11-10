import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Linter } from 'eslint';

import { reactConfig, virtualFile } from './helpers.mjs';

const VERSION_WARNING = 'React version not specified in eslint-plugin-react settings';

test('.ts sem JSX não emite o aviso de versão do React', () => {
  const linter = new Linter({ configType: 'flat' });
  const logged = [];
  const originalError = console.error;

  console.error = (...args) => logged.push(args.join(' '));
  try {
    linter.verify('export function value(id: string): string { return id; }\n', reactConfig, virtualFile('value.ts'));
  } finally {
    console.error = originalError;
  }

  assert.equal(logged.filter((line) => line.includes(VERSION_WARNING)).length, 0);
});
