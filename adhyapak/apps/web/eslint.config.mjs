import next from 'eslint-config-next';

/**
 * `next lint` was removed in Next 16, so ESLint runs directly with the config
 * the old command wrapped. Rules beyond Next's own are deliberately not added.
 *
 * Three react-hooks v6 rules are downgraded to warnings, not disabled. They
 * flag patterns this codebase uses on purpose — hydrating state from
 * localStorage in an effect, the standard fetch-hook shape in useAsync, and
 * per-render Date.now() for exam countdowns — where the suggested refactors
 * (useSyncExternalStore, externalising clocks) would be real churn for
 * advisory performance hints. Warnings keep them visible in every lint run
 * without gating the build on a style migration.
 */
export default [
  ...next,
  { ignores: ['.next/**', 'out/**', 'next-env.d.ts'] },
  {
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
];
