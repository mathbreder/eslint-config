import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const pkg = JSON.parse(fs.readFileSync(path.join(repo, 'package.json'), 'utf8'));
const KEEP = process.env.KEEP_CONSUMERS === '1';

const CONSUMERS = [
  { name: 'node-esm', verify: ['node', 'verify.mjs'] },
  { name: 'node-cjs', verify: ['node', 'verify.cjs'], optional: ['eslint-plugin-react-refresh'] },
  { name: 'typescript', verify: ['node', 'verify.mjs'], optional: ['typescript'] },
  { name: 'react', verify: ['node', 'verify.mjs'] },
  { name: 'expo', verify: ['node', 'verify.mjs'] },
  { name: 'vite-react', verify: ['node', 'verify.mjs'], optional: ['eslint-plugin-react-refresh'] },
  { name: 'monorepo', verify: ['node', 'verify.mjs'] },
  { name: 'next', verify: ['node', 'verify.mjs'], optional: ['@next/eslint-plugin-next'] },
];

const run = (command, args, options = {}) => spawnSync(command, args, {
  encoding: 'utf8',
  shell: process.platform === 'win32',
  timeout: 15 * 60 * 1000,
  ...options,
});

const requiredPeers = () => {
  const meta = pkg.peerDependenciesMeta ?? {};
  return Object.fromEntries(
    Object.entries(pkg.peerDependencies).filter(([name]) => !meta[name]?.optional),
  );
};

const packTarball = (destination) => {
  const build = run('pnpm', ['run', 'build'], { cwd: repo });
  if (build.status !== 0) throw new Error(`build falhou:\n${build.stdout}${build.stderr}`);
  const pack = run('pnpm', ['pack', '--pack-destination', destination], { cwd: repo });
  if (pack.status !== 0) throw new Error(`pack falhou:\n${pack.stdout}${pack.stderr}`);
  const tarball = fs.readdirSync(destination).find((file) => file.endsWith('.tgz'));
  if (!tarball) throw new Error('tarball não encontrado após pack');
  return path.join(destination, tarball);
};

const prepareConsumer = (consumer, tarball, workRoot) => {
  const dest = path.join(workRoot, consumer.name);
  fs.cpSync(path.join(here, consumer.name), dest, { recursive: true });
  const dependencies = {
    ...requiredPeers(),
    '@mathbreder/eslint-config': `file:${tarball.split(path.sep).join('/')}`,
  };
  for (const name of consumer.optional ?? []) {
    dependencies[name] = pkg.peerDependencies[name];
  }
  fs.writeFileSync(
    path.join(dest, 'package.json'),
    JSON.stringify({ name: `consumer-${consumer.name}`, private: true, type: 'module', dependencies }, null, 2),
  );
  return dest;
};

const runConsumer = (consumer, tarball, workRoot) => {
  const dest = prepareConsumer(consumer, tarball, workRoot);
  const install = run('pnpm', ['install', '--reporter=silent'], { cwd: dest });
  if (install.status !== 0) {
    return { ok: false, stage: 'install', output: `${install.stdout}${install.stderr}` };
  }
  const [command, ...args] = consumer.verify;
  const check = run(command, args, { cwd: dest });
  const output = `${check.stdout}${check.stderr}`;
  return { ok: check.status === 0, stage: 'verify', output };
};

const main = () => {
  const workRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mathbreder-consumers-'));
  const packDir = path.join(workRoot, 'pack');
  fs.mkdirSync(packDir);
  let failures = 0;
  try {
    const tarball = packTarball(packDir);
    console.log(`tarball: ${tarball}`);
    for (const consumer of CONSUMERS) {
      const result = runConsumer(consumer, tarball, workRoot);
      if (result.ok) {
        console.log(`PASS ${consumer.name}`);
      } else {
        failures += 1;
        console.log(`FAIL ${consumer.name} (${result.stage})\n${result.output}`);
      }
    }
  } finally {
    if (KEEP) {
      console.log(`consumidores mantidos em ${workRoot}`);
    } else {
      fs.rmSync(workRoot, { recursive: true, force: true });
    }
  }
  console.log(`${CONSUMERS.length - failures}/${CONSUMERS.length} consumidores passaram`);
  process.exit(failures === 0 ? 0 : 1);
};

main();
