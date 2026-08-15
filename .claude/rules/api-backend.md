# Express API Backend Rules

Read this before editing `apps/api`, `apps/couriers-api`, `apps/billing-api`,
API contracts, OpenAPI docs, provider integrations, repositories, or typed
client methods.

## Fixed stack and assembly

The canonical data-service stack is Express 5, strict TypeScript/ESM, Node
22+, Prisma 7, Zod 4, OpenAPI generated from Zod, Vitest/Supertest, Pino, and
Cloudflare Containers.

`src/app.ts` builds the application in this order: Helmet, explicit CORS,
`trust proxy`, request context, bounded JSON/form parsing, compression,
response envelope, generated OpenAPI, central route composition, final 404,
and final error handling. `src/server.ts` owns process startup and shutdown.

## Bounded modules

Normal domains live at `src/modules/<domain>/` and contain only the layers the
domain needs:

- `*.routes.ts`: path, security declaration, validation, response contracts,
  OpenAPI registration, and controller selection.
- `*.controller.ts`: read already-validated values, call one service operation,
  select the HTTP status, and return the response.
- `*.service.ts`: orchestration, business rules, transactions exposed by the
  repository, and calls to public module/provider interfaces.
- `*.repository.ts` or `repositories/`: all Prisma/database access.
- `*.schemas.ts`, `*.serializers.ts`, and `*.docs.ts`: runtime contracts, wire
  representation, and operation documentation.
- `index.ts`: the module's public interface. Never import another module's
  internal files.

Do not create top-level `routes/`, `controllers/`, `services/`, or
`repositories/` collections. Do not recreate dynamic dispatchers or generic
ORM resource services. Related resource families may share one bounded module
with explicit sub-repositories.

## Layer boundaries

- Controllers must not import Prisma or contain business rules.
- Services must not import Express request/response types.
- Only repositories may import the generated Prisma client.
- Providers own outbound service/vendor transport; provider SDK calls do not
  belong in repositories or controllers.
- Cross-module calls use public `index.ts` exports. New cross-module database
  joins are prohibited.
- Next.js applications never import a data service's Prisma client and never
  duplicate financial/provider business logic.

Dependency-cruiser enforces these rules; every data-service change must run its
`boundaries` script.

## Routes, auth, and contracts

- Declare route security once in the typed route specification. The same
  declaration drives guards, principal requirements, OpenAPI, and tests.
- Attach guards per route, never with a broad `router.use()`, so nonexistent
  paths return 404 rather than credential errors.
- Store verified principals outside writable request state.
- Use Zod for params/query/body validation and generate OpenAPI from the same
  declarations.
- Use the central error and envelope middleware. Expected client-safe errors
  must not expose HTTP status fields, raw database/provider errors, secrets, or
  tokens.
- Every app-owned resource has a literal `object` discriminator. Lists use
  `{ object: "list", data, hasMore, url, totalCount }`; timestamps are Unix
  seconds and pagination uses item-ID cursors (`startingAfter` / `endingBefore`).
- Existing released contracts must not change accidentally. Intentional contract
  migrations — including casing migrations — must update the API schemas,
  serializers, SDK packages, OpenAPI output, contract manifests, tests, and all
  first-party call sites in the same coordinated change. Do not maintain dual
  casing unless an explicitly versioned external compatibility requirement demands it.

Billing has four credential kinds (`internal`, `scheduler`, `app_api_key`, and
`oauth`) and requires exactly one supplied credential. Its integration guard
must enforce token/app identity, membership, tenant state, OAuth scope, and
finance-connection scope. Integration creates preserve byte-compatible
idempotency canonicalization and hash behavior.

## Database and financial safety

- Prisma schema and migrations belong to the service that owns the data.
- Preserve existing mapped table/column names and Decimal/BigInt semantics.
- Do not combine an ORM/framework migration with a table redesign.
- Billing uses one writer lease and never dual-writes. Recurring workers must
  preserve row locking, `SKIP LOCKED`, billing-run idempotency, rollback, and
  retry behavior.
- Financial calculations and idempotency canonicalization require frozen
  cross-implementation fixtures, not Node-only self-consistency tests.

## Required checks

For each affected Express service run:

```bash
pnpm --filter <workspace> typecheck
pnpm --filter <workspace> lint
pnpm --filter <workspace> boundaries
pnpm --filter <workspace> test
pnpm --filter <workspace> build
```

Billing changes also run:

```bash
pnpm --filter @876/billing-api db:validate
pnpm --filter @876/billing-api db:drift
pnpm --filter @876/billing-api api:contract:check
```

Tests that cover HTTP behavior must exercise the assembled Express middleware
with Supertest. Repository tests may use narrow fakes, but route/auth/envelope
tests must not call controllers directly.
