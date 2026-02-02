import { defineConfig } from 'tsup';
import pkg from './package.json';

// Externalize runtime packages so we don't bundle ESLint plugins and their
// CommonJS helpers into the published bundle. This avoids dynamic require
// errors when our ESM build is imported by consumers.
const deps = new Set([
  ...Object.keys(pkg.peerDependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
]);

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/**/*.{ts,tsx}'
  ],
  dts: true,
  // Build both CJS and ESM outputs. We added a runtime fallback to support
  // `import.meta.url` in both module systems without causing build-time
  // warnings when generating CJS bundles.
  format: ['cjs', 'esm'],
  clean: true,
  sourcemap: true,
  splitting: false, // <- desativa geração de chunks

  // Prevent bundling native modules and runtime dependencies
  external: Array.from(deps),

  // Ensure node platform handling for native modules
  esbuildOptions(options) {
    options.platform = 'node';
    options.splitting = false; // reforça para esbuild caso necessário
    return options;
  },
});