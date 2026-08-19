# Data Fetching Boundaries

Read `.grok/rules/data-loading.md` before adding or changing any page that
renders live data. Data ownership and data loading are separate concerns: this
file defines **where data comes from**; `data-loading.md` defines **how pages
wait for it without blocking the UI**.

All database access, provider calls, and business logic belong in the owning
HTTP data service: `apps/api` for core platform data, `apps/billing-api` for
financial data, and `apps/widgets-api` for widget data. Next.js apps **must
not** contain raw service fetches or direct DB/provider access.

## Correct pattern

| App                              | Package / facade | Auth method                                               |
| -------------------------------- | ---------------- | --------------------------------------------------------- |
| `@876/app` (consumer/enterprise) | `@876/sdk`       | Session cookie / OAuth                                    |
| `@876/console`                   | `$876`           | Internal service credentials, server-only                 |
| `@876/billing-app`               | `$876` / billing | OAuth/session through its authenticated application path  |

### Console server component example

```tsx
import { Suspense } from 'react'
import { $876 } from '@/lib/876'

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
  const result = await $876.users.admin.list({ limit: 25 })
  if (result.error) throw new Error(result.error.message)
  return <UsersTable data={result.data.data} />
}
```

The important boundary is deliberate: the page shell renders before the live
request finishes. Do not copy the request into the top-level page merely because
it is a Server Component.

### Consumer app example

```ts
import { create876Client } from '@876/sdk'
// SDK handles auth transport; session/cookies stay in the app.
```

## What goes where

- **HTTP data services** — SQL queries, provider calls, credential validation,
  business rules, batching and joins owned by that service.
- **`@876/admin` / composed `$876` admin projections** — typed internal clients
  for Console and other trusted server surfaces.
- **`@876/sdk`** — typed platform client for consumer/enterprise/session-tier
  resources.
- **`@876/billing`** — typed Billing resources and integrations.
- **Next.js apps** — rendering, routing, UX state, Suspense boundaries and
  request composition; no direct database/provider business logic.

## Never do this in a Next.js app

```ts
// ❌ Raw service fetch with an internal key — use the typed facade.
const res = await fetch(`${process.env.API_URL}/users`, {
  headers: { 'x-internal-key': process.env.API_INTERNAL_KEY },
})

// ❌ Creating a DB connection or ORM query in a route/component.
import { db } from '@876/db'

// ❌ Blocking otherwise-renderable page chrome on live data.
export default async function Page() {
  const result = await $876.users.admin.list({ limit: 25 })
  return <UsersPage data={result.data?.data ?? []} />
}
```

## Adding new API operations

1. Add the operation to its owning Express data-service module.
2. Add the typed method to `@876/admin`, `@876/sdk`, `@876/billing`, or the
   owning package.
3. Expose it through the app's canonical `$876` facade when the resource belongs
   on that app surface.
4. Call through the typed facade in the Next.js app — never fetch the service
   directly.
5. For page-sized enrichment, add a **batch/purpose-built operation** rather than
   issuing one HTTP request per row.
