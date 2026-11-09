import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import { root } from './helpers.mjs';

const distDir = path.join(root, 'dist');
const declarationFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  if (entry.isDirectory()) return declarationFiles(full);
  return /\.d\.c?ts$/.test(entry.name) ? [full] : [];
});
const EXACT_ESBUILD_SPECIFIER = /(from|import)\s+['"]esbuild['"]|require\(\s*['"]esbuild['"]\s*\)/;

test('nenhuma declaração publicada importa o pacote esbuild', () => {
  const offenders = declarationFiles(distDir).filter((file) => EXACT_ESBUILD_SPECIFIER.test(fs.readFileSync(file, 'utf8')));
  assert.deepEqual(offenders.map((file) => path.relative(root, file)), []);
});

test('nenhum módulo JavaScript publicado carrega o pacote esbuild em runtime', () => {
  const jsFiles = fs.readdirSync(distDir, { recursive: true })
    .filter((file) => /\.c?js$/.test(String(file)))
    .map((file) => path.join(distDir, String(file)));
  const offenders = jsFiles.filter((file) => EXACT_ESBUILD_SPECIFIER.test(fs.readFileSync(file, 'utf8')));
  assert.deepEqual(offenders.map((file) => path.relative(root, file)), []);
});
