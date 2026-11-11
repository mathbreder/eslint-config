import { preferPathAlias } from './prefer-path-alias';

export const mathbrederPlugin = {
  rules: {
    'prefer-path-alias': preferPathAlias,
  },
};

export { preferPathAlias } from './prefer-path-alias';
export { clearPathAliasCaches } from './path-alias-resolver';
