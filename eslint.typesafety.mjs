/**
 * Shared typesafety rules for workspaces whose `any` budget is already 0.
 *
 * Import this fragment from a workspace `eslint.config.mjs` once the
 * any-budget gate (`scripts/check-any-budget.mjs`) reports 0 for it — never
 * for a workspace with a non-zero budget. Consuming configs must already
 * load the `@typescript-eslint` plugin (through
 * `eslint-config-next/typescript` or `typescript-eslint`); this fragment
 * only sets rule severity, mirroring how `eslint.app-structure.mjs` and
 * `eslint.ignores.mjs` are shared.
 */

export const typesafetyRules = [
  {
    name: 'typesafety/no-explicit-any',
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
]

export default typesafetyRules
