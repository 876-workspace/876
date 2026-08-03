# Brief — Console list pages: stream rows behind Suspense

## Why

Every Console list page is an `async` Server Component that awaits its entire
data set before returning any JSX. Next.js cannot flush a byte until that
resolves, and there is no `loading.tsx` anywhere in the app, so clicking
"Users" in the sidebar leaves the **previous page** on screen until the API
round trip (plus, on `/users`, an N+1 of 25 `listApps` calls) finishes. The
user's report: "when I click on user it takes a little while to load … when it
loads the page all the information is there."

The fix is the standard Next.js App Router streaming shape: render the page
chrome synchronously, put the awaits in a child component behind `<Suspense>`,
and add a `loading.tsx` so a hard navigation gets the same instant shell.

Reference (read these before starting):

- `node_modules/next/dist/docs/01-app/02-guides/streaming.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md`

**Do NOT enable `cacheComponents` or use `unstable_instant` / `use cache`.**
That migration was explicitly deferred. Plain Suspense + `loading.tsx` only.

## Scope — files you may touch

Only these route directories under `apps/console/src/app/(app)/`:

| # | Route dir | Page file |
|---|-----------|-----------|
| 1 | `users/` | `page.tsx` |
| 2 | `orgs/` | `page.tsx` |
| 3 | `apps/` | `page.tsx` |
| 4 | `settings/users/` | `page.tsx` |
| 5 | `settings/users/roles/` | `page.tsx` |
| 6 | `audit-log/` | `page.tsx` |
| 7 | `orgs/[slug]/members/` | `page.tsx` |
| 8 | `orgs/[slug]/billing/accounts/` | `page.tsx` |
| 9 | `orgs/[slug]/billing/customers/` | `page.tsx` |
| 10 | `orgs/[slug]/billing/subscriptions/` | `page.tsx` |
| 11 | `apps/[slug]/plans/` | `page.tsx` |
| 12 | `apps/[slug]/subscribers/` | `page.tsx` |
| 13 | `apps/[slug]/features/` | `page.tsx` |

You may **add** `loading.tsx` and files under each route's own `_components/`
directory. You may **not** touch `packages/`, any other app, any API code, or
any route not listed above. You may not touch
`users/_components/columns.tsx` or `orgs/_components/columns.tsx` — a
concurrent branch owns those two files.

## The pattern to apply

Take `users/page.tsx` as the worked example. Today it is one async function
that awaits the list, then awaits an N+1 of `listApps`, then returns JSX.

Restructure to exactly this shape:

```tsx
// page.tsx — NOT async at the top level for the chrome
import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { USERS_SKELETON_COLUMNS } from './_components/users-skeleton-columns'

export const metadata = { title: 'Users' }

type Props = { searchParams: Promise<{ /* … unchanged … */ }> }

export default function UsersPage({ searchParams }: Props) {
  return (
    <Page>
      {/* chrome that needs no data renders immediately */}
      <ResourceToolbar … />
      <div className="mb-4 max-w-sm">
        <Suspense><UserSearchBar /></Suspense>
      </div>

      <Suspense fallback={<DataTableSkeleton columns={USERS_SKELETON_COLUMNS} />}>
        <UsersTableData searchParams={searchParams} />
      </Suspense>
    </Page>
  )
}

// same file (or _components/users-table-data.tsx) — all awaits live here
async function UsersTableData({ searchParams }: { searchParams: Props['searchParams'] }) {
  const { after, before, q, status } = await searchParams
  … existing fetch + empty-state + <UsersTable /> logic, unchanged …
}
```

### Hard rules for the restructure

1. **The page function must not `await` anything.** Pass the `searchParams`
   promise down un-awaited. Awaiting it in the page body makes the whole page
   suspend and defeats the boundary.
2. **`StatusFilterHeading` needs the resolved status.** It is a client
   component reading a value derived from `searchParams`. Keep the toolbar in
   the instant chrome by rendering it inside its **own** small `<Suspense>`
   with a `<Skeleton className="h-7 w-40" />` fallback, in an async child that
   awaits only `searchParams` — never fold it into the data component. The Add
   button and `···` dropdown must stay outside that boundary so they paint
   immediately.
3. **Preserve behavior exactly.** Same fetches, same params, same error
   handling (`if (result.error) throw new Error(...)`), same empty states, same
   props into the existing table components. This is a restructure, not a
   rewrite. Do not change any `$876` call signature.
4. **Split independent fetches into separate boundaries.** On `/users`, the
   `$876.users.listApps(u.id)` N+1 that builds `enrollmentsMap` must **not**
   block the table. Render the table from the list result, and let the Apps
   column fill in from a second, nested `<Suspense>`. If that is not achievable
   without changing `UsersTable`'s props, instead keep them together but leave a
   `// TODO(perf):` comment naming the batch endpoint that would fix it — do
   **not** silently keep the N+1 in the critical path without the comment.
   Same reasoning for `orgs/page.tsx`'s `subscriptions.listByOrganizations`
   (that one is already batched, so it is fine to keep inline).
5. **Skeleton columns live in a shared const**, one file per route under that
   route's `_components/` (e.g. `_components/users-skeleton-columns.ts`),
   exported and imported by **both** `page.tsx` and `loading.tsx`. The labels
   must match the real column headers in that route's `columns.tsx` exactly,
   in the same order. Never duplicate the array in two files.

### `loading.tsx` for each route

```tsx
// users/loading.tsx
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { Skeleton } from '@876/ui/skeleton'
import { USERS_SKELETON_COLUMNS } from './_components/users-skeleton-columns'

export default function Loading() {
  return (
    <Page>
      <ResourceToolbar title="Users" primaryLabel="Add" primaryHref="/users/new" primaryVariant="info" refresh />
      <div className="mb-4 max-w-sm"><Skeleton className="h-9 w-full" /></div>
      <DataTableSkeleton columns={USERS_SKELETON_COLUMNS} />
    </Page>
  )
}
```

- `loading.tsx` renders the plain `title` on `ResourceToolbar`, **not**
  `StatusFilterHeading` — it cannot read `searchParams`.
- Keep the toolbar props identical to the page's so the chrome does not shift
  when real content swaps in.
- For a route whose page uses `PageBreadcrumb`, include the same breadcrumb in
  `loading.tsx`.

## `DataTableSkeleton` API (already on this branch)

`packages/ui/src/components/data-table-skeleton.tsx`, imported as
`@876/ui/data-table-skeleton`:

```ts
type DataTableSkeletonColumn = {
  label: string          // real header text
  width?: string         // e.g. '36px'
  srOnly?: boolean       // avatar / action columns
  cell?: 'text' | 'avatar' | 'badge'
  cellWidth?: string
}

function DataTableSkeleton(props: {
  columns: DataTableSkeletonColumn[]
  rows?: number   // default 8
  card?: boolean  // default true — wraps in `876-card`
  className?: string
}): JSX.Element
```

Use `cell: 'avatar'` for a column whose cell pairs a logo/avatar with text,
`cell: 'badge'` for a status column, `cell: 'text'` (default) otherwise. Do not
modify this file.

## Rules from the repo you must follow

- `.claude/rules/app-structure.md` — route-local components go in that route's
  `_components/`; no barrel `index.ts`; no app-name prefixes on files.
- `.claude/rules/app-layout.md` — do not change container padding, toolbar
  shape, button labels/variants, or heading sizes.
- `.claude/rules/code-style.md` — single-statement `if` without braces, blank
  line between concern groups. Applies to `src/lib/` and `src/app/api/` only,
  but match surrounding style everywhere.
- **No server actions.** Do not introduce any.
- Do not add `export const dynamic` / `revalidate` to any page in this task. A
  later phase audits that separately. Leave the two existing ones on
  `apps/page.tsx` exactly as they are.

## Verification — all must pass before you report done

```bash
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
npx prettier --check "apps/console/src/app/(app)/**/*.tsx"
```

Fix anything you break. If a test asserts on the old page structure, update the
test to the new structure rather than reverting the restructure — but say so
explicitly in your final report.

## Do not

- Do not commit. Leave changes in the working tree; the orchestrator commits.
- Do not create a branch, stash, or run any `git` write command.
- Do not enable `cacheComponents`, use `use cache`, or export
  `unstable_instant`.
- Do not touch `packages/`, `apps/couriers`, `apps/api`, or the two
  `columns.tsx` files named above.
- Do not "improve" unrelated code you happen to read.

## Report back

For each of the 13 routes: what you changed, whether the N+1 was split or
TODO-commented, and anything you could not restructure and why.
