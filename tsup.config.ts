import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  dts: true,
  // Build both CJS and ESM outputs. We added a runtime fallback to support
  // `import.meta.url` in both module systems without causing build-time
  // warnings when generating CJS bundles.
  format: ['cjs', 'esm'],
  clean: true,
  sourcemap: true,

  // Prevent bundling native @swc modules and Babel preset package.json which
  // cause esbuild/tsup to error when resolving platform-specific binaries.
  external: [
    '@swc/wasm',
    '@swc/core',
    '@babel/preset-typescript',
    '@babel/preset-typescript/package.json',
    'esbuild'
  ],

  // Ensure node platform handling for native modules
  esbuildOptions(options) {
    options.platform = 'node';
    return options;
  },
});