# 876 Billing API

Express 5 financial data plane for 876 Billing. The service owns the Billing
PostgreSQL schema, all financial business rules, provider integration state,
the frozen v1 HTTP contract, and scheduled recurring billing. The Next.js
Billing application is a presentation layer and has no database client.

## Development

```bash
pnpm --filter @876/billing-api db:generate
pnpm --filter @876/billing-api dev
pnpm --filter @876/billing-api typecheck
pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api build
```

The public v1 prefix is `/api/v1`. Liveness, readiness, generated OpenAPI, and
Prometheus telemetry are exposed at `/health`, `/ready`, `/openapi.json`, and
`/metrics`. Internal projections and the scheduler endpoint live under
`/internal` and require service credentials.

## Architecture

Each bounded context under `src/modules` owns its routes, controllers,
services, repositories, schemas, serializers, documentation, and tests.
Controllers handle HTTP only, services own orchestration and business rules,
and repositories are the only application layer allowed to import Prisma.
Cross-module calls use the owning module's public `index.ts`.

Billing preserves the frozen contract at
`apps/billing/contracts/v1/openapi.json`. Runtime validation remains Zod-based;
the generated v1 compatibility manifest preserves the legacy OpenAPI rendering
without replacing route declarations or runtime validation.

```bash
pnpm --filter @876/billing-api api:contract:check
```

## Database ownership

Prisma 7 owns the exact existing Billing schema and migration ledger under
`prisma/`. The migration baseline adopts the existing production schema; it
does not recreate or rename financial tables.

```bash
pnpm --filter @876/billing-api db:validate
pnpm --filter @876/billing-api db:baseline -- --dry-run
pnpm --filter @876/billing-api db:migration:check
pnpm --filter @876/billing-api db:drift
pnpm --filter @876/billing-api db:deploy
```

`db:baseline` is an idempotent adoption guard for existing environments. It
requires zero structural drift and a complete Billing-only table sample before
removing a fixed list of historical identity-service ledger rows and marking
the already-existing vendor table migration applied. It refuses unknown rows,
partial schemas, or migrations that still require DDL.

## Billing engine

The admin action, Cloudflare scheduled request, and CLI call the same billing
engine service. Due subscriptions are claimed with PostgreSQL
`FOR UPDATE ... SKIP LOCKED`; billing-run records and provider events preserve
retry idempotency.

```bash
BILLING_WRITER=express pnpm --filter @876/billing-api billing:run -- --limit 100
```

`BILLING_WRITER` is the single-writer lease and defaults to `express`, which
owns writes now that the FastAPI cutover is complete. Set it to `none` to
deliberately freeze mutations (a validation window or an incident); the API then
rejects mutating `/api/v1` traffic with `billing/writer-inactive` and reports the
active value in the `x-billing-writer` response header.

See [the cutover runbook](../../docs/billing-api-cutover.md) and
[Cloudflare operations](../../docs/cloudflare.md).
