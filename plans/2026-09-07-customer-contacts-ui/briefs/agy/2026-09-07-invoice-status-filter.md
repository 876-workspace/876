# Task: complete the invoice status filter and de-duplicate it (876 Billing + 876 Invoice)

Repository root: `/root/projects/876`. Branch: `feature/customer-contacts-ui`.
**Do not commit. Do not create, switch, or delete a branch. Do not open a PR.**

## Concurrency — three other agents are editing this repository right now

You may edit **only** these four files:

1. `packages/billing-ui/src/document-status.ts`
2. `apps/billing/src/app/(app)/(sales)/invoices/_components/invoices-section.tsx`
3. `apps/billing/src/app/(app)/(sales)/invoices/_components/invoices-list.tsx`
4. `apps/invoice/src/app/(app)/invoices/_components/invoices-toolbar.tsx`

Plus **one new test file** you create:
`packages/billing-ui/src/document-status.test.ts` — if that file already exists,
**add** your cases to it and delete nothing.

**Do not edit any other file.** In particular do NOT edit
`packages/billing-ui/package.json`, anything under `customers/`, `quotes/`, or
`invoices/[invoiceId]/`. Another agent owns each of those and your edit would
be lost or would break theirs.

## The problem

`InvoiceStatus` in `apps/billing-api/prisma/schema/enums.prisma:175` has eight
values:

```
DRAFT  OPEN  SENT  PARTIALLY_PAID  OVERDUE  PAID  UNCOLLECTIBLE  VOID
```

The UI filter offers only five — `draft`, `sent`, `overdue`, `paid`, `void`.
**`OPEN`, `PARTIALLY_PAID`, and `UNCOLLECTIBLE` are missing**, so invoices in
those three states cannot be filtered for in either app.

The same five-item list is also **copy-pasted into three files**, which is why
it drifted. You will move it to one owner and import it in all three.

## Step 1 — add the shared constant

Append to `packages/billing-ui/src/document-status.ts` (keep everything already
in that file untouched):

```ts
/** One option in a sales-document status filter. */
export interface DocumentStatusOption {
  value: string
  label: string
  headingLabel: string
}

/**
 * Every filterable invoice status, in lifecycle order.
 *
 * Mirrors the `InvoiceStatus` enum in the Billing API. It lives here rather
 * than in each host so Billing and Invoice cannot drift apart — which is
 * exactly how `OPEN`, `PARTIALLY_PAID`, and `UNCOLLECTIBLE` went missing.
 */
export const INVOICE_STATUS_OPTIONS: DocumentStatusOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Invoices' },
  { value: 'draft', label: 'Draft', headingLabel: 'Draft Invoices' },
  { value: 'open', label: 'Open', headingLabel: 'Open Invoices' },
  { value: 'sent', label: 'Sent', headingLabel: 'Sent Invoices' },
  {
    value: 'partially_paid',
    label: 'Partially paid',
    headingLabel: 'Partially Paid Invoices',
  },
  { value: 'overdue', label: 'Overdue', headingLabel: 'Overdue Invoices' },
  { value: 'paid', label: 'Paid', headingLabel: 'Paid Invoices' },
  {
    value: 'uncollectible',
    label: 'Uncollectible',
    headingLabel: 'Uncollectible Invoices',
  },
  { value: 'void', label: 'Void', headingLabel: 'Void Invoices' },
]

/** The filter values above, excluding the `all` sentinel. */
export const INVOICE_STATUS_VALUES: string[] = INVOICE_STATUS_OPTIONS.filter(
  (option) => option.value !== 'all'
).map((option) => option.value)

/** Narrows an unknown query value to a supported invoice filter value. */
export function resolveInvoiceStatus(value: string | null | undefined): string {
  return value && INVOICE_STATUS_VALUES.includes(value) ? value : 'all'
}
```

`packages/billing-ui/package.json` **already** exports `./document-status`, so
you do not need to add an export entry. Do not open that file.

## Step 2 — replace the three duplicated copies

In each of the three app files below, delete the local
`INVOICE_STATUS_OPTIONS` array and any hand-written inline status-value array,
and import from `@876/billing-ui/document-status` instead.

| # | File | What to change |
| - | ---- | -------------- |
| 1 | `apps/billing/.../invoices/_components/invoices-section.tsx` | Delete the local `INVOICE_STATUS_OPTIONS` const. Import `INVOICE_STATUS_OPTIONS` and `resolveInvoiceStatus`. Replace `const selectedStatus = ['draft','sent','overdue','paid','void'].includes(status) ? status : 'all'` with `const selectedStatus = resolveInvoiceStatus(status)`. |
| 2 | `apps/billing/.../invoices/_components/invoices-list.tsx` | Same: import `resolveInvoiceStatus` and use it for the `selectedStatus` computation around line 32-36. Leave the `documentStatusVariant` import and the row rendering exactly as they are. |
| 3 | `apps/invoice/.../invoices/_components/invoices-toolbar.tsx` | Delete the local `INVOICE_STATUS_OPTIONS` const and the `type StatusFilterOption` import if it becomes unused. Import `INVOICE_STATUS_OPTIONS` from `@876/billing-ui/document-status` and pass it to `StatusFilterHeading` unchanged. |

**Two things to be careful about, because they are easy to get wrong:**

- In file 2 the list filters rows with
  `row.status.toLowerCase() === selectedStatus`. The API enum value is
  `PARTIALLY_PAID`, which lowercases to `partially_paid` — which is exactly the
  filter value in the table above, so that comparison keeps working. **Do not
  change it to a hyphen.** Do not "normalise" `partially_paid` to
  `partially-paid` anywhere; it is compared against a database enum.
- Keep the existing import ordering and formatting style of each file.

## Step 3 — tests

Add to `packages/billing-ui/src/document-status.test.ts` at least **8** `it()`
cases. Assert real values, never `toBeDefined()`:

1. `INVOICE_STATUS_OPTIONS` contains exactly 9 entries.
2. Its values equal, in order: `all, draft, open, sent, partially_paid, overdue, paid, uncollectible, void`.
3. Every non-`all` value lowercases from a real `InvoiceStatus` enum member —
   assert the exact expected array.
4. `INVOICE_STATUS_VALUES` excludes `all` and has 8 entries.
5. `resolveInvoiceStatus('partially_paid')` returns `'partially_paid'`.
6. `resolveInvoiceStatus('uncollectible')` returns `'uncollectible'`.
7. `resolveInvoiceStatus('bogus')` returns `'all'`.
8. `resolveInvoiceStatus(null)` and `resolveInvoiceStatus(undefined)` both
   return `'all'`.
9. Every option has a non-empty `label` and `headingLabel`.

Read an existing test file in `packages/billing-ui/src/` first and match its
import style and `describe`/`it` conventions exactly.

## Step 4 — verify, and report the real output

Run these and paste the actual output into your report. Do not claim a pass you
did not see.

```
pnpm --filter @876/billing-ui typecheck
pnpm --filter @876/billing-ui test
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/invoice-app typecheck
npx prettier --check packages/billing-ui/src/document-status.ts
```

If `prettier --check` fails, run `npx prettier --write` on only the files you
edited.

## Do not

- Do not add `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, or `as any`.
- Do not edit `packages/billing-ui/package.json`.
- Do not touch any file not listed above.
- Do not commit, branch, or open a pull request.
- Do not change `documentStatusVariant` — it already handles all eight statuses.

## Report

Write `plans/2026-09-07-customer-contacts-ui/reports/agy/2026-09-07-invoice-status-filter.md`
containing: each file you changed and what changed in it, the counted number of
`it()` cases you added, the real output of every command in Step 4, and anything
you could not do.
