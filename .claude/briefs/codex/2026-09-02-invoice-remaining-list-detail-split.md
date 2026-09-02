# Invoice — split view for quotes, invoices, payments, sales-receipts

## Context

The repo is mid-way through converting every list section in `apps/billing`,
`apps/invoice`, `apps/console` and `apps/crm` to the shared list/detail split
view. Seventeen sections are already converted and are **uncommitted in the
working tree** — read them, they are your reference.

Invoice's `customers` and `items` are already converted. Your job is the four
remaining sections that have real records: **`quotes`**, **`invoices`**,
**`payments`**, **`sales-receipts`**.

`expenses` and `time-tracking` are out of scope: they are static empty states
with no records at all, so there is nothing to open beside a list. Do not touch
them.

## Read first, in this order

1. `.claude/rules/app-layout.md` §5a "List/detail split view" — the whole
   section, including "Height", "Scrolling", and the shipping checklist. It is
   the contract for this work and it was updated for exactly this pattern.
2. The reference section in this same app, all files:
   - `apps/invoice/src/app/(app)/customers/layout.tsx`
   - `apps/invoice/src/app/(app)/customers/(list)/page.tsx`
   - `apps/invoice/src/app/(app)/customers/_components/customers-section.tsx`
   - `apps/invoice/src/app/(app)/customers/_components/customers-toolbar.tsx`
   - `apps/invoice/src/app/(app)/customers/_components/customers-list.tsx`
   - `apps/invoice/src/app/(app)/customers/_components/customers-list-data.tsx`
   - `apps/invoice/src/app/(app)/customers/[customerId]/page.tsx` — the record card
3. `apps/invoice/src/app/(app)/items/` — the same shape, second instance.
4. The shared primitives you must import rather than reimplement:
   `packages/ui/src/components/list-detail-section.tsx`,
   `list-detail-shell.tsx`, `list-pane.tsx`, `detail-card.tsx`.

## What to build

For **each** of `quotes`, `invoices`, `payments`, `sales-receipts`:

1. Move today's `page.tsx` apart into the five-file shape the reference uses —
   `layout.tsx`, `(list)/page.tsx` (returns `null`, keeps the `metadata`),
   `_components/<x>-section.tsx`, `_components/<x>-toolbar.tsx` if the section
   needs one, `_components/<x>-list.tsx`, `_components/<x>-list-data.tsx`.
   The existing `_components/<x>-table.tsx` stays and is reused unchanged where
   possible.
2. Add the detail route the section has never had: `[<x>Id]/page.tsx`.

### The detail routes — read this carefully

The Billing SDK this app talks to (`packages/billing`) exposes `retrieve` for
**payments only**. `quotes`, `invoices` and sales receipts have `list` and no
`retrieve`.

- **payments** → use the real `billing.payments.retrieve(paymentId)`.
- **quotes, invoices, sales-receipts** → the detail page calls the same
  `list()` the section already calls and finds the row by id, then renders it.
  Call `notFound()` when the id is not in the list.

Do **not** add a method to `packages/billing`, and do not call the Billing API
directly — adding a `retrieve` means a backend route, a typed SDK method and a
contract change, which is product work outside this task. Say so in your report.

Every detail page renders a real `DetailCard` from `@876/ui/detail-card` with
the identity the row actually carries — number, customer, amount, currency,
status badge, dates — modelled on
`apps/invoice/src/app/(app)/customers/[customerId]/page.tsx`. Where the row
genuinely has no more to show than the list already shows, say that plainly in
one short line inside the card body rather than padding it with invented fields.
Do not nest a `876-card` inside a card body (rule §5a). Use
`DetailCardHeadline` / `DetailCardSection` / `DetailCardFacts` /
`DetailCardFact`.

## Hard requirements

- The shell is rendered from `layout.tsx`, never from a page.
- The list data component is `flex h-full min-h-0 flex-col`; the Suspense
  fallback uses the same wrapper so the skeleton and the loaded table sit at the
  same height.
- The detail route returns the card as the column's only child — no wrapper
  `div`, no `space-y-*`, no breadcrumb.
- The status filter is applied **client-side** over the already-fetched rows,
  because a layout receives no `searchParams`. Carry the same explanatory
  comment `customers-list.tsx` carries — this is a deliberate documented
  departure from `app-layout.md` §5, not an oversight.
- Preserve every existing status option, `headingLabel`, permission gate, error
  handling (`redirectIfSignedOut`, the Sentry captures, the `FetchError`
  fallbacks), empty state, and skeleton column set. Those error paths are load
  bearing — carry them into the new `*-list-data.tsx` verbatim rather than
  simplifying them away.
- The condensed `ListPaneItem` must keep whatever the full table encodes with a
  badge or colour (status), per rule §5a.
- No `as any`, no `eslint-disable`, no `@ts-ignore`. `as unknown as T` only at a
  genuine boundary — the existing pages already use a couple at the SDK edge;
  keep those, add none.
- Do not commit. Do not create branches. Do not touch `apps/billing`,
  `apps/console`, `apps/crm`, or `packages/` — another run is working there.

## Verify before you report

Run these and paste the real output:

```
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app lint
pnpm --filter @876/invoice-app test
node scripts/check-app-structure.mjs
```

Report the counted number of tests before and after, and name anything you could
not do and why.
