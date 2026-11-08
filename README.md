# mathbreder's ESLint config

## Whats included?

- Standard config base;
- Prettier;

## Setup

Requires ESLint 9.35 or newer (flat config). Version 9.35 is the minimum because of the `preserve-caught-error` rule. The package exports `eslintConfigs` (presets) and `getEslintImportConfig` (import rules).

Install the package together with the peer dependencies listed in its `package.json`:
```
pnpm add -D @mathbreder/eslint-config
```

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
- `expoConfig`: Expo defaults. It registers its own `react-hooks` plugin, so do not combine it with `reactNextConfig` in the same config array.

Opt-in preset, not included in `eslintConfigs`:

- `viteReactRefreshConfig`, from `@mathbreder/eslint-config/react-refresh-vite`: see [React Refresh for Vite](#react-refresh-for-vite).

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

The native rules below are turned off for TypeScript files only. The TypeScript compiler already checks declarations, types, overloads and identifiers, and these native rules can report false positives on them:

- `no-redeclare`: TypeScript allows declaration merging and overloads.
- `no-undef`: TypeScript resolves types and global declarations itself.
- `no-dupe-class-members`: replaced by the TypeScript-aware version above.
- `no-array-constructor` and `no-unused-expressions`: replaced by their `@typescript-eslint` versions.

JavaScript keeps all of these native rules enabled.

### Inherited from presets

- `js.configs.recommended` (`@eslint/js`) supplies the core ESLint error rules, such as `no-cond-assign`, `no-unreachable`, `no-useless-escape`, `no-undef` and `no-redeclare` (the last two are off for TypeScript, see above). The config does not repeat them.
- `reactPlugin` recommended supplies `react/jsx-no-comment-textnodes`, `react/jsx-no-undef`, `react/jsx-uses-vars`, `react/no-children-prop`, `react/no-danger-with-children`, `react/no-deprecated`, `react/no-direct-mutation-state` and `react/no-find-dom-node`, all as error.
- `react-hooks` recommended supplies `react-hooks/rules-of-hooks` (error) and `react-hooks/exhaustive-deps` (warn). Custom hook names are not set globally; configure `react-hooks` in the project when needed.

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

### Known conflicts

- `export default () => <div />` triggers `react/display-name` (warn). The config sets `react/function-component-definition` to `unnamedComponents: 'arrow-function'`, so anonymous arrow components are not reported as errors.
- Malformed JSX indentation is reported by both `@stylistic/indent` and `react/jsx-indent`, so the same error appears twice. Both rules expect the same indentation, so there is no contradiction. This duplication is accepted.

## Tests

```
pnpm test
```

Runs `pnpm run build` and then the tests in `tests/`. The tests use the ESLint API against the built output. They cover the no-unused-vars options, stylistic indentation, the max function length, the recommended and TypeScript rules (valid and invalid examples in `.js` and `.ts`), the TypeScript native overrides and overloads, `no-require-imports` with `allow`, `import/order`, `import/no-unresolved` (including the `@/` alias), JSX indentation, `react/display-name`, React Hooks, the opt-in React Refresh preset, and the effective severities of inherited rules.

## Automated dependency updates 🔄
We use Dependabot to keep dependencies and GitHub Actions up to date. Dependabot opens weekly pull requests with suggested upgrades so you can review and merge them.
