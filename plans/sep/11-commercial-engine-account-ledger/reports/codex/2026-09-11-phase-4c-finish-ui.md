# Phase 4c — finish recurring invoices and reporting UI

## Inherited and completed

Inherited the interrupted 4a/4b implementation: shared recurring-invoice
surfaces, report panels/range helper, both hosts' routes and adapters, Billing
dashboard/customer/item compositions, report preference client routes, and
their tests. I retained that work.

Completed the missing public exports in `packages/billing-ui/package.json` for
all report panels, report bars/ranges, and recurring-invoice UI. Completed
Invoice's customer and item sales-summary compositions, its reports module
settings UI, sales-write preference mutation authorization, settings-catalog
parity, contract-baseline inventory, and corresponding route/navigation tests.
I also corrected lint violations in the inherited UI/test code without adding
suppression comments.

## Files added or changed by completion

- `packages/billing-ui/package.json` — exports each new public shared UI
  subpath.
- `apps/invoice/.../customer-sales-summary.tsx` and
  `items/.../item-sales-summary.tsx` — missing Invoice overview panel
  compositions, with Invoice-only subscription figures omitted.
- `apps/invoice/.../settings/modules/[moduleKey]/page.tsx` and
  `features/settings/components/report-preferences-form.tsx` — reports module
  entry point, searchable timezone selector, fiscal-month setting, inline
  errors, and a disabled save path without `sales:write`.
- `apps/billing/.../api/report-preferences/...` and
  `apps/invoice/.../api/report-preferences/...` — PATCH is explicitly guarded
  by `sales:write`; route tests cover the 403 boundary.
- `packages/billing/src/settings-catalog.ts` — reports is shared between
  Billing and Invoice, so both hosts can expose the required module settings.
- app catalog/navigation/contract tests — updated canonical routes/catalogs;
  report and recurring OpenAPI paths are whitelisted as documented post-legacy
  capability paths.
- inherited reporting/recurring data components — removed lint-invalid direct
  time/state patterns while preserving server/Suspense behavior.

## Scope checklist

- [x] Shared recurring list, route-form and lifecycle surfaces; status/frequency,
  totals, confirmable destructive actions, shared document line editor.
- [x] Billing and Invoice recurring list/new/detail/edit routes, status threaded
  to the API, child invoices, skeleton columns, route clients/handlers.
- [x] Invoice-origin link in both invoice-detail hosts.
- [x] Billing and Invoice navigation/guard binding updates.
- [x] All seven plain-prop shared report panels, accessible bars, per-currency
  blocks, ready/empty/error/skeleton states, and no chart dependency.
- [x] Shared server-range helper, preset/custom URL controls, independent report
  Suspense boundaries, and Billing-only subscription reporting.
- [x] Billing dashboard report cards/panel and Billing/Invoice customer/item
  summary compositions (subscription metrics only in Billing).
- [x] Billing and Invoice reports-module settings, curated/searchable timezone
  input, fiscal month, inline 403/error behavior, and `sales:write` PATCH
  authorization.

## Test floors

- Shared recurring components: 26 `it()` cases (floor 14).
- Shared reporting panels plus bars: 29 `it()` cases (floor 18).
- Report range helper: 17 `it()` cases (floor 8).
- Billing host reporting/recurring/overview/settings coverage: 99 `it()` cases
  in the affected route groups (each host floor 6 per brief group).
- Invoice host reporting/recurring/overview/settings coverage: 48 `it()` cases
  in the affected route groups (each host floor 6 per brief group).

## Verification

- `@876/billing-ui`: typecheck passed; 54 files / 493 tests passed.
- `@876/billing`: typecheck passed; 36 files / 358 tests passed.
- `@876/billing-app`: typecheck passed; 101 files / 930 tests passed; lint
  passed with 15 pre-existing warnings.
- `@876/invoice-app`: typecheck passed; 81 files / 523 tests passed; lint
  passed with 5 pre-existing warnings.
- `pnpm check:transpile`: passed.
- `check-app-structure`: only the documented pre-existing
  `ConsoleHome` naming violation remains.
- `git diff --check`: passed.

## Gaps

The mandated grep still finds one pre-existing compatibility facade marker in
`apps/billing/src/lib/service/index.ts`. Removing it would require replacing a
large legacy untyped facade used broadly outside this phase; no new or touched
Phase 4 UI file contains `eslint-disable`, `as any`, or `@ts-ignore`.
