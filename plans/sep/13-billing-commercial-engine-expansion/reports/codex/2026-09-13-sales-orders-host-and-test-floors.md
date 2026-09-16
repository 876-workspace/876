# Sales Orders host and test floors — pass 2

Model: GPT-5.6-terra was requested; this run executed in the available Codex model environment.

## Completed work

- Fixed the five Billing app test failures. Four were stale test expectations after the committed Sales Orders additions (navigation catalog, root browser client, module settings catalog, and module catalog). The OpenAPI baseline inventory omission was a code/test-inventory defect; Sales Orders paths are now enumerated.
- Replaced the flat Sales Orders route with a Quotes-style list/detail section: list-only route group, streaming toolbar/skeleton, list pane/table, detail card, draft-only edit route, lifecycle actions, inline `AppError`, derived invoicing/payment badges, and linked invoice.
- Added host mutation authorization for non-GET Sales Orders proxy operations using `sales-orders:write`.
- Corrected the shared navigation permission to the Billing host's existing colon-form key (`sales-orders:read`) so the navigation and route guard bind to the same permission.
- Added 11 host `it()` cases: 4 mutation route authorization/pass-through cases, 5 status-to-action cases, 1 navigation-to-route binding case, and 1 list failure shell-retention case.
- Read the Sales Order Prisma schema and migration manually. No column, index, FK, or enum mismatch was found. `db:validate` passed.

## Not completed

- The required Sales Order API floor (30) and conversion floor (12) were not expanded in this pass. Existing counted coverage remains 19 (15 transition and 4 persistence) before any conversion additions.
- Required assembled-Express Supertest cases, quote/order conversion cases, and invoice conversion cases were not added.
- The Sales Order list shell currently starts from the host service list path; status-filter query propagation needs a follow-up to make the selected UI status reach that server-side request without violating the split layout.
- Full prescribed pnpm verification is blocked by an unrelated frozen-lockfile mismatch: `apps/commerce-api/package.json` has dependencies absent from `pnpm-lock.yaml`. No install or lockfile mutation was made.

## Files changed by this pass

- `apps/billing/src/app/(app)/(sales)/sales-orders/**`: split UI, list/error shell, detail/actions, draft edit form, and host tests.
- `apps/billing/src/app/api/sales-orders/[[...path]]/route.ts`: host write-permission gate.
- `apps/billing/src/types/sales-order.ts`: detail/edit resource fields.
- `apps/billing/src/lib/api/contract-baseline.test.ts`, `src/components/shell/nav-config.test.ts`, `src/lib/client/resources.test.ts`, `src/lib/modules/catalog.test.ts`, and module-settings test: correct stale registry expectations.
- `packages/billing/src/navigation.ts`: navigation/route permission alignment.
- `plan.md`: current partial status and completed host checklist items.

## Verification

- `pnpm --filter @876/billing-api db:validate`: PASS (Prisma schema valid).
- Direct local `tsc -p apps/billing-api/tsconfig.json --noEmit`: PASS.
- Direct local `tsc -p apps/billing/tsconfig.json --noEmit`: PASS.
- Targeted original five Billing test files: PASS, 5 files / 126 tests.
- New/affected host tests: PASS, 4 files / 33 tests.
- `node scripts/check-app-structure.mjs`: PASS.
- All prescribed pnpm package tests/typechecks/lint/boundaries/contract checks: NOT RUN to completion because pnpm stops before execution on the unrelated frozen-lockfile mismatch above.

## Migration audit

`20260913183000_sales_orders/migration.sql` matches `schema/sales-order.prisma`: all stored fields, enum values, composite customer FK, tenant/id and quote uniqueness, order/line indexes, line tax snapshot columns/FKs, and non-unique invoice Sales Order link are present. No SQL change was needed. No database connection or migration diff was run.

## Risks

- DocumentsService chaos tests were not run in this pass, so their reported flakiness was neither observed nor changed.
- Existing unrelated dirty workspace changes were preserved.
