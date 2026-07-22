# 876 Billing API

Python FastAPI data plane for 876 Billing. This service will own Billing's
database access, financial business logic, integrations, and scheduled work.
The Next.js Billing application remains the presentation layer.

## Development

```bash
pnpm --filter @876/billing-api dev
pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api typecheck
pnpm --filter @876/billing-api test
```

The canonical versioned API prefix is `/api/v1`. Liveness, readiness, and
Prometheus telemetry are available at `/health`, `/ready`, and `/metrics`.

## Database ownership

Alembic owns schema changes after revision `202607220001`. The adoption
revision adopts the exact legacy Prisma schema without replaying DDL and
refuses empty, partial, or drifted schemas. New environments restore the
Billing database before Alembic adopts it. Revision `202607220002` creates the
vendor table that existed in the Prisma schema but was absent from its migration
history.

```bash
pnpm --filter @876/billing-api db:migrate
pnpm --filter @876/billing-api db:migration:check
pnpm --filter @876/billing-api db:reconcile
pnpm --filter @876/billing-api cutover:check -- --base-url http://localhost:4004
```

## Billing engine

The internal `POST /api/v1/admin/billing/run` operation and the scheduler CLI
run the same bounded, provider-neutral engine. Both require the FastAPI service
to own writes. Subscription-period runs and provider events are idempotent, and
workers claim due rows with PostgreSQL `SKIP LOCKED` so overlapping scheduler
deliveries do not produce duplicate invoices.

```bash
BILLING_WRITER=fastapi pnpm --filter @876/billing-api billing:run -- --limit 100
```

The command exits non-zero when any subscription fails, while preserving the
successful per-subscription transactions and durable failure records for retry.

`BILLING_WRITER` is the shared single-writer lease. Its valid values are
`legacy`, `fastapi`, and `none`; missing or invalid configuration fails closed.
The reconciliation command requires `BILLING_WRITER=none` operationally and
reads its source from `BILLING_LEGACY_DATABASE_URL` and target from
`BILLING_DATABASE_URL`.

See [the cutover runbook](../../docs/billing-api-cutover.md) for the ordered
handoff and rollback procedure.
