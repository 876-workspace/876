# Verification fixes and Requests surface completion

## Changes

- `apps/billing/src/app/api/requests/tasks-and-activity.test.ts` and `apps/billing/src/app/api/customers/[customerId]/requests/route.test.ts`: replaced stale workspace-context mocks with `requireRequestApiAccess`, asserted its request permission contract, and added feature-denial cases that prove CRM is not called.
- `apps/invoice/src/app/api/requests/tasks-and-activity.test.ts` and `apps/invoice/src/app/api/customers/[customerId]/requests/route.test.ts`: replaced stale `requireApiPermission` mocks with `requireApiCapability`, asserted the Requests feature contract, and added equivalent CRM-negative cases.
- `apps/console/src/lib/permissions.test.ts`: updated the role count pins for the intended Requests permission projections. Requests adds two staff, five admin, and six super-admin permissions.
- `plan.md`: reconciled P7/P8 and the completed P9 mobile-navigation item with the implemented routes and guards.

## Test results

The four focused route files were failing before this work: Billing had 10 failures and 3 passes; Invoice had 13 failures. After updating the guard mocks and adding the feature-denial coverage, both focused app runs pass with 15 tests.

The Console permission test had four failures before this work. The three Requests-derived count failures are resolved by the updated pins. One failure remains: the expected product-group list omits `876 commerce`.

Completed checks: Billing and Invoice typecheck/lint completed without reported diagnostics; the focused Billing and Invoice route suites pass; Console typecheck passes; `@876/crm-ui` typecheck passes and its suite is 32/32; `node scripts/check-app-structure.mjs` passes. `git diff --check` passes.

## Decisions and remaining work

- `git diff main...HEAD` shows the Requests module projection in `packages/core/src/modules.ts`, which explains the three Console role-count changes.
- The `876 commerce` catalog and its Console projection are already present on `main`; this branch did not cause the stale expected product-group list. Per the brief, that assertion was left unchanged. Consequently, `pnpm --filter @876/console test src/lib/permissions.test.ts` still has that one pre-existing failure.
- P9 Work degradation was not implemented. The repository has provisioning policy definitions for `service:work` and `work.*` capabilities, but no runtime, app/CRM/Console-consumable Work-capability signal. The core policy explicitly says translating those selections to Work tenant/access configuration is a later phase. No new feature flag or parallel capability resolver was invented. Billing and Invoice currently expose Tasks and Activity/events; they do not expose request-reminder routes/pages to gate.
- Core Request list/detail/create remains independent of Work, as required.
- P10 remains open because the known pre-existing Console test failure prevents an all-green required verification set.
