import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { satisfiesNodeRange } from './node-range.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const pkg = JSON.parse(fs.readFileSync(path.join(repo, 'package.json'), 'utf8'));
const KEEP = process.env.KEEP_CONSUMERS === '1';
const MAX_DIAGNOSTIC_LINES = 400;

const CJS_REQUIRE_ESM = '^20.19.0 || ^22.12.0 || >=23.0.0';
const EXPO_FRAMEWORK = '^22.13.0 || ^24.3.0 || ^26.0.0 || >=27.0.0';

const CONSUMERS = [
  { name: 'node-esm', verify: ['node', 'verify.mjs'] },
  { name: 'node-cjs', verify: ['node', 'verify.cjs'], optional: ['eslint-plugin-react-refresh'], nodeRange: CJS_REQUIRE_ESM, reason: 'require(esm) estável (Node 20.19+, 22.12+ ou 23+)' },
  { name: 'typescript', verify: ['node', 'verify.mjs'], optional: ['typescript'] },
  { name: 'react', verify: ['node', 'verify.mjs'] },
  { name: 'expo', verify: ['node', 'verify.mjs'], optional: ['eslint-config-expo', 'typescript'], nodeRange: EXPO_FRAMEWORK, reason: 'eslint-plugin-expo exige Node 22.13+, 24.3+, 26+ ou 27+' },
  { name: 'vite-react', verify: ['node', 'verify.mjs'], optional: ['eslint-plugin-react-refresh'] },
  { name: 'monorepo', verify: ['node', 'verify.mjs'], optional: ['eslint-config-expo'], nodeRange: EXPO_FRAMEWORK, reason: 'o app mobile usa expoConfig (eslint-plugin-expo exige Node 22.13+)' },
  { name: 'next', verify: ['node', 'verify.mjs'], optional: ['@next/eslint-plugin-next'] },
];

const run = (command, args, options = {}) => spawnSync(command, args, {
  encoding: 'utf8',
  shell: process.platform === 'win32',
  timeout: 15 * 60 * 1000,
  maxBuffer: 64 * 1024 * 1024,
  ...options,
});

const redact = (text) => text
  .split('\n')
  .map((line) => (/(_auth|_authToken|token|password|secret|authorization)/i.test(line) ? '[linha redigida]' : line))
  .join('\n');

const tail = (text) => {
  const lines = redact(text).split('\n');
  if (lines.length <= MAX_DIAGNOSTIC_LINES) return lines.join('\n');
  return `[... ${lines.length - MAX_DIAGNOSTIC_LINES} linhas anteriores omitidas ...]\n${lines.slice(-MAX_DIAGNOSTIC_LINES).join('\n')}`;
};

const pnpmRuntime = (workRoot) => {
  const probeDir = path.join(workRoot, 'pnpm-runtime-probe');
  fs.mkdirSync(probeDir, { recursive: true });
  fs.writeFileSync(
    path.join(probeDir, 'package.json'),
    JSON.stringify({ name: 'pnpm-runtime-probe', private: true, scripts: { probe: 'node -p process.env.npm_config_user_agent' } }),
  );
  const probe = run('pnpm', ['run', '-s', 'probe'], { cwd: probeDir, env: { ...process.env, npm_config_loglevel: 'silent' } });
  const userAgent = `${probe.stdout ?? ''}${probe.stderr ?? ''}`;
  const runtime = /pnpm\/(\S+)\s.*node\/v([\d.]+)/.exec(userAgent)
    ?? /pnpm\/(\S+).*?node\/v([\d.]+)/.exec(userAgent);
  if (probe.status !== 0 || !runtime) {
    throw new Error(`não foi possível identificar o runtime do pnpm (código ${probe.status}):\n${tail(userAgent)}`);
  }
  return { pnpmVersion: runtime[1], nodeVersion: runtime[2] };
};

const assertPnpmRunsOnHarnessNode = (workRoot) => {
  const harnessNode = process.versions.node;
  const pnpm = pnpmRuntime(workRoot);
  if (pnpm.nodeVersion !== harnessNode) {
    throw new Error(
      `o pnpm executa sob Node ${pnpm.nodeVersion}, mas o harness roda sob Node ${harnessNode}. `
      + 'As instalações não representariam o ambiente testado. Ajuste o PATH para que o pnpm use o mesmo Node.',
    );
  }
  return pnpm;
};

const requiredPeers = () => {
  const meta = pkg.peerDependenciesMeta ?? {};
  return Object.fromEntries(
    Object.entries(pkg.peerDependencies).filter(([name]) => !meta[name]?.optional),
  );
};

const buildAndPack = (destination) => {
  const build = run('pnpm', ['run', 'build'], { cwd: repo });
  if (build.status !== 0) throw new Error(`build falhou:\n${tail(`${build.stdout}${build.stderr}`)}`);
  const pack = run('pnpm', ['pack', '--pack-destination', destination], { cwd: repo });
  if (pack.status !== 0) throw new Error(`pack falhou:\n${tail(`${pack.stdout}${pack.stderr}`)}`);
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

const runConsumer = (consumer, tarball, workRoot, runtime) => {
  const dest = prepareConsumer(consumer, tarball, workRoot);
  const installArgs = ['install', '--engine-strict'];
  const install = run('pnpm', installArgs, { cwd: dest });
  const installOutput = `${install.stdout ?? ''}${install.stderr ?? ''}`;
  if (install.status !== 0) {
    return {
      ok: false,
      stage: 'install',
      diagnostic: {
        command: `pnpm ${installArgs.join(' ')}`,
        cwd: dest,
        exitCode: install.status,
        error: install.error ? String(install.error) : null,
        pnpmVersion: runtime.pnpmVersion,
        nodeVersion: runtime.nodeVersion,
        output: installOutput,
      },
    };
  }
  const [command, ...args] = consumer.verify;
  const check = run(command, args, { cwd: dest });
  const output = `${check.stdout ?? ''}${check.stderr ?? ''}`;
  if (check.status !== 0) {
    return {
      ok: false,
      stage: 'verify',
      diagnostic: {
        command: [command, ...args].join(' '),
        cwd: dest,
        exitCode: check.status,
        error: check.error ? String(check.error) : null,
        pnpmVersion: runtime.pnpmVersion,
        nodeVersion: process.versions.node,
        output,
      },
    };
  }
  return { ok: true };
};

const printDiagnostic = (consumer, result) => {
  const d = result.diagnostic;
  console.log(`FAIL ${consumer.name} (${result.stage})`);
  console.log(`  comando:      ${d.command}`);
  console.log(`  diretório:    ${d.cwd}`);
  console.log(`  node (harness/execução): ${process.versions.node}`);
  console.log(`  node (pnpm): ${d.nodeVersion}`);
  console.log(`  pnpm:         ${d.pnpmVersion}`);
  console.log(`  código de saída: ${d.exitCode}`);
  if (d.error) console.log(`  erro de inicialização: ${d.error}`);
  console.log('  ----- saída (stdout e stderr) -----');
  console.log(tail(d.output));
  console.log('  ----- fim da saída -----');
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
    const runtime = assertPnpmRunsOnHarnessNode(workRoot);
    console.log(`pnpm ${runtime.pnpmVersion} executando sob Node ${runtime.nodeVersion}`);
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
      const result = runConsumer(consumer, tarball, workRoot, runtime);
      if (result.ok) {
        passes += 1;
        console.log(`PASS ${consumer.name}`);
      } else {
        failures += 1;
        printDiagnostic(consumer, result);
      }
    }
  } catch (error) {
    failures += 1;
    console.log(`ERRO DO HARNESS: ${error.message}`);
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
