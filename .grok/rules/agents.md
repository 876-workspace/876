# Agent Instructions (Grok copy)

Grok-oriented copy of root `AGENTS.md`. Prefer rule paths under `.grok/rules/`. **Never open `.claude/rules/cli.md` or `.agents/rules/cli.md`.** See `00-grok.md`.

This file provides guidance when working with code in this repository (Grok harness).

## Package Manager

Use **pnpm** only: `pnpm install`, `pnpm dev`, `pnpm --filter <package> <script>`.

## Current Architecture

| Workspace          | Path               | Port | Role                                                              |
| ------------------ | ------------------ | ---- | ----------------------------------------------------------------- |
| `@876/app`         | `apps/876`         | 3000 | Consumer app, org workspaces, auth pages, OAuth provider UI, PWA. |
| `@876/console`     | `apps/console`     | 3002 | Internal Console.                                                 |
| `@876/api`         | `apps/api`         | 4000 | FastAPI backend; owns database/provider server calls.             |
| `@876/docs`        | `apps/docs`        | 3003 | SDK documentation app with OpenAPI-backed method references.      |
| `@876/billing-app` | `apps/billing`     | 3004 | Billing SaaS presentation layer and authenticated API BFF.        |
| `@876/billing-api` | `apps/billing-api` | 4004 | FastAPI financial data plane, providers, and scheduled billing.   |
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
pnpm dev:api                      # FastAPI only (uvicorn --reload)
pnpm dev:app                      # Consumer app only
pnpm dev:console                  # Console app + API + Widgets API

# Per-workspace checks and testing
pnpm --filter @876/app typecheck
pnpm --filter @876/console typecheck
pnpm --filter @876/api typecheck
pnpm --filter @876/sdk typecheck
pnpm --filter @876/core typecheck
pnpm --filter @876/api test       # pytest
pnpm --filter @876/sdk test       # vitest
pnpm check                        # format + lint + typecheck + test (run before committing)
```

API can also be run directly from `apps/api`:

```bash
python -m uvicorn main:app --host 0.0.0.0 --port 4000 --reload
python -m pytest
python -m mypy . tests
python -m ruff check .
```

## Required Context

- Read `apps/docs/content/docs/index.mdx` at session start when working on documentation.
- Read `.grok/rules/performance.md`, `.grok/rules/types.md`, and `.grok/rules/code-style.md` before editing app code.
- Read `.grok/rules/data-fetching.md` and `.grok/rules/api-access.md` before writing data-fetching code.
- Read `.grok/rules/api-backend.md` before editing `apps/api`, API contracts, OpenAPI docs, repositories, provider integrations, or API client methods.
- Read `.grok/rules/stripe-api-pattern.md` before changing API contracts, SDK contracts, service results, provider errors, or serialized resources.
- Read `.grok/rules/feature-flags.md` before creating, renaming, seeding, or evaluating any feature flag (app-prefixed `<app>_<group>_<child>` key standard, parent/child group semantics, PostHog + local catalog sync).
- For Next.js routing/rendering/config/metadata/proxy changes, read the matching local guide in `node_modules/next/dist/docs/` first.

## Boundaries

- **All database access, provider calls, and business logic belong in the owning FastAPI data service** (`apps/api`, `apps/billing-api`, or `apps/widgets-api`). Next.js apps must not contain raw `fetch` calls to FastAPI or any direct DB/provider access. Frontends fetch over HTTP via the owning typed package or BFF.
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

Platform permissions are derived from `users.role` via `apps/api/core/permissions.py`. The API returns a `permissions: string[]` field on every user response.

## API Architecture (FastAPI)

Entry: `main.py` → `api/v1.py`. Domain routers live in `domains/<name>/router.py`; route-level OpenAPI docs live in matching `docs.py`; Pydantic contracts live in matching `schemas.py`.

| Domain        | Path prefix      | Auth                                                                    |
| ------------- | ---------------- | ----------------------------------------------------------------------- |
| auth          | `/auth`          | Public / session                                                        |
| oauth         | `/oauth`         | Public / bearer                                                         |
| users         | `/users`         | AdminDep (internal key) except `/oauth-grants`, `/ensure` (app API key) |
| organizations | `/organizations` | AdminDep                                                                |
| memberships   | `/memberships`   | AdminDep                                                                |
| features      | `/features`      | AdminDep                                                                |
| apps          | `/apps`          | ApiKeyDep + AdminDep where required                                     |
| health        | `/health`        | Public                                                                  |

`require_api_key` protects the top-level protected router and validates `876_app_secret_*` API keys. `AdminDep` requires the `x-internal-key` header to match `API_INTERNAL_KEY`; when `API_INTERNAL_KEY` is empty, admin routes reject all requests. DB models live in `db/models.py`; repositories in `db/repositories/`. See `.grok/rules/api-backend.md` for backend route, schema, docs, auth, and testing rules.

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

1. Add the endpoint to `apps/api` (FastAPI router + repository method).
2. Add the typed method to `@876/admin` (`packages/admin/src/client.ts`) or `@876/sdk`.
3. Call through the package in the Next.js app — never fetch directly.

## API Contracts

- Every serialized resource includes a Stripe-style `object` discriminator (`"object": "user"`).
- SDK/API results use `{ data, error }` envelopes.
- Timestamps are Unix seconds.
- List responses: `{ object: "list", data: T[], has_more: bool, url: string, total_count: int | null }`.
- Cursor pagination via `starting_after` / `ending_before` (item ID-based).
- Client-safe errors must not include HTTP status fields.

## Codespace / Environment Notes

In GitHub Codespaces, `NEXT_PUBLIC_API_URL` must be the HTTPS-forwarded Codespace URL for port 4000 (e.g. `https://<codespace>-4000.app.github.dev`), set in `apps/console/.env.local`. The server-side `API_URL` stays `http://127.0.0.1:4000`. Port 4000 must be set to **Public** in the Codespaces Ports panel.

## Docs

- SDK documentation lives under `apps/docs/content/docs/` and is rendered by `@876/docs`.
- API method references in the docs app use `apps/docs/openapi.json`; regenerate it with `pnpm sync:openapi` when API contracts change.
- Package-local notes stay in package `README.md` files.

## Commit Attribution

AI commits MUST include:

```txt
Co-Authored-By: (the agent model's name and attribution byline)
```
