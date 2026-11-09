import nextPlugin from '@next/eslint-plugin-next';
import { defineConfig } from 'eslint/config';

/**
 * Next.js rules from `@next/eslint-plugin-next`, loaded only through
 * `@mathbreder/eslint-config/next`. Use it with `reactNextConfig`; React, Hooks,
 * JSX and imports come from the other presets.
 */
export const nextConfig = defineConfig([
  nextPlugin.configs.recommended,
  {
    name: 'next-overrides',
    rules: {
      '@next/next/no-html-link-for-pages': 'error',
    },
  },
]);
