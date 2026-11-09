import assert from 'node:assert/strict';
import path from 'node:path';

import { ESLint } from 'eslint';

const projects = ['apps/web', 'apps/mobile', 'packages/shared'];
const file = (project) => path.join('src', project === 'packages/shared' ? 'util.ts' : 'App.tsx');

const lintProject = async (project) => {
  const eslint = new ESLint({ cwd: path.resolve(project) });
  const [result] = await eslint.lintFiles([file(project)]);
  return result.messages;
};

const web = await lintProject('apps/web');
assert.ok(web.some((m) => m.ruleId === 'react-hooks/rules-of-hooks'), 'apps/web deve aplicar a regra de hooks');

const mobile = await lintProject('apps/mobile');
assert.ok(mobile.some((m) => m.ruleId === 'react-hooks/rules-of-hooks'), 'apps/mobile deve aplicar a regra de hooks');

const shared = await lintProject('packages/shared');
assert.equal(shared.filter((m) => m.ruleId?.startsWith('react')).length, 0, 'packages/shared não recebe regras React');

console.log(`OK monorepo (${projects.join(', ')})`);
