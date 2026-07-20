# Data Fetching Boundaries

All database access, provider calls, and business logic belong in `apps/api` (FastAPI).
Next.js apps **must not** contain raw `fetch` calls to the FastAPI or any direct DB/provider access.

## Correct pattern

| App                              | Package      | Auth method                                               |
| -------------------------------- | ------------ | --------------------------------------------------------- |
| `@876/app` (consumer/enterprise) | `@876/sdk`   | Session cookie / OAuth                                    |
| `@876/console`                   | `@876/admin` | `internalKey: process.env.API_INTERNAL_KEY` (server-only) |

### Console server component example

```ts
// apps/console/src/lib/876.ts
import 'server-only'
import { create876AdminClient } from '@876/admin'

export const $876 = create876AdminClient({
  internalKey: process.env.API_INTERNAL_KEY,
  apiKey: process.env.API_876_KEY,
})

// In a server component:
import { $876 } from '@/lib/876'
const { data } = await $876.users.list({ limit: 25 })
```

### Consumer app example

```ts
import { create876Client } from '@876/sdk'
// SDK handles auth transport; session/cookies stay in the app
```

## What goes where

- **`apps/api`** — SQL queries, WorkOS calls, Stripe calls, session validation, business rules
- **`@876/admin`** — typed client wrapping FastAPI admin endpoints; used only in MC server components
- **`@876/sdk`** — typed client wrapping FastAPI auth/OAuth endpoints; used in consumer/enterprise apps
- **Next.js apps** — rendering, routing, UX state; no direct backend calls

## Never do this in a Next.js app

```ts
// ❌ Raw fetch with internal key — belongs in @876/admin
const res = await fetch(`${process.env.API_URL}/users`, {
  headers: { 'x-internal-key': process.env.API_INTERNAL_KEY },
})

// ❌ Creating a DB connection or ORM query in a Next.js route/component
import { db } from '@876/db'
```

## Adding new API operations

1. Add the endpoint to `apps/api` (FastAPI router).
2. Add the typed method to `@876/admin` (for MC) or `@876/sdk` (for consumer/enterprise).
3. Call through the package in the Next.js app — never fetch directly.
