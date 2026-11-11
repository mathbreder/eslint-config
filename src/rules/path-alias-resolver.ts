import { createRequire } from 'node:module';
import path from 'node:path';

import type * as TypeScript from 'typescript';

type TypeScriptModule = typeof TypeScript;

export type AliasLookup = {
  filename: string;
  specifier: string;
  project?: string | string[];
};

type Project = {
  configPath: string;
  configDir: string;
  options: TypeScript.CompilerOptions;
  files: Set<string>;
  moduleCache: TypeScript.ModuleResolutionCache;
};

type Candidate = {
  specifier: string;
  wildcardPosition: number;
  exact: boolean;
  keyLength: number;
};

const EXTENSION_PATTERN = /\.(d\.mts|d\.cts|d\.ts|tsx|ts|mts|cts|jsx|js|mjs|cjs)$/;

const projectCache = new Map<string, Project | null>();
const nearestConfigCache = new Map<string, string | null>();
const resultCache = new Map<string, string | null>();

let typescriptModule: TypeScriptModule | null = null;

const loadTypeScript = (filename: string): TypeScriptModule => {
  if (!typescriptModule) {
    const requireFromFile = createRequire(filename);

    typescriptModule = requireFromFile('typescript') as TypeScriptModule;
  }

  return typescriptModule;
};

const toPosix = (value: string) => value.split(path.sep).join('/');

const caseKey = (ts: TypeScriptModule, value: string) => (
  ts.sys.useCaseSensitiveFileNames ? value : value.toLowerCase()
);

const normalizeFile = (ts: TypeScriptModule, value: string) => (
  caseKey(ts, toPosix(path.resolve(value)))
);

const loadProject = (ts: TypeScriptModule, configPath: string): Project | null => {
  if (projectCache.has(configPath)) return projectCache.get(configPath) ?? null;

  const read = ts.readConfigFile(configPath, ts.sys.readFile);

  if (read.error) {
    projectCache.set(configPath, null);

    return null;
  }

  const configDir = path.dirname(configPath);
  const parsed = ts.parseJsonConfigFileContent(
    read.config,
    ts.sys,
    configDir,
    undefined,
    configPath,
  );
  const project: Project = {
    configPath,
    configDir,
    options: parsed.options,
    files: new Set(parsed.fileNames.map((file) => normalizeFile(ts, file))),
    moduleCache: ts.createModuleResolutionCache(
      configDir,
      (file) => caseKey(ts, file),
      parsed.options,
    ),
  };

  projectCache.set(configPath, project);

  return project;
};

const nearestConfig = (ts: TypeScriptModule, filename: string): string | null => {
  const directory = path.dirname(filename);

  if (!nearestConfigCache.has(directory)) {
    nearestConfigCache.set(directory, ts.findConfigFile(directory, ts.sys.fileExists) ?? null);
  }

  return nearestConfigCache.get(directory) ?? null;
};

const candidateConfigs = (ts: TypeScriptModule, lookup: AliasLookup): string[] => {
  if (lookup.project === undefined) {
    const nearest = nearestConfig(ts, lookup.filename);

    return nearest ? [ nearest ] : [];
  }

  const list = Array.isArray(lookup.project) ? lookup.project : [ lookup.project ];

  return list.map((entry) => path.resolve(entry));
};

const projectFor = (ts: TypeScriptModule, lookup: AliasLookup): Project | null => {
  const target = normalizeFile(ts, lookup.filename);

  for (const configPath of candidateConfigs(ts, lookup)) {
    const project = loadProject(ts, configPath);

    if (project?.files.has(target)) return project;
  }

  return null;
};

const resolveFile = (
  ts: TypeScriptModule,
  specifier: string,
  containingFile: string,
  project: Project,
): string | null => {
  const { resolvedModule } = ts.resolveModuleName(
    specifier,
    containingFile,
    project.options,
    ts.sys,
    project.moduleCache,
  );

  if (!resolvedModule || resolvedModule.isExternalLibraryImport) return null;

  return resolvedModule.resolvedFileName;
};

const targetVariants = (resolvedFile: string): string[] => {
  const withoutExtension = toPosix(resolvedFile).replace(EXTENSION_PATTERN, '');
  const variants = [ withoutExtension ];

  if (path.posix.basename(withoutExtension) === 'index') {
    variants.push(path.posix.dirname(withoutExtension));
  }

  return variants;
};

const wildcardCandidate = (
  ts: TypeScriptModule,
  key: string,
  targetPrefix: string,
  targetSuffix: string,
  variant: string,
): Candidate | null => {
  const matches = variant.length >= targetPrefix.length + targetSuffix.length
    && caseKey(ts, variant).startsWith(caseKey(ts, targetPrefix))
    && caseKey(ts, variant).endsWith(caseKey(ts, targetSuffix));

  if (!matches) return null;

  const captured = variant.slice(targetPrefix.length, variant.length - targetSuffix.length);
  const keyStar = key.indexOf('*');
  const specifier = keyStar < 0 ? key : key.slice(0, keyStar) + captured + key.slice(keyStar + 1);

  return {
    specifier,
    wildcardPosition: keyStar < 0 ? key.length : keyStar,
    exact: false,
    keyLength: key.length,
  };
};

const mappingCandidates = (
  ts: TypeScriptModule,
  key: string,
  target: string,
  project: Project,
  variants: string[],
): Candidate[] => {
  const pathsBase = project.options.baseUrl ?? project.configDir;
  const absolutePattern = toPosix(path.resolve(pathsBase, target));
  const targetStar = absolutePattern.indexOf('*');

  if (targetStar < 0) {
    return variants
      .filter((variant) => caseKey(ts, variant) === caseKey(ts, absolutePattern))
      .map(() => ({
        specifier: key,
        wildcardPosition: key.length,
        exact: true,
        keyLength: key.length,
      }));
  }

  const prefix = absolutePattern.slice(0, targetStar);
  const suffix = absolutePattern.slice(targetStar + 1);

  return variants
    .map((variant) => wildcardCandidate(ts, key, prefix, suffix, variant))
    .filter((candidate): candidate is Candidate => candidate !== null);
};

const pathsCandidates = (
  ts: TypeScriptModule,
  project: Project,
  variants: string[],
): Candidate[] => {
  const paths = project.options.paths ?? {};

  return Object.entries(paths).flatMap(([ key, targets ]) => targets.flatMap(
    (target) => mappingCandidates(ts, key, target, project, variants),
  ));
};

const isUsableSpecifier = (specifier: string) => (
  specifier.length > 0 && !specifier.startsWith('.') && !path.isAbsolute(specifier)
);

const baseUrlCandidates = (project: Project, variants: string[]): Candidate[] => {
  const baseUrl = project.options.baseUrl;

  if (!baseUrl) return [];

  const base = toPosix(path.resolve(baseUrl));

  return variants
    .map((variant) => path.posix.relative(base, variant))
    .filter((relative) => isUsableSpecifier(relative))
    .map((relative) => ({ specifier: relative, wildcardPosition: 0, exact: false, keyLength: 0 }));
};

const compareText = (a: string, b: string) => {
  if (a === b) return 0;

  return a < b ? -1 : 1;
};

const compareCandidates = (a: Candidate, b: Candidate) => (
  b.wildcardPosition - a.wildcardPosition
  || Number(b.exact) - Number(a.exact)
  || b.keyLength - a.keyLength
  || compareText(a.specifier, b.specifier)
);

const findAliasUncached = (ts: TypeScriptModule, lookup: AliasLookup): string | null => {
  if (lookup.specifier.includes('?') || lookup.specifier.includes('#')) return null;

  const project = projectFor(ts, lookup);

  if (!project) return null;

  const resolvedTarget = resolveFile(ts, lookup.specifier, lookup.filename, project);

  if (!resolvedTarget) return null;

  const targetKey = normalizeFile(ts, resolvedTarget);
  const variants = targetVariants(resolvedTarget);
  const candidates = [
    ...pathsCandidates(ts, project, variants),
    ...baseUrlCandidates(project, variants),
  ].sort(compareCandidates);

  for (const candidate of candidates) {
    if (!isUsableSpecifier(candidate.specifier)) continue;

    const resolved = resolveFile(ts, candidate.specifier, lookup.filename, project);

    if (resolved && normalizeFile(ts, resolved) === targetKey) return candidate.specifier;
  }

  return null;
};

export const findEquivalentAlias = (lookup: AliasLookup): string | null => {
  const ts = loadTypeScript(lookup.filename);
  const project = projectFor(ts, lookup);
  const key = [
    project?.configPath ?? '',
    normalizeFile(ts, lookup.filename),
    lookup.specifier,
  ].join('\u0000');

  if (!resultCache.has(key)) {
    resultCache.set(key, project ? findAliasUncached(ts, lookup) : null);
  }

  return resultCache.get(key) ?? null;
};

export const clearPathAliasCaches = () => {
  projectCache.clear();
  nearestConfigCache.clear();
  resultCache.clear();
};
