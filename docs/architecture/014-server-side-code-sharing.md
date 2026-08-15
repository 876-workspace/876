# 014 — Server-side code sharing across the Express services

Status: **in progress** (Phase 1 landed: `@876/server/express` `validate`).
Owner: platform. Companion rules: `.claude/rules/express-api.md`,
`.claude/rules/api-backend.md`, `.claude/rules/sdk-conventions.md`,
`.claude/rules/platform-services.md`.

## Why

Most backend services are now Express/TypeScript in this monorepo: the core
identity API (`apps/api`), Billing (`apps/billing-api`), and Couriers
(`apps/couriers-api`), with Storage (`apps/storage-api`, still Python) and
Widgets (`apps/widgets-api`, Next/OpenNext) to follow. The three converted
services have independently grown near-identical HTTP infrastructure, and their
wire contracts are duplicated between each service and its client package —
where they have already **drifted**.

The goal is to take advantage of the shared language and monorepo **without**
building a server-side `$876` facade. We centralize **protocols and
infrastructure**; we keep **business services, databases, and providers**
isolated per bounded context.

> One rule for everything below: **Do not centralize business services.
> Centralize protocols and infrastructure.**

## Verified findings (2026-08-15, against the real tree)

- **`app.ts` is near-identical** across api / billing-api / couriers-api: same
  `disable('x-powered-by')` → `trust proxy` → `helmet` → `cors` →
  `requestContext` → `express.json` → `compression` → `envelope` → OpenAPI →
  `notFoundHandler` → `errorHandler` order. Billing legitimately adds a second
  internal OpenAPI document and service-specific middleware.
- **Middleware is duplicated verbatim**: `envelope.ts`, `error-handler.ts`,
  `request-context.ts`, `validate.ts` exist in all three. Billing additionally
  has `metrics.ts`, `raw-body.ts`, `writer.ts` — those are Billing semantics and
  **stay local**.
- **The duplication has already drifted** (this is the real cost, not just
  bytes):
  - `validate.ts`: api and couriers-api are identical; **billing diverged** to a
    `WeakMap` variant that dropped the typed `Validated<S>` helper.
  - `request-context.ts`: billing mints request ids with `generateId('req')`
    while api/couriers use `generateId('request')` — a behavioral divergence in
    the trace id prefix.
- **Contract duplication + drift in Couriers**: the wire schemas are defined
  twice — `apps/couriers-api/src/modules/customers/customers.schemas.ts` and
  `packages/couriers/src/admin/types/customer.schema.ts` — and the create-body
  validation differs (the API constrains fields the package leaves as bare
  `z.string()`). A layering smell compounds it: the **non-admin** resource
  `packages/couriers/src/resources/customers.ts` imports its schema from
  `../admin/types/`.
- **Package-export asymmetry**: `@876/billing` exposes
  `. ./admin ./integration ./proxy ./server`; `@876/widgets` exposes
  `. ./react ./server ./server/admin ./browser`; but **`@876/couriers` has no
  `./server`** and **`@876/storage` has only `.`** (no subpaths). Billing is the
  normalization template.
- **Enforcement is already wired**: all three Express apps run `dependency-cruiser`
  via a `boundaries` script, so new package boundaries can be made build errors.
- **Nuance the first draft missed**: `@876/core` already exports
  `./request-context`, `./client`, `./api`, `./platform`, `./auth/*`. Some
  server-leaning primitives already live in core; the "keep core pure" rule
  needs a reconciliation note (below), not a clean-slate split.

## Target layering

```
Layer 1  UNIVERSAL            @876/types, @876/core          (pure, runtime-neutral)
Layer 2  SERVER INFRA         @876/server                    (Express/Node primitives)
Layer 3  DOMAIN CONTRACTS     @876/billing, @876/couriers,   (wire schemas + typed
         + CLIENTS            @876/storage, @876/widgets       server/client)
Layer 4  SERVICES             apps/*-api                     (db, repos, providers, workers)
```

Dependencies only point downward:

```
apps/*-api ──► @876/<domain> ──► @876/server ──► @876/core ──► @876/types
```

Never `@876/server → apps/*`, never `@876/<domain> → apps/*`, never one API into
another API's Prisma client.

### `@876/server` is not a facade

It ships **primitives via subpath exports** (no root `.` export, to force
explicit intent):

```
@876/server/express        validate, envelope, error handlers, raw-body, health
@876/server/context        request id + AsyncLocalStorage request context
@876/server/http           server-to-server transport mechanics (ids, retry, zod decode)
@876/server/auth           credential/JWT/api-key/internal-key parsing, principal shape
@876/server/openapi        shared error/list/pagination/security schemas
@876/server/observability  pino logger creation, request-aware child logger, Sentry
@876/server/config         env→typed settings helpers
@876/server/testing        supertest harness helpers
```

Service-to-service calls stay **explicit**, never ambient:

```ts
const billing = create876BillingServerClient({ internalKey, requestId })
await billing.customers.create(params) // NOT $876.billing.customers.create
```

Explicit clients make the dependency graph legible and mockable.

## What is shared vs kept local

**Share:** Zod wire contracts + types, error codes/shapes, request context,
request validation, response envelope, service-to-service transport mechanics,
authentication _mechanics_, OpenAPI primitives, logging/observability, testing
helpers.

**Keep local:** Prisma schemas/clients, repositories, business orchestration,
service-specific **authorization policy**, provider integrations, migrations,
workers, service secrets, service-specific middleware (billing `writer`/`metrics`).

Contracts describe the **wire**, never the database: put `customerSchema`
(with its `object` discriminator) in the package; never put
`Prisma.CustomerGetPayload` or a repository there.

## `@876/core` reconciliation

`@876/core` keeps pure, runtime-neutral primitives (ids, timestamps, phone,
errors, pagination, transport, resource types). It already carries
`request-context`, `client`, `api`, `platform`, `auth/*`. Rule going forward:
Express/Node/Pino/Prisma-aware code belongs in `@876/server`, not `@876/core`.
The already-present core subpaths are **runtime-neutral shapes/transport** and
stay; anything Express-specific extracted in later phases lands in `@876/server`.
Do not migrate the existing core subpaths as part of this effort unless one is
found to pull in a Node/Express dependency.

## Phased plan (with the sequencing dependencies found in the tree)

- **Phase 1 — `@876/server` skeleton + safest primitive.** ✅ **DONE.**
  Package scaffolded (`packages/server`, subpath exports, no root export).
  `@876/server/express` ships `validate` — the pure express/zod primitive that
  had already drifted. All three services now consume it via a thin re-export
  shim at `src/http/middleware/validate.ts`; billing's `WeakMap` variant is
  gone. Verified: `@876/server` typecheck + 4 tests; api/billing/couriers
  typecheck + boundaries green; couriers 331, billing 77, api 1545 tests pass.
- **Phase 1a — flatten shims (mechanical, delegatable).** Rewrite the ~40 call
  sites across the three apps to import from `@876/server/express` directly and
  delete the shims. Non-overlapping file sets → parallel `opencode`/DeepSeek.
- **Phase 2 — canonical contracts, starting with Couriers customers.** Move the
  wire schemas into `packages/couriers/src/contracts/customers/` and have both
  `apps/couriers-api` and the package resources import them; delete the parallel
  admin-types copy; fix the non-admin→admin import smell. Then the rest of
  couriers (packages, mailboxes, branches, warehouses, tenants), then billing.
  **Highest-value change** — it eliminates API↔package drift at the source.
- **Phase 3 — envelope / error / request-context.** Extract to
  `@876/server/express` + `@876/server/context`. **Sequencing gate:**
  `request-context` depends on the per-app pino logger (`@/platform/logger`),
  which is security-sensitive (redaction list) and divergent across apps — so
  **Phase 7 (observability) must land first, or request-context takes the logger
  by injection** (`createRequestContext({ logger, idPrefix })`, which also fixes
  the `req`/`request` prefix drift). Do not extract request-context blind.
- **Phase 4 — server-to-server transport (`@876/server/http`).** Extract the
  mechanics from the billing/couriers/storage request layers; keep endpoint
  definitions and per-service auth semantics in each `@876/<domain>/server`.
  Pilot on `@876/billing/server` (cleanest prototype today).
- **Phase 5 — auth mechanics (`@876/server/auth`).** Share header/Bearer/JWT/
  api-key/internal-key parsing and the principal shape. **Keep domain
  authorization policy local** (`canManageInvoice`, etc.).
- **Phase 6 — OpenAPI primitives (`@876/server/openapi`).** Shared error/list/
  pagination/security schemas; domain schemas come from the packages. Pilot on
  billing (it already has contract check/generate scripts).
- **Phase 7 — observability (`@876/server/observability`).** Reconcile the
  per-app pino loggers into one, preserving the union of the redaction lists.
  Gates Phase 3's request-context.
- **Phase 8 — Express bootstrap reduction.** Only after the primitives are
  proven identical: a small `createExpressApp({ service, cors })` +
  `installErrorHandlers`/`installOpenApi`. Keep it thin — billing must still
  `app.use(metrics)` / `app.use(writerLease)` explicitly. No magic hook system.
- **Phase 9 — Storage contracts, then Express conversion.** Finalize
  `@876/storage/contracts` first and run them as parity fixtures against the
  current Python service; the Express rewrite then starts with all infra solved
  and focuses on R2/metadata/signed-URLs/quotas.
- **Phase 10 — Widgets.** Split wire contracts from React/UI, then move the
  Next API onto the same Express skeleton. `@876/server` must never depend on
  React or Widgets.
- **Phase 11 — tooling consolidation** under `tooling/` (dep-cruiser presets,
  tsconfig, tsup, vitest) — not inside `@876/server`.

## Boundary rules to enforce (dependency-cruiser)

- `packages/*` must not import `apps/*`.
- `@876/server` must not import any `@876/<domain>` or any `apps/*`.
- `@876/<domain>/contracts` must not import Express or Prisma.
- No API imports another API's generated Prisma client; no cross-API source
  imports.
- Contracts → no server implementation; resources → contracts + transport;
  server clients → contracts + `@876/server/http`; API impl → contracts +
  `@876/server`.

## Do-not list

- Do not build a server-side `$876` facade or a `create876Service()` mega-object.
- Do not create a shared `packages/database` / cross-service Prisma client.
- Do not centralize a provider just because two services have a `providers/`
  folder — extract only when multiple services integrate the same vendor under
  identical platform semantics.
- Do not put business orchestration in `@876/server`.
- Do not extract `request-context` before the logger question (Phase 7 / inject).
- Do not force every endpoint through the envelope — enveloped by default,
  explicit plain-response contract where the protocol needs it (e.g. `/ready`).
