# Brief — Couriers: stream page content behind Suspense

## Why

Same defect as Console, one layer worse. Every Couriers org route is an `async`
Server Component that awaits `getManageContext(orgSlug)` — which itself makes a
network call to the platform API (`memberships.listRouting`) — and then awaits
its own datastore and registry queries, all before returning any JSX. There is
no `loading.tsx` anywhere in the app. Next.js cannot flush a byte until all of
that resolves, so clicking a sidebar item leaves the previous screen up for the
full round trip.

The fix is the standard App Router streaming shape: render the page chrome
synchronously, move the awaits into a child behind `<Suspense>`, and add a
`loading.tsx` so a hard navigation gets the same instant shell.

Reference (read before starting):

- `node_modules/next/dist/docs/01-app/02-guides/streaming.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md`

**Do NOT enable `cacheComponents` or use `unstable_instant` / `use cache`.**
That migration was explicitly deferred. Plain Suspense + `loading.tsx` only.

## Scope — files you may touch

Only these route directories under `apps/couriers/src/app/`:

| #   | Route dir                             |
| --- | ------------------------------------- |
| 1   | `org/[orgSlug]/customers/`            |
| 2   | `org/[orgSlug]/items/`                |
| 3   | `org/[orgSlug]/settings/users/`       |
| 4   | `org/[orgSlug]/settings/users/roles/` |
| 5   | `org/[orgSlug]/settings/locations/`   |
| 6   | `org/[orgSlug]/settings/warehouses/`  |
| 7   | `org/[orgSlug]/settings/orgprofile/`  |
| 8   | `portal/(tenant)/(portal)/packages/`  |

You may **add** `loading.tsx` and files under each route's own `_components/`.
You may **not** touch `packages/`, `apps/console`, `apps/api`, any other route,
or `apps/couriers/src/lib/`.

## The pattern to apply

`org/[orgSlug]/customers/page.tsx` is the worked example. Today it awaits
`params`, `searchParams`, `getManageContext`, `service.customerProfiles.list`,
and `$876.billing.customers.list` in sequence, then returns JSX.

Restructure to:

```tsx
export default function CustomersPage({ params, searchParams }: Props) {
  return (
    <Page>
      <ResourceToolbar … />   {/* chrome, no data, paints immediately */}

      <Suspense fallback={<DataTableSkeleton columns={CUSTOMERS_SKELETON_COLUMNS} />}>
        <CustomersTableData params={params} searchParams={searchParams} />
      </Suspense>
    </Page>
  )
}

async function CustomersTableData({ params, searchParams }: …) {
  … every existing await, unchanged …
}
```

### Hard rules

1. **The page function must not `await` anything.** Pass the `params` and
   `searchParams` promises down un-awaited. Awaiting either in the page body
   suspends the whole page and defeats the boundary.
2. **`ResourceToolbar`'s `primaryHref` needs `orgSlug`**, which only exists in
   the awaited `params`. Do **not** await `params` in the page body to get it.
   Instead render the toolbar inside its own small `<Suspense>` with a
   `<Skeleton className="h-9 w-full" />` fallback, in a tiny async child that
   awaits only `params`. `params` resolves without a network call, so that
   boundary settles almost immediately while the data boundary is still
   pending — which is the entire point.
   Same treatment for `StatusFilterHeading`, which needs the resolved
   `searchParams` status.
3. **Preserve behavior exactly.** Same calls, same guards — including
   `if (!ctx?.tenant) return null` and every `redirect(...)` — same error
   surfaces (e.g. the `registry?.error` banner on customers), same props into
   existing table components. This is a restructure, not a rewrite.
   **A `redirect()` or `notFound()` must still run before anything streams.**
   If a page's guard currently runs before its data fetch, keep that ordering
   inside the async child; do not hoist a guard above the Suspense boundary and
   do not move one below a fetch.
4. **Skeleton columns live in a shared const**, one file per route under that
   route's `_components/` (e.g. `_components/customers-skeleton-columns.ts`),
   imported by **both** `page.tsx` and `loading.tsx`. Labels must match the real
   table's headers exactly, in order. Never duplicate the array.
5. Do not change `getManageContext` or anything in `src/lib/`. Its per-navigation
   platform call is a real cost, but it is a separate task — if you notice a
   page calling it more than once in a way React's `cache()` does not dedupe,
   leave a `// TODO(perf):` comment rather than refactoring.

### `loading.tsx` for each route

Mirror the page's chrome with static placeholders:

```tsx
export default function Loading() {
  return (
    <Page>
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-9 w-24" />
      </div>
      <DataTableSkeleton columns={CUSTOMERS_SKELETON_COLUMNS} />
    </Page>
  )
}
```

`loading.tsx` cannot read `params` or `searchParams`, so it uses skeleton
placeholders for the toolbar rather than the real `ResourceToolbar`. Keep the
heights matching the real chrome so nothing shifts on swap. Where a route's page
renders `PageBreadcrumb`, that is static text — render the real breadcrumb in
`loading.tsx` (it needs `orgSlug` in its href, so use a `Skeleton` if the href
cannot be built without `params`).

For routes 7 (`settings/orgprofile`) and any other form page, there is no table
— use `Skeleton` blocks shaped like the form's `FormRow`s instead of
`DataTableSkeleton`.

## `DataTableSkeleton` API

`packages/ui/src/components/data-table-skeleton.tsx`, imported as
`@876/ui/data-table-skeleton`. Already on this branch — **do not modify it**.

```ts
type DataTableSkeletonColumn = {
  label: string // real header text
  width?: string // e.g. '36px'
  srOnly?: boolean // avatar / action columns
  cell?: 'text' | 'avatar' | 'badge'
  cellWidth?: string
}

function DataTableSkeleton(props: {
  columns: DataTableSkeletonColumn[]
  rows?: number // default 8
  card?: boolean // default true — wraps in `876-card`
  className?: string
}): JSX.Element
```

`cell: 'avatar'` for a cell pairing a logo with text, `'badge'` for a status
column, `'text'` (default) otherwise.

## Rules from the repo you must follow

- `.claude/rules/app-structure.md` — route-local components in that route's
  `_components/`; no barrels; no app-name prefixes.
- `.claude/rules/app-layout.md` — do not change container padding, toolbar
  shape, button labels/variants, or heading sizes.
- `.claude/rules/module-settings.md` — if you touch a settings route, do not
  change how preferences resolve; defaults are never stored.
- **No server actions.** Do not introduce any.
- Do not add `export const dynamic` / `revalidate`. A later phase audits that.

## Verification — all must pass before you report done

```bash
pnpm --filter @876/couriers typecheck
pnpm --filter @876/couriers lint
pnpm --filter @876/couriers test
npx prettier --check "apps/couriers/src/app/**/*.tsx"
```

Fix anything you break. If a test asserts on the old page structure, update it
to the new structure rather than reverting — and say so explicitly in your
report.

## Do not

- Do not commit, branch, stash, or run any `git` write command.
- Do not enable `cacheComponents`, use `use cache`, or export `unstable_instant`.
- Do not touch `packages/`, `apps/console`, `apps/api`, or `src/lib/`.
- Do not "improve" unrelated code you happen to read.

## Report back

Per route: what changed, whether any guard/redirect ordering was subtle, and
anything you could not restructure and why.
