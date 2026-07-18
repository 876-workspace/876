# 876 Monorepo

876 is a pnpm/Turborepo workspace for the 876 identity platform — one account that unlocks the consumer app, Enterprise org workspace, internal Console, and Couriers, all backed by a shared FastAPI core and shared packages.

---

## Apps

| Workspace          | Path              | Port | Description                                                                                               |
| ------------------ | ----------------- | ---- | --------------------------------------------------------------------------------------------------------- |
| `@876/app`         | `apps/876`        | 3000 | Consumer app — embedded auth, account/org management, OAuth provider UI, PWA.                             |
| `@876/enterprise`  | `apps/enterprise` | 3001 | Enterprise org workspace — embedded auth (sign-in + business onboarding), org dashboards, billing.        |
| `@876/console`     | `apps/console`    | 3002 | Internal Console — platform admin console (users, orgs, roles/permissions, app subscriptions, settings).  |
| `@876/couriers`    | `apps/couriers`   | 3003 | Couriers SaaS app — multitenant courier management platform, own Prisma datastore.                        |
| `@876/billing-app` | `apps/billing`    | 3004 | Standalone multitenant Billing SaaS — catalogue, customers, invoices, quotes, and subscriptions.          |
| `@876/api`         | `apps/api`        | 4000 | FastAPI backend; owns all database access, provider calls, business logic, auth, and API-key validation.  |
| `@876/docs`        | `apps/docs`       | 3003 | Internal engineering docs — API route references, identity model, client package guides, OpenAPI browser. |

`@876/docs` and `@876/couriers` both default to port 3003 — don't run them at the same time without overriding one.

## Packages

| Package          | Path                 | Description                                                                                                                                                             |
| ---------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@876/sdk`       | `packages/sdk`       | Consumer/first-party typed client (`$876`); API-key + session tier. Auth, OAuth, apps, and self-scoped resources. Request-only — does not own cookies or session state. |
| `@876/admin`     | `packages/admin`     | Privileged platform-admin client (`$876`); internal-key tier, **server-only**. All `AdminDep` CRUD/list/search across users, orgs, memberships, roles, features, apps.  |
| `@876/billing`   | `packages/billing`   | Versioned client for standalone 876 Billing; tenant-scoped root export plus server-only `/admin` projection tier.                                                       |
| `@876/core`      | `packages/core`      | Shared errors, ID generation, timestamps, contracts, and the shared client runtime (`@876/core/client`) both tier packages build on.                                    |
| `@876/ui`        | `packages/ui`        | shadcn/ui primitives (Base UI + Tailwind v4), chart components, embeddable auth UI (`@876/ui/auth`), and shared design tokens.                                          |
| `@876/analytics` | `packages/analytics` | PostHog analytics provider and shared tracking utilities.                                                                                                               |

Console and Couriers each own an **app-local Prisma datastore** (`apps/console/prisma/`, `apps/couriers/prisma/`) for operational data scoped to that app — they never store or duplicate identity/platform tables, and reference core 876 entities by opaque ID only. There is no shared `@876/db` package; identity and platform data live exclusively behind `apps/api`.

---

## Requirements

| Tool    | Version                                |
| ------- | -------------------------------------- |
| Node.js | 20+                                    |
| pnpm    | 11.3.0 (enforced via `packageManager`) |
| Python  | 3.12+ (for `apps/api`)                 |

---

## Quick Start

```bash
pnpm install
pnpm dev        # 876 app + Enterprise + Console + API in parallel (Turbopack)
```

| App            | URL                        |
| -------------- | -------------------------- |
| 876 app        | http://localhost:3000      |
| Enterprise     | http://localhost:3001      |
| Console        | http://localhost:3002      |
| Couriers       | http://localhost:3003      |
| Billing        | http://localhost:3004      |
| Widgets API    | http://localhost:3005      |
| Docs           | http://localhost:3003      |
| FastAPI (docs) | http://localhost:4000/docs |

---

## Common Commands

```bash
# Development
pnpm dev                             # Product apps + API + Widgets API
pnpm dev:api                         # FastAPI only (uvicorn --reload)
pnpm dev:876                         # 876 consumer app + API
pnpm dev:enterprise                  # Enterprise app + API
pnpm dev:console                     # Console + API + Widgets API
pnpm dev:couriers                    # Couriers app + API
pnpm dev:billing                     # Billing + API + Widgets API
pnpm dev:widgets                     # Widgets API only
pnpm dev:docs                        # Docs app only

# Quality
pnpm check                           # format:check + lint + typecheck + test
pnpm format                          # Prettier across all workspaces
pnpm lint                            # ESLint + Ruff
pnpm typecheck                       # tsc --noEmit across all TS workspaces

# Per-workspace
pnpm --filter @876/app typecheck
pnpm --filter @876/enterprise typecheck
pnpm --filter @876/console typecheck
pnpm --filter @876/couriers typecheck
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing typecheck
pnpm --filter @876/api typecheck
pnpm --filter @876/sdk typecheck
pnpm --filter @876/core typecheck
pnpm --filter @876/api test          # pytest
pnpm --filter @876/sdk test          # vitest

# Docs
pnpm sync:openapi                    # Fetch live OpenAPI JSON from API → apps/docs/openapi.json
pnpm --filter @876/docs generate:api-internals   # Regenerate route docs from API source

# App-local Prisma datastores (Console, Couriers)
pnpm --filter @876/console db:generate   # Regenerate Console's Prisma client
pnpm --filter @876/couriers db:generate  # Regenerate Couriers' Prisma client

# Cloudflare deploy (each Next.js app deploys independently)
pnpm --filter @876/app deploy
pnpm --filter @876/enterprise deploy
pnpm --filter @876/console deploy
pnpm --filter @876/couriers deploy
```

---

## Architecture

```
Browser / Next.js Apps (876, Enterprise, Console, Couriers)
       │
       │  @876/sdk (consumer/first-party, API-key + session tier)
       │  @876/admin (server-only, internal-key tier)
       │
       ▼
  apps/api  (FastAPI — identity/platform source of truth)
       │
       ▼
  PostgreSQL (identity/platform DB, SQLAlchemy)
  WorkOS     (auth provider)
  Stripe     (billing)
  PostHog    (analytics)

App-local operational data (Console, Couriers) lives in that
app's own Prisma datastore — never shared, never a cross-DB FK
to identity. Core entities are referenced by opaque ID only,
resolved through @876/admin.
```

**Core boundary:** All identity/platform database access, provider calls, and business logic live in `apps/api`. Next.js apps never make raw fetches to FastAPI — they call typed methods on `@876/sdk` or `@876/admin`. An app may still own a database for data local to itself (e.g. Console's and Couriers' in-app Prisma datastores) as long as it never duplicates identity tables and references core entities by opaque ID only.

### API Auth Tiers

| Tier                 | Header                                   | Who uses it                                        |
| -------------------- | ---------------------------------------- | -------------------------------------------------- |
| Public               | —                                        | Health, OAuth discovery, geo lookups               |
| App API key          | `Authorization: Bearer 876_app_secret_*` | First-party apps via `@876/sdk`                    |
| Session (JWT)        | `Authorization: Bearer <access_token>`   | Authenticated user requests                        |
| Admin (internal key) | `x-internal-key: <API_INTERNAL_KEY>`     | Server components via `@876/admin` — never browser |

### Client Surface

All calls follow `$876.<resource>.<verb>(params)` — see [Packages docs](apps/docs/content/docs/packages/) and `.claude/rules/sdk-conventions.md`.

| Client       | Use when                                                                                | Browser-safe?  |
| ------------ | --------------------------------------------------------------------------------------- | -------------- |
| `@876/sdk`   | Auth flows, user's own data, OAuth client apps, self-scoped resources                   | ✅ Yes         |
| `@876/admin` | Any `AdminDep` operation — users, orgs, memberships, roles, features, app subscriptions | ❌ Server-only |

---

## Documentation

Full identity model, API route reference, and package guides live in the `@876/docs` app (rendered at http://localhost:3003 when running `pnpm dev`).

| Resource         | Path                                            | Description                                                     |
| ---------------- | ----------------------------------------------- | --------------------------------------------------------------- |
| Docs source      | `apps/docs/content/docs/`                       | Identity model, API route reference, package guides             |
| OpenAPI snapshot | `apps/docs/openapi.json`                        | Committed; regenerate with `pnpm sync:openapi`                  |
| Agent rules      | `.claude/rules/` (mirrored in `.agents/rules/`) | Code style, data fetching, API backend, git, performance, types |

---

## Key Rules

1. **pnpm only** — never `npm` or `yarn`.
2. **All data/provider logic in `apps/api`** — Next.js apps must not contain raw `fetch` calls to FastAPI or direct DB access.
3. **`@876/admin` is server-only** — never import it in browser code. The secret service key (`API_876_SERVICE_KEY`, legacy alias `API_INTERNAL_KEY`) must never appear in a client bundle.
4. **`@876/sdk` is request-only** — it does not own cookies, session stores, or navigation.
5. **App-local datastores (Console, Couriers) are server-only and identity-free** — they must never store or duplicate identity/platform tables, and reference core 876 entities by opaque ID only, resolved through `$876`.
6. **Timestamps are Unix seconds** everywhere — DB, API, SDK, client contracts. Multiply by 1000 before `new Date()`.
7. **Cursor pagination** — never use offset. Use `starting_after` / `ending_before` (item ID-based).
8. **No real secrets in `.env*`** — never commit API keys, internal keys, or Stripe secrets.
9. **`@876/ui/auth` is presentation-only** — do not add session state to the embeddable auth UI.
10. **Routing logic belongs in RSC layouts**, not in `proxy.ts` — the proxy only has access to the sealed session snapshot (`userId`, `accountType`) for coarse routing.

---

## Codespace / Environment Notes

- `NEXT_PUBLIC_API_URL` in Codespaces must be the HTTPS-forwarded URL for port 4000 (e.g. `https://<codespace>-4000.app.github.dev`). Port 4000 must be set to **Public** in the Ports panel.
- Server-side `API_URL` stays `http://127.0.0.1:4000` even in Codespaces.
- `API_INTERNAL_KEY` is never exposed to the browser. Set it only in server-side `.env.local` files.

---

## Commit Attribution

Do **not** add Claude/AI co-author attribution to commits. Author and co-author metadata must reflect human contributors only. See `.claude/rules/git.md`.
