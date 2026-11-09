import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import { root } from './helpers.mjs';

const distDir = path.join(root, 'dist');
const IMPORT_SPECIFIER = /(?:from\s+|import\s*\(\s*|require\s*\(\s*)['"]([^'"]+)['"]/g;

const externalPackagesOf = (entryFile) => {
  const seen = new Set();
  const externals = new Set();
  const queue = [entryFile];
  while (queue.length > 0) {
    const current = queue.pop();
    if (seen.has(current) || !fs.existsSync(current)) continue;
    seen.add(current);
    for (const match of fs.readFileSync(current, 'utf8').matchAll(IMPORT_SPECIFIER)) {
      const specifier = match[1];
      if (specifier.startsWith('.')) {
        queue.push(path.resolve(path.dirname(current), specifier));
      } else if (!specifier.startsWith('node:') && !['fs', 'path'].includes(specifier)) {
        externals.add(specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0]);
      }
    }
  }
  return [...externals].sort();
};

const dist = (file) => path.join(distDir, file);

test('o entrypoint principal (ESM e CJS) carrega só os plugins do preset base e os helpers do tsup', () => {
  for (const entry of [dist('index.js'), dist('index.cjs')]) {
    const packages = externalPackagesOf(entry);
    for (const required of ['eslint', 'eslint-plugin-import', 'eslint-plugin-react', '@swc/core', 'typescript-eslint']) {
      assert.ok(packages.includes(required), `${path.basename(entry)} deve carregar ${required}`);
    }
    for (const forbidden of ['eslint-config-expo', '@next/eslint-plugin-next', 'eslint-plugin-react-refresh', 'typescript']) {
      assert.equal(packages.includes(forbidden), false, `${path.basename(entry)} não deve carregar ${forbidden}`);
    }
  }
});

test('o subpath ./expo carrega apenas eslint e eslint-config-expo, em ESM e CJS', () => {
  for (const entry of [dist('eslint-configs/expo.js'), dist('eslint-configs/expo.cjs')]) {
    assert.deepEqual(externalPackagesOf(entry), ['eslint', 'eslint-config-expo']);
  }
});

test('o subpath ./next carrega apenas eslint e o plugin do Next.js, em ESM e CJS', () => {
  for (const entry of [dist('eslint-configs/next.js'), dist('eslint-configs/next.cjs')]) {
    assert.deepEqual(externalPackagesOf(entry), ['@next/eslint-plugin-next', 'eslint']);
  }
});

test('o subpath ./react-refresh-vite carrega apenas eslint e o plugin react-refresh, em ESM e CJS', () => {
  for (const entry of [dist('eslint-configs/react-refresh-vite.js'), dist('eslint-configs/react-refresh-vite.cjs')]) {
    assert.deepEqual(externalPackagesOf(entry), ['eslint', 'eslint-plugin-react-refresh']);
  }
});
