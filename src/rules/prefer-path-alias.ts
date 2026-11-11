import path from 'node:path';

import type { Rule } from 'eslint';

import { findEquivalentAlias } from './path-alias-resolver';

type SourceLiteral = { value: unknown; raw: string; range: [ number, number ] };

type ModuleNode = { source?: SourceLiteral | null };

type Options = { project?: string | string[] };

const PARENT_PREFIX = '../';

export const preferPathAlias: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description: 'Prefer a configured TypeScript path alias over a parent-relative import that resolves to the same module.',
    },
    messages: {
      preferAlias: 'Use o alias \'{{alias}}\' em vez do caminho relativo \'{{specifier}}\'.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          project: {
            anyOf: [
              { type: 'string' },
              { type: 'array', items: { type: 'string' } },
            ],
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const filename = context.filename;

    if (!path.isAbsolute(filename)) return {};

    const options: Options = context.options[0] ?? {};

    const check = (node: ModuleNode) => {
      const source = node.source;

      if (!source || typeof source.value !== 'string') return;

      const specifier = source.value;

      if (!specifier.startsWith(PARENT_PREFIX)) return;

      const alias = findEquivalentAlias({ filename, specifier, project: options.project });

      if (!alias) return;

      const quote = source.raw.charAt(0);

      context.report({
        node: source as unknown as Rule.Node,
        messageId: 'preferAlias',
        data: { alias, specifier },
        fix: (fixer) => fixer.replaceTextRange(source.range, `${quote}${alias}${quote}`),
      });
    };

    return {
      ImportDeclaration: (node) => check(node as unknown as ModuleNode),
      ExportAllDeclaration: (node) => check(node as unknown as ModuleNode),
      ExportNamedDeclaration: (node) => {
        const declaration = node as unknown as ModuleNode;

        if (declaration.source) check(declaration);
      },
    };
  },
};
