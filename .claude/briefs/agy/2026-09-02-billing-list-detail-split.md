# Brief — convert Billing sections to the list/detail split view

You are working in the repo at `/root/projects/876`. Package manager is **pnpm**.

## What already exists (do not rebuild it)

The shared primitives are finished and typecheck clean. **Import them; never
re-implement them.**

- `@876/ui/list-detail-section` → `ListDetailSection`
- `@876/ui/list-detail-shell` → `useDetailSegments`, `useListDetailRoute`
- `@876/ui/list-pane` → `ListPane`, `ListPaneHeader`, `ListPaneBody`,
  `ListPaneEmpty`, `ListPaneItem`
- `@876/ui/detail-card` → `DetailCard`, `DetailCardHeader`, … (already used by
  Billing's `DetailLayout`)

`apps/billing/src/components/patterns/detail/detail-layout.tsx` has **already**
been converted to render a `DetailCard`. Every `[id]/layout.tsx` that uses
`DetailLayout` therefore already renders as a card. **Do not edit
`detail-layout.tsx` and do not edit any `[id]/layout.tsx`.**

## The worked example — read these five files first

`apps/billing/src/app/(app)/customers/` is the finished reference. Read every
one of these before writing a line:

1. `layout.tsx` — guard, then `<CustomersSection list={<Suspense …>}>`
2. `_components/customers-section.tsx` — `'use client'`, reads
   `useSearchParams()` for the status, renders `ListDetailSection`
3. `_components/customers-list.tsx` — `'use client'`, returns the full table
   when nothing is open and a `ListPane` when a record is open
4. `_components/customers-list-data.tsx` — server, fetches and renders the list
5. `(list)/page.tsx` — returns `null` with only `metadata`

## Your task

Apply that exact five-file shape to these **five** sections, and nothing else:

| #   | Section directory (under `apps/billing/src/app/(app)/`) | Record segment     |
| --- | ------------------------------------------------------- | ------------------ |
| 1   | `items`                                                 | `[itemId]`         |
| 2   | `(sales)/quotes`                                        | `[quoteId]`        |
| 3   | `(sales)/credit-notes`                                  | `[creditNoteId]`   |
| 4   | `(sales)/invoices`                                      | `[invoiceId]`      |
| 5   | `(subscription-management)/subscriptions`               | `[subscriptionId]` |

For **each** section, in order, do exactly this:

1. Read the section's existing `(list)/page.tsx`. It currently renders
   `<Page>`, a toolbar component, and a `<Suspense>` around a `*-table-data`
   server component. Note the toolbar component's name and props, the
   `*-skeleton-columns` constant, and the table component's name.
2. Create `_components/<section>-section.tsx` (`'use client'`) modelled on
   `customers-section.tsx`. It renders `ListDetailSection` with the section's
   **existing** toolbar component and a `takeoverSegments` list. Include
   `'new'` and `'edit'` always, plus any other non-record child segment that
   the section already has (e.g. `import`, `views`, `invoice-preferences`,
   `charges`, `discounts`, `manage`) — check the real directory listing, do not
   guess. If the toolbar takes a `status` prop, read it with
   `useSearchParams().get('status') ?? 'all'` exactly as the reference does.
3. Create `_components/<section>-list.tsx` (`'use client'`) modelled on
   `customers-list.tsx`:
   - `const segments = useDetailSegments()`; `const selectedId = segments[0] ?? null`
   - when `selectedId` is null, return the section's **existing** table
     component with the same props it already receives
   - otherwise return a `ListPane`. `ListPaneHeader` is the section's plural
     name. One `ListPaneItem` per row: `href` to the record (preserving the
     current query string, as the reference does), `selected` when the row id
     equals `selectedId`, `label={\`View <thing> ${row.<name>}\`}`,
`title`= the row's subject (the same value the table's first column
shows),`subtitle`= one supporting field,`trailing` = the amount, date,
     or status badge if the table has an obvious one. Do not invent fields —
     only use fields already present on the row type.
   - if the existing page filtered by status server-side, carry that filter
     over as a client-side `.filter()` on the rows, with the same comment the
     reference carries explaining why.
4. Move the data fetch: rename/convert the existing `*-table-data.tsx` into
   `_components/<section>-list-data.tsx` so it takes **no props** (a layout
   cannot pass `searchParams`), resolves the same data, and renders the new
   `*-list.tsx` instead of the table directly, wrapped in
   `<div className="flex h-full min-h-0 flex-col gap-3">`. Delete the old
   `*-table-data.tsx`. If the old one derived a status filter from
   `searchParams`, drop that argument and fetch unfiltered.
5. Replace `layout.tsx`: keep whatever permission guard / data it already does,
   then render `<XSection list={<Suspense fallback={<DataTableSkeleton
columns={X_SKELETON_COLUMNS} rows={5} />}><XListData /></Suspense>}>
{children}</XSection>`. If the section has no `layout.tsx` yet, create one.
6. Replace `(list)/page.tsx` with the null page — keep its existing `metadata`
   export verbatim, delete everything else, and copy the reference's doc
   comment.
7. Update or delete any test that imported the deleted `*-table-data`. If a
   test only proved the old page rendered a toolbar, replace it with a test
   modelled on
   `apps/billing/src/app/(app)/customers/_components/customers-list-data.test.tsx`
   — three cases: full table when nothing is open, condensed pane with the open
   row marked `aria-current="true"` when `mocks.segments = ['<id>']`, and the
   empty state. Do not delete a test without replacing its coverage.

## Hard rules

- **Do not** edit anything outside `apps/billing/src/app/(app)/{items,(sales)/quotes,(sales)/credit-notes,(sales)/invoices,(subscription-management)/subscriptions}`.
  In particular do not touch `packages/`, `apps/invoice`, `apps/crm`,
  `apps/console`, `detail-layout.tsx`, or any `[id]/` directory.
- **Do not** commit, branch, push, or run any git write command.
- **Do not** use `as any`, `@ts-ignore`, or add an `eslint-disable` comment. If
  something will not typecheck, stop and report it rather than silencing it.
- **Do not** change a table component, a toolbar component, a skeleton-columns
  file, or a row type. Reuse them exactly as they are.
- **Do not** add a description paragraph under any heading, and do not add
  green buttons (project UI rules).
- Keep every file formatted: run
  `npx prettier --write <the files you changed>` at the end.

## Verification (run these, in this order, and report the real output)

```bash
cd /root/projects/876
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app lint
cd apps/billing && npx vitest run src/app/'(app)'/items src/app/'(app)'/'(sales)' src/app/'(app)'/'(subscription-management)'
node /root/projects/876/scripts/check-app-structure.mjs
```

`typecheck` must be clean. `lint` must have **0 errors** (pre-existing warnings
are fine). If a command fails, fix the cause and re-run — do not report a
failure you did not attempt to fix, and never claim a command passed without
running it.

## Report

Write `/root/projects/876/.claude/reports/agy/2026-09-02-billing-list-detail-split.md`
containing: a per-section table (done / partial / skipped), every file added,
changed, or deleted with a one-line reason, the verbatim final output of each
verification command, anything you could not do and why, and any place you had
to make a judgement call the brief did not settle.
