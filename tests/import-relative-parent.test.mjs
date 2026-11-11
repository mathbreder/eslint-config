import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import { importConfig, messagesFor, root } from './helpers.mjs';

const RULE = 'import/no-relative-parent-imports';
const lint = (code, filename) => messagesFor(code, importConfig(), filename, [RULE]);

test('imports com caminho relativo para o diretório pai são erro', () => {
  const file = path.join(root, 'tests/fixtures/composition/src/relative.ts');
  const messages = lint(fs.readFileSync(file, 'utf8'), file);

  assert.equal(messages.length, 1);
  assert.equal(messages[0].severity, 2);
});

test('imports com alias e imports irmãos não são afetados', () => {
  const file = path.join(root, 'tests/fixtures/composition/src/sibling-only.ts');
  const messages = lint("import { h } from './helpers';\nexport const v = h;\n", file);

  assert.equal(messages.length, 0);
});
