import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const pkg = JSON.parse(fs.readFileSync(path.join(repo, 'package.json'), 'utf8'));
const KEEP = process.env.KEEP_CONSUMERS === '1';

const CJS_REQUIRE_ESM = '^20.19.0 || ^22.12.0 || >=23.0.0';
const EXPO_FRAMEWORK = '^22.13.0 || ^24.3.0 || ^26.0.0 || >=27.0.0';

const CONSUMERS = [
  { name: 'node-esm', verify: ['node', 'verify.mjs'] },
  { name: 'node-cjs', verify: ['node', 'verify.cjs'], optional: ['eslint-plugin-react-refresh'], nodeRange: CJS_REQUIRE_ESM, reason: 'require(esm) estável (Node 20.19+, 22.12+ ou 23+)' },
  { name: 'typescript', verify: ['node', 'verify.mjs'], optional: ['typescript'] },
  { name: 'react', verify: ['node', 'verify.mjs'] },
  { name: 'expo', verify: ['node', 'verify.mjs'], optional: ['eslint-config-expo'], nodeRange: EXPO_FRAMEWORK, reason: 'eslint-plugin-expo exige Node 22.13+, 24.3+, 26+ ou 27+' },
  { name: 'vite-react', verify: ['node', 'verify.mjs'], optional: ['eslint-plugin-react-refresh'] },
  { name: 'monorepo', verify: ['node', 'verify.mjs'], optional: ['eslint-config-expo'], nodeRange: EXPO_FRAMEWORK, reason: 'o app mobile usa expoConfig (eslint-plugin-expo exige Node 22.13+)' },
  { name: 'next', verify: ['node', 'verify.mjs'], optional: ['@next/eslint-plugin-next'] },
];

const parseVersion = (text) => text.replace(/^[^\d]*/, '').split('.').map((part) => Number(part) || 0);

const compareVersions = (left, right) => {
  for (let index = 0; index < 3; index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

const satisfiesClause = (version, clause) => {
  const trimmed = clause.trim();
  if (trimmed.startsWith('>=')) return compareVersions(version, parseVersion(trimmed)) >= 0;
  if (trimmed.startsWith('^')) {
    const base = parseVersion(trimmed);
    return version[0] === base[0] && compareVersions(version, base) >= 0;
  }
  return compareVersions(version, parseVersion(trimmed)) === 0;
};

const satisfiesNodeRange = (nodeVersion, range) => {
  const version = parseVersion(nodeVersion);
  return range.split('||').some((clause) => satisfiesClause(version, clause));
};

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

const buildAndPack = (destination) => {
  const build = run('pnpm', ['run', 'build'], { cwd: repo });
  if (build.status !== 0) throw new Error(`build falhou:\n${build.stdout}${build.stderr}`);
  const pack = run('pnpm', ['pack', '--pack-destination', destination], { cwd: repo });
  if (pack.status !== 0) throw new Error(`pack falhou:\n${pack.stdout}${pack.stderr}`);
  const tarball = fs.readdirSync(destination).find((file) => file.endsWith('.tgz'));
  if (!tarball) throw new Error('tarball não encontrado após pack');
  return path.join(destination, tarball);
};

const resolveTarball = (argument) => {
  const tarball = path.resolve(argument);
  if (!fs.existsSync(tarball)) throw new Error(`tarball não encontrado: ${tarball}`);
  return tarball;
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
  const install = run('pnpm', ['install', '--reporter=silent', '--engine-strict'], { cwd: dest });
  if (install.status !== 0) {
    return { ok: false, stage: 'install', output: `${install.stdout}${install.stderr}` };
  }
  const [command, ...args] = consumer.verify;
  const check = run(command, args, { cwd: dest });
  const output = `${check.stdout}${check.stderr}`;
  return { ok: check.status === 0, stage: 'verify', output };
};

const parseArguments = (argv) => {
  const options = { tarball: null };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--tarball') {
      options.tarball = argv[index + 1];
      index += 1;
    }
  }
  return options;
};

const main = () => {
  const { tarball: tarballArgument } = parseArguments(process.argv.slice(2));
  const nodeVersion = process.versions.node;
  const workRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mathbreder-consumers-'));
  let failures = 0;
  let passes = 0;
  let skips = 0;
  console.log(`Node ${nodeVersion}, engine-strict`);
  try {
    let tarball;
    if (tarballArgument) {
      tarball = resolveTarball(tarballArgument);
    } else {
      const packDir = path.join(workRoot, 'pack');
      fs.mkdirSync(packDir);
      tarball = buildAndPack(packDir);
    }
    console.log(`tarball: ${tarball}`);
    for (const consumer of CONSUMERS) {
      if (consumer.nodeRange && !satisfiesNodeRange(nodeVersion, consumer.nodeRange)) {
        skips += 1;
        console.log(`SKIP ${consumer.name}: ${consumer.reason}`);
        continue;
      }
      const result = runConsumer(consumer, tarball, workRoot);
      if (result.ok) {
        passes += 1;
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
  console.log(`${passes} passaram, ${failures} falharam, ${skips} ignorados por Node incompatível`);
  process.exit(failures === 0 ? 0 : 1);
};

main();
