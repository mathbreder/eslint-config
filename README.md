# mathbreder's ESLint config

## Whats included?

- Standard config base;
- Prettier;

## Setup

### Requirements

Node.js has two different requirements: the one for consumers, which this package declares in `engines`, and the one for development in this repository.

- **Consumers:** Node.js `^18.18.0 || ^20.9.0 || >=22.0.0`. The requirement depends on the module format:
  - **ESM** (`import`): Node 18.18+, 20.9+ and 22+. Use `import` on Node 18.
  - **CommonJS** (`require`): Node 20.19+, 22.12+ and 23+. The CommonJS entry loads `@stylistic/eslint-plugin` 5.10, which is ESM-only, through `require(esm)`. On Node 18 and on 20.9 to 20.18, `require()` fails with `ERR_REQUIRE_ESM`.
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

### Compatibility policy

- **ESLint 9.39.5 (transitional):** the npm registry marks this version as deprecated, with the notice that it is no longer supported. It is kept on purpose: ESLint 10.14 is available, but `eslint-plugin-react@7.37.5`, `eslint-plugin-jsx-a11y@6.10.2` and `eslint-plugin-import@2.32.0` do not declare ESLint 10 support. The migration to ESLint 10 is pending until those plugins declare it.
- **TypeScript:** development uses TypeScript 6.0.3. The supported range for consumers is `>=4.8.4 <6.1.0`; TypeScript 7 is not supported. `tsconfig.json` sets `ignoreDeprecations: "6.0"` because the declaration bundler still emits `baseUrl`, which TypeScript 7 removes. Revisit this before a TypeScript 7 upgrade.
- **Expo:** `expoConfig` is published only at `@mathbreder/eslint-config/expo`. It follows `eslint-config-expo` 58, which uses `react-hooks` 7 like the React preset, and its Node requirement comes from `eslint-plugin-expo` (see [Requirements](#requirements)). Projects on Expo 10 must stay on the previous package version. Combining `expoConfig` with `getEslintImportConfig` in one config array fails with a clear message, because Expo registers its own `eslint-plugin-import` instance; see [Known conflicts](#known-conflicts).
- **Next.js:** `nextConfig` follows the `recommended` set of `@next/eslint-plugin-next` 16.4.5. That version adds `no-location-assign-relative-destination` as `warn`, which is inherited and reported in the Next.js section.
- **Node.js:** consumer installs are checked with `pnpm install --engine-strict` on Node 18.18.2, 18.20.8, 20.9.0, 20.19.0, 22, 24 and 26. The consumer tests (see [Consumer tests](#consumer-tests)) run on each of them, and skip only the consumers whose framework requires a newer Node. Development runs on Node 22. `tsup` 9 requires Node `^22.18` and is used only on Node 22.
- **Breaking change: `expoConfig` moved to `@mathbreder/eslint-config/expo`.** It is no longer part of `eslintConfigs`, and the main entry no longer loads `eslint-config-expo`, so projects without Expo do not need it. The migration is described in [Migrating `expoConfig`](#migrating-expoconfig). The package version is not changed by this update; the release that ships it sets the version.
- **Behavior changes in this update:**
  - `react-hooks/component-hook-factories` is deprecated in `eslint-plugin-react-hooks` 7.1.1 and no longer part of `recommended`. It is not re-added.
  - `expoConfig` now includes the `react-hooks` 7 rules, and turns `react-hooks/static-components` off in `.jsx` and `.tsx` files, as the React preset does.
  - No approved severity or option changed in `baseConfig`, `reactNextConfig`, `typeCheckedConfig`, `viteReactRefreshConfig` or `getEslintImportConfig`. This was checked by comparing the effective configuration with the previous commit.
- **Peer dependencies not used by the source:** `eslint-config-next`, `eslint-plugin-n`, `eslint-plugin-promise`, `eslint-plugin-prettier`, `eslint-config-prettier`, `prettier` and `prettier-plugin-tailwindcss` are declared but not imported by any entrypoint. They are optional peers, so installing this package does not install them. They are kept for compatibility and are candidates for removal in a future major version.
- **Breaking changes since 0.0.10 (the version is not changed yet):**
  1. `eslintConfigs.expoConfig` moved to `@mathbreder/eslint-config/expo`. See [Migrating `expoConfig`](#migrating-expoconfig).
  2. The types of `TsupPlugin.esbuildOptions` and of the tsup helpers use a structural subset of esbuild's `BuildOptions` instead of the esbuild type. See [Known conflicts](#known-conflicts).
  3. `import/no-cycle` reports cycles between TypeScript files, which it did not before. Projects with existing TypeScript cycles get new warnings. See [Known conflicts](#known-conflicts).
  The release that ships these changes sets the version, following semantic versioning.

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

CommonJS works only where `require(esm)` is stable: Node 20.19 and newer, 22.12 and newer, and 23 and newer. On Node 18 and on 20.9 to 20.18, use ESM.

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
- `reactNextConfig`: React, React Hooks, JSX a11y and JSX rules. Apply it to React projects.
- `typeCheckedConfig`: opt-in rules that need type information. See [Type-checked rules](#type-checked-rules-opt-in).
- `nextConfig`: opt-in Next.js rules, from `@mathbreder/eslint-config/next`. See [Next.js](#nextjs).

Opt-in presets, not included in `eslintConfigs`:

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
- CommonJS projects use `require('@mathbreder/eslint-config/expo')` with the same shape. The subpath follows the same Node rules as the main entry: CommonJS needs Node 20.19+, 22.12+ or 23+.

### Composition and plugin collisions

`eslintConfigs.defineConfig` (the same function as `eslint/config`'s `defineConfig`, plus one check) does not remove or replace plugins:

- Using the same plugin object in several presets is fine. The presets are not modified.
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
- `node tests/consumers/run.mjs --tarball <file.tgz>` installs an existing tarball without building it. The CI consumers job uses this command, so Node 18 jobs never run `tsup`.

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
- **`consumers` (matrix):** downloads that exact tarball and runs `node tests/consumers/run.mjs --tarball` on Node 18.18.2, 18.20.8, 20.9.0, 20.19.0, 22, 24 and 26. These jobs install no repository dependencies and do not run `tsup`, so they check what a consumer installs.
- **`publish-npm`:** runs only when a release is created, after `build` and `consumers` pass. It publishes the same tarball that was tested, with `pnpm publish` and the `npm_token` repository secret.

The package is published with `publishConfig.access: public`, because it is scoped (`@mathbreder/...`). Before a release, run `pnpm run build && pnpm pack` and inspect the tarball, or run `pnpm run test:consumers`.

Status of the CI: the workflow was checked statically (YAML, job dependencies, artifact flow, the single `NODE_AUTH_TOKEN` usage) and every check it runs was executed locally on the same tarball. The workflow has not run on GitHub Actions yet, so a first run on GitHub is still required. The actions use `actions/checkout` v7, `actions/setup-node` v7, `actions/upload-artifact` v7 and `actions/download-artifact` v8. `pnpm/action-setup` stays on v4, because v6 moved its setup to pnpm v11, and pnpm 10.28 was not verified with v6. In `setup-node` v7 the `NODE_AUTH_TOKEN` fallback was removed: the publish step sets `NODE_AUTH_TOKEN` explicitly, so the generated `.npmrc` resolves the token.

## Security

`pnpm audit` reports the advisories of the whole development tree, and it reports only what a consumer receives when it audits the installed package. The two results differ, so both are reported here.

- **Consumer tree** (this package with every peer dependency, including the optional ones, installed from the tarball): one advisory, moderate, `minimatch` 10.2.6 (GHSA-g3hv-75wg-m249, CWE-405, denial of service through a glob pattern with `optimizationLevel` 2 or higher). It reaches consumers through `@typescript-eslint/typescript-estree` 8.72.1, which depends on `minimatch` ^10. The fix is in `minimatch` 11.0.1, which needs `typescript-eslint` 9, a major upgrade that is not part of this release. The exposure is limited to glob patterns that come from untrusted input, such as the `tsconfig.json` of a pull request that a CI job lints. Accepted as a residual risk.
- **Repository tree**: 23 advisories before the targeted lockfile update, and 1 after it. The update changed only the lockfile, and only the packages listed in the advisories, inside the ranges their parents already declare: `minimatch` 3.1.5, `brace-expansion` 1.1.21, `picomatch` 2.3.2, `flatted` 3.4.4, `browserslist` 4.29.5, `zod` 4.6.7, `@babel/core` 7.29.13, `@humanfs/node` 0.16.8 and `baseline-browser-mapping` 2.11.35, with the data packages that `browserslist` needs. The remaining advisory is the `minimatch` 10.2.6 above.

Run `pnpm audit` in the repository and `pnpm audit --prod` in a consumer project. Do not use `pnpm audit --fix` here: it would update packages outside the advisories.

## Automated dependency updates 🔄
We use Dependabot to keep dependencies and GitHub Actions up to date. Dependabot opens weekly pull requests with suggested upgrades so you can review and merge them.
