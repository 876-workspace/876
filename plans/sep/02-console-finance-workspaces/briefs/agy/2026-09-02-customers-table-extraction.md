# Brief — extract the finance Customers list into `@876/billing-ui`

You are working in the monorepo at `/root/projects/876` on branch
`feature/console-finance-workspaces`. Do **not** create branches, do **not**
commit, do **not** push. Leave every change in the working tree.

## Why

`apps/billing` and `apps/invoice` each carry their own near-identical copy of a
customers table and list. Console now needs to render the same screen inside an
organization's workspace, and writing a third copy is forbidden by
`.claude/rules/shared-product-ui.md`. Extract the two components into the
shared package once, then make both apps render the shared version.

## The exact pattern to follow

`packages/billing-ui/src/items-table.tsx` is the already-extracted reference.
Read it first. Copy its conventions exactly:

- `'use client'` at the top.
- An exported row `interface` declared in the package (no `@/` imports — a
  package may never import from an app).
- A `baseHref: string` prop. Every link and row click goes to
  `${baseHref}/${id}`. The package never hardcodes `/customers`.
- A `formatAmount: (amount: bigint | string | null, currency: string) => string`
  prop, because money formatting is host policy.
- An optional `emptyState?: ReactNode`.
- Doc comments that explain **why** a prop exists, in the voice of
  `items-table.tsx`. Do not narrate syntax.

## Files to create

### 1. `packages/billing-ui/src/customers-table.tsx`

Port `apps/billing/src/app/(app)/customers/_components/customers-table.tsx`.

- Export `interface CustomerRow` with exactly these fields — this is the union
  of both apps' shapes:
  ```ts
  export interface CustomerRow {
    id: string
    name: string
    companyName: string | null
    contactName: string | null
    phone: string | null
    receivables: bigint | string
    currency: string
    status: 'ACTIVE' | 'ARCHIVED'
  }
  ```
- Export `interface CustomersTableProps` with `customers`, `baseHref`,
  `formatAmount`, `emptyState?`.
- Columns, classes and markup are unchanged from the Billing copy: Customer
  (avatar + link), Company, Contact, Phone, Receivables (right-aligned,
  `tabular-nums`).
- Replace `formatMoney(String(row.original.receivables), row.original.currency)`
  with `formatAmount(row.original.receivables, row.original.currency)`.
- Replace both `/customers/${id}` occurrences with `${baseHref}/${id}`.

### 2. `packages/billing-ui/src/customers-list.tsx`

Port `apps/billing/src/app/(app)/customers/_components/customers-list.tsx`.

- Import `CustomersTable` and `CustomerRow` from `./customers-table`.
- Props: `customers: CustomerRow[]`, `baseHref: string`,
  `formatAmount` (same signature, forwarded to the table), `emptyState?`.
- Keep the dual-form behaviour exactly: full table when no detail segment is
  selected, `ListPane` when one is. Keep the `status` searchParam filter and
  keep Billing's fuller comment explaining why the filter is applied here.
- Every `/customers/${customer.id}` becomes `${baseHref}/${customer.id}`;
  the `?${query}` suffix behaviour is unchanged.

### 3. `packages/billing-ui/src/customers-table.test.tsx`

Port `apps/billing/src/app/(app)/customers/_components/customers-table.test.tsx`
into the package. Follow `packages/billing-ui/src/items-table.test.tsx` for how
this package sets up mocks and renders. Every existing assertion must survive.
Add two new cases:

- it links each row to `${baseHref}/${id}` for a non-root `baseHref`
  (use `/orgs/acme/workspace/billing/customers`);
- it renders the receivables through the injected `formatAmount`, asserting the
  formatter received the row's own `receivables` and `currency`.

### 4. `packages/billing-ui/package.json`

Add `./customers-table` and `./customers-list` to `exports`, in the same shape
as the existing entries. **Keep the existing keys in their current order and
append**; do not re-sort the map.

## Files to change

### 5. `apps/billing/src/app/(app)/customers/_components/customers-list.tsx`

Delete the local file's body and replace it with a thin host adapter that
renders `CustomersList` from `@876/billing-ui/customers-list`, passing
`baseHref="/customers"` and the app's own `formatMoney` adapted to the
`formatAmount` signature. Keep the file's existing export name so its callers
are untouched.

### 6. Delete `apps/billing/src/app/(app)/customers/_components/customers-table.tsx`

and its test `customers-table.test.tsx` (the coverage moved into the package).
`customers-skeleton-columns.test.tsx` imports the deleted component — update
that import to `@876/billing-ui/customers-table` and pass the props the shared
component now requires. Do **not** delete
`customers-skeleton-columns.ts`/`.test.ts`; they still guard the skeleton.

### 7. `apps/invoice/src/app/(app)/customers/_components/customers-list.tsx`

Same treatment as Billing: render the shared `CustomersList` with
`baseHref="/customers"` and Invoice's own `formatMoney`.

### 8. Delete `apps/invoice/src/app/(app)/customers/_components/customers-table.tsx`

`apps/invoice/src/app/(app)/customers/_components/customers-list.test.tsx`
imports `type { CustomerRow } from './customers-table'` — repoint it at
`@876/billing-ui/customers-table`.

## Rules you must not break

- No `as any`, no `@ts-ignore`, no `eslint-disable`. If types do not line up,
  fix the types.
- A package never imports from `@/` or from `apps/`.
- Do not change any behaviour, column, class name, or copy string beyond the
  `baseHref`/`formatAmount` parameterisation described above.
- Do not touch any file not listed here. In particular do not touch
  `apps/console`, `packages/billing`, or any nav registry.

## Verify before you report

Run these and make them pass:

```bash
pnpm --filter @876/billing-ui typecheck
pnpm --filter @876/billing-ui test
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/invoice-app typecheck
```

## Report

Write `plans/2026-09-02-console-finance-workspaces/reports/agy/2026-09-02-customers-table-extraction.md`
listing every file created/changed/deleted with one line of why, the exact
output of each verification command, and anything you could not do.
