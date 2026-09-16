# Orchestrator Verification and Console Integration Report

## Outcome

The implementation is complete and synchronized with `main` through commit `6e2a02ace`. It centralizes first-party commercial module identity in `@876/core`, materializes the Invoice module catalog through the explicit API seed, and gives Console reusable, request-cached loaders for complete application, module, feature-flag, and provisioning catalogs.

This fixes the code path that produced an empty Invoice plan module picker after materialization. It does not run seeds automatically at API startup or sign-in, and it does not introduce new runtime module paywalls.

The original plan referenced `reports/gpt-web/2026-09-09-canonical-module-registry.md`; that file was not present in the local checkout or the remote feature branch. This report records the orchestrator's independent review and shell verification instead of reconstructing an absent report.

## Material Changes

- `packages/core` owns stable Invoice and Billing commercial module identity and projects matching metadata into access catalogs. Registry lookup rejects inherited object names such as `__proto__`.
- `packages/billing` reuses canonical finance identity while retaining settings-only modules locally. Anti-drift tests cover every shared finance definition.
- `apps/api` materializes modules from the registry. A newly created module and its initial free-plan grants are written atomically with a nested Prisma create. Existing modules are repaired for identity metadata without restoring operator-removed grants.
- `apps/console` uses shared server-only loaders that exhaust cursor pagination and preserve typed errors. Plan creation, entitlement editing, module management, feature association, and provisioning pages no longer duplicate partial catalog loading or convert expected API failures into false 404s.
- Console forms preserve entered state across asynchronously resolved options and block writes when authoritative option catalogs failed to load.
- The Work widget merge was reconciled by allowing Console to expose all widget metadata while rendering only widget implementations owned by Console.
- ADR-016, API and Console READMEs, mirrored module-setting rules, and this plan describe ownership and rollout boundaries.

## Verification

Passed:

- `@876/core`: typecheck; 42 test files, 1,094 tests.
- `@876/billing`: typecheck; 34 test files, 341 tests.
- `@876/api`: typecheck, build, lint (28 existing warnings); 117 test files, 2,276 tests.
- `@876/console`: typecheck; 179 test files, 1,729 tests.
- `node scripts/check-app-structure.mjs`.
- Changed-file ESLint, Prettier, `git diff --check`, unsafe-cast/suppression review, and byte-identical mirrored-rule comparison.

Total passing tests: 5,440.

Known repository baselines:

- `pnpm check` stops in the formatting phase on 453 files across the repository. The branch-owned files were formatted independently; broad unrelated formatting churn was intentionally excluded.
- `pnpm --filter @876/api boundaries` reports 18 existing dependency cycles in app-access, organizations, memberships, and provisioning. The affected cycle paths have no diff from `origin/main` in this branch.

## Rollout and Unverified Items

No database, deployment, or browser environment was available or authorized. Before relying on the new Invoice choices in an environment, run the explicit maintenance seed against that environment:

```bash
pnpm --filter @876/api seed --only=defaultPrices,plans
```

The operation materializes eight Invoice modules. On first module creation it grants only `customers`, `items`, `invoices`, `quotes`, and `payments` to `876-invoice-free` when that product exists. It also performs the seed's existing Billing assignment backfill. It does not overwrite custom prices, module status, feature flags, ordering, or intentionally removed grants, and it does not seed provisioning manifests.

Staging verification should confirm the materialized rows, remove and re-seed behavior, selection of all active Invoice modules in a new Console plan, and rejection of cross-application assignments. API-level immutability for registry-owned identity remains a future schema/contract enhancement; this change enforces it in Console and through seed synchronization.
