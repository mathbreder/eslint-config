import fs from 'fs';
import path from 'path';

import type { BuildEnd, TsupPlugin } from '../types/tsup-plugin';

const REL_IMPORT = /(from\s*['"]|^(?:import|export)\s*['"])(\.{1,2}\/[^'"]+)(['"])/gm;

const addJsExt = (code: string, baseDir: string) =>
  code.replace(REL_IMPORT, (_m: string, p1: string, spec: string, p3: string) => {
  // already has extension? keep
    if (/\.(mjs|cjs|js|json|node)$/.test(spec)) return `${p1}${spec}${p3}`;
    // ends with slash? index.js
    if (spec.endsWith('/')) return `${p1}${spec}index.js${p3}`;
    // check for folder index file
    const maybeIndex = `${spec}/index.js`;
    if (fs.existsSync(path.join(baseDir, maybeIndex))) return `${p1}${maybeIndex}${p3}`;
    return `${p1}${spec}.js${p3}`;
  });

const buildEnd: BuildEnd = ({ writtenFiles }) => {
  const files = writtenFiles.filter((f) => !f.name.endsWith('.map'));
  for (const f of files) {
    const code = fs.readFileSync(f.name, 'utf8');
    const outDir = path.dirname(f.name);
    const fixed = addJsExt(code, outDir);
    if (fixed !== code) fs.writeFileSync(f.name, fixed, 'utf8');
  }
};

export const fixBuildImportsPlugin: TsupPlugin = {
  name: 'fix-build-imports',
  buildEnd,
};
