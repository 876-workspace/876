# Data Fetching Boundaries

Read `.claude/rules/data-loading.md` before adding or changing any page that
renders live data. Read `.claude/rules/error-handling.md` before handling a
failed service/SDK result. Data ownership and data loading are separate concerns:
this file defines **where data comes from**; `data-loading.md` defines **how pages
wait for it without blocking the UI**.

All database access, provider calls, and business logic belong in the owning
HTTP data service: `apps/api` for core platform data, `apps/billing-api` for
financial data, and `apps/widgets-api` for widget data. Next.js apps **must
not** contain raw service fetches or direct DB/provider access.

## Correct pattern

| Host                      | Bounded roots                                                                       | Authority                          |
| ------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------- |
| `@876/app`                | `$876` from `@876/account`                                                          | signed-in account / app credential |
| organization product apps | `$876`, `workspace`, and only the product roots they need                           | session or first-party service     |
| `@876/console`            | `platform`, `workspace`, `billing`, `couriers`, `crm`, `storage`, `widgets`, `work` | operator credentials, server-only  |

### Console server component example

```tsx
import { Suspense } from 'react'
import { AppError } from '@876/ui/app-error'
import { platform } from '@/lib/services/platform'

export default function UsersPage() {
  return (
    <>
      <UsersToolbar />
      <Suspense fallback={<UsersTableSkeleton />}>
        <UsersTableData />
      </Suspense>
    </>
  )
}

async function UsersTableData() {
  const result = await platform.users.list({ limit: 25 })
  const rows = result.data?.data ?? []

  return (
    <div className="space-y-3">
      {result.error ? (
        <AppError
          title="Some user data could not be loaded"
          error={result.error}
          variant="banner"
          showCode
        />
      ) : null}
      <UsersTable data={rows} />
    </div>
  )
}
```

Expected SDK/application errors stay values all the way to the UI. Never replace
`result.error` with `throw new Error(result.error.message)`; that discards its
stable code and turns ordinary application state into a framework crash.

A failed dataset is not allowed to own the page. Keep the toolbar, filters,
table/list shell, and pagination region mounted. An empty structural dataset is
acceptable during a failure only when a visible notice makes clear that the
empty region represents unavailable data rather than a real "no records" state.

The important boundary is deliberate: the page shell renders before the live
request finishes. Do not copy the request into the top-level page merely because
it is a Server Component.

### Consumer app example

```ts
import { create876AccountClient } from '@876/account'
// Account handles auth transport; session/cookies stay in the app.
```

## What goes where

- **HTTP data services** — SQL queries, provider calls, credential validation,
  business rules, batching and joins owned by that service.
- **`@876/account`** — Account auth and current-user resources.
- **`@876/workspace/session` / `@876/workspace/operator`** — organization-plane
  access at the named caller authority.
- **`@876/platform/operator`** — genuinely platform-wide operator resources.
- **Product authority entrypoints** — typed product resources for the named
  `session`, `service`, `operator`, or `integration` caller.
- **Next.js apps** — rendering, routing, UX state, Suspense boundaries and
  request composition; no direct database/provider business logic.

## Never do this in a Next.js app

```ts
// ❌ Raw service fetch with an internal key — use the owning typed client.
const res = await fetch(`${process.env.API_URL}/users`, {
  headers: { 'x-internal-key': process.env.API_INTERNAL_KEY },
})

// ❌ Creating a DB connection or ORM query in a route/component.
import { db } from '@876/db'

// ❌ Blocking otherwise-renderable page chrome on live data.
export default async function Page() {
  const result = await platform.users.list({ limit: 25 })
  return <UsersPage data={result.data?.data ?? []} />
}

// ❌ Throwing a known application error returned by the typed client.
if (result.error) throw new Error(result.error.message)
```

## Adding new API operations

1. Add the operation to its owning Express data-service module.
2. Add the typed method to the owning bounded package at the entrypoint for the
   actual caller principal.
3. Add or update the host's domain module under `src/lib/services/`; do not add
   an aggregator.
4. Call the named bounded root in the Next.js app — never fetch the service
   directly.
5. For page-sized enrichment, add a **batch/purpose-built operation** rather than
   issuing one HTTP request per row.
6. Preserve expected errors as values and render them at the smallest useful UI
   scope per `.claude/rules/error-handling.md`.
