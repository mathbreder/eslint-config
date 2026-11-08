# mathbreder's ESLint config

## Whats included?

- Standard config base;
- Prettier;

## Setup

### Requirements

- Node.js `^18.18.0 || ^20.9.0 || >=21.1.0` (declared in `engines`). CI runs Node 20 and 22.
- ESLint 9.35 or newer, flat config only. 9.35 is the minimum because of the `preserve-caught-error` rule.
- TypeScript `>=4.8.4 <6.0.0` when you use TypeScript. This is the range supported by `typescript-eslint` 8.
- `eslint-plugin-react-refresh` only when you use `viteReactRefreshConfig`.

### Installation

Install the package together with its required peer dependencies (the ones listed in `package.json` without `optional`):

```
pnpm add -D @mathbreder/eslint-config
```

The published package contains only `dist/`, `README.md`, `LICENSE` and `package.json`. Both ESM and CommonJS entries are available:

```js
// ESM
import { eslintConfigs, getEslintImportConfig } from '@mathbreder/eslint-config';
```

```js
// CommonJS
const { eslintConfigs, getEslintImportConfig } = require('@mathbreder/eslint-config');
```

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
- `expoConfig`: Expo defaults. It registers its own `react-hooks` plugin (version 5, from `eslint-config-expo`), while `reactNextConfig` uses `react-hooks` version 7. The two cannot share one config array; see [React and Expo in one monorepo](#react-and-expo-in-one-monorepo).
- `typeCheckedConfig`: opt-in rules that need type information. See [Type-checked rules](#type-checked-rules-opt-in).

Opt-in preset, not included in `eslintConfigs`:

- `viteReactRefreshConfig`, from `@mathbreder/eslint-config/react-refresh-vite`: see [React Refresh for Vite](#react-refresh-for-vite).

### Composition and plugin collisions

`eslintConfigs.defineConfig` (the same function as `eslint/config`'s `defineConfig`, plus one check) does not remove or replace plugins:

- Using the same plugin object in several presets is fine. The presets are not modified.
- Registering a plugin name twice with different implementations throws when you call `defineConfig`, and the message names both blocks, for example `Plugin "react-hooks" foi registrado com implementações diferentes em "bloco 2 (sem nome)" e "bloco 3 (sem nome)"`.

Previous versions removed the second registration silently, which could apply rules from a different plugin version. Compositions that worked before still work; the incompatible ones now fail explicitly.

### React and Expo in one monorepo

`reactNextConfig` and `expoConfig` cannot be combined in one config array, and file scopes do not change that: ESLint registers plugin names for the whole array, so `files` patterns cannot split the two `react-hooks` versions. Use one `eslint.config` per project and run ESLint from each project directory, so ESLint loads the nearest config:

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
- The main entry also exports the tsup helpers (`fixBuildImportsPlugin` and `overrideSwcPlugin`), whose type declarations reference `esbuild`. TypeScript consumers that do not have `esbuild` installed see a `Cannot find module 'esbuild'` error unless they use `skipLibCheck: true`. The JavaScript output does not import `esbuild`, so runtime use is not affected. Moving the tsup helpers to their own subpath would remove this, but it changes the import path, so it is left as a separate decision.
- `@swc/core` and `eslint-config-expo` are required peer dependencies because the main entry loads every preset and the tsup helper. Projects that do not use Expo still install `eslint-config-expo`.

## Tests

```
pnpm test
```

Runs `pnpm run build` and then the tests in `tests/`. The tests use the ESLint API against the built output. They cover the no-unused-vars options, stylistic indentation, the max function length, the recommended and TypeScript rules (valid and invalid examples in `.js` and `.ts`), the TypeScript native overrides and overloads, `no-require-imports` with `allow`, `import/order`, `import/no-unresolved` (including the `@/` alias), JSX indentation, `react/display-name`, React Hooks, the opt-in React Refresh preset, the type-checked preset (`no-floating-promises` on real files, across two `tsconfig.json` projects, and an out-of-project file), the quality rules and `no-alert` by preset, plugin composition (identity reuse, collisions, no mutation of presets), `.mjs` and `.cjs` handling, a React and Expo monorepo with one config per project, and the effective severities of inherited rules. The consumer tests are a separate command, described below.

## Consumer tests

`pnpm run test:consumers` packs the package, installs the tarball and its required peer dependencies in temporary directories, and runs one verification per consumer under `tests/consumers/`:

| Consumer | Checks |
|---|---|
| `node-esm` | `baseConfig`, `getEslintImportConfig`, and linting `.js` and `.mjs` |
| `node-cjs` | `require()` of the main entry and of `react-refresh-vite`, and linting `.cjs` |
| `typescript` | `typeCheckedConfig`, alias resolution, and the public type exports (`tsc`) |
| `react` | `reactNextConfig`, rules of hooks, and `no-alert` for `.js` and `.tsx` |
| `expo` | `expoConfig`, rules of hooks, and no `no-alert` |
| `vite-react` | `viteReactRefreshConfig` imported from its subpath |
| `monorepo` | React and Expo projects in one repository, each with its own config |

These projects are independent fixtures that behave like consumers. They do not replace validation in real production applications.

## Publishing and CI

The workflow `.github/workflows/npm-publish.yml` uses pnpm with `pnpm install --frozen-lockfile`:

- **Pull requests, and pushes to `main`:** the `verify` job runs on Node 20 and 22. It builds, runs lint, the unit tests, the consumer tests, and `pnpm publish --dry-run`.
- **Release created:** the `publish-npm` job runs only after `verify` succeeds, and publishes with `pnpm publish` using the `npm_token` repository secret.

The package is published with `publishConfig.access: public`, because it is scoped (`@mathbreder/...`). Before a release, run `pnpm run build && pnpm pack` and inspect the tarball, or run `pnpm run test:consumers`.

## Automated dependency updates 🔄
We use Dependabot to keep dependencies and GitHub Actions up to date. Dependabot opens weekly pull requests with suggested upgrades so you can review and merge them.
