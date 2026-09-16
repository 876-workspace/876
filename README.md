# 876 Monorepo

876 is a pnpm/Turborepo workspace for the 876 identity platform — one account that unlocks the consumer app, Enterprise org workspace, internal Console, Couriers, Billing, Invoice, CRM, Projects, and Commerce, all backed by shared data services and typed packages.

---

## Apps

| Workspace           | Path                | Port | Description                                                                                              |
| ------------------- | ------------------- | ---- | -------------------------------------------------------------------------------------------------------- |
| `@876/app`          | `apps/876`          | 3000 | Consumer app — embedded auth, account/org management, OAuth provider UI, PWA.                            |
| `@876/enterprise`   | `apps/enterprise`   | 3001 | Enterprise org workspace — embedded auth (sign-in + business onboarding), org dashboards, billing.       |
| `@876/console`      | `apps/console`      | 3002 | Internal Console — platform admin console (users, orgs, roles/permissions, app subscriptions, settings). |
| `@876/couriers-app` | `apps/couriers`     | 3003 | Couriers SaaS app — multitenant courier management platform.                                             |
| `@876/couriers-api` | `apps/couriers-api` | 4001 | Couriers API service — Express + Prisma Accelerate; owns the couriers datastore and its migrations.      |
| `@876/billing-app`  | `apps/billing`      | 3004 | Standalone multitenant Billing SaaS — catalogue, customers, invoices, quotes, and subscriptions.         |
| `@876/widgets-api`  | `apps/widgets-api`  | 3005 | Widgets service — Next.js + Prisma datastore backing embeddable widgets.                                 |
| `@876/invoice-app`  | `apps/invoice`      | 3006 | 876 Invoice SaaS app — a thin product surface over the shared Billing data plane; owns no datastore.     |
| `@876/crm-app`      | `apps/crm`          | 3007 | 876 CRM SaaS app — customer profiles linked to shared Billing customers.                                 |
| `@876/projects-app` | `apps/projects`     | 3008 | 876 Projects app — a Linear-style tracker for projects, issues, and labels.                              |
| `@876/commerce-app` | `apps/commerce`     | 3009 | 876 Commerce app — a merchant's own online store; base setup (auth, onboarding, shell) only so far.      |
| `@876/api`          | `apps/api`          | 4000 | Express backend; owns all database access, provider calls, business logic, auth, and API-key validation. |
| `@876/billing-api`  | `apps/billing-api`  | 4004 | Express Billing financial data plane; owns its PostgreSQL schema and Prisma migrations.                  |
| `@876/storage-api`  | `apps/storage-api`  | 4005 | FastAPI 876 Storage service — file metadata, upload sessions, and Cloudflare R2 objects.                 |
| `@876/crm-api`      | `apps/crm-api`      | 4010 | Express CRM data service; owns CRM tenant/profile data and links it to Billing customer records.         |
| `@876/projects-api` | `apps/projects-api` | 4030 | Express 876 Projects data service; owns the projects/issues datastore and its migrations.                |
| `@876/commerce-api` | `apps/commerce-api` | 4040 | Express 876 Commerce service; health and readiness only, with no datastore until its first model.        |
| `@876/work-api`     | `apps/work-api`     | 4020 | Express 876 Work service — the shared productivity plane; owns tasks, reminders, and its own datastore.  |

## Packages

| Package          | Path                 | Description                                                                                                                                                        |
| ---------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@876/platform`  | `packages/platform`  | Privileged platform/identity client (`$876`); internal-key tier, server-only. Core users, orgs, memberships, features, apps.                                       |
| `@876/account`   | `packages/account`   | Consumer/first-party typed client; session + app-key tier. Auth flows, profile, sessions, OAuth grants.                                                            |
| `@876/billing`   | `packages/billing`   | Versioned client for 876 Billing; tenant-scoped root export plus server-only `/admin` projection tier and `/integration` partner tier.                             |
| `@876/couriers`  | `packages/couriers`  | Typed client for Couriers API; tenant-scoped client plus server-only `/admin` tier.                                                                                |
| `@876/crm`       | `packages/crm`       | Bounded CRM client and canonical wire contracts (`@876/crm/contracts`).                                                                                            |
| `@876/commerce`  | `packages/commerce`  | Bounded 876 Commerce client with `session`, `service`, and `operator` entrypoints; no resources until the Commerce service has its first model.                    |
| `@876/projects`  | `packages/projects`  | Bounded 876 Projects client with `session`, `service`, and `operator` entrypoints and its wire contracts (`@876/projects/contracts`).                              |
| `@876/work`      | `packages/work`      | Typed client for the 876 Work service. Root export is contracts + integration scopes; `/integration` is the app-key tier and `/operator` is the internal-key tier. |
| `@876/storage`   | `packages/storage`   | Typed client (`$storage`) for the 876 Storage service; service-key tier, server-only. Upload sessions and file metadata.                                           |
| `@876/workspace` | `packages/workspace` | Server-only workspace control plane client for cross-service provisioning and app materialization.                                                                 |
| `@876/admin`     | `packages/admin`     | Platform-admin facade client (`$876`); internal-key tier, **server-only**.                                                                                         |
| `@876/sdk`       | `packages/sdk`       | Consumer/first-party facade client (`$876`); API-key + session tier.                                                                                               |
| `@876/core`      | `packages/core`      | Shared errors, ID generation, timestamps, contracts, and the shared client runtime (`@876/core/client`).                                                           |
| `@876/ui`        | `packages/ui`        | shadcn/ui primitives (Base UI + Tailwind v4), chart components, embeddable auth UI (`@876/ui/auth`), and shared design tokens.                                     |
| `@876/analytics` | `packages/analytics` | PostHog analytics provider and shared tracking utilities.                                                                                                          |

Console, the Couriers API, the CRM API, the Work API, and the Projects API each own an **app-local Prisma datastore** (`apps/console/prisma/`, `apps/couriers-api/prisma/`, `apps/crm-api/prisma/`, `apps/work-api/prisma/`, `apps/projects-api/prisma/`) for operational data scoped to that app or service — they never store or duplicate identity/platform tables, and reference core 876 entities by opaque ID only. There is no shared `@876/db` package; identity and platform data live exclusively behind `apps/api`.

CRM stores only CRM-owned tenant and profile fields. Financial customer records remain in Billing and are reached server-to-server through `@876/billing/integration`; the CRM Next.js app never accesses either database directly. See `docs/architecture/023-876-crm.md` and `docs/876-crm.md`.

876 Invoice is the opposite case: it deliberately owns **no** datastore and no API of its own. It is a product surface gated on the `876-invoice` app subscription whose records live in the shared Billing data plane, reached through `$876.invoices.*`. A Billing workspace existing does not grant access to Invoice, and a `876-billing` subscription is unrelated to it. See `docs/876-invoice.md`.

876 Projects is a bounded context of the same shape: `apps/projects-api` owns projects, issues, labels and comments in its own datastore and references the 876 organization by opaque ID. Console administers it at the **operator** tier and the standalone app calls it at the **service** tier, resolving the organization from the signed-in session. See `docs/architecture/022-876-projects.md` and `docs/876-projects.md`.

The finance and commerce products follow ADR 025 (`docs/architecture/025-finance-and-commerce-product-lineup.md`): Invoice, Books, Billing, Inventory, Commerce and Marketplace are focused products over **one** financial data plane (`apps/billing-api`), with a single subscription engine. 876 Commerce is the merchant's own online store. `apps/commerce-api` will own only storefront, theme, domain, cart and checkout-session state, and creates customers, sales orders and payments through the financial plane. It has no datastore yet.

876 Work is a **shared platform service**, the same shape as Billing's financial data plane but for productivity records: CRM's Tasks and Reminders modules are stored in Work, not in CRM. An organization's Work workspace is prepared at the **operator** tier by `apps/api` (`workspace.work.ensure`), which also mints that app's scoped connection; the product app then reaches Work at the **integration** tier with its own app API key and the four `work.{tasks,reminders}.{read,write}` scopes. No product app holds `WORK_INTERNAL_KEY`. See `docs/architecture/019-work-service-and-productivity-plane.md`.

---

## Requirements

| Tool    | Version                                |
| ------- | -------------------------------------- |
| Node.js | 20+                                    |
| pnpm    | 11.3.0 (enforced via `packageManager`) |
| Python  | 3.12+ (for `apps/storage-api`)         |

---

## Quick Start

```bash
pnpm install
pnpm dev        # 876 app + Enterprise + Console + API in parallel (Turbopack)
```

| App                   | URL                                |
| --------------------- | ---------------------------------- |
| 876 app               | http://localhost:3000              |
| Enterprise            | http://localhost:3001              |
| Console               | http://localhost:3002              |
| Couriers              | http://localhost:3003              |
| Billing               | http://localhost:3004              |
| Widgets API           | http://localhost:3005              |
| Invoice               | http://localhost:3006              |
| CRM                   | http://localhost:3007              |
| Projects              | http://localhost:3008              |
| Commerce              | http://localhost:3009              |
| API core (spec)       | http://localhost:4000/openapi.json |
| Billing API (docs)    | http://localhost:4004/docs         |
| Storage API (docs)    | http://localhost:4005/docs         |
| CRM API (health)      | http://localhost:4010/health       |
| Work API (health)     | http://localhost:4020/health       |
| Projects API (health) | http://localhost:4030/health       |
| Commerce API (health) | http://localhost:4040/health       |

---

## Common Commands

```bash
# Development
pnpm dev                             # Product apps + API + Widgets API
pnpm dev:api                         # API core only (tsx watch)
pnpm dev:876                         # 876 consumer app + API
pnpm dev:enterprise                  # Enterprise app + API
pnpm dev:console                     # Console + API + Widgets API + Billing API + CRM API
pnpm dev:console:min                 # Console + API + Billing API (no Widgets/Billing app)
pnpm dev:console:core                # Console + API only (no Billing backend)
pnpm dev:couriers                    # Couriers app + couriers API + core API + Storage API + Billing + Widgets
pnpm dev:couriers:min                # Couriers app + couriers API + core API + Billing API (no Widgets/Storage/Billing app)
pnpm dev:couriers:core               # Couriers app + couriers API + core API only (no Billing backend)
pnpm dev:billing                     # Billing + API + Widgets API
pnpm dev:billing:min                 # Billing app + API + Billing API (no Widgets API)
pnpm dev:billing:core                # Billing app + Billing API only (no core API/Widgets)
pnpm dev:invoice                     # Invoice app + Billing app + Billing API + core API
pnpm dev:invoice:min                 # Invoice app + Billing API + core API (no Billing app)
pnpm dev:crm                         # CRM app + CRM API + Work API + Billing API + core API
pnpm dev:crm:api                     # CRM API + Billing API + Work API only
pnpm dev:projects                    # Projects app + Projects API + core API
pnpm dev:projects:api                # Projects API only
pnpm dev:commerce                    # Commerce app + Commerce API + core API
pnpm dev:commerce:api                # Commerce API only
pnpm dev:work                        # Work API only
pnpm dev:widgets                     # Widgets API only

# Quality
pnpm check                           # format:check + lint + typecheck + test
pnpm format                          # Prettier across all workspaces
pnpm lint                            # ESLint (+ Ruff in the remaining Python services)
pnpm typecheck                       # tsc --noEmit across all TS workspaces

# Per-workspace
pnpm --filter @876/app typecheck
pnpm --filter @876/enterprise typecheck
pnpm --filter @876/console typecheck
pnpm --filter @876/couriers-app typecheck
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/crm-app typecheck
pnpm --filter @876/crm-api typecheck
pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-api typecheck
pnpm --filter @876/commerce-app typecheck
pnpm --filter @876/commerce-api typecheck
pnpm --filter @876/work-api typecheck
pnpm --filter @876/billing typecheck
pnpm --filter @876/api typecheck
pnpm --filter @876/sdk typecheck
pnpm --filter @876/core typecheck
pnpm --filter @876/storage typecheck
pnpm --filter @876/api test          # vitest
pnpm --filter @876/sdk test          # vitest
pnpm --filter @876/storage test      # vitest
pnpm --filter @876/billing-api test  # vitest
pnpm --filter @876/storage-api test  # pytest

# Core API schema (Prisma). The service applies no DDL at startup — migrations
# run in CI, and the seeds are an explicit CLI.
pnpm --filter @876/api db:deploy     # prisma migrate deploy
pnpm --filter @876/api seed          # feature/geo/plan/provisioning/bootstrap seeds

# Storage service (Alembic)
pnpm --filter @876/storage-api db:migrate
pnpm dev:storage                     # 876 Storage service alone on :4005

# App-local Prisma datastores (Console, Couriers API, CRM API, Work API)
pnpm --filter @876/console db:generate   # Regenerate Console's Prisma client
pnpm --filter @876/couriers-api db:generate  # Regenerate the Couriers API's Prisma client
pnpm --filter @876/crm-api db:generate  # Regenerate the CRM API's Prisma client
pnpm --filter @876/crm-api db:deploy    # Apply committed CRM migrations
pnpm --filter @876/projects-api db:deploy  # Apply committed Projects migrations
pnpm --filter @876/work-api db:generate # Regenerate the Work API's Prisma client
pnpm --filter @876/work-api db:deploy   # Apply committed Work migrations

# Cloudflare deploy (each app deploys independently)
pnpm --filter @876/app deploy
pnpm --filter @876/enterprise deploy
pnpm --filter @876/console deploy
pnpm --filter @876/couriers-app deploy
pnpm --filter @876/couriers-api deploy
```

---

## Architecture

```
Browser / Next.js Apps (876, Enterprise, Console, Couriers, Billing, Invoice, CRM, Projects)
       │
       │  @876/platform, @876/account, @876/billing, @876/couriers, @876/crm, @876/work, @876/projects
       │  @876/sdk (consumer/first-party), @876/admin (internal-key platform admin)
       │
       ▼
  apps/api  (Express — identity/platform source of truth)
       │
       ▼
  PostgreSQL (identity/platform DB, Prisma 7)
  WorkOS     (auth provider)
  Stripe     (billing)
  PostHog    (analytics)

App-local operational data (Console, Couriers API, CRM API) lives in that
app's own Prisma datastore — never shared, never a cross-DB FK
to identity. Core entities are referenced by opaque ID only,
resolved through @876/admin.
```

**Core boundary:** All identity/platform database access, provider calls, and business logic live in `apps/api`. Next.js apps never make raw fetches to the API — they call typed methods on `@876/sdk` or `@876/admin`. An app may still own a database for data local to itself (e.g. Console's, Couriers', and CRM's Prisma datastores) as long as it never duplicates identity tables and references core entities by opaque ID only.

### API Auth Tiers

| Tier                 | Header                                   | Who uses it                                        |
| -------------------- | ---------------------------------------- | -------------------------------------------------- |
| Public               | —                                        | Health, OAuth discovery, geo lookups               |
| App API key          | `Authorization: Bearer 876_app_secret_*` | First-party apps via `@876/sdk`                    |
| Session (JWT)        | `Authorization: Bearer <access_token>`   | Authenticated user requests                        |
| Admin (internal key) | `x-internal-key: <API_INTERNAL_KEY>`     | Server components via `@876/admin` — never browser |

### Client Surface

All calls follow `$876.<resource>.<verb>(params)` — see the package READMEs and `.claude/rules/sdk-conventions.md`.

| Client       | Use when                                                                                | Browser-safe?  |
| ------------ | --------------------------------------------------------------------------------------- | -------------- |
| `@876/sdk`   | Auth flows, user's own data, OAuth client apps, self-scoped resources                   | ✅ Yes         |
| `@876/admin` | Any `AdminDep` operation — users, orgs, memberships, roles, features, app subscriptions | ❌ Server-only |

---

## Documentation & Planning

Package-specific guidance lives in each package's `README.md`. Repository-wide
agent rules live in `.claude/rules/` and are mirrored in `.agents/rules/` and
`.grok/rules/` (Grok omits `cli.md`).

All feature implementation plans, delegation briefs, execution reports, and multi-session
trackers live in dedicated implementation directories under `plans/<date>-<feature-slug>/`
(e.g. `plans/sep/02-billing-and-invoice-list-detail-split/`). See `.claude/rules/implementation-tracker.md`.

---

## Key Rules

1. **pnpm only** — never `npm` or `yarn`.
2. **All data/provider logic in `apps/api`** — Next.js apps must not contain raw `fetch` calls to the API or direct DB access.
3. **`@876/admin` is server-only** — never import it in browser code. The secret service key (`API_876_SERVICE_KEY`, legacy alias `API_INTERNAL_KEY`) must never appear in a client bundle.
4. **`@876/sdk` is request-only** — it does not own cookies, session stores, or navigation.
5. **App-local datastores (Console, Couriers) are server-only and identity-free** — they must never store or duplicate identity/platform tables, and reference core 876 entities by opaque ID only, resolved through `$876`.
6. **Timestamps are Unix seconds** everywhere — DB, API, SDK, client contracts. Multiply by 1000 before `new Date()`.
7. **Cursor pagination** — never use offset. Use `starting_after` / `ending_before` (item ID-based).
8. **No real secrets in `.env*`** — never commit API keys, internal keys, or Stripe secrets.
9. **`@876/ui/auth` is presentation-only** — do not add session state to the embeddable auth UI.
10. **Routing logic belongs in RSC layouts**, not in `proxy.ts` — the proxy only has access to the sealed session snapshot (`userId`, `accountType`) for coarse routing.

---

## Environment Notes

- `API_INTERNAL_KEY` is never exposed to the browser. Set it only in server-side `.env.local` files.

---

## Commit Attribution

Do **not** add Claude/AI co-author attribution to commits. Author and co-author metadata must reflect human contributors only. See `.claude/rules/git.md`.
