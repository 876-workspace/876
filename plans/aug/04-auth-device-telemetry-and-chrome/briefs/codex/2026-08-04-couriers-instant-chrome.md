# Couriers — stop skeletoning page chrome; shimmer only the data

## Why

On `/org/[orgSlug]/items` (and every other list/settings page in
`apps/couriers`) a client navigation currently replaces the **toolbar** — page
title, status-filter dropdown, Add button, `···` dropdown — with a grey
`<Skeleton className="h-9 w-full" />` bar, then swaps in the real toolbar a beat
later. The same happens for section headings and breadcrumbs. This reads as
"slow app" even when the data is fast, and it is unnecessary: none of that
chrome depends on I/O. It was skeletoned only because the components that render
it `await params` / `await searchParams`, which are promises that carry **no
I/O** and resolve immediately.

Next's own guidance (`node_modules/next/dist/docs/01-app/02-guides/instant-navigation.md`,
"Iterate on loading states"): _"The best loading states keep as much real,
cached content visible as possible and only show fallbacks where data is
actually in flight."_

## Target behaviour (this is the acceptance criterion)

On both a hard load and a client navigation into any couriers list page:

| Element                                         | While data is in flight       |
| ----------------------------------------------- | ----------------------------- |
| `ResourceToolbar` title + `StatusFilterHeading` | **real, interactive**         |
| Add button, `···` dropdown, `PageBreadcrumb`    | **real, interactive**         |
| Data table `<thead>` column labels              | **real text**                 |
| Data table body rows                            | shimmering skeleton           |
| Card-grid pages (locations, warehouses)         | real heading + card skeletons |

No grey bar ever appears where the toolbar or a section heading goes.

## Scope — `apps/couriers` ONLY

Do not touch `apps/console`, `apps/876`, `apps/enterprise`, `apps/billing`,
`apps/api`, or `packages/**`. A later PR does Console. If you believe a shared
`packages/ui` change is required, **stop and write the reason in your summary
instead of making it** — `DataTableSkeleton` already renders real column
headers, so it should not be needed.

Files in scope (page + its `loading.tsx` + its `_components/`):

1. `src/app/org/[orgSlug]/items/page.tsx` + `loading.tsx`
2. `src/app/org/[orgSlug]/customers/page.tsx` + `loading.tsx`
3. `src/app/org/[orgSlug]/settings/users/page.tsx` + `loading.tsx`
4. `src/app/org/[orgSlug]/settings/users/roles/page.tsx` + `loading.tsx`
5. `src/app/org/[orgSlug]/settings/locations/page.tsx` + `loading.tsx`
6. `src/app/org/[orgSlug]/settings/warehouses/page.tsx` + `loading.tsx`
7. `src/app/org/[orgSlug]/settings/orgprofile/page.tsx` + `loading.tsx`
8. `src/app/portal/(tenant)/(portal)/packages/page.tsx` + `loading.tsx`

Also sweep every other `page.tsx` under `src/app/org/[orgSlug]/` and
`src/app/portal/` for the same anti-pattern even if it has no `Suspense` today
(e.g. a page that `await`s data at the top and therefore blocks its own
toolbar). Fix those the same way.

## The refactor, precisely

### 1. Await route promises at the top of the page

Make the page component `async` and resolve `params` / `searchParams` there.
These are not I/O; awaiting them does not delay the shell.

```tsx
export default async function ItemsPage({ params, searchParams }: Props) {
  const [{ orgSlug }, { status }] = await Promise.all([params, searchParams])
  const selectedStatus =
    status === 'active' || status === 'inactive' ? status : 'all'

  return (
    <Page>
      <ResourceToolbar
        title="Items"
        titleFilter={
          <StatusFilterHeading
            label="Items"
            value={selectedStatus}
            options={ITEM_STATUS_OPTIONS}
          />
        }
        primaryLabel="Add"
        primaryHref={`/org/${orgSlug}/items/new`}
        primaryVariant="info"
        refresh
        dropdownActions={ITEMS_DROPDOWN_ACTIONS}
      />
      <Suspense
        fallback={<DataTableSkeleton columns={ITEMS_SKELETON_COLUMNS} />}
      >
        <ItemsTableData params={params} searchParams={searchParams} />
      </Suspense>
    </Page>
  )
}
```

Delete the now-dead `ItemsToolbar` / `*StatusFilter` async sub-components and
the `<Suspense>` that wrapped them.

Keep passing the **promises** into the data component (`ItemsTableData` already
awaits them itself) — do not change those components' prop contracts unless a
test forces it. If passing resolved values is cleaner for a given page, that is
fine, but then update that page's `_components/*.test.tsx` accordingly.

### 2. `loading.tsx` renders the real chrome, not a bar

`loading.tsx` cannot receive `params` as a prop, so make it a **client**
component and read `useParams()` from `next/navigation`. `useParams()` does not
suspend.

```tsx
'use client'

import { useParams } from 'next/navigation'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ITEMS_SKELETON_COLUMNS } from './_components/items-skeleton-columns'

export default function Loading() {
  const { orgSlug } = useParams<{ orgSlug: string }>()
  return (
    <Page>
      <ResourceToolbar
        title="Items"
        titleFilter={
          <StatusFilterHeading
            label="Items"
            value="all"
            options={ITEM_STATUS_OPTIONS}
          />
        }
        primaryLabel="Add"
        primaryHref={`/org/${orgSlug}/items/new`}
        primaryVariant="info"
        refresh
        dropdownActions={ITEMS_DROPDOWN_ACTIONS}
      />
      <DataTableSkeleton columns={ITEMS_SKELETON_COLUMNS} />
    </Page>
  )
}
```

**Do NOT call `useSearchParams()` in a `loading.tsx`.** It suspends during
prerender and a route-level fallback has no boundary above it to catch that.
Default the status filter to `"all"`.

To keep the page and its `loading.tsx` from drifting, extract the shared
literals — the status options array, the `dropdownActions` array, and the
skeleton column list — into the route's `_components/` (or `_lib/`) so both
files import the same constants. Per `.claude/rules/app-structure.md`, plain
non-JSX helpers go in `_lib/`, anything that renders goes in `_components/`.
A shared **shell component** taking `orgSlug` + `status` + `children` is also
acceptable and often cleaner — use your judgement, but the two files must not
each hand-maintain their own copy of the toolbar.

### 3. Table fallbacks always use `DataTableSkeleton` with real columns

Any `<Suspense fallback={<Skeleton className="h-96 w-full" />}>` around a table
becomes `<Suspense fallback={<DataTableSkeleton columns={X_SKELETON_COLUMNS} />}>`.
Create the `*-skeleton-columns.ts` file if the route lacks one, matching the
loaded table's real column labels **exactly and in order** (read the table
component to get them — do not guess). Follow the existing shape in
`src/app/org/[orgSlug]/items/_components/items-skeleton-columns.ts`.

### 4. Non-table pages

`settings/locations`, `settings/warehouses` (card grids) and
`settings/orgprofile` (a form): the `PageBreadcrumb` and the page heading render
immediately; only the cards / form body sit behind `<Suspense>`. Their
`loading.tsx` must show the same real breadcrumb + heading. Same for the portal
`packages` page.

### 5. Do not remove `loading.tsx` files

They are the only instant feedback during the server round-trip on a client
navigation. Fix them; don't delete them.

## Constraints

- Follow `.claude/rules/app-layout.md` (toolbar anatomy, button labels, breadcrumb
  placement), `.claude/rules/app-structure.md` (`_components/` vs `_lib/`, no
  barrels, no app-name prefixes), and `.claude/rules/code-style.md`.
- No behaviour change to data fetching, auth guards, status-filter semantics, or
  the `status=all → undefined` threading into `.list()`/`.search()`.
- Do not rename routes, exported components consumed elsewhere, or skeleton
  column constants that other files import.
- Do not commit. Do not create branches. Leave the work in the working tree.
- Update any `_components/*.test.tsx` whose props you changed. Do not weaken an
  assertion to make a test pass.

## Verification — run all of these, in the foreground, and report exit codes

```bash
cd /workspaces/876
pnpm --filter @876/couriers typecheck
pnpm --filter @876/couriers lint
pnpm --filter @876/couriers test
pnpm prettier --check "apps/couriers/**/*.{ts,tsx}"
```

All four must pass. If one fails for a reason unrelated to your change, say so
explicitly in your summary with the exact error rather than working around it.

## Report back

1. Every file you changed, and one line on what changed in it.
2. Any page where the "real chrome immediately" target could not be met, and why.
3. Whether you needed anything from `packages/ui` (and what, if so — you must
   not have changed it).
4. Exit code of each verification command.
