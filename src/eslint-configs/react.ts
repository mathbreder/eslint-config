import stylistic from '@stylistic/eslint-plugin';
import { defineConfig } from 'eslint/config';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

const { configs: reactHooksConfigs } = reactHooks;

/**
 * React/Next.js specific ESLint configuration
 * Includes: react, react-hooks, jsx rules, no-inline-styles
 */
export const reactNextConfig = defineConfig([
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat[ 'jsx-runtime' ],
  reactHooksConfigs.flat.recommended,
  jsxA11yPlugin.flatConfigs.recommended,
  {
    name: 'react-jsx',
    files: ['**/*.{jsx,tsx}'],
    plugins: {},
    settings: {
      'react': {
        'version': 'detect',
        'defaultVersion': '19.2.0',
      },
    },
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // React specific rules
      'react/checked-requires-onchange-or-readonly': [ 'error' ],
      'react/display-name': [ 'off' ],
      'react/function-component-definition': [ 'error', { 'namedComponents': 'arrow-function' } ],
      'react/jsx-boolean-value': [ 'error', 'never', { 'assumeUndefinedIsFalse': true } ],
      'react/jsx-child-element-spacing': [ 'error' ],
      'react/jsx-closing-bracket-location': [ 'error', 'line-aligned' ],
      'react/jsx-closing-tag-location': [ 'error', 'line-aligned' ],
      'react/jsx-curly-brace-presence': [ 'error', { 'props': 'never', 'children': 'never' } ],
      'react/jsx-curly-newline': [ 'error' ],
      'react/jsx-curly-spacing': [ 'error', { 'when': 'never', 'children': true } ],
      'react/jsx-equals-spacing': [ 'error', 'never' ],
      'react/jsx-first-prop-new-line': [ 'error', 'multiline' ],
      'react/jsx-fragments': [ 'error', 'syntax' ],
      'react/jsx-indent-props': [ 'error', 2 ],
      'react/jsx-indent': [ 'error', 2 ],
      'react/jsx-key': [
        'error', {
          'checkFragmentShorthand': true,
          'checkKeyMustBeforeSpread': true,
          'warnOnDuplicates': true,
        },
      ],
      'react/jsx-max-depth': [ 'warn', { 'max': 4 } ],
      'react/jsx-max-props-per-line': [ 'warn', { 'maximum': { 'single': 3, 'multi': 1 } } ],
      'react/jsx-newline': [ 'error', { 'prevent': true } ],
      'react/jsx-no-duplicate-props': [ 'error', { 'ignoreCase': true } ],
      'react/jsx-no-constructed-context-values': [ 'error' ],
      'react/no-unstable-nested-components': [ 'warn', { 'allowAsProps': true } ],
      'react/prop-types': 'off',
      'react/forbid-component-props': [ 'error', { 'forbid': [ 'style' ] } ],
      'react/forbid-dom-props': [ 'error', { 'forbid': [ 'style' ] } ],

      'react-hooks/static-components': 'off',

      'no-restricted-syntax': [
        'error',
        {
          'selector': 'AssignmentExpression[left.property.name=\'displayName\']',
          'message':
            'The use of \'displayName\' is prohibited. Use named exports (export const MyComponent = () => {}) so the component name can be inferred.',
        },
        {
          'selector': 'Property[key.name=\'displayName\']',
          'message':
            'The use of \'displayName\' is prohibited in object definitions. Use named exports so the component name can be inferred.',
        },
      ],
    },
  },
  {
    name: 'stylistic-jsx',
    files: ['**/*.{jsx,tsx}'],
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      // JSX specific stylistic rules
      '@stylistic/jsx-closing-bracket-location': 1,
      '@stylistic/jsx-closing-tag-location': 1,
      '@stylistic/jsx-first-prop-new-line': [ 'error', 'multiline' ],
      '@stylistic/jsx-newline': [
        'error', {
          'prevent': true,
        },
      ],
      '@stylistic/jsx-quotes': [ 'error', 'prefer-double' ],
      '@stylistic/jsx-wrap-multilines': [
        'error', {
          'declaration': 'parens-new-line',
          'assignment': 'parens-new-line',
          'return': 'parens-new-line',
          'arrow': 'parens-new-line',
          'condition': 'parens-new-line',
          'logical': 'parens-new-line',
          'prop': 'parens-new-line',
        },
      ],
    },
  },
  {
    name: 'a11y-jsx',
    files: ['**/*.{jsx,tsx}'],
    rules: {
      'jsx-a11y/no-noninteractive-element-interactions': 'off',
    },
  },
]);