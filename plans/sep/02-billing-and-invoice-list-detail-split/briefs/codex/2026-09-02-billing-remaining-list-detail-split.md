# Billing — split view for the last two sections (estimates, vendors)

## Context

The repo is mid-way through converting every list section in `apps/billing`,
`apps/invoice`, `apps/console` and `apps/crm` to the shared list/detail split
view. Seventeen sections are already converted and are **uncommitted in the
working tree** — read them, they are your reference.

Your job is the two Billing sections that were left out because they had no
detail route: **`(sales)/estimates`** and **`purchases/vendors`**.

`purchases/expenses` and `payroll` are out of scope: they are static stubs with
no records at all, so there is nothing to open beside a list. Do not touch them.

## Read first, in this order

1. `.claude/rules/app-layout.md` §5a "List/detail split view" — the whole
   section, including "Height", "Scrolling", and the shipping checklist. It is
   the contract for this work and it was updated for exactly this pattern.
2. The reference section, all five files:
   - `apps/billing/src/app/(app)/(sales)/quotes/layout.tsx`
   - `apps/billing/src/app/(app)/(sales)/quotes/(list)/page.tsx`
   - `apps/billing/src/app/(app)/(sales)/quotes/_components/quotes-section.tsx`
   - `apps/billing/src/app/(app)/(sales)/quotes/_components/quotes-list.tsx`
   - `apps/billing/src/app/(app)/(sales)/quotes/_components/quotes-list-data.tsx`
3. The record card chrome: `apps/billing/src/components/patterns/detail/detail-layout.tsx`,
   and how a detail route uses it:
   `apps/billing/src/app/(app)/(sales)/quotes/[quoteId]/layout.tsx` +
   `.../[quoteId]/page.tsx`.
4. The shared primitives you must import rather than reimplement:
   `packages/ui/src/components/list-detail-section.tsx`,
   `list-detail-shell.tsx`, `list-pane.tsx`, `detail-card.tsx`.

## What to build

For **each** of `(sales)/estimates` and `purchases/vendors`, produce the exact
five-file shape the reference uses:

| File | Contents |
| --- | --- |
| `layout.tsx` | keeps its existing `requireBillingFeature(...)` await, then renders `<XSection list={<Suspense fallback={<DataTableSkeleton …/>}><XListData/></Suspense>}>{children}</XSection>` |
| `(list)/page.tsx` | `export default function XPage() { return null }` plus the existing `metadata`, with the comment the reference carries |
| `_components/x-section.tsx` | `'use client'`; reads the status filter with `useSearchParams()`; renders `ListDetailSection` with a `StreamingResourceToolbar` and `takeoverSegments` |
| `_components/x-list.tsx` | `'use client'`; renders the existing full table when nothing is selected and a `ListPane` of `ListPaneItem`s when a record is open; applies the status filter to the rows |
| `_components/x-list-data.tsx` | server component; resolves the workspace context, calls `service.<x>.list(...)`, wraps the list in `<div className="flex h-full min-h-0 flex-col gap-3">` |

Then add the **detail route** each section is missing:

- `(sales)/estimates/[estimateId]/layout.tsx` and `page.tsx`
- `purchases/vendors/[vendorId]/layout.tsx` and `page.tsx`

Both resources already have a working `retrieve` — `service.estimates.retrieve`
and `service.vendors.retrieve` come from the `crud()` helper in
`apps/billing/src/lib/service/index.ts`. **Use the real record.** Model both
routes on `quotes/[quoteId]`: the layout resolves the record, calls `notFound()`
when it is absent, and renders `DetailLayout` (which is the shared `DetailCard`
under the hood) with the title, status badge, and a single "Overview" tab; the
page renders the record's facts inside it.

Keep the detail body modest and truthful — the identity, status, amounts/currency
and timestamps the record actually carries. Do **not** invent fields, and do not
nest a `876-card` inside the card body (rule §5a says so explicitly); use
`DetailCardSection` / `DetailCardFacts` / `DetailCardFact`, or the existing
`DetailField` + `MetricCard` pattern that `quotes/[quoteId]/page.tsx` uses.

## Hard requirements

- The shell is rendered from `layout.tsx`, never from a page.
- The list data component is `flex h-full min-h-0 flex-col`; the Suspense
  fallback uses the same wrapper so the skeleton and the loaded table sit at
  the same height.
- The detail route returns the card as the column's only child — no wrapper
  `div`, no `space-y-*`, no breadcrumb.
- The status filter is applied **client-side** over the already-fetched rows,
  because a layout receives no `searchParams`. Carry the same explanatory
  comment the reference files carry — this is a deliberate documented departure
  from `app-layout.md` §5, not an oversight.
- Preserve every existing status option, `headingLabel`, permission key, empty
  state, and skeleton column set. Do not redesign the tables.
- The condensed `ListPaneItem` must keep whatever the full table encodes with a
  badge or colour (status), per rule §5a.
- Delete the section's `(list)/loading.tsx` if one exists and it now duplicates
  the layout's Suspense fallback — check what the already-converted sections did
  and match it.
- No `as any`, no `eslint-disable`, no `@ts-ignore`. `as unknown as T` only at a
  genuine boundary.
- Do not commit. Do not create branches. Do not touch `apps/invoice`,
  `apps/console`, `apps/crm`, or `packages/` — another run is working there.

## Verify before you report

Run these and paste the real output:

```
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app lint
pnpm --filter @876/billing-app test
node scripts/check-app-structure.mjs
```

`apps/billing/src/lib/feature-route-layouts.test.ts` and
`apps/billing/src/app/(app)/_components/list-loadings.test.tsx` assert facts
about these routes — read them before you move a file, and update them honestly
if the route shape genuinely changed. Do not weaken an assertion to make a test
pass.

Report the counted number of tests before and after, and name anything you could
not do and why.
