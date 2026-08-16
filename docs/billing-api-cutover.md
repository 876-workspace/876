# Billing API Express cutover

The Billing migration uses a single explicit writer lease and never dual
writes. The old FastAPI deployment and the Express candidate may serve shadow
reads during rollout, but only one runtime may mutate financial data.

## Controls

| Variable                      | Purpose                                                                                         |
| ----------------------------- | ----------------------------------------------------------------------------------------------- |
| `BILLING_WRITER`              | `fastapi`, `express`, or `none`; `legacy` remains accepted only for a pre-migration UI rollback |
| `BILLING_DATABASE_URL`        | Runtime Billing PostgreSQL connection                                                           |
| `BILLING_DIRECT_DATABASE_URL` | Direct PostgreSQL connection for Prisma migrations                                              |
| `BILLING_LEGACY_DATABASE_URL` | Optional read-only source for one-off reconciliation                                            |
| `BILLING_SWEEP_ENABLED`       | Cloudflare scheduler switch; keep `false` until Express owns writes                             |
| `BILLING_SCHEDULER_KEY`       | Dedicated credential for `/internal/billing-sweep`                                              |

All mutating `/api/v1` requests fail with `billing/writer-inactive` unless the
runtime owns the lease, and the rejection names the active value so the cause is
readable without inspecting response headers. `none` is the fail-closed handoff
state.

The cutover is complete: Express owns the lease and `BILLING_WRITER` now
**defaults to `express`**. The steps below describe the one-time handoff and are
kept for reference and for any future writer migration. `none` remains a
deliberate freeze switch, but it is no longer what an unset variable means — a
`none` default left every fresh dev environment, CI job, and sibling app unable
to write, failing with an error that named no cause.

## Preflight

1. Deploy Express with `BILLING_WRITER=none` and
   `BILLING_SWEEP_ENABLED=false`.
2. Apply the Prisma ledger to the existing database and verify no drift:

   ```bash
   pnpm --filter @876/billing-api db:validate
   pnpm --filter @876/billing-api db:baseline -- --dry-run
   pnpm --filter @876/billing-api db:baseline
   pnpm --filter @876/billing-api db:deploy
   pnpm --filter @876/billing-api db:migration:check
   pnpm --filter @876/billing-api db:drift
   ```

3. Run the service gates:

   ```bash
   pnpm --filter @876/billing-api api:contract:check
   pnpm --filter @876/billing-api env:check
   pnpm --filter @876/billing-api cutover:check -- --base-url https://876-billing-api.1876.workers.dev
   ```

4. Compare representative read responses from FastAPI and Express, including
   tenant, integration, document, payment, subscription, and billing-engine
   state. Existing idempotency keys must replay identically.

## Freeze and hand off

1. Disable the old scheduler.
2. Set the old deployment and Express deployment to `BILLING_WRITER=none`.
3. Confirm a mutation sent to each deployment returns
   `billing/writer-inactive` and includes its writer header.
4. If separate databases were used during validation, reconcile them while
   writes remain frozen:

   ```bash
   pnpm --filter @876/billing-api db:reconcile
   ```

   Do not continue unless every table count and canonical digest matches.

5. Set the Express Worker to `BILLING_WRITER=express`, deploy it, and route
   production Billing traffic to it. Keep `BILLING_SWEEP_ENABLED=false`.
6. Run smoke operations in order: customer creation, item creation, invoice
   creation/finalization, payment creation/application, subscription lifecycle,
   integration idempotency replay, and one explicitly targeted billing run.
7. Set `BILLING_SWEEP_ENABLED=true` only after the smoke operations and
   billing-run records are correct.

## Observe

Monitor `/metrics`, `/ready`, application logs, Sentry, database connection
usage, writer rejections, provider-event retries, billing-run failures, and
duplicate-invoice invariants. The Billing Next.js app is HTTP-only and no
longer runs Prisma migrations or reads the financial database directly.

## Rollback

1. Immediately set `BILLING_SWEEP_ENABLED=false` and
   `BILLING_WRITER=none` before changing traffic.
2. Because Prisma preserves the existing table/column layout, the previous
   FastAPI image may be redeployed read-only for diagnosis. Grant it
   `BILLING_WRITER=fastapi` only after verifying no incompatible migration was
   applied and reconciling all financial state.
3. Never grant both deployments a writer lease and never route writes to a
   stale database copy.
