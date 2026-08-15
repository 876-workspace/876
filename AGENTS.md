# Agent Instructions

This file provides guidance to agent harnesses (such as Codex, OpenCode, Antigravity, and Gemini CLI) when working with code in this repository.

## Package Manager

Use **pnpm** only: `pnpm install`, `pnpm dev`, `pnpm --filter <package> <script>`.

## Current Architecture

| Workspace          | Path               | Port | Role                                                              |
| ------------------ | ------------------ | ---- | ----------------------------------------------------------------- |
| `@876/app`         | `apps/876`         | 3000 | Consumer app, org workspaces, auth pages, OAuth provider UI, PWA. |
| `@876/console`     | `apps/console`     | 3002 | Internal Console.                                                 |
| `@876/api`         | `apps/api`         | 4000 | Express identity/platform data service; owns DB/provider calls.   |
| `@876/billing-app` | `apps/billing`     | 3004 | Billing SaaS presentation layer and authenticated API BFF.        |
| `@876/billing-api` | `apps/billing-api` | 4004 | Express financial data plane, providers, and scheduled billing.   |
| `@876/widgets-api` | `apps/widgets-api` | 3005 | Widget-owned data service backed by dedicated Postgres.           |

### Shared packages

| Package        | Path               | Role                                                                                                                                                                                         |
| -------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@876/sdk`     | `packages/sdk`     | Consumer/first-party client (`$876`); app-API-key/session tier. Auth, OAuth, and self-scoped resources. Request-only; no session or DB access.                                               |
| `@876/admin`   | `packages/admin`   | Privileged platform-admin client (`$876`); internal-key tier, server-only. All admin CRUD/list/search.                                                                                       |
| `@876/core`    | `packages/core`    | Errors, ID generation, timestamps, shared utilities.                                                                                                                                         |
| `@876/billing` | `packages/billing` | Tenant-scoped Billing client plus server-only `@876/billing/admin` projection client.                                                                                                        |
| `@876/ui`      | `packages/ui`      | shadcn/ui primitives (Base UI + Tailwind v4) + shared design tokens/auth CSS. Subpath imports only. Embeddable auth UI lives at `@876/ui/auth` (presentation + flow only; no session state). |

## Dev & File-Scoped Commands

```bash
pnpm dev                          # Product apps + API + Widgets API in parallel
pnpm dev:api                      # Express identity API only
pnpm dev:app                      # Consumer app only
pnpm dev:console                  # Console app + API + Widgets API

# Per-workspace checks and testing
pnpm --filter @876/app typecheck
pnpm --filter @876/console typecheck
pnpm --filter @876/api typecheck
pnpm --filter @876/sdk typecheck
pnpm --filter @876/core typecheck
pnpm --filter @876/api test       # vitest
pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-api api:contract:check
pnpm --filter @876/sdk test       # vitest
pnpm check                        # format + lint + typecheck + test (run before committing)
```

The Express data services can also be run directly:

```bash
pnpm --filter @876/api dev
pnpm --filter @876/billing-api dev
pnpm --filter @876/couriers-api dev
```

## Required Context

- Read `.agents/rules/git.md` before creating branches, committing, pushing,
  opening or updating pull requests, reviewing PR feedback, or merging.
- Read `.agents/rules/performance.md`, `.agents/rules/types.md`, and `.agents/rules/code-style.md` before editing app code.
- Read `.agents/rules/data-fetching.md` and `.agents/rules/api-access.md` before writing data-fetching code.
- Read `.agents/rules/api-backend.md` before editing `apps/api`, API contracts, OpenAPI docs, repositories, provider integrations, or API client methods.
- Read `.agents/rules/stripe-api-pattern.md` before changing API contracts, SDK contracts, service results, provider errors, or serialized resources.
- Read `.agents/rules/feature-flags.md` before creating, renaming, seeding, or evaluating any feature flag (app-prefixed `<app>_<group>_<child>` key standard, parent/child group semantics, PostHog + local catalog sync).
- Read `.agents/rules/storage-architecture.md` before storing, uploading, referencing, serving, or listing any file (876 Storage vs 876 Drive, the category/audience classification, server-generated object keys, upload flow).
- For Next.js routing/rendering/config/metadata/proxy changes, read the matching local guide in `node_modules/next/dist/docs/` first.

## Boundaries

- **All database access, provider calls, and business logic belong in the owning data service** (`apps/api`, `apps/billing-api`, or `apps/widgets-api`). Next.js apps must not contain direct DB/provider access or bypass the owning typed package/BFF. Billing database access belongs exclusively to `apps/billing-api` repositories.
- `@876/app` and `@876/console` fetch data exclusively through `@876/sdk` (consumer/auth) or `@876/admin` (Console server components).
- `@876/admin` server-side calls use `internalKey: process.env.API_INTERNAL_KEY`. Never expose this key to the browser.
- `@876/sdk` is request-only auth/OAuth transport; apps own cookies, session stores, and navigation.
- `@876/auth-ui` (or embeddable auth UI at `@876/ui/auth`) is presentation and flow logic only; do not add session state there.
- Console-only logic stays under `apps/console/src/lib/console/` and must not be imported by consumer/org code.
- App-owned timestamps are Unix seconds in DB/API/SDK/client contracts.
- Do not commit real secrets from `.env*` files.

## Routing — proxy.ts (not middleware.ts)

Both Next.js apps use `src/proxy.ts` (exported as `middleware`) instead of `middleware.ts`. The proxy runs on the Edge runtime and only has access to the sealed session cookie snapshot (`userId`, `accountType`). It performs coarse routing only:

- `@876/app`: redirects enterprise users off `/app/*` and consumer users off `/org/*`.
- `@876/console`: validates session exists; all permission checks happen in RSC layouts.

Fine-grained permission and feature checks belong in **RSC layouts and server components**, not in the proxy.

## Authentication Architecture

Session cookies are sealed with `iron-session` (`unsealSession876`). The session snapshot contains `userId` (WorkOS user ID) and `accountType`. Full user data (role, permissions, features) is fetched from the API in server components using the internal key.

Permission helpers live in each app's `src/lib/auth/guards.ts`:

- `@876/app`: `requireSession`, `requireConsumerAccount`, `requireEnterpriseMembership`, `requireConsumerFeature`, `hasPermission`
- `@876/console`: `requireConsoleAccount`, `requireConsolePermission`, `hasPermission`

Platform permissions are derived from `users.role` via `apps/api/src/platform/permissions.ts`. The API returns a `permissions: string[]` field on every user response.

## API Architecture (Express)

`apps/api`, `apps/couriers-api`, and `apps/billing-api` use Express 5, strict
TypeScript/ESM, Prisma 7, Zod 4, generated OpenAPI, Vitest/Supertest, Pino, and
Cloudflare Containers. `src/app.ts` assembles middleware and route composition;
bounded domains live under `src/modules/<domain>/` with routes, controllers,
services, repositories, schemas, serializers, docs, and tests.

Routes declare security, validation, responses, OpenAPI metadata, and a thin
controller. Services own orchestration; only repositories import Prisma.
Cross-module access goes through public `index.ts` exports. Route-local guards
are required so nonexistent paths remain 404s rather than auth failures. See
`.agents/rules/api-backend.md` for the full standard.

## Data Fetching Pattern

Console server components call `@876/admin` through the wrapper at `src/lib/console/api.ts`:

```ts
import 'server-only'
import { create876AdminClient } from '@876/admin'

function getAdminClient() {
  return create876AdminClient({
    baseUrl: process.env.API_URL,
    internalKey: process.env.API_INTERNAL_KEY,
  })
}
```

Adding a new API operation:

1. Add the endpoint to the owning Express module (route, Zod schema, service,
   repository, docs, and middleware-level tests).
2. Add the typed method to `@876/admin` (`packages/admin/src/client.ts`) or `@876/sdk`.
3. Call through the package in the Next.js app — never fetch directly.

## API Contracts

- Every serialized resource includes a Stripe-style `object` discriminator (`"object": "user"`).
- SDK/API results use `{ data, error }` envelopes.
- Timestamps are Unix seconds.
- List responses: `{ object: "list", data: T[], hasMore: bool, url: string, totalCount: int | null }`.
- Cursor pagination via `startingAfter` / `endingBefore` (item ID-based).
- All 876-owned TypeScript wire fields are camelCase end-to-end (Zod schemas, serializers, SDK params/results).
- Client-safe errors must not include HTTP status fields.

## Docs

- Package-local notes stay in package `README.md` files.

## Commit Attribution

AI commits MUST NOT include `Co-Authored-By` trailers or `Generated with` lines. Follow `.agents/rules/git.md` and `.claude/rules/git.md` — author and co-author metadata must reflect human contributors only. If a local commit contains such a trailer, amend or rebase to remove it before pushing.
