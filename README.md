# mathbreder's ESLint config

## Whats included?

- Standard config base, with `@stylistic` rules for formatting;
- Presets for React, Expo, Next.js, Vite and type-checked projects. Prettier itself is not enabled; see [Rules intentionally not enabled](#rules-intentionally-not-enabled).

## Setup

### Requirements

Node.js has two different requirements: the one for consumers, which this package declares in `engines`, and the one for development in this repository.

- **Consumers:** Node.js `^20.19.0 || ^22.13.0 || >=24.0.0`, declared in `engines`. This is the range that the real dependency tree installs with `--engine-strict`. The transitive package `eslint-visitor-keys@5` requires exactly this range, through `@typescript-eslint/*`. Node 18, Node 20.9 to 20.18, Node 22.0 to 22.12 and Node 23 are not supported. Support for Node 18 was investigated and could not be kept with the current dependency tree; see [Node.js support](#nodejs-support).
  - **ESM** (`import`) and **CommonJS** (`require`) both work on every supported version.
  - The CommonJS entry loads `@stylistic/eslint-plugin` 5.10, which is ESM-only, through `require(esm)`. This is stable on the supported versions.
- **Development (this repository):** Node.js 22. Build, lint, unit tests and packing run on Node 22, because `tsup` 9 requires Node `^22.18`.

Framework requirements, which apply only when you use that preset:

- `expoConfig` (from `@mathbreder/eslint-config/expo`): `eslint-config-expo` 58 depends on `eslint-plugin-expo` 1.2.1, which requires Node `^22.13 || ^24.3 || ^26 || >=27`. Node 18, 20, 23 and 25 are not supported by this preset.
- `nextConfig` (from `@mathbreder/eslint-config/next`): `@next/eslint-plugin-next` declares no Node engine. Next.js 16 applications, which are the projects being linted, require Node 20.9 or newer.
- `viteReactRefreshConfig`: no requirement beyond the package's own.

Other requirements:

- ESLint 9.35 or newer, flat config only. 9.35 is the minimum because of the `preserve-caught-error` rule. See [Compatibility policy](#compatibility-policy) for the ESLint 9 line.
- TypeScript `>=4.8.4 <6.1.0` when you use TypeScript. This is the range supported by `typescript-eslint` 8.72.
- `eslint-config-expo` `^58.0.4` (optional peer) when you use `expoConfig`. Expo 10 is no longer supported by this package version.
- `@next/eslint-plugin-next` `^16.4.5` (optional peer) when you use `nextConfig`.
- `eslint-plugin-react-refresh` (optional peer) only when you use `viteReactRefreshConfig`.

Recommended for development of this repository: Node.js 22, pnpm 10.28, ESLint 9.39.5, TypeScript 6.0.3, `typescript-eslint` 8.72.1 and `eslint-config-expo` 58.0.4.

### Node.js support

Support for Node 18 was investigated and could not be kept. Node 18, Node 20.9 to 20.18, Node 22.0 to 22.12 and Node 23 are not supported.

- **Cause:** the transitive package `eslint-visitor-keys@5.0.1`, required through `@typescript-eslint/visitor-keys` by `@typescript-eslint/*` 8.72, declares `engines.node` as `^20.19.0 || ^22.13.0 || >=24`. With `pnpm install --engine-strict`, any consumer on a lower Node version fails with `ERR_PNPM_UNSUPPORTED_ENGINE`. The packages that declare Node 18 in their own `engines` do not change this, because the restriction comes from the leaf package.
- **What was tried:** pinning `typescript-eslint` to 8.55 (the last line that uses `eslint-visitor-keys@4`) was not enough, because `eslint-plugin-perfectionist` pulls `@typescript-eslint/utils` 8.72 and reaches the same leaf. Keeping Node 18 would require pinning the whole `@typescript-eslint` family and downgrading TypeScript, which breaks TypeScript 6 support. Overrides in this package would not reach consumers.
- **Result:** `engines` is `^20.19.0 || ^22.13.0 || >=24.0.0`. This is the intersection of the ranges required by the dependency tree, so it matches what `--engine-strict` installs.
- **CommonJS:** supported on every version in `engines`. ESM is supported on the same versions.
- **Expo:** `expoConfig` keeps its own requirement, from `eslint-plugin-expo` 1.2.1: Node `^22.13 || ^24.3 || ^26 || >=27`. Node 24.0 to 24.2 and Node 25 are excluded by that preset, not by this package.
- **Next.js:** `nextConfig` has no Node requirement of its own beyond the package's.

### Compatibility policy

- **ESLint 9.39.5 (transitional):** the npm registry marks this version as deprecated, with the notice that it is no longer supported. It is kept on purpose: ESLint 10.14 is available, but `eslint-plugin-react@7.37.5`, `eslint-plugin-jsx-a11y@6.10.2` and `eslint-plugin-import@2.32.0` do not declare ESLint 10 support. The migration to ESLint 10 is pending until those plugins declare it.
- **TypeScript:** development uses TypeScript 6.0.3. The supported range for consumers is `>=4.8.4 <6.1.0`; TypeScript 7 is not supported. `tsconfig.json` sets `ignoreDeprecations: "6.0"` because the declaration bundler still emits `baseUrl`, which TypeScript 7 removes. Revisit this before a TypeScript 7 upgrade.
- **Expo:** `expoConfig` is published only at `@mathbreder/eslint-config/expo`. It follows `eslint-config-expo` 58, which uses `react-hooks` 7 like the React preset, and its Node requirement comes from `eslint-plugin-expo` (see [Requirements](#requirements)). Projects on Expo 10 must stay on the previous package version. Combining `expoConfig` with `getEslintImportConfig` in one config array fails with a clear message, because Expo registers its own `eslint-plugin-import` instance; see [Known conflicts](#known-conflicts).
- **Next.js:** `nextConfig` follows the `recommended` set of `@next/eslint-plugin-next` 16.4.5. That version adds `no-location-assign-relative-destination` as `warn`, which is inherited and reported in the Next.js section.
- **Node.js:** consumer installs are checked with `pnpm install --engine-strict` on Node 20.19.0, 22.13.0, 22 (latest), 24 and 26. The consumer tests (see [Consumer tests](#consumer-tests)) run on each of them, and skip only the consumers whose framework requires a newer Node. Development runs on Node 22. `tsup` 9 requires Node `^22.18` and is used only on Node 22.
- **Breaking change: `expoConfig` moved to `@mathbreder/eslint-config/expo`.** It is no longer part of `eslintConfigs`, and the main entry no longer loads `eslint-config-expo`, so projects without Expo do not need it. The migration is described in [Migrating `expoConfig`](#migrating-expoconfig). This change is released as 0.1.0.
- **Behavior changes in this update:**
  - `react-hooks/component-hook-factories` is deprecated in `eslint-plugin-react-hooks` 7.1.1 and no longer part of `recommended`. It is not re-added.
  - `expoConfig` now includes the `react-hooks` 7 rules, and turns `react-hooks/static-components` off in `.jsx` and `.tsx` files, as the React preset does.
  - No approved severity or option changed in `baseConfig`, `reactNextConfig`, `typeCheckedConfig`, `viteReactRefreshConfig` or `getEslintImportConfig`. This was checked by comparing the effective configuration with the previous commit.
- **Peer dependencies not used by the source:** `eslint-config-next`, `eslint-plugin-n`, `eslint-plugin-promise`, `eslint-plugin-prettier`, `eslint-config-prettier`, `prettier` and `prettier-plugin-tailwindcss` are declared but not imported by any entrypoint. They are optional peers, so installing this package does not install them. They are kept for compatibility and are candidates for removal in a future major version.
- **Breaking changes in 0.1.0 (since 0.0.10):**
  1. `eslintConfigs.expoConfig` moved to `@mathbreder/eslint-config/expo`. See [Migrating `expoConfig`](#migrating-expoconfig).
  2. The types of `TsupPlugin.esbuildOptions` and of the tsup helpers use a structural subset of esbuild's `BuildOptions` instead of the esbuild type. See [Known conflicts](#known-conflicts).
  3. `import/no-cycle` reports cycles between TypeScript files, which it did not before. Projects with existing TypeScript cycles get new warnings. See [Known conflicts](#known-conflicts).
  4. The default `pathGroups` of `getEslintImportConfig` no longer include the fixed aliases `@web/**`, `@mobile/**`, `@api/**`, `@shared/**` and `@db`, which were classified as `internal`. Projects that rely on this classification must declare them in `pathGroups`. This can change the order of imports in existing projects. See [Migrating import options](#migrating-import-options).
  5. `PathGroup.group` is required. It was optional before.
  6. When `project` is omitted, the TypeScript resolver uses the `tsconfig.json` of the current working directory, as documented in the options table. Before, it looked for a `tsconfig.json` next to the package build, which projects did not have.
  7. Node.js support changed: `engines` is `^20.19.0 || ^22.13.0 || >=24.0.0`. Node 18, Node 20.9 to 20.18, Node 22.0 to 22.12 and Node 23 are no longer supported. See [Node.js support](#nodejs-support).
  8. Eight rules are now `error`: `array-bracket-spacing`, `arrow-body-style` (core rule, `as-needed`), `arrow-parens`, `arrow-spacing`, `comma-style`, `computed-property-spacing`, `eol-last` and `function-call-spacing`. Projects that use the presets may see new lint errors, most of them fixable by autofix. See [Rule review, batch 1](#rule-review-batch-1).
  9. Six more Stylistic rules are now `error`: `function-call-argument-newline`, `function-paren-newline`, `generator-star-spacing`, `key-spacing`, `keyword-spacing` and `max-statements-per-line`. Projects that use the presets may see new lint errors. `jsx-a11y/anchor-ambiguous-text` is now `warn` in JSX and TSX, with a list of generic link texts. See [Rule review, batch 2](#rule-review-batch-2).
  10. Batch 3 makes these rules `error`: `multiline-ternary`, `new-parens`, `no-floating-decimal`, `no-tabs`, `no-whitespace-before-property`, `semi-spacing`, `no-eval`, `no-implied-eval` and `no-throw-literal`. It makes `no-mixed-operators`, `no-use-before-define` and `no-useless-constructor` `warn`. Projects that use the presets may see new lint errors and warnings. See [Rule review, batch 3](#rule-review-batch-3).
  11. Batch 4 makes these rules `error`: `operator-linebreak`, `padded-blocks`, `rest-spread-spacing`, `semi-style`, `space-before-blocks`, `space-before-function-paren`, `space-infix-ops`, `space-unary-ops`, `switch-colon-spacing`, `template-curly-spacing`, `template-tag-spacing`, `wrap-iife`, `yield-star-spacing`, `prefer-promise-reject-errors` (outside `typeCheckedConfig`), `perfectionist/sort-named-imports` and `perfectionist/sort-named-exports`. It makes `quote-props` and `require-await` `warn`. Projects that use the presets may see new lint errors and warnings. See [Rule review, batch 4](#rule-review-batch-4).
  12. Batch 5 makes these rules active: `@stylistic/indent-binary-ops` and `@stylistic/padding-line-between-statements` (`warn`), `@stylistic/member-delimiter-style`, `@stylistic/type-generic-spacing` and `@stylistic/type-named-tuple-spacing` (`error`, TypeScript files), and `@stylistic/jsx-one-expression-per-line` (`warn`) and `@stylistic/jsx-tag-spacing` (`error`) in the React and Next.js presets. Projects that use the presets may see new lint errors and warnings. See [Rule review, batch 5](#rule-review-batch-5).
  Version 0.1.0 is the first release with these changes. The `0.x` series allows breaking changes in a minor version.

### Installation

```
pnpm add -D @mathbreder/eslint-config
```

pnpm installs the required peer dependencies (the ones in `package.json` without `optional`) automatically. Install an optional peer only when you import the subpath that needs it:

| Peer | Install when |
|---|---|
| `eslint-config-expo` `^58.0.4` | you import `@mathbreder/eslint-config/expo` |
| `@next/eslint-plugin-next` `^16.4.5` | you import `@mathbreder/eslint-config/next` |
| `eslint-plugin-react-refresh` `^0.5.7` | you import `@mathbreder/eslint-config/react-refresh-vite` |
| `typescript` `>=4.8.4 <6.1.0` | you use TypeScript |
| `eslint-config-next`, `eslint-plugin-n`, `eslint-plugin-promise`, `eslint-plugin-prettier`, `eslint-config-prettier`, `prettier`, `prettier-plugin-tailwindcss` | your own configuration uses them. This package does not import them |

Use `--engine-strict` in CI and in new projects, so a Node version outside the supported range fails the install instead of being ignored.

The published package contains only `dist/`, `README.md`, `LICENSE` and `package.json`. Both ESM and CommonJS entries are available:

```js
// ESM
import { eslintConfigs, getEslintImportConfig } from '@mathbreder/eslint-config';
```

```js
// CommonJS
const { eslintConfigs, getEslintImportConfig } = require('@mathbreder/eslint-config');
```

Both ESM and CommonJS work on every supported Node version (see [Requirements](#requirements)). The CommonJS entry depends on `require(esm)`, which is stable on the supported versions.

The package exports `eslintConfigs` (presets) and `getEslintImportConfig` (import rules). Type definitions are provided for both entries.

Create `eslint.config.mjs` in the project:
```js
import { eslintConfigs, getEslintImportConfig } from '@mathbreder/eslint-config';

export default eslintConfigs.defineConfig([
  ...eslintConfigs.baseConfig,
  ...getEslintImportConfig({
    project: './tsconfig.json',
    pathGroups: [
      { pattern: '@app/**', group: 'internal' },
      { pattern: '@shared/**', group: 'internal' },
    ],
    noUnresolvedIgnore: ['^virtual:'],
  }),
]);
```

Presets available in `eslintConfigs`:

- `baseConfig`: TypeScript, stylistic and perfectionist rules, plus general ESLint rules.
- `reactNextConfig`: React, React Hooks, JSX a11y and JSX rules. Apply it to React projects, together with `baseConfig`. For JavaScript and JSX files it does not detect undefined identifiers by itself. See [Rule review, batch 6: `react/jsx-no-undef` and `no-undef`](#rule-review-batch-6-reactjsx-no-undef-and-no-undef).
- `typeCheckedConfig`: opt-in rules that need type information. See [Type-checked rules](#type-checked-rules-opt-in).

Opt-in presets, not included in `eslintConfigs`:

- `nextConfig`, from `@mathbreder/eslint-config/next`: opt-in Next.js rules from `@next/eslint-plugin-next`, an optional peer dependency (see [Requirements](#requirements)). Compose it with `baseConfig` and `reactNextConfig`: `...eslintConfigs.baseConfig, ...eslintConfigs.reactNextConfig, ...nextConfig`. See [Next.js](#nextjs).
- `expoConfig`, from `@mathbreder/eslint-config/expo`: Expo defaults, from `eslint-config-expo` 58. It uses `react-hooks` 7 like `reactNextConfig`, so both can be combined in one config array in an installation where they resolve to the same plugin instance. The package checks this when you call `defineConfig` and fails with a clear message otherwise. See [React and Expo in one monorepo](#react-and-expo-in-one-monorepo) and [Migrating `expoConfig`](#migrating-expoconfig).
- `viteReactRefreshConfig`, from `@mathbreder/eslint-config/react-refresh-vite`: see [React Refresh for Vite](#react-refresh-for-vite).

### Migrating `expoConfig`

Before this update, `expoConfig` came from the main entry. Now it comes from its own subpath, so the main entry no longer loads `eslint-config-expo`:

```diff
  import { eslintConfigs } from '@mathbreder/eslint-config';
+ import { expoConfig } from '@mathbreder/eslint-config/expo';

  export default eslintConfigs.defineConfig([
    ...eslintConfigs.baseConfig,
-   ...eslintConfigs.expoConfig,
+   ...expoConfig,
  ]);
```

Install the Expo peer in the projects that use it:

```
pnpm add -D eslint-config-expo@^58.0.4
```

Two points to check when you migrate:

- `eslintConfigs.expoConfig` is now `undefined`. Accessing it does not throw, so a missing import shows up as a config without Expo rules. If a file stops reporting Expo rules after the update, check the import first.
- CommonJS projects use `require('@mathbreder/eslint-config/expo')` with the same shape. The subpath follows the same Node rules as the main entry.

### Composition and plugin collisions

`eslintConfigs.defineConfig` (the same function as `eslint/config`'s `defineConfig`, plus one check) does not remove or replace plugins:

- Using the same plugin object in several presets is fine. The presets are not modified.
- Two different registrations of the `import` plugin that are equivalent (same version and rule metadata) are merged: `defineConfig` keeps the instance of this package and points the other block to it, with a new block object. This is how `expoConfig` and `getEslintImportConfig` compose. Any other difference still throws.
- Registering a plugin name twice with different implementations throws when you call `defineConfig`, and the message names both blocks, for example `Plugin "react-hooks" foi registrado com implementações diferentes em "bloco 2 (sem nome)" e "bloco 3 (sem nome)"`.

Previous versions removed the second registration silently, which could apply rules from a different plugin version. Compositions that worked before still work; the incompatible ones now fail explicitly.

### React and Expo in one monorepo

`reactNextConfig` and `expoConfig` can share one config array when both resolve to the same `react-hooks` instance, which is the case with `eslint-config-expo` 58. File scopes do not split plugin names, though: ESLint registers names for the whole array, so two different implementations of the same plugin cannot coexist in one array. `expoConfig` can be combined with `getEslintImportConfig` in one array (see [Known conflicts](#known-conflicts)). When a project needs two different implementations of the same plugin, use one `eslint.config` per project and run ESLint from each project directory, so ESLint loads the nearest config:

```
apps/
  web/
    eslint.config.mjs   # baseConfig + reactNextConfig
    src/
  mobile/
    eslint.config.mjs   # baseConfig + expoConfig
    src/
packages/
  shared/
    eslint.config.mjs   # baseConfig only
    src/
```

```json
{
  "scripts": {
    "lint": "pnpm -r --parallel run lint"
  }
}
```

Each package defines its own `"lint": "eslint ."` script. Running `eslint` from the monorepo root uses the root config, so put the root config on the shared base only, or do not lint the root with React or Expo presets.

### File types

`baseConfig` covers `.js`, `.jsx`, `.mjs`, `.cjs`, `.ts`, `.tsx`, `.mts` and `.cts`:

- `.cjs` is parsed as CommonJS (`sourceType: 'commonjs'`). `require()`, `module` and `exports` are available globals.
- `.mjs` and `.js` are parsed as modules.
- TypeScript-only rules apply only to `.ts`, `.tsx`, `.mts` and `.cts`. They are not applied to JavaScript files.
- Known limitation: the TypeScript parser used for every file accepts `import` syntax in `.cjs` files without reporting it.

### `getEslintImportConfig(options?)`

| Option | Type | Default | Description |
|---|---|---|---|
| `project` | `string \| string[]` | `<cwd>/tsconfig.json` | tsconfig(s) used by `eslint-import-resolver-typescript`. Accepts globs, for example `packages/*/tsconfig.json`. |
| `pathGroups` | `PathGroup[]` | `[]` | Extra groups for `import/order`, added after the default `react` group. |
| `noUnresolvedIgnore` | `string[]` | `[]` | Regex patterns for modules that `import/no-unresolved` should accept without resolution, for example virtual modules. |

`PathGroup` is `{ pattern: string; group: ImportGroup; position?: 'before' | 'after' }`.

Aliases are not ignored by default: an alias declared in `tsconfig.json` is resolved, and an alias that does not exist is reported. Use `noUnresolvedIgnore` only for justified exceptions.

#### Migrating import options

Earlier versions classified these aliases as `internal` by default: `@web/**`, `@mobile/**`, `@api/**`, `@shared/**` and `@db`. This version does not, so the same import can move to another group. If your project imports these aliases and depends on that order, declare them explicitly:

```js
getEslintImportConfig({
  pathGroups: [
    { pattern: '@web/**', group: 'internal' },
    { pattern: '@mobile/**', group: 'internal' },
    { pattern: '@api/**', group: 'internal' },
    { pattern: '@shared/**', group: 'internal' },
    { pattern: '@db', group: 'internal' },
  ],
});
```

Run `pnpm exec eslint --fix` once after the change and review the reordered imports, because the order can change in existing code. Every `PathGroup` must now set `group`.

### Notable rules

- `@typescript-eslint/no-unused-vars` reports unused arguments, variables and caught errors. Names starting with `_` are ignored, and rest siblings in destructuring are ignored.
- `@stylistic/indent` uses 2 spaces, one level for arrays and function bodies, and aligns parameters to the first one. Class properties are ignored.
- `react/jsx-indent` checks indentation inside `&&` and ternary expressions in JSX.
- `react/display-name` (warn) requires a name only for anonymous components. Named components, including those created with `const X = () => ...`, are accepted. For `memo` and `forwardRef`, name the inner function:
  ```js
  export const Input = forwardRef(function Input(props, ref) { /* ... */ });
  ```
  Setting `displayName` manually is also accepted.
- `max-lines-per-function` is set to 80 lines, ignoring blank lines and comments. Test files are exempt.
- `eqeqeq` requires strict comparison (`===`/`!==`), including with `null`. Use `value === null || value === undefined` instead of `value == null`.
- `no-unsafe-optional-chaining` also reports arithmetic on optional chains (`usuario?.saldo * 2`). Provide an explicit fallback that matches your business rule, for example `(usuario?.saldo ?? 0) * 2`.
- TypeScript rules enabled individually from `typescript-eslint` (not the full preset): `ban-ts-comment` (descriptions of at least 10 characters), `no-array-constructor`, `no-duplicate-enum-values`, `no-non-null-asserted-optional-chain`, `no-unsafe-declaration-merging`, `no-unsafe-function-type`, `no-unused-expressions`, `prefer-as-const`, `prefer-namespace-keyword`, `no-misused-new`, `triple-slash-reference`, `no-extra-non-null-assertion` and `no-wrapper-object-types`.
- `prefer-rest-params` and `prefer-spread` are enabled.
- Quality rules, all `warn` with default options unless noted: `max-depth` (reports more than 4 nesting levels), `max-params` (max 5 parameters), `no-else-return`, `no-nested-ternary`, `no-useless-return`, `object-shorthand` and `prefer-template`. They do not change the limits already set for `max-lines-per-function` and `complexity`.
- `@stylistic/no-extra-semi` (error) rejects duplicated semicolons such as `const valor = 10;;`. It works with `@stylistic/semi`: applying the automatic fix leaves no remaining message from either rule.
- `no-alert` (warn) is enabled only by the React/Next preset, for `.js`, `.jsx`, `.ts` and `.tsx` files. It is not part of `baseConfig`, so Node.js projects and libraries are not affected. `expoConfig` is not changed, so Expo projects that want the rule must add it themselves.
- `curly` is not enabled, so both `if (ativo) executar();` and `if (ativo) { executar(); }` are accepted. `@stylistic/brace-style` still controls how existing braces are formatted.
- `@stylistic/no-multiple-empty-lines` allows one empty line between blocks and one at the end of the file, and forbids empty lines at the start of the file.
- `no-unassigned-vars`, `no-useless-assignment` and `preserve-caught-error` are enabled as `error` with default options. `preserve-caught-error` expects the original error in `cause`:
  ```js
  try {
    await salvar();
  } catch (error) {
    throw new Error('Falha ao salvar', {
      cause: error,
    });
  }
  ```
- Import organization uses `import/order`. `perfectionist/sort-imports` is not enabled, so the two rules do not conflict. Perfectionist still sorts union and intersection types.

### Rule review, batch 1

This batch reviewed 21 rules. The status below is the effective configuration, checked with `ESLint.calculateConfigForFile()` for `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs`, `.mts` and `.cts`, with `baseConfig`, `reactNextConfig` and `expoConfig`. React and Expo do not change any of these rules. The Stylistic rule names are used; the core ESLint names are not registered when a Stylistic rule covers the same behavior.

| Rule | Decision | Effective setting | Origin |
|---|---|---|---|
| `array-bracket-newline` | kept | `error`, `{ multiline: true }` | `baseConfig` (Stylistic) |
| `array-element-newline` | kept | `error`, `consistent` | `baseConfig` (Stylistic) |
| `array-bracket-spacing` | **added** | `error`, `always` | `baseConfig` (Stylistic) |
| `arrow-body-style` | **added** (core rule; there is no Stylistic equivalent) | `error`, `as-needed` | `baseConfig` (ESLint core) |
| `arrow-parens` | **added** | `error`, `always` | `baseConfig` (Stylistic) |
| `arrow-spacing` | **added** | `error`, `{ before: true, after: true }` | `baseConfig` (Stylistic) |
| `babel/object-curly-spacing` | replaced | `@stylistic/object-curly-spacing`: `error`, `always` | `baseConfig` (Stylistic) |
| `babel/quotes` | replaced | `@stylistic/quotes`: `error`, `single` | `baseConfig` (Stylistic) |
| `babel/semi` | replaced | `@stylistic/semi`: `error`, `always` | `baseConfig` (Stylistic) |
| `block-spacing` | kept | `error`, `always` | `baseConfig` (Stylistic) |
| `brace-style` | kept | `error`, `1tbs`, `{ allowSingleLine: true }` | `baseConfig` (Stylistic) |
| `camelcase` | off, by decision | off | not configured |
| `class-methods-use-this` | off, by decision | off | not configured |
| `comma-dangle` | kept | `error`, `always-multiline` | `baseConfig` (Stylistic) |
| `comma-spacing` | kept | `error`, `{ before: false, after: true }` | `baseConfig` (Stylistic) |
| `comma-style` | **added** | `error`, `last` | `baseConfig` (Stylistic) |
| `computed-property-spacing` | **added** | `error`, `never` | `baseConfig` (Stylistic) |
| `consistent-return` | off, by decision | off | not configured |
| `dot-location` | kept | `error`, `property` | `baseConfig` (Stylistic) |
| `eol-last` | **added** | `error`, `always` | `baseConfig` (Stylistic) |
| `func-call-spacing` | **added** as `@stylistic/function-call-spacing` | `error`, `never` | `baseConfig` (Stylistic) |

Notes on the decisions:

- **Added (8 rules):** `arrow-body-style`, `array-bracket-spacing`, `arrow-parens`, `arrow-spacing`, `comma-style`, `computed-property-spacing`, `eol-last` and `function-call-spacing`. They are `error` and they are absent from every preset before this batch. Autofix is available for all seven. The package source had 115 violations, all from `array-bracket-spacing` (108), `eol-last` (5) and `computed-property-spacing` (2), and they were fixed by autofix. `arrow-body-style` added 2 more, in `override-swc.ts`, also fixed by autofix. The total for this batch is 117 autofix changes. Projects that adopt the package will see these errors too, so they are a breaking change for lint results.
- **Replaced `babel/*`:** `@babel/eslint-plugin` is not added. The three Stylistic rules above already enforce the same behavior, and they are active in every file extension.
- **Off by decision:** `camelcase` is not global, because API, database and external object names may use other conventions. `class-methods-use-this` stays off, to avoid false positives in interfaces, inheritance and object-oriented code. `consistent-return` stays off. In TypeScript projects, the compiler option `noImplicitReturns` can enforce it, but this package does not assume that option in consumer projects and does not change their `tsconfig.json`.

### Rule review, batch 2

This batch reviewed 21 rules. The status below is the effective configuration, checked with `ESLint.calculateConfigForFile()` for `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs`, `.mts` and `.cts`, under `baseConfig` with the React, Expo and Next.js presets. The origin column says where each setting comes from: our `baseConfig`, a preset, an explicit `off` from a preset, or nothing (absent, which means off). Core ESLint names are deprecated when a Stylistic rule covers the same behavior, so the Stylistic names are used.

| Rule | Modern equivalent | Origin | Before | After | Reason |
|---|---|---|---|---|---|
| `function-call-argument-newline` | `@stylistic/function-call-argument-newline` | `baseConfig` | absent | `error`, `consistent` | Arguments on one line, or one per line. |
| `function-paren-newline` | `@stylistic/function-paren-newline` | `baseConfig` | absent | `error`, `multiline-arguments` | Multiline arguments need a line break after `(` and before `)`. |
| `generator-star` | none | not configured | absent | absent | Removed from ESLint; `generator-star-spacing` covers it. |
| `generator-star-spacing` | `@stylistic/generator-star-spacing` | `baseConfig` | absent | `error`, `after` | Writes `function* name()`. |
| `i18next/no-literal-string` | none | not configured | absent | absent | Plugin not installed. Internationalization is the consumer's responsibility. |
| `implicit-arrow-linebreak` | `@stylistic/implicit-arrow-linebreak` | not configured | absent | absent | Kept off. Arrow formatting is covered by `arrow-parens` and `arrow-spacing` from batch 1. |
| `import/default` | none | `expoConfig` (`off`) | off | off | Not enabled globally. Expo's resolver setup and TypeScript imports would produce false positives. |
| `import/named` | none | `expoConfig` (`off`) | off | off | Same as `import/default`. |
| `import/no-anonymous-default-export` | none | not configured | absent | absent | Kept off. Anonymous default exports are not restricted globally. |
| `import/no-relative-parent-imports` | none | not configured | absent | absent | Kept off. Relative imports to parent directories remain allowed. |
| `indent` | `@stylistic/indent` | `baseConfig` | `error`, 2 | `error`, 2 | Preserved with the same options. |
| `indent-legacy` | none | not configured | absent | absent | Removed from ESLint. `@stylistic/indent` covers it. |
| `jsx-a11y/anchor-ambiguous-text` | `jsx-a11y` plugin, option `words` | `reactNextConfig` (`.jsx` and `.tsx` only) | off | `warn`, with a list of generic link texts in Portuguese and English | Enabled for JSX and TSX only, not in `baseConfig`. The list keeps the plugin defaults, because `words` replaces them. See the note below. |
| `jsx-a11y/control-has-associated-label` | none | `reactNextConfig` (`off`) | off | off | Kept off. Not enabled by itself. |
| `jsx-a11y/label-has-for` | none | `reactNextConfig` (`off`) | off | off | Kept off. `jsx-a11y/label-has-associated-control` stays `error`. |
| `jsx-quotes` | `@stylistic/jsx-quotes` | `reactNextConfig` (`.jsx` and `.tsx` only) | `prefer-double` | `prefer-double` | Preserved. Only in JSX files. |
| `key-spacing` | `@stylistic/key-spacing` | `baseConfig` | absent | `error`, `{ beforeColon: false, afterColon: true }` | `key: value`. |
| `keyword-spacing` | `@stylistic/keyword-spacing` | `baseConfig` | absent | `error`, `{ before: true, after: true }` | Space around keywords such as `if`, `else`, `try` and `catch`. |
| `linebreak-style` | `@stylistic/linebreak-style` | `baseConfig` | `error`, `unix` | `error`, `unix` | Preserved. |
| `lines-around-comment` | `@stylistic/lines-around-comment` | not configured | absent | absent | Kept off. Does not force blank lines around comments. |
| `max-statements-per-line` | `@stylistic/max-statements-per-line` | `baseConfig` | absent | `error`, `{ max: 1 }` | One statement per line. Differs from `brace-style` on single-line blocks; see below. |

Notes on the decisions:

- **Added (6 rules):** `function-call-argument-newline`, `function-paren-newline`, `generator-star-spacing`, `key-spacing`, `keyword-spacing` and `max-statements-per-line`. They were absent from every preset, and only the Stylistic names are registered.
- **Preserved (3 rules):** `indent`, `linebreak-style` and `jsx-quotes`, with the same options as before.
- **Kept off or dispensed:** the removed rules `generator-star` and `indent-legacy`, `i18next/no-literal-string`, the Expo rules `import/default` and `import/named`, the rules left off by decision, and the React rules that the React preset already sets to `off`.
- **Autofix:** the package source had one violation, from `function-paren-newline`, fixed by autofix in `override-swc.ts`. No other rule in this batch produced violations in the package source.
- **`jsx-a11y/anchor-ambiguous-text`:** the React preset sets `warn` for `.jsx` and `.tsx` files, with this list: the plugin defaults (`click here`, `here`, `link`, `a link`, `learn more`), then the Portuguese texts `clique aqui`, `aqui`, `clique`, `um link`, `saiba mais`, `leia mais`, `veja mais` and `mais`, then the English texts `read more`, `more` and `click`. The plugin compares the text in lowercase, trimmed, with collapsed spaces and without the punctuation `,.?¿!‽¡;:`, so case and spacing variations are covered without extra entries. Other punctuation, such as `…` or `-`, is not removed by the plugin, so `clique aqui…` is not reported. Descriptive text and descriptive `aria-label` values are not reported. This list was defined from common generic link texts; it should be confirmed for your projects before publication.
- **Overlap, `max-statements-per-line` and `brace-style` (not a technical conflict):** `brace-style` with `allowSingleLine: true` accepts `if (a) { b(); }`, and `max-statements-per-line` with `max: 1` rejects it, because it counts the `if` and `b();` as two statements on one line. Both rules report nothing for the multiline form `if (a) {` / `  b();` / `}`, which satisfies both, so there is no code that cannot be made compliant. Neither rule rewrites the single-line block, so autofix leaves it unchanged and it does not oscillate. The rules disagree only about the single-line form. The configuration is unchanged. A possible change is `ignoredNodes: ['IfStatement']` on `max-statements-per-line`, which would accept the single-line form and changes what the rule measures, so it needs a decision.

### Rule review, batch 3

This batch reviewed 25 rules. The table gives the effective configuration before and after, checked with `ESLint.calculateConfigForFile()` for `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs`, `.mts` and `.cts`, under `baseConfig`, the React, Expo and Next.js presets, and `typeCheckedConfig`. "Origin" says where the setting comes from: `baseConfig`, the TypeScript block of `baseConfig`, `typeCheckedConfig`, a preset, or nothing (absent). Stylistic names are used when they exist; core names are used when Stylistic has no equivalent.

| Rule | Implementation | Origin | Before | After | Reason |
|---|---|---|---|---|---|
| `multiline-ternary` | `@stylistic/multiline-ternary` | `baseConfig` | absent | `error`, `always-multiline` | Multiline ternaries keep one line break per part. |
| `new-parens` | `@stylistic/new-parens` | `baseConfig` | absent | `error`, `always` | `new Foo()`, with parentheses. |
| `newline-per-chained-call` | `@stylistic/newline-per-chained-call` | not configured | absent | absent | Not enforced. Long chains on one line are allowed. |
| `no-array-constructor` | `@typescript-eslint/no-array-constructor` in all files; core off in TS and not enabled in JS | `baseConfig` | TS `error` | TS `error` | Preserved. The TypeScript version also applies to `.js`, `.jsx`, `.mjs` and `.cjs`, with no duplicate diagnostic. |
| `no-arrow-condition` | none | not available | absent | absent | Not in Stylistic or core. Covered by the batch 1 arrow rules. |
| `no-comma-dangle` | `@stylistic/comma-dangle` | `baseConfig` | `error`, `always-multiline` | `error`, `always-multiline` | Replaced by the Stylistic rule approved in batch 1; not added. |
| `no-confusing-arrow` | `@stylistic/no-confusing-arrow` | not configured | absent | absent | Not enabled in this batch. Batch 1 keeps `arrow-parens` and `arrow-spacing`. |
| `no-empty-function` | `@typescript-eslint/no-empty-function` | `baseConfig` (TS block) | `warn`, allow `overrideMethods`, `decoratedFunctions` | same | Preserved. Test files keep their existing override. |
| `no-eval` | `no-eval` (core) | `baseConfig` | absent | `error` | Blocks `eval`, `globalThis.eval`, `global.eval` and aliases such as `const f = eval`. `window.eval(...)` is reported only where `window` is a declared global: the React preset in `.jsx`/`.tsx`, the Expo preset, or a configuration with browser globals. See the note below. |
| `no-extra-parens` | `@stylistic/no-extra-parens` | not configured | absent | absent | Kept off, so useful parentheses stay. |
| `no-floating-decimal` | `@stylistic/no-floating-decimal` | `baseConfig` | absent | `error` | `0.5`, not `.5`. |
| `no-implied-eval` | `no-implied-eval` (core); `@typescript-eslint/no-implied-eval` in `typeCheckedConfig` | `baseConfig`, `typeCheckedConfig` | absent | `error` (core), TS `error` in typed files | Blocks strings passed to `setTimeout`/`setInterval`. The typed version needs type information, so the core rule stays in files without it. |
| `no-mixed-operators` | `@stylistic/no-mixed-operators` | `baseConfig` | absent | `warn` | Warns on mixed operators; parentheses clarify. |
| `no-mixed-spaces-and-tabs` | covered by `@stylistic/no-tabs` | `baseConfig` | absent | absent (covered) | `no-tabs` rejects any tab, so mixed indentation is rejected too. |
| `no-multi-spaces` | `@stylistic/no-multi-spaces` | `baseConfig` | `error` | `error` | Preserved. |
| `no-new-symbol` | replaced by `no-new-native-nonconstructor` | `@eslint/js` recommended | absent (core deprecated) | `error` (inherited) | The core rule is deprecated. The replacement is already active through the recommended preset. |
| `no-reserved-keys` | none | not available | absent | absent | Removed; not in Stylistic or core. |
| `no-space-before-semi` | `@stylistic/semi-spacing` | `baseConfig` | absent | `error`, `{ before: false, after: true }` | `a();`, with no space before the semicolon. |
| `no-spaced-func` | `@stylistic/function-call-spacing` (batch 1) | `baseConfig` | absent | `error`, `never` | Replaced by the batch 1 rule. |
| `no-tabs` | `@stylistic/no-tabs` | `baseConfig` | absent | `error` | Tabs are not allowed in indentation. |
| `no-throw-literal` | `no-throw-literal` (core); `@typescript-eslint/only-throw-error` in `typeCheckedConfig` | `baseConfig`, `typeCheckedConfig` | absent | `error` (core), TS `error` in typed files | `throw new Error(...)`. The typed version needs type information. |
| `no-trailing-spaces` | `@stylistic/no-trailing-spaces` | `baseConfig` | `error` | `error` | Preserved. |
| `no-use-before-define` | `no-use-before-define` (core, JS); `@typescript-eslint/no-use-before-define` (TS) | `baseConfig` | absent | `warn`, `{ functions: false, classes: true, variables: true }` | Functions may be declared later. In TS the core rule is off and the TS version applies. |
| `no-useless-constructor` | `no-useless-constructor` (core, JS); `@typescript-eslint/no-useless-constructor` (TS) | `baseConfig` | absent | `warn` | Parameter properties, access modifiers and constructors with logic are kept. In TS the core rule is off. |
| `no-whitespace-before-property` | `@stylistic/no-whitespace-before-property` | `baseConfig` | absent | `error` | `obj.prop`, with no space before the property. |

Notes on the decisions:

- **Three rules set to `warn`:** `@stylistic/no-mixed-operators`, `no-use-before-define` and `no-useless-constructor`.
- **TypeScript-specific rules:** `@typescript-eslint/no-use-before-define` and `@typescript-eslint/no-useless-constructor` apply to TS files without type information, so the core versions are off in TS. `@typescript-eslint/no-implied-eval` and `@typescript-eslint/only-throw-error` need type information, so they apply only in `typeCheckedConfig`, and the core versions are off there. Without `typeCheckedConfig`, the core rules still apply to TS files.
- **Behaviors checked in TypeScript:** an interface used before its declaration is accepted (the TS rule ignores type references by default). Enums and classes used before their declaration are reported. A constructor with parameter properties, a `private` constructor and a constructor with logic are accepted. A constructor that only calls `super` is reported.
- **Replaced or deprecated rules:** `no-spaced-func`, `no-space-before-semi` and `no-comma-dangle` are covered by batch 1 and batch 2 rules; `no-new-symbol` is covered by `no-new-native-nonconstructor`. The core versions are not registered.
- **Dispensed rules:** `no-arrow-condition`, `no-reserved-keys` and `newline-per-chained-call` (not enforced). `no-confusing-arrow` and `no-extra-parens` stay off.
- **Preserved rules:** `no-array-constructor` (TypeScript version in all files), `no-empty-function` (TS, warn), `no-multi-spaces` and `no-trailing-spaces`.
- **`no-eval` and globals:** the core rule reads the global scope. It checks `window.eval` only if `window` is declared, and `globalThis`/`global` are reported without a declaration because they are standard or Node globals. `baseConfig` declares only Node and Jest globals, so `window.eval(...)` in `.js` or `.ts` is not reported. The typed configuration does not change this. Adding `window` to the base globals would change behavior for every consumer and needs a decision.
- **Defaults added by ESLint:** `no-use-before-define` (core) and `@typescript-eslint/no-use-before-define` receive defaults such as `enums`, `typedefs` and `ignoreTypeReferences`. The approved options are the three in the table. The others are defaults, not extra configuration.
- **Overlap, `max-statements-per-line` and `brace-style`:** described in batch 2. It is not a technical conflict, and it does not change in this batch.

### Rule review, batch 4

This batch reviewed 41 rules. Of these, 17 do not exist in the installed packages or were discarded by the review (marked "Discarded"). The rest are split into 18 new activations, 6 preserved settings and rules left unchanged. The table gives the state before and after, checked with `ESLint.calculateConfigForFile()` for `.js`, `.jsx`, `.mjs`, `.cjs`, `.ts`, `.tsx`, `.mts` and `.cts`, under `baseConfig`, the React, Next.js and Expo presets, and `typeCheckedConfig`.

| Rule | Modern implementation | Origin before | Severity before | Severity after | Options after | Reason |
|---|---|---|---|---|---|---|
| `no-wrap-func` | none | not installed | absent | not configured | — | Discarded. Not in the installed packages. |
| `nonblock-statement-body-position` | `@stylistic/nonblock-statement-body-position` exists | not configured | absent | not configured | — | Discarded. Out of scope for this batch. |
| `object-curly-newline` | `@stylistic/object-curly-newline` | `baseConfig` | `error` | `error` | `{ multiline: true, consistent: true }` | Preserved. |
| `object-curly-spacing` | `@stylistic/object-curly-spacing` | `baseConfig` | `error` | `error` | `always` | Preserved. |
| `object-property-newline` | `@stylistic/object-property-newline` | `baseConfig` | `error` | `error` | `{ allowAllPropertiesOnSameLine: true }` | Preserved. |
| `one-var-declaration-per-line` | `@stylistic/one-var-declaration-per-line` exists | not configured | absent | not configured | — | Discarded. The `one-var` decision belongs to another batch. |
| `operator-linebreak` | `@stylistic/operator-linebreak` | not configured | absent | `error` | `before`, with `overrides: { '=': 'after' }` | Operators go at the start of the continuation line. The `=` of assignments and type aliases stays at the end of the line. |
| `padded-blocks` | `@stylistic/padded-blocks` | not configured | absent | `error` | `never` | No blank lines at the start or end of blocks. |
| `paths/alias` | none installed | not installed | absent | not configured | — | Discarded. Aliases belong to the consuming project. |
| `perfectionist/sort-named-exports` | `perfectionist/sort-named-exports` | not configured | absent | `error` | `{ type: 'alphabetical', order: 'asc' }` | Sorts named export members. See the notes below. |
| `perfectionist/sort-named-imports` | `perfectionist/sort-named-imports` | not configured | absent | `error` | `{ type: 'alphabetical', order: 'asc' }` | Sorts named import members inside each import. |
| `prefer-promise-reject-errors` | core; `@typescript-eslint/prefer-promise-reject-errors` with types | not configured | absent | core `error`; TS `error` in typed files | — | Rejects with non-Error values. The typed version replaces the core one. |
| `quote-props` | `@stylistic/quote-props` | not configured | absent | `warn` | `as-needed` | Quotes on keys only when needed. |
| `quotes` | `@stylistic/quotes` | `baseConfig` | `error` | `error` | `single` | Preserved. |
| `require-await` | core; `@typescript-eslint/require-await` with types | not configured | absent | core `warn`; TS `warn` in typed files | — | Async functions must contain `await`. The typed version accepts awaitable returns. |
| `rest-spread-spacing` | `@stylistic/rest-spread-spacing` | not configured | absent | `error` | `never` | `...a`, without a space. |
| `semi-spacing` | `@stylistic/semi-spacing` | `baseConfig` (batch 3) | `error` | `error` | `{ before: false, after: true }` | Preserved. |
| `semi-style` | `@stylistic/semi-style` | not configured | absent | `error` | `last` | The semicolon goes at the end of the line. |
| `simple-import-sort/exports` | none installed | not installed | absent | not configured | — | Discarded. `import/order` is kept. |
| `simple-import-sort/imports` | none installed | not installed | absent | not configured | — | Discarded. `import/order` is kept. |
| `space-after-function-name` | none (replaced) | not existing | absent | not configured | — | Discarded. Replaced by `space-before-function-paren`. |
| `space-after-keywords` | none (replaced) | not existing | absent | not configured | — | Discarded. Covered by `keyword-spacing` (batch 2). |
| `space-before-blocks` | `@stylistic/space-before-blocks` | not configured | absent | `error` | `always` | Space before `{`. |
| `space-before-function-paren` | `@stylistic/space-before-function-paren` | not configured | absent | `error` | `{ anonymous: 'always', named: 'never', asyncArrow: 'always' }` | Anonymous and async functions get a space; named functions do not. |
| `space-before-function-parentheses` | none (replaced) | not existing | absent | not configured | — | Discarded. Replaced by `space-before-function-paren`. |
| `space-before-keywords` | none (replaced) | not existing | absent | not configured | — | Discarded. Covered by `keyword-spacing` (batch 2). |
| `space-in-brackets` | none (replaced) | not existing | absent | not configured | — | Discarded. Covered by `array-bracket-spacing`, `computed-property-spacing` and `object-curly-spacing`. |
| `space-in-parens` | `@stylistic/space-in-parens` | `baseConfig` | `error` | `error` | `never` | Preserved. |
| `space-infix-ops` | `@stylistic/space-infix-ops` | not configured | absent | `error` | default | Spaces around binary operators. |
| `space-return-throw-case` | none (replaced) | not existing | absent | not configured | — | Discarded. Covered by `keyword-spacing` (batch 2). |
| `space-unary-ops` | `@stylistic/space-unary-ops` | not configured | absent | `error` | `{ words: true, nonwords: false }` | Words get a space; symbols do not. |
| `space-unary-word-ops` | none (replaced) | not existing | absent | not configured | — | Discarded. Replaced by `space-unary-ops`. |
| `standard/array-bracket-even-spacing` | none installed | not installed | absent | not configured | — | Discarded. Stylistic `array-bracket-spacing` is kept. |
| `standard/computed-property-even-spacing` | none installed | not installed | absent | not configured | — | Discarded. Stylistic `computed-property-spacing` is kept. |
| `standard/object-curly-even-spacing` | none installed | not installed | absent | not configured | — | Discarded. Stylistic `object-curly-spacing` is kept. |
| `switch-colon-spacing` | `@stylistic/switch-colon-spacing` | not configured | absent | `error` | `{ before: false, after: true }` | `case 1: x`. |
| `template-curly-spacing` | `@stylistic/template-curly-spacing` | not configured | absent | `error` | `never` | `${value}`, without spaces. |
| `template-tag-spacing` | `@stylistic/template-tag-spacing` | not configured | absent | `error` | `never` | A tag followed directly by its template, without a space. |
| `wrap-iife` | `@stylistic/wrap-iife` | not configured | absent | `error` | `inside` | `(function () {})()`. Kept as `inside`, not the Stylistic default. |
| `wrap-regex` | `@stylistic/wrap-regex` exists | not configured | absent | not configured | — | Kept off. `/abc/.test(value)` is not wrapped. |
| `yield-star-spacing` | `@stylistic/yield-star-spacing` | not configured | absent | `error` | `after` | `yield* values`. |

Notes on the decisions:

- **Import and export order:** `perfectionist/sort-named-imports` and `perfectionist/sort-named-exports` sort only the named members inside each import or export. They do not change import groups, paths, aliases or `type` modifiers. `import/order` remains the only rule for group order, and it is unchanged. In a combined test, both fixes ran in one pass and the second pass changed nothing. Sorting ignores case by default, so `Config` comes before `defaultDefineConfig`.
- **Promises and `await`:** the core rules apply to JavaScript and to TypeScript without `typeCheckedConfig`. With `typeCheckedConfig`, the TypeScript versions replace them for `.ts`, `.tsx`, `.mts` and `.cts`, so no file has two implementations. The two versions disagree on purpose: an `async` function that returns a Promise or a thenable without `await` is reported by the core rule and accepted by the typed one, because returning an awaitable from an `async` function is not a missing `await`.
- **Overlap with function declarations:** the examples `function executar() {}` and `const processar = async (valor) => valor` pass the spacing rules. `func-style` (`expression`, an existing rule) still rejects function declarations, and `require-await` reports `async (valor) => valor` when there is no `await`. Neither result is changed by this batch.
- **Typed rules:** `@typescript-eslint/prefer-promise-reject-errors` and `@typescript-eslint/require-await` need type information, so they apply only with `typeCheckedConfig`. The base configuration does not use them.
- **Discarded rules:** the 17 discarded rules are either absent from the installed packages or replaced by an approved Stylistic rule. No plugin was added. `simple-import-sort`, `paths` and `standard` are not installed.
- **Autofix on this repository:** the new `quote-props` rule removed unnecessary quotes from keys in `base.ts` and `react.ts`, and the new Perfectionist rule reordered one import in `utils.ts`. These are the only changes made by autofix. No logic changed.
- **`operator-linebreak` and `=`:** with `before` alone, the rule also treats the `=` of assignments and type aliases as an operator. `const v =` followed by a line break became `const v` and `= valor`, and the leading-pipe union `export type X =` became `= | 'a'`. The approved setting keeps `before` for every operator and adds `overrides: { '=': 'after' }`, so `=` stays at the end of the line. `overrides: { '=': 'none' }` was rejected because it would forbid line breaks next to `=`, which the previous behavior allowed. Checked cases: variable assignments, type aliases, generic defaults, conditional (`?`, `:`) and logical operators, with stable autofix.
- **`require-await` in `override-swc.ts`:** the helper `onLoad` is no longer `async`. It only registers the callback with `build.onLoad`, synchronously. The callback passed to `build.onLoad` keeps `async`, because it awaits `transformSwc`. `onLoad` is not exported and its only caller does not await it, so no consumer depends on a `Promise` return. `tests/override-swc.test.mjs` checks that registration is synchronous and that the transformation still removes types and emits a sourcemap. The signature change itself is protected by the lint rule, not by that runtime test.

### Rule review, batch 5

This batch received 131 rule entries. They correspond to 84 unique rules. 65 entries use the legacy `@stylistic/js/*` namespace, which maps to the same `@stylistic/*` rules. Two `@babel/*` entries map to Stylistic rules that were already configured, and three `@blitz/*` entries belong to a plugin that is not installed. Seven rules were activated. The other 77 unique rules are either already active and unchanged (55), not activated (19), or discarded (3).

The effective configuration was compared with the previous commit using `ESLint.calculateConfigForFile()` for `.js`, `.jsx`, `.mjs`, `.cjs`, `.ts`, `.tsx`, `.mts` and `.cts`, under `baseConfig`, the React preset, the Next.js preset (with `reactNextConfig`), the Expo preset and `typeCheckedConfig`. Only the seven activated rules changed.

#### Activated rules

| Rule | Severity | Options | Applies to | Before |
|---|---|---|---|---|
| `@stylistic/indent-binary-ops` | `warn` | `2` | All files (`baseConfig`) | absent |
| `@stylistic/padding-line-between-statements` | `warn` | `{ blankLine: 'always', prev: '*', next: 'return' }` | All files (`baseConfig`) | absent |
| `@stylistic/member-delimiter-style` | `error` | `multiline: { delimiter: 'semi', requireLast: true }`, `singleline: { delimiter: 'semi', requireLast: false }` | `.ts`, `.tsx`, `.mts`, `.cts` | absent |
| `@stylistic/type-generic-spacing` | `error` | none | `.ts`, `.tsx`, `.mts`, `.cts` | absent |
| `@stylistic/type-named-tuple-spacing` | `error` | none | `.ts`, `.tsx`, `.mts`, `.cts` | absent |
| `@stylistic/jsx-one-expression-per-line` | `warn` | `{ allow: 'single-line' }` | `.jsx`, `.tsx` in `reactNextConfig` | absent |
| `@stylistic/jsx-tag-spacing` | `error` | `closingSlash: 'never'`, `beforeSelfClosing: 'always'`, `afterOpening: 'never'`, `beforeClosing: 'allow'` | `.jsx`, `.tsx` in `reactNextConfig` | absent |

The four TypeScript-only rules do not need type information, so `projectService` is not enabled for them. `indent-binary-ops` and `padding-line-between-statements` are in `baseConfig`, so they apply to every file it covers. `@stylistic/indent-binary-ops` keeps the `warn` severity: it is not raised to `error` in this batch.

#### Equivalent identifiers

- `@stylistic/js/<rule>` (65 entries) is the same as `@stylistic/<rule>`. The legacy namespace is not registered.
- `@stylistic/js/func-call-spacing` and `@stylistic/func-call-spacing` map to `@stylistic/function-call-spacing`, which keeps the `never` option.
- `@babel/object-curly-spacing` maps to `@stylistic/object-curly-spacing`, and `@babel/semi` maps to `@stylistic/semi`. Both were already `error` with the approved options.
- `@blitz/block-scope-case`, `@blitz/catch-error-name` and `@blitz/comment-syntax` belong to a plugin that is not installed. It was not added.

#### Consolidated status

| Status | Entries | Unique rules |
|---|---|---|
| Activated in this batch | 7 | 7 |
| Already active and unchanged | 93 | 55 |
| Not activated | 28 | 19 |
| Discarded (plugin not installed) | 3 | 3 |
| Total | 131 | 84 |

Not activated, with the original names and the reason:

| Rule | Original names | Reason |
|---|---|---|
| `@stylistic/line-comment-position` | `@stylistic/line-comment-position` | Not activated in this batch. |
| `@stylistic/implicit-arrow-linebreak` | `@stylistic/implicit-arrow-linebreak`, `@stylistic/js/implicit-arrow-linebreak` | Not activated in this batch. |
| `@stylistic/jsx-child-element-spacing` | `@stylistic/jsx-child-element-spacing` | `react/jsx-child-element-spacing` is already active, so no duplicate. |
| `@stylistic/jsx-curly-newline` | `@stylistic/jsx-curly-newline` | `react/jsx-curly-newline` is already active. |
| `@stylistic/jsx-curly-spacing` | `@stylistic/jsx-curly-spacing` | `react/jsx-curly-spacing` is already active. |
| `@stylistic/jsx-equals-spacing` | `@stylistic/jsx-equals-spacing` | `react/jsx-equals-spacing` is already active. |
| `@stylistic/jsx-indent` | `@stylistic/jsx-indent` | Obsolete implementation. `react/jsx-indent` is already active. |
| `@stylistic/jsx-indent-props` | `@stylistic/jsx-indent-props` | `react/jsx-indent-props` is already active. |
| `@stylistic/jsx-max-props-per-line` | `@stylistic/jsx-max-props-per-line` | `react/jsx-max-props-per-line` is already active. |
| `@stylistic/jsx-props-no-multi-spaces` | `@stylistic/jsx-props-no-multi-spaces` | `@stylistic/no-multi-spaces` already covers props. |
| `@stylistic/lines-around-comment` | `@stylistic/lines-around-comment`, `@stylistic/js/lines-around-comment` | Not activated in this batch. |
| `@stylistic/newline-per-chained-call` | `@stylistic/newline-per-chained-call`, `@stylistic/js/newline-per-chained-call` | Not activated in this batch. |
| `@stylistic/no-confusing-arrow` | `@stylistic/no-confusing-arrow`, `@stylistic/js/no-confusing-arrow` | Not activated in this batch. |
| `@stylistic/no-extra-parens` | `@stylistic/no-extra-parens`, `@stylistic/js/no-extra-parens` | Not activated in this batch. |
| `@stylistic/no-mixed-spaces-and-tabs` | `@stylistic/no-mixed-spaces-and-tabs`, `@stylistic/js/no-mixed-spaces-and-tabs` | Not activated in this batch. |
| `@stylistic/nonblock-statement-body-position` | `@stylistic/nonblock-statement-body-position`, `@stylistic/js/nonblock-statement-body-position` | Not activated. It was also discarded in batch 4. |
| `@stylistic/one-var-declaration-per-line` | `@stylistic/one-var-declaration-per-line`, `@stylistic/js/one-var-declaration-per-line` | Not activated. The `one-var` decision belongs to another batch. |
| `@stylistic/type-annotation-spacing` | `@stylistic/type-annotation-spacing` | Kept off, because it overlaps with `key-spacing`. The coverage is documented below. |
| `@stylistic/wrap-regex` | `@stylistic/wrap-regex`, `@stylistic/js/wrap-regex` | Kept off, as in batch 4. |

#### Decisions

- **React JSX rules are preserved.** The `react/jsx-*` rules remain the implementation for child spacing, curly spacing and newlines, equals spacing, indentation and props per line. Their Stylistic equivalents were not activated, to avoid duplicate diagnostics on the same tokens.
- **`type-annotation-spacing` stays off.** `key-spacing` covers the colon in type members: type literals, property signatures in aliases, class properties and index signature keys. It does not cover variable annotations (`const x : number`), parameters (`(a : number)`), return types (`(): void`), function types (`(a : string) => void`), optional properties (`a ?: string`), method signatures (`m (): void`) or `as`. These gaps are documented here and were not closed by a new rule.
- **`type` remains the preferred form.** `@typescript-eslint/consistent-type-definitions` still reports `interface`. `member-delimiter-style` checks only the members, so it does not change that preference.

#### Scope

- **JavaScript:** `indent-binary-ops` and `padding-line-between-statements` apply to every file in `baseConfig`.
- **TypeScript:** `member-delimiter-style`, `type-generic-spacing` and `type-named-tuple-spacing` apply to `.ts`, `.tsx`, `.mts` and `.cts`. They are not type-aware.
- **JSX:** `jsx-one-expression-per-line` and `jsx-tag-spacing` apply to `.jsx` and `.tsx` in `reactNextConfig`, which the React and Next.js presets use. `expoConfig` alone does not add them, as with the other Stylistic JSX rules.

#### Interactions checked

- **`indent-binary-ops` with `indent` and `operator-linebreak`.** A continuation inside parentheses with the wrong indentation is fixed by both rules, and the result is stable. An operator at the end of a line is moved by `operator-linebreak` and then indented by `indent-binary-ops`.
- **`padding-line-between-statements` with `max-statements-per-line`, `padded-blocks` and comments.** A one-line body is split and receives the blank line in the same autofix. Padding at the start of a block is removed by `padded-blocks never`, and the blank line is placed before the `return`, not at the start of the block. When a comment precedes the `return`, the blank line goes before the comment.
- **`member-delimiter-style` with `semi`, `key-spacing` and `consistent-type-definitions`.** Each rule reports its own problem on its own node, with no duplicate diagnostics.
- **`type-named-tuple-spacing` with `key-spacing`.** Tuple labels are reported only by `type-named-tuple-spacing`.
- **`jsx-tag-spacing` with `jsx-indent-props` and multi-line closing brackets.** `jsx-tag-spacing` accepts a closing bracket on its own line, and `jsx-indent-props` reports only the indentation of the props.

#### Known conflict

`type-generic-spacing` and `operator-linebreak` with `'=': 'after'` disagree about a line break inside a multi-line generic default:

```ts
export type Box<T
  = string> = T;
```

The composed autofix produces `export type Box<T = string> = T;`. `type-generic-spacing` reports `<T =` followed by a line break as a spacing mismatch and removes the break. The result is stable: a second autofix changes nothing. The `=` override still applies when `type-generic-spacing` is off, which is verified in isolation. The approved rules were not changed. If the multi-line generic default form must be kept, this needs a decision.

#### Compatibility

- Projects that use the presets may see new warnings from `indent-binary-ops`, `padding-line-between-statements` and `jsx-one-expression-per-line`, and new errors from `member-delimiter-style`, `type-generic-spacing`, `type-named-tuple-spacing` and `jsx-tag-spacing`.
- All seven rules have autofix. The fixes change whitespace, blank lines and separators only. For the TypeScript cases, the tests check that the fixed code has the same type structure.
- No plugin was added. No global of `baseConfig` changed. No severity or option approved in batches 1 to 4 changed.
- On this repository, autofix changed four files in `src/`, and only blank lines or semicolons in single-line type literals: `src/eslint-configs/utils.ts`, `src/tsup-plugins/fix-dist-imports.ts`, `src/tsup-plugins/override-swc.ts` and `src/types/tsup-plugin.ts`.

### Rule review, batch 6: JSX duplicates

Four JSX rules were enabled twice, once from `eslint-plugin-react` and once from `@stylistic/eslint-plugin`. This batch removes the four Stylistic entries from the `stylistic-jsx` block of `reactNextConfig`. The React rules stay with the same severities and options, and no other rule changed. Compared with batch 5, only 16 effective configuration entries changed: these four rules in `.jsx` and `.tsx`, for the React and Next.js presets.

| Pair | Removed Stylistic rule | Kept React rule | Finding |
|---|---|---|---|
| `jsx-closing-bracket-location` | `@stylistic/jsx-closing-bracket-location`: `warn`, `tag-aligned` | `react/jsx-closing-bracket-location`: `error`, `line-aligned` | Reproduced conflict |
| `jsx-closing-tag-location` | `@stylistic/jsx-closing-tag-location`: `warn`, `tag-aligned` | `react/jsx-closing-tag-location`: `error`, `line-aligned` | Reproduced conflict |
| `jsx-first-prop-new-line` | `@stylistic/jsx-first-prop-new-line`: `error`, `multiline` | `react/jsx-first-prop-new-line`: `error`, `multiline` | Duplicate diagnostics |
| `jsx-newline` | `@stylistic/jsx-newline`: `error`, `prevent: true` | `react/jsx-newline`: `error`, `prevent: true`, `allowMultilines: false` | Duplicate diagnostics |

#### Reproduced conflict

The two alignment rules disagree when the opening tag does not start its line. `line-aligned` aligns the closing bracket or tag with the line that contains the opening tag. `tag-aligned` aligns it with the `<` itself. Two minimal cases, with the previous configuration:

```jsx
render(<A
  p="1"
/>);
```

`react/jsx-closing-bracket-location` accepts this code. `@stylistic/jsx-closing-bracket-location` expects `/>` at the column of `<`. After the autofix, the Stylistic warning remained, so the composed configuration did not converge on this code. In the same runs, ESLint reported `ESLintCircularFixesWarning` (circular fixes) for JSX in these positions.

```jsx
render(<Painel>
  Conteúdo
    </Painel>);
```

The same happens with `jsx-closing-tag-location`: the Stylistic warning remained after the autofix, and React accepted the output.

In an object literal, `{ x: <A⏎  p="1"⏎/> }`, the previous configuration left a trailing space before the closing brace. The React rule alone produced clean output.

#### Observed duplicates

For `jsx-first-prop-new-line` and `jsx-newline`, both rules report the same line and column, with the same message and the same autofix. For `jsx-closing-tag-location` the two rules also report the same position when the closing tag is misaligned in a multi-line element. For `jsx-closing-bracket-location` in a ternary whose opening tag starts mid-line, both rules report the same position, but they expect different columns.

#### Potential divergence, not reproduced

Whenever the opening tag does not start its line, the two alignments can differ. In the cases tested, `jsx-wrap-multilines` (with `parens-new-line`) wraps the expression in parentheses first, and then both alignments coincide. The divergence therefore appears only where the wrapping rule does not apply, such as call arguments, array elements and object values.

#### Compatibility

- Projects that use the React or Next.js presets see fewer diagnostics in JSX: the two `jsx-closing-*` warnings disappear, and the duplicate `jsx-first-prop-new-line` and `jsx-newline` errors are reported once.
- The React errors remain, with the same severities and options, so the code that the React rules reject is still rejected.
- The `expoConfig` preset alone is unchanged, and so is the `typeCheckedConfig` composition.
- The tests are in `tests/lote6-jsx-duplicates.test.mjs`, with fixtures in `tests/fixtures/lote6/jsx-duplicates/`. They run the effective configuration and check the diagnostics, the autofix output and its second run.

### Rule review, batch 6: `react/jsx-no-undef` and `no-undef`

The React and Next.js presets enabled `react/jsx-no-undef` and `no-undef` at the same time for JavaScript and JSX files. Both reported an undefined JSX component at the same position, so each mistake produced two diagnostics. This batch turns `react/jsx-no-undef` off for `**/*.{js,jsx}`, and keeps `no-undef` on. Nothing else changed.

#### Why `no-undef` is kept and `react/jsx-no-undef` is turned off in JavaScript

The coverage was compared case by case, in `.js`, `.jsx` and `.tsx`, with the effective configuration:

| Case | `.js` / `.jsx`: both on | `.js` / `.jsx`: `react` off (kept) | `.js` / `.jsx`: `no-undef` off |
|---|---|---|---|
| Undefined component, `<ComponenteInexistente />` | 2 diagnostics, same position | 1, `no-undef` | 1, `react` |
| Undefined variable, `{variavelInexistente}` | 1, `no-undef` | 1, `no-undef` | **0, lost** |
| Undefined member, `<UI.Button />` | 2 | 1, `no-undef` | 1, `react` |
| Undefined prop value, `key={chave}` | 3 | 2, `no-undef` | 1, `react`, and `chave` is lost |
| Component defined locally or imported | 0 | 0 | 0 |
| Native element, `<section />` | 0 | 0 | 0 |
| Fragment, nested scope, defined component | 0 | 0 | 0 |
| Global declared with `/* global */` | 1, `react` | 0 | 0 |

Turning `no-undef` off would lose undefined variables in JavaScript, so that alternative was rejected. Turning off `react/jsx-no-undef` in `.tsx` would lose undefined components, because `no-undef` is already off in TypeScript files. So `.tsx` keeps `react/jsx-no-undef`.

#### Preserved per extension

- `.js`, `.jsx`: `no-undef` is `error`; `react/jsx-no-undef` is `off`, from the override.
- `.tsx`: `react/jsx-no-undef` is `error`; `no-undef` is `off`, from the TypeScript block. This is unchanged.
- `.ts`, `.mts`, `.cts`: `react/jsx-no-undef` is `error`, as before. These files cannot contain JSX, so the rule does not report anything there.
- `.mjs`, `.cjs`: unchanged, so they keep both rules. See the residual cases below.

#### Residual differences and limitations

- **Declared globals.** `react/jsx-no-undef` has `allowGlobals` set to `false`, so it reports a component that is declared as a global. `no-undef` accepts declared globals. In `.js` and `.jsx` a declared global is no longer reported. This is a relaxation: it accepts a component that is really declared. `.tsx` is unchanged.
- **`expoConfig` alone** reports an undefined component once, with `react/jsx-no-undef`, and an undefined variable with `no-undef`. There is no duplicate in that composition. This package does not change the Expo preset.
- **`expoConfig` combined with `baseConfig`.** The duplicate appears in `.js` and `.jsx`: the component is reported by both rules in the same position. It is kept, because the Expo preset defines `react/jsx-no-undef` as `error` for all files.
- **`expoConfig` placed after `reactNextConfig` in the same array, with `baseConfig`.** The Expo rule comes later and enables `react/jsx-no-undef` again in `.js` and `.jsx`. Consumers who combine them must put an override after `expoConfig`. Separate configs, as the README recommends for the monorepo case, avoid this.
- **`.mjs` and `.cjs` with JSX** still report the component twice, because the override is limited to `.js` and `.jsx` as approved.

#### `reactNextConfig` alone

`reactNextConfig` does not include `no-undef`, and it turns `react/jsx-no-undef` off for `.js` and `.jsx`. So in those files, a project that uses `reactNextConfig` without `baseConfig` has no rule that reports an undefined component or variable. The measured results, with `ESLint.calculateConfigForFile()` and the rules run on the same code, are:

| Composition | Undefined component in `.js` / `.jsx` | Undefined variable in `.js` / `.jsx` | Undefined component in `.tsx` |
|---|---|---|---|
| `reactNextConfig` alone | not reported | not reported | reported by `react/jsx-no-undef` |
| `baseConfig` alone | reported by `no-undef` | reported by `no-undef` | not reported (TypeScript compiler) |
| `baseConfig` + `reactNextConfig` (recommended) | reported once, by `no-undef` | reported once, by `no-undef` | reported once, by `react/jsx-no-undef` |
| Next.js documented (`baseConfig` + `reactNextConfig` + `nextConfig`) | reported once, by `no-undef` | reported once, by `no-undef` | reported once, by `react/jsx-no-undef` |
| `expoConfig` alone | reported once, by `react/jsx-no-undef` | reported by `no-undef` | reported by `react/jsx-no-undef` |
| `baseConfig` + `expoConfig` | reported twice in the same position (duplicate, kept) | reported by `no-undef` | reported by `react/jsx-no-undef` |
| `baseConfig` + `reactNextConfig` + `expoConfig` | reported twice in the same position (duplicate, kept) | reported by `no-undef` | reported by `react/jsx-no-undef` |

Components that are imported, defined in the same file, used as properties of a defined object, or native elements are not reported in any composition. Undefined members (`<UI.Button />`) are reported in the same way as undefined components.

Because of this, `reactNextConfig` must be combined with `baseConfig` for JavaScript and JSX files. The recommended composition is:

```ts
import { eslintConfigs } from '@mathbreder/eslint-config';

export default eslintConfigs.defineConfig([
  ...eslintConfigs.baseConfig,
  ...eslintConfigs.reactNextConfig,
]);
```

This composition is what the rest of this README documents. The table does not show that `reactNextConfig` alone is equivalent to it: it is not, for JavaScript and JSX.

#### Tests

- `tests/lote6-jsx-no-undef.test.mjs` runs 72 tests. They cover the 16 scenarios in `.js`, `.jsx` and `.tsx`, the fixtures in `tests/fixtures/lote6/jsx-no-undef/`, the effective configuration per composition and extension, the alternatives that were rejected, and the residual limitations above.
- Mutation check: turning the override back to `error` makes 16 of these tests fail.
- Three expectations of earlier tests described the duplicate that this batch removes, and were updated to the new behavior: `tests/react-inherited.test.mjs` (`react/jsx-no-undef` is `off` in `case.jsx`, and `no-undef` covers it), and two assertions in `tests/lote6-jsx-duplicates.test.mjs` (in `.jsx`, `no-undef` reports the component once, and `react/jsx-no-undef` is `off`).

### TypeScript files

The rules in this section apply to `.ts`, `.tsx`, `.mts` and `.cts` files. `.mts` and `.cts` also receive the base configuration.

- `@typescript-eslint/adjacent-overload-signatures` (error): overloads of the same method, function or interface member must be consecutive. This rule has no autofix, so reorder the signatures manually. Valid overloads are not reported:
  ```ts
  class Conversor {
    converter(value: string): string;
    converter(value: number): string;
    converter(value: string | number) {
      return String(value);
    }

    limpar() {}
  }
  ```
- `@typescript-eslint/no-dupe-class-members` (error) replaces the native `no-dupe-class-members` in TypeScript. It reports real duplicate implementations and accepts overload signatures.
- `@typescript-eslint/no-non-null-assertion` (warn): discourages `!`, but does not forbid it when you know a guarantee from outside the code. A single `!` is reported as a warning; `!!` is reported as an error by `no-extra-non-null-assertion`.
- `@typescript-eslint/no-require-imports` (error): use `import` instead of `require()`. Projects can allow specific paths in their own config, without changing the shared configuration:
  ```js
  // eslint.config.mjs of the consuming project
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-require-imports': [
        'error',
        { allow: ['\\.(png|jpg|svg|json)$'] },
      ],
    },
  }
  ```

- `@typescript-eslint/array-type` (warn, `array-simple`): simple types use `string[]` and `readonly string[]`; complex types keep `Array<string | number>`. `Array<string>` and `ReadonlyArray<string>` are reported.
- `@typescript-eslint/consistent-type-assertions` (warn): prefers `value as Type` over `<Type>value`. Object literal assertions with `as` are accepted.
- `@typescript-eslint/no-empty-object-type` (error) replaces the deprecated `no-empty-interface`, which is not enabled. Empty interfaces, empty interfaces that only extend another, and `{}` are reported. An interface that extends another and adds members is accepted.
- `@typescript-eslint/prefer-for-of` (warn): an index loop that only reads array elements should be a `for...of` loop. Loops that use the index are accepted.
- `@typescript-eslint/prefer-function-type` (warn): an interface with a single call signature and no other members should be a function type. Interfaces with extra members or several call signatures are accepted.
- `@typescript-eslint/explicit-member-accessibility` (warn, `explicit`, constructors `no-public`): class members need explicit `private`, `protected` or `public`, including accessors and parameter properties. Constructors must not declare `public`:
  ```ts
  class Usuario {
    private nome: string;

    constructor(nome: string) {
      this.nome = nome;
    }

    public obterNome(): string {
      return this.nome;
    }
  }
  ```
- `no-inferrable-types` is not enabled, so `let a: number = 1;` is accepted. The rule cannot distinguish `let` from `const`, so it stays off.

- `@typescript-eslint/member-ordering` (warn, default options) checks the order of class and interface members. It does not impose alphabetical order. Overload signatures are not treated as a violation: `adjacent-overload-signatures` (error) keeps overloads consecutive, and `no-dupe-class-members` (TypeScript-aware, error) reports real duplicate implementations.
- `@typescript-eslint/no-empty-function` (warn) reports empty constructors, methods, callbacks and functions. Two official exceptions are enabled because empty bodies are intentional there: `overrideMethods` (an overridden method emptied on purpose) and `decoratedFunctions` (members used by decorators). Test files (`**/*.{test,spec}.{ts,tsx}` and `**/tests/**`) are not checked by this rule. For other cases, use an inline `eslint-disable` comment with a description.

The native rules below are turned off for TypeScript files only. The TypeScript compiler already checks declarations, types, overloads and identifiers, and these native rules can report false positives on them:

- `no-redeclare`: TypeScript allows declaration merging and overloads.
- `no-undef`: TypeScript resolves types and global declarations itself.
- `no-dupe-class-members`: replaced by the TypeScript-aware version above.
- `no-array-constructor` and `no-unused-expressions`: replaced by their `@typescript-eslint` versions.

JavaScript keeps all of these native rules enabled.

### Type-checked rules (opt-in)

`typeCheckedConfig` adds rules that need type information. It is not part of `baseConfig`, so projects without type-checking are not required to use it. It enables `@typescript-eslint/no-floating-promises` (error) for `.ts`, `.tsx`, `.mts` and `.cts` files, and uses `parserOptions.projectService: true`. Each file is checked against the nearest `tsconfig.json` of the consuming project, so monorepos with several `tsconfig.json` files work without extra configuration. A file that is not included in any `tsconfig.json` is reported as a parsing error, not ignored.

```js
import { eslintConfigs } from '@mathbreder/eslint-config';

export default eslintConfigs.defineConfig([
  ...eslintConfigs.baseConfig,
  ...eslintConfigs.typeCheckedConfig,
]);
```

`no-floating-promises` reports a promise that is called and neither awaited, returned, handled with `.catch()` nor marked with `void`:

```ts
async function salvar() {
  await gravarNoBanco();
}

salvar(); // reported: wrap it with await, return, .catch() or void
```

`void salvar();` is accepted by default (`ignoreVoid`). This marks the promise as intentionally discarded, but it does not handle a rejection: if `salvar` rejects, the error is still unhandled. Use `.catch()` or `try`/`await` when the error must be handled.

### Inherited from presets

- `js.configs.recommended` (`@eslint/js`) supplies the core ESLint error rules, such as `no-cond-assign`, `no-unreachable`, `no-useless-escape`, `no-undef` and `no-redeclare` (the last two are off for TypeScript, see above). The config does not repeat them.
- `reactPlugin` recommended supplies `react/jsx-no-comment-textnodes`, `react/jsx-no-undef`, `react/jsx-uses-vars`, `react/no-children-prop`, `react/no-danger-with-children`, `react/no-deprecated`, `react/no-direct-mutation-state` and `react/no-find-dom-node`, all as error.
- `react-hooks` recommended supplies `react-hooks/rules-of-hooks` (error), `react-hooks/exhaustive-deps` (warn), `react-hooks/incompatible-library` (warn), `react-hooks/unsupported-syntax` (warn) and the other rules of the preset as error (`config`, `error-boundaries`, `gating`, `globals`, `immutability`, `preserve-manual-memoization`, `purity`, `refs`, `set-state-in-effect`, `set-state-in-render`, `use-memo`, `component-hook-factories`). `react-hooks/static-components` is off by project decision. Custom hook names are not set globally; configure `react-hooks` in the project when needed.
- `jsx-a11y` recommended supplies `alt-text`, `aria-props`, `aria-proptypes`, `aria-unsupported-elements`, `role-has-required-aria-props` and `role-supports-aria-props`, all as error without options. Custom components (for example an `Image` component that renders `img`) are not declared globally; configure `jsx-a11y` in the project that uses them.

### React Refresh for Vite

`viteReactRefreshConfig` enables `react-refresh/only-export-components` as `warn`, with `allowConstantExport: true`, for `.jsx` and `.tsx` files. It is not part of `baseConfig`, `reactNextConfig` or `expoConfig`, and it is not loaded when you import the main package.

Install the optional plugin in your project, then add the preset:

```
pnpm add -D eslint-plugin-react-refresh
```

```js
import { eslintConfigs } from '@mathbreder/eslint-config';
import { viteReactRefreshConfig } from '@mathbreder/eslint-config/react-refresh-vite';

export default eslintConfigs.defineConfig([
  ...eslintConfigs.baseConfig,
  ...eslintConfigs.reactNextConfig,
  ...viteReactRefreshConfig,
]);
```

Components exported by a file are accepted. Exporting a helper function or a non-primitive object from a component file triggers the warning, because Fast Refresh can then reload the file incorrectly.

### Next.js

`nextConfig`, from `@mathbreder/eslint-config/next`, enables the 21 rules of `@next/eslint-plugin-next` 16.0.1. It is not part of `baseConfig`, `reactNextConfig` or `expoConfig`: enabling `reactNextConfig` alone does not turn on any Next.js rule. The main entry does not load the Next plugin, so projects that do not use Next.js do not need it.

Install the plugin in the project that uses Next.js:

```
pnpm add -D @next/eslint-plugin-next
```

Compose it with React and the import rules:

```js
import { eslintConfigs, getEslintImportConfig } from '@mathbreder/eslint-config';
import { nextConfig } from '@mathbreder/eslint-config/next';

export default eslintConfigs.defineConfig([
  ...eslintConfigs.baseConfig,
  ...eslintConfigs.reactNextConfig,
  ...nextConfig,
  ...getEslintImportConfig(),
]);
```

The preset uses the plugin's `recommended` configuration, not `core-web-vitals`, with one change:

- `error` (7): `inline-script-id`, `no-assign-module-variable`, `no-document-import-in-page`, `no-duplicate-head`, `no-head-import-in-document`, `no-html-link-for-pages` (raised from `warn` so internal navigation uses `next/link`), `no-script-component-in-head`.
- `warn` (14): `google-font-display`, `google-font-preconnect`, `next-script-for-ga`, `no-async-client-component`, `no-before-interactive-script-outside-document`, `no-css-tags`, `no-head-element`, `no-img-element`, `no-page-custom-font`, `no-styled-jsx-in-document`, `no-sync-scripts`, `no-title-in-document-head`, `no-typos`, `no-unwanted-polyfillio`.

`core-web-vitals` also raises `no-sync-scripts` to `error`. That change is not part of this preset, so `no-sync-scripts` stays a warning.

Disable a rule in one project when you need to, for example a deliberate `<img>`:

```js
export default eslintConfigs.defineConfig([
  ...eslintConfigs.baseConfig,
  ...eslintConfigs.reactNextConfig,
  ...nextConfig,
  { rules: { '@next/next/no-img-element': 'off' } },
]);
```

Some rules check a specific structure, so they only report what they are written for:

- `no-duplicate-head` checks a class-based `_document` (`class X extends Document`), not a function component.
- `no-assign-module-variable` checks declarations (`const module = ...`), not assignments (`module = ...`).

#### Next.js in a monorepo

Set `settings.next.rootDir` to the Next.js application directory. The plugin uses it to find `pages/` and `app/`:

```js
export default eslintConfigs.defineConfig([
  ...eslintConfigs.baseConfig,
  ...eslintConfigs.reactNextConfig,
  ...nextConfig,
  { settings: { next: { rootDir: 'apps/web' } } },
]);
```

The path is resolved from the directory where ESLint runs (`process.cwd()`), not from the config file's location. Run ESLint from the monorepo root so `apps/web` resolves, or use one `eslint.config` per application as described in [React and Expo in one monorepo](#react-and-expo-in-one-monorepo).

### Rules intentionally not enabled

- Retired TypeScript rules, not to be added: `@typescript-eslint/ban-types` (use `no-empty-object-type`, `no-unsafe-function-type` and `no-wrapper-object-types`, plus `no-restricted-types` when needed), `@typescript-eslint/indent` (use `@stylistic/indent`) and `@typescript-eslint/no-var-requires` (use `no-require-imports`). `no-empty-interface` is also not enabled, because `no-empty-object-type` replaces it.
- `perfectionist/sort-imports` is not enabled. Import order is handled by `import/order`, with per-project `pathGroups` and alphabetical sorting. Perfectionist stays for union and intersection types.
- `import/no-duplicates` is not enabled. `no-duplicate-imports` (error) remains the duplicate-import rule. It also reports `import type` and value imports from the same module, which `import/no-duplicates` would accept as separate by default. Re-exports are not reported in this configuration (`no-duplicate-imports` runs with `includeExports: false`).
- `prettier/prettier` is not enabled. Formatting is handled by the `@stylistic` rules and the JSX rules of this configuration. Migrating to Prettier is a separate decision.
- `no-restricted-globals` (for example `$` and `jQuery`) is not enabled globally. Projects that need these restrictions configure them in their own `eslint.config`.
- `@dword-design/import-alias` is not used. Alias requirements are project-specific: configure `pathGroups` and `noUnresolvedIgnore` in `getEslintImportConfig`.

### Known conflicts

- `export default () => <div />` triggers `react/display-name` (warn). The config sets `react/function-component-definition` to `unnamedComponents: 'arrow-function'`, so anonymous arrow components are not reported as errors.
- Malformed JSX indentation is reported by both `@stylistic/indent` and `react/jsx-indent`, so the same error appears twice. Both rules expect the same indentation, so there is no contradiction. This duplication is accepted.
- `expoConfig` combined with `getEslintImportConfig` used to fail with `Plugin "import" foi registrado com implementações diferentes`. The cause is that `eslint-plugin-import` 2.32.0 is installed as two pnpm instances: `eslint-config-expo` 58 depends on `eslint-import-resolver-typescript` 3.x, while this package uses 4.x. Both instances have the same version and the same rule metadata. `defineConfig` now keeps this package's instance, which resolves imports with the resolver this package declares, and points the Expo block at it. Any other plugin conflict still fails with the same message. The package does not change the lockfile to deduplicate peer contexts, because that would not reach consumers.
- `import/no-cycle` runs with `disableScc: true`. This option makes the rule check cycles directly instead of through strongly connected components. It reports the same cycles, and it avoids a crash in `eslint-plugin-import` 2.32.0 when the file being linted cannot be resolved by the TypeScript resolver, which happens with the Expo preset. The cost is speed on very large import graphs.
- `import/no-cycle` reports cycles between TypeScript files (`.ts`, `.tsx`, `.mts`, `.cts`). Before this update the preset did not set `import/extensions`, so the rule never reported cycles between `.ts` files. The preset now sets `import/extensions` to the TypeScript and JavaScript extensions, which is the same list `expoConfig` uses. As a consequence, projects that already had TypeScript cycles will see new `import/no-cycle` warnings after the update. Type-only imports are still ignored by the rule.
- The tsup helpers (`fixBuildImportsPlugin` and `overrideSwcPlugin`) are still exported from the main entry. Their declarations no longer reference `esbuild`, so TypeScript consumers do not need `esbuild` installed and do not need `skipLibCheck: true`. The option type is a structural subset of esbuild's `BuildOptions`. A function annotated with the full esbuild type may need a cast when it is assigned to `esbuildOptions`.
- `@swc/core` is a required peer dependency, because the main entry loads the tsup helper `overrideSwcPlugin`, which imports it. `eslint-config-expo` is an optional peer: only projects that import `@mathbreder/eslint-config/expo` need it.

## Tests

```
pnpm test
```

Runs `pnpm run build` and then the tests in `tests/`. The tests use the ESLint API against the built output. They cover the no-unused-vars options, stylistic indentation, the max function length, the recommended and TypeScript rules (valid and invalid examples in `.js` and `.ts`), the TypeScript native overrides and overloads, `no-require-imports` with `allow`, `import/order`, `import/no-unresolved` (including the `@/` alias), JSX indentation, `react/display-name`, React Hooks, the opt-in React Refresh preset, the type-checked preset (`no-floating-promises` on real files, across two `tsconfig.json` projects, and an out-of-project file), the quality rules and `no-alert` by preset, plugin composition (identity reuse, collisions, no mutation of presets), `.mjs` and `.cjs` handling, a React and Expo monorepo with one config per project, and the effective severities of inherited rules. `expo-subpath-migration.test.mjs` covers the Expo migration: `expoConfig` is absent from `eslintConfigs`, the `./expo` export resolves in ESM and CommonJS with the expected files, no module reachable from the main entry imports `eslint-config-expo`, and the peer is optional. `typescript-cycles.test.mjs` covers cycles between TypeScript files, `.tsx` files, aliases, type-only imports and the Expo composition, and checks that the rule keeps its severity and `disableScc`. The consumer tests are a separate command, described below.

## Consumer tests

The consumer tests install the package the way a project does, in temporary directories, and run one verification per consumer under `tests/consumers/`. Each installation uses the required peer dependencies plus the optional peers of that consumer, and runs with `--engine-strict`.

There are two ways to run them:

- `pnpm run test:consumers` builds and packs the package, then runs every consumer on the current Node version. Use it during development.
- `node tests/consumers/run.mjs --tarball <file.tgz>` installs an existing tarball without building it. The CI consumers job uses this command, so consumer jobs never run `tsup`. Before installing anything, the harness checks that the pnpm executing the installs runs on the same Node version as the harness, and aborts otherwise. Failures print the command, the Node and pnpm versions, the exit code and the full output.

A consumer whose framework needs a newer Node version than the current one is reported as `SKIP` with its reason. A skip is not a pass, and the summary line counts skipped consumers separately.

| Consumer | Node range | Checks |
|---|---|---|
| `node-esm` | all supported | `baseConfig`, `getEslintImportConfig`, and linting `.js` and `.mjs`. Also checks that `eslint-config-expo` is not installed and that the main entry does not expose `expoConfig` |
| `node-cjs` | `^20.19.0 \|\| ^22.12.0 \|\| >=23.0.0` | `require()` of the main entry and of `react-refresh-vite`, and linting `.cjs` |
| `typescript` | all supported | `typeCheckedConfig`, alias resolution, and the public type exports (`tsc`) |
| `react` | all supported | `reactNextConfig`, rules of hooks, and `no-alert` for `.js` and `.tsx` |
| `expo` | `^22.13.0 \|\| ^24.3.0 \|\| ^26.0.0 \|\| >=27.0.0` | `expoConfig` from `@mathbreder/eslint-config/expo`, rules of hooks, and no `no-alert` |
| `vite-react` | all supported | `viteReactRefreshConfig` imported from its subpath |
| `monorepo` | `^22.13.0 \|\| ^24.3.0 \|\| ^26.0.0 \|\| >=27.0.0` | React and Expo projects in one repository, each with its own config |
| `next` | all supported | `nextConfig` from its subpath (ESM and CJS), with `no-html-link-for-pages` and `no-img-element` on a Next.js app |

These projects are independent fixtures that behave like consumers. They do not replace validation in real production applications.

## Publishing and CI

The workflow `.github/workflows/npm-publish.yml` has three jobs, and they separate the build from the consumer tests:

- **`build` (Node 22):** `pnpm install --frozen-lockfile`, build, lint, unit tests, `pnpm pack`, and `pnpm publish --dry-run`. It uploads the tarball as the `package-tarball` artifact. The build tooling (`tsup` 9) runs only here.
- **`consumers` (matrix):** downloads that exact tarball and runs `node tests/consumers/run.mjs --tarball` on Node 20.19.0, 22.13.0, 22 (latest), 24 and 26. These jobs install no repository dependencies and do not run `tsup`, so they check what a consumer installs.
- **`publish-npm`:** runs only when a release is created, after `build` and `consumers` pass. It publishes the same tarball that was tested, with `pnpm publish` and the `npm_token` repository secret.

The package is published with `publishConfig.access: public`, because it is scoped (`@mathbreder/...`). Before a release, run `pnpm run build && pnpm pack` and inspect the tarball, or run `pnpm run test:consumers`.

Status of the CI: the workflow was checked statically (YAML, job dependencies, artifact flow, the single `NODE_AUTH_TOKEN` usage) and every check it runs was executed locally on the same tarball. The workflow runs on GitHub Actions for every pull request. On pull request #9, the build job and the consumer jobs on Node 20.19.0, 22.13.0, 22, 24 and 26 passed, and the publish job was skipped, as expected for a pull request. The actions use `actions/checkout` v7, `actions/setup-node` v7, `actions/upload-artifact` v7 and `actions/download-artifact` v8. `pnpm/action-setup` stays on v4, because v6 moved its setup to pnpm v11, and pnpm 10.28 was not verified with v6. In `setup-node` v7 the `NODE_AUTH_TOKEN` fallback was removed: the publish step sets `NODE_AUTH_TOKEN` explicitly, so the generated `.npmrc` resolves the token.

## Security

`pnpm audit` reports the advisories of the whole development tree, and it reports only what a consumer receives when it audits the installed package. The two results differ, so both are reported here.

- **Consumer tree** (this package with every peer dependency, including the optional ones, installed from the tarball): one advisory, moderate, `minimatch` 10.2.6 (GHSA-g3hv-75wg-m249, CWE-405, denial of service through a glob pattern with `optimizationLevel` 2 or higher). It reaches consumers through `@typescript-eslint/typescript-estree` 8.72.1, which depends on `minimatch` ^10. The fix is in `minimatch` 11.0.1, which needs `typescript-eslint` 9, a major upgrade that is not part of this release. The exposure is limited to glob patterns that come from untrusted input, such as the `tsconfig.json` of a pull request that a CI job lints. Accepted as a residual risk.
- **Repository tree**: 23 advisories before the targeted lockfile update, and 1 after it. The update changed only the lockfile, and only the packages listed in the advisories, inside the ranges their parents already declare: `minimatch` 3.1.5, `brace-expansion` 1.1.21, `picomatch` 2.3.2, `flatted` 3.4.4, `browserslist` 4.29.5, `zod` 4.6.7, `@babel/core` 7.29.13, `@humanfs/node` 0.16.8 and `baseline-browser-mapping` 2.11.35, with the data packages that `browserslist` needs. The remaining advisory is the `minimatch` 10.2.6 above.

Run `pnpm audit` in the repository and `pnpm audit --prod` in a consumer project. Do not use `pnpm audit --fix` here: it would update packages outside the advisories.

## Automated dependency updates 🔄
We use Dependabot to keep dependencies and GitHub Actions up to date. Dependabot opens weekly pull requests with suggested upgrades so you can review and merge them.
