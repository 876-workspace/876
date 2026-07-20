# API Access Rules

Read this file before writing or modifying any data-fetching code in `apps/876` or `apps/console`.

## Core Rule

**All backend calls must go through the FastAPI backend (`apps/api`). Next.js apps are presentation-only.**

This means:

- **No Server Actions.** Client-initiated mutations use a **pure-transport route handler** instead (see below). Business logic always lives in FastAPI.
- **No raw `fetch` calls** from Next.js apps directly to the Python API or any external provider.
- **No business logic, DB access, or provider calls in route handlers.** Route handlers may only authorize the request and call the package `$876` (`@876/sdk` / `@876/admin`); the logic lives in FastAPI.

### Client-initiated mutations: pure-transport route handlers

Reads happen in server components via `$876`. For mutations triggered from client components, do **not** use server actions. Instead:

1. Add a thin route handler under `app/api/...` that (a) authorizes the request — session check, and for Console `requireConsolePermission(...)` — and (b) calls `$876.<resource>.<verb>()`. It contains no business logic.
2. Call it from the client via the app's typed browser client (`client` from `@/lib/client` — `apps/876/src/lib/client/`, `apps/console/src/lib/client/`) — or, for no-JS form posts, a native `<form action="/api/..." method="post">` that redirects.

This keeps a single, testable RPC surface and avoids server actions while still owning no business logic in Next.js. See `.grok/rules/sdk-conventions.md`.

The OAuth callback at `apps/876/src/app/callback/route.ts` and the auth bridge at `app/api/auth/[...path]/route.ts` are protocol adapters (session-cookie copy / transport forwarding) and contain no business logic.

> Known follow-up: `apps/876/src/app/oauth/consent/actions.ts` is the last remaining server action (an OAuth approve/deny redirect flow); convert it to a route handler in a dedicated change.

Auth protocol bridge routes may forward transport metadata to the API, but they must not own provider/business logic. When an auth flow needs an absolute browser origin (for example WorkOS social callback URLs), derive it from the incoming request/forwarded headers and pass it explicitly to FastAPI. Do not hardcode `localhost`, Codespaces URLs, or deployment URLs in code. The 876 auth bridge forwards this as `x-876-origin`; the API may use it to replace missing or local-only callback configuration while production/non-local configured URLs remain authoritative.

## How to Fetch Data

### Consumer app (`apps/876`)

Browser-side auth calls → `@876/sdk` via `authClient` (`apps/876/src/lib/auth/client.ts`)

```ts
import { authClient } from '@/lib/auth/client'

const result = await authClient.auth.login({ identifier, password })
```

Server-side data → API-key-tier `$876` from `@/lib/876` (`apps/876/src/lib/876.ts`); privileged session bootstrap uses the internal-key admin client in `apps/876/src/lib/auth/guards.ts`:

```ts
import { $876 } from '@/lib/876'

const result = await $876.apps.retrieve(appId)
```

### Console (`apps/console`)

All server-side data calls → `@876/admin` via the `$876` singleton at `src/lib/876.ts`:

```ts
import { $876 } from '@/lib/876'

const result = await $876.users.list()
```

Browser-side auth calls → `@876/sdk` (`create876Client`) with `credentials: 'include'`:

```ts
const $876 = create876Client({
  apiKey: process.env.NEXT_PUBLIC_876_API_KEY,
  baseUrl:
    process.env.NEXT_PUBLIC_876_API_URL ?? process.env.NEXT_PUBLIC_API_URL,
  credentials: 'include',
})
```

## SDK Client Configuration

All `create876Client` calls in browser-rendered components **must** include `credentials: 'include'`. This is required for the session cookie to be set and cleared across the API origin boundary.

```ts
// CORRECT
create876Client({
  apiKey: process.env.NEXT_PUBLIC_876_API_KEY,
  baseUrl:
    process.env.NEXT_PUBLIC_876_API_URL ?? process.env.NEXT_PUBLIC_API_URL,
  credentials: 'include',
})

// WRONG — omitting credentials breaks login/logout
create876Client({
  baseUrl: process.env.NEXT_PUBLIC_API_URL,
})
```

## Authentication Boundary

- **Server-side route guards** (`requireSession`, `requireConsoleAccount`, etc.) are the authoritative auth gate. They run in RSC layouts before any page renders.
- **Client-side state** (Zustand stores) holds display-only user data (name, avatar, role) hydrated after the server guard passes. Never use client-side state to decide whether a route is accessible.
- Session cookies are set by the Python API and read by Next.js via `cookies()` from `next/headers`. Next.js apps do not seal or validate HMAC on cookies — that is the API's responsibility.

## Adding a New API Operation

1. Add the endpoint to `apps/api` (FastAPI router + repository method).
2. Add the typed method to the correct tier per the auth-tier gating rule: `@876/admin` (`packages/admin/src/client.ts`) if the endpoint is `AdminDep`, and/or `@876/sdk` (`packages/sdk/src/client.ts`) if it is API-key/session and self-scoped. A method may live in `@876/sdk` only if its endpoint is not `AdminDep`.
3. Call through the package's exported `$876` in the Next.js app — never `fetch` the API directly, and never add bespoke flat wrappers (`listUsers()`) around the client.

See `sdk-conventions.md` for the `$876.<resource>.<verb>()` surface, client initialization, and the auth-tier gating rule. See `stripe-api-pattern.md` for resource shape conventions.
