import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';

import { ESLint } from 'eslint';

const require = createRequire(import.meta.url);
const cjs = require('@mathbreder/eslint-config/next');
assert.ok(Array.isArray(cjs.nextConfig), 'subpath ./next deve exportar nextConfig em CJS');

const esm = await import('@mathbreder/eslint-config/next');
assert.ok(Array.isArray(esm.nextConfig), 'subpath ./next deve exportar nextConfig em ESM');

const eslint = new ESLint({ cwd: process.cwd() });
const [index] = await eslint.lintFiles([path.join('pages', 'index.tsx')]);
const next = index.messages.filter((m) => m.ruleId?.startsWith('@next/next/'));

const link = next.find((m) => m.ruleId === '@next/next/no-html-link-for-pages');
assert.ok(link, 'link para página interna deve ser reportado');
assert.equal(link.severity, 2);

const img = next.find((m) => m.ruleId === '@next/next/no-img-element');
assert.ok(img, '<img> deve ser reportado');
assert.equal(img.severity, 1);

const [about] = await eslint.lintFiles([path.join('pages', 'about.tsx')]);
assert.equal(about.messages.filter((m) => m.ruleId?.startsWith('@next/next/')).length, 0);

console.log('OK next');
