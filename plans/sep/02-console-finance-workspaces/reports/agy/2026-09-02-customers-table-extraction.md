# Report: Finance Customers List Extraction into `@876/billing-ui`

- **Task:** Extract duplicated Customers table and list components from `apps/billing` and `apps/invoice` into `@876/billing-ui`.
- **Branch:** `feature/console-finance-workspaces`
- **Date:** 2026-09-02

## Files Created, Changed, and Deleted

### Created
- `packages/billing-ui/src/customers-table.tsx`: Shared customer table component implementing `CustomerRow`, `CustomersTableProps`, parameterized `baseHref` and `formatAmount`, and TANStack table columns.
- `packages/billing-ui/src/customers-list.tsx`: Shared dual-form customer list component rendering `CustomersTable` or `ListPane` depending on route detail selection.
- `packages/billing-ui/src/customers-table.test.tsx`: Vitest suite covering all table assertions ported from Billing, plus scoping links to a non-root `baseHref` and verifying `formatAmount` receives row receivables and currency.

### Changed
- `packages/billing-ui/package.json`: Appended `./customers-table` and `./customers-list` entries to the package `exports` map.
- `apps/billing/src/app/(app)/customers/_components/customers-list.tsx`: Replaced local component body with a host adapter delegating to `@876/billing-ui/customers-list` with `baseHref="/customers"` and `formatMoney`.
- `apps/billing/src/app/(app)/customers/_components/customers-skeleton-columns.test.tsx`: Updated import of `CustomersTable` to `@876/billing-ui/customers-table` and provided required props (`baseHref`, `formatAmount`).
- `apps/invoice/src/app/(app)/customers/_components/customers-list.tsx`: Replaced local component body with a host adapter delegating to `@876/billing-ui/customers-list` with `baseHref="/customers"` and `formatMoney`.
- `apps/invoice/src/app/(app)/customers/_components/customers-list.test.tsx`: Repointed `CustomerRow` type import from local `./customers-table` to `@876/billing-ui/customers-table`.

### Deleted
- `apps/billing/src/app/(app)/customers/_components/customers-table.tsx`: Redundant app-local table component deleted in favor of shared `@876/billing-ui/customers-table`.
- `apps/billing/src/app/(app)/customers/_components/customers-table.test.tsx`: App-local table test file deleted in favor of package-level coverage in `packages/billing-ui/src/customers-table.test.tsx`.
- `apps/invoice/src/app/(app)/customers/_components/customers-table.tsx`: Redundant app-local table component deleted in favor of shared `@876/billing-ui/customers-table`.

## Verification Commands & Outputs

### 1. `pnpm --filter @876/billing-ui typecheck`
```
$ tsc --noEmit
```
Result: Exited with code 0.

### 2. `pnpm --filter @876/billing-ui test`
```
$ vitest run

 RUN  v4.1.11 /root/projects/876/packages/billing-ui

Not implemented: navigation to another Document
Not implemented: navigation to another Document
Not implemented: navigation to another Document
Not implemented: navigation to another Document

 Test Files  6 passed (6)
      Tests  71 passed (71)
   Start at  20:39:32
   Duration  9.55s (transform 1.16s, setup 0ms, import 7.91s, tests 5.72s, environment 10.36s)
```
Result: Exited with code 0.

### 3. `pnpm --filter @876/billing-app typecheck`
```
$ tsc --noEmit
```
Result: Exited with code 0.

### 4. `pnpm --filter @876/invoice-app typecheck`
```
$ tsc --noEmit
```
Result: Exited with code 0.

## Blockers or Incomplete Items
None. All components, tests, and adapters were created and wired cleanly with zero type errors, no type assertions or suppresses (`as any`, `@ts-ignore`), and all target packages typecheck and test clean.
