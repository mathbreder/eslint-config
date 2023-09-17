module.exports = {
  env: {
    es2021: true,
    node: true,
  },
  extends: [
    'standard',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: [ '@typescript-eslint' ],
  rules: {
    '@typescript-eslint/member-delimiter-style': 'warn',
    '@typescript-eslint/naming-convention': 'warn',
    '@typescript-eslint/no-unused-expressions': 'off',
    '@typescript-eslint/semi': [ 'warn', 'always' ],
    'import/no-unresolved': 'error',
    'curly': 'warn',
    'eqeqeq': [ 'warn', 'always' ],
    'no-redeclare': 'warn',
    'no-throw-literal': 'warn',
    'no-unused-expressions': 'off',
    'prettier/prettier': [
      'error',
      {
        printWidth: 80,
        tabWidth: 2,
        semi: true,
        quoteProps: "consistent",
        singleQuote: true,
        trailingComma: 'all',
        bracketSpacing: true,
        bracketSameLine: true,
        arrowParens: 'always',
      },
    ],
    'sort-imports': [
      'error',
      {
        ignoreCase: true,
        ignoreDeclarationSort: false,
        ignoreMemberSort: false,
        memberSyntaxSortOrder: [ 'all', 'single', 'multiple', 'none' ],
        allowSeparatedGroups: true,
      },
    ],
  },
  settings: {
    'import/parsers': {
      [ require.resolve( '@typescript-eslint/parser' ) ]: [ '.ts', '.tsx', '.d.ts' ],
    },
    'import/resolver': {
      typescript: true,
      node: true,
    },
  },
}