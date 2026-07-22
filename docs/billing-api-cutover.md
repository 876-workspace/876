# Billing API database cutover

The Billing backend migration uses one explicit writer lease and never dual
writes. The Next.js backend and FastAPI service may run together for shadow
reads, but only the runtime named by `BILLING_WRITER` may mutate financial
data.

## Controls

| Variable                      | Runtime             | Purpose                                           |
| ----------------------------- | ------------------- | ------------------------------------------------- |
| `BILLING_WRITER`              | Billing UI + API    | `legacy`, `fastapi`, or `none`                    |
| `BILLING_DATABASE_URL`        | Billing API         | Database owned by FastAPI after cutover           |
| `BILLING_LEGACY_DATABASE_URL` | Reconciliation only | Frozen source database used for digest comparison |

FastAPI rejects `POST`, `PUT`, `PATCH`, and `DELETE` below `/api/v1` unless
the writer is `fastapi`. The legacy Prisma client rejects every model mutation
unless the writer is `legacy`. `none` therefore creates a fail-closed freeze
window.

## Prepare

1. Deploy both runtimes with `BILLING_WRITER=legacy`. FastAPI serves shadow
   reads but rejects mutations.
2. Set the FastAPI `BILLING_DATABASE_URL`.
   - For the existing Billing database, run the adoption migration in place.
   - For a new database, restore the source with PostgreSQL backup/restore so
     enum types, constraints, and transaction boundaries are retained. Do not
     copy financial rows through application APIs.
3. Run the schema adoption and confirm the expected revision:

   ```bash
   pnpm --filter @876/billing-api db:migrate
   pnpm --filter @876/billing-api db:migration:check
   ```

4. Confirm `/ready` reports `migration: "current"`. The endpoint remains
   `not_ready` while the Alembic revision is missing or stale.

## Freeze and reconcile

1. Set `BILLING_WRITER=none` on both runtimes and stop legacy and FastAPI
   schedulers. Verify mutation requests return `billing/writer-inactive`.
2. Set `BILLING_LEGACY_DATABASE_URL` for the one-off reconciliation process.
3. Compare every mapped table:

   ```bash
   pnpm --filter @876/billing-api db:reconcile
   ```

The command reads both databases in repeatable-read transactions, orders each
table by its primary key, and hashes every column value. It emits JSON without
database URLs. Exit code `0` means every row count and digest matches, `1`
means at least one table differs, and `2` means the check could not complete.
Use repeatable `--table <name>` arguments to investigate named mismatches.

Do not continue while the report has `matches: false`.

## Activate FastAPI

1. Keep legacy writes frozen.
2. Set `BILLING_WRITER=fastapi` on both runtimes. This enables FastAPI writes
   and keeps Prisma mutations blocked.
3. Route service clients to `BILLING_API_URL`, then run the deployment gate:

   ```bash
   BILLING_API_URL=https://billing-api.example.com \
     pnpm --filter @876/billing-api cutover:check
   ```

   The command emits a secret-free JSON report and fails unless health,
   readiness, the `fastapi` writer lease, and all 187 frozen v1 operations
   match the deployment.
4. Verify a read, an idempotent mutation, and the matching financial record.
5. Re-enable only the FastAPI scheduler after the billing-engine phase is
   deployed.

## Observe

Scrape `/metrics` for request volume, latency, status, active writer metadata,
and rejected mutation counts. Route labels use FastAPI templates rather than
raw resource IDs. Alert on readiness failures, any unexpected writer rejection
after cutover, elevated 5xx responses, and scheduler failures.

The Billing UI no longer publishes its old `/api/billing/*` or `/api/admin/*`
handlers and no longer runs Prisma migrations. Its `/api/v1/*` browser surface
is an authenticated BFF for the standalone service. A temporary Prisma read
projection remains for server-rendered pages; `BILLING_WRITER=fastapi` keeps it
read-only until those page queries are moved to `@876/billing`.

## Rollback

1. Set `BILLING_WRITER=none` on both runtimes before changing traffic.
2. If both runtimes share the same database, set the lease to `legacy` and
   restore legacy routing after confirming no migration newer than the legacy
   schema has been applied.
3. If databases are separate, keep writes frozen. Reconcile the databases and
   restore the authoritative target into the rollback database before granting
   the legacy writer lease. Never reverse traffic onto a stale financial copy.
