# Phase 1 — engine correctness and scheduling report

## Changed files

- `apps/billing-api/src/modules/documents/workflows/finalize-invoice.ts` and
  `modules/documents/index.ts`: extracted the transaction-scoped finalize
  effects and used it from the manual workflow. The core owns inventory,
  finalization, ledger posting, optional credit settlement, AR recompute, and
  the durable `invoice.finalized` event.
- `apps/billing-api/src/modules/subscriptions/repositories/bill.ts`: new
  auto-finalized invoices use that core; finalized consolidations now add a
  run-specific ledger debit and use the canonical invoice-status projection.
  Due lifecycle schedules are applied before billing when required, and an
  arrears period-end cancellation bills its final served period before cancel.
- `apps/billing-api/src/modules/subscriptions/repositories/lifecycle.ts` and
  `modules/subscriptions/index.ts`: lifecycle work has an individually
  claimable apply operation plus an active-tenant, `SKIP LOCKED` drain.
- `apps/billing-api/src/modules/billing-engine/*`: sweep draining/time budget,
  `hasMore`, lifecycle processing, shared overdue processing, and the cron
  endpoint.
- `apps/billing-api/src/modules/documents/repositories/invoices/mark-overdue.ts`:
  one active-tenant-aware overdue implementation.
- `apps/billing-api/src/config`, auth/OpenAPI routing, `.env.example`, and
  `vercel.json`: fail-closed `CRON_SECRET` bearer authentication and the daily
  06:00 UTC Vercel cron.
- Billing OpenAPI artifacts were regenerated.
- Added/updated tests for the finalize core, sweep drain summary, cron guard,
  and overdue tenant/status constraints.

## Decisions

- The cron uses `GET /internal/billing-sweep/cron`, the same `/internal`
  namespace as the existing scheduler POST. It remains the `scheduler`
  security kind, with its bearer variant explicitly documented as `cronSecret`.
- The public sweep schema retains its existing body shape. The 240-second
  budget is an internal run option; only the cron supplies its high limit and
  budget.
- Lifecycle schedules are drained after subscription claims, so an arrears
  cancellation effective at its billing boundary invoices the final served
  period first.

## Test counts

| Area | `it()` cases |
| --- | ---: |
| Finalize core/manual workflow | 6 relevant cases |
| Consolidation | 0 dedicated cases |
| Lifecycle-aware billing | 2 pre-existing relevant cases |
| Sweep drain/budget/hasMore | 4 |
| Cron guard (assembled Supertest app) | 5 |
| Overdue | 2 |

## Verification

- `pnpm --filter @876/billing-api typecheck` — passed.
- `pnpm --filter @876/billing-api boundaries` — passed: 604 modules, 1,926 dependencies.
- `pnpm --filter @876/billing-api test` — passed: 89 files, 781 tests.
- `pnpm --filter @876/billing-api api:contract:check` — passed: 297 frozen/Express operations; no metadata, schema, request, response, or status differences.
- `pnpm --filter @876/billing-api lint` emitted only the pre-existing Next
  pages-directory warning, but the harness ended it at its 30-second command
  limit before reporting an exit status.
- `grep -rn "eslint-disable\|as any\|@ts-ignore" apps/billing-api/src` finds
  only generated Prisma files under `src/db/generated/prisma`; the modified
  source has no matches. `git diff --check` passed.

## Incomplete items

The implementation is present, but the brief's required dedicated test minimums
for consolidation and lifecycle billing were not completed. No commit was made.

## Phase 1b

### Review fixes

- Finalized invoice consolidations now recompute customer AR after posting the
  run-specific ledger debit.
- The IN_ADVANCE cancellation guard now considers only a scheduled CANCEL whose
  effective timestamp is at or before the next billing boundary. The billing
  read loads scheduled cancellations even when they are not due yet.
- Lifecycle drains leave an ACTIVE/TRIALING IN_ARREARS period-end cancellation
  scheduled until billing has posted the final period. `billSubscription` then
  explicitly applies that cancellation after the invoice is created.
- The subscription include is defined once with `Prisma.SubscriptionInclude`
  and reused for the lifecycle re-read.

### Test counts

| Area | `it()` cases |
| --- | ---: |
| Consolidation | 5 dedicated cases |
| Lifecycle-aware billing | 8 dedicated cases |
| Billing-engine lifecycle drain | 1 dedicated case |

The consolidation tests assert the exact run-specific ledger row, replay no-op,
PARTIALLY_PAID and SENT projection, DRAFT no-ledger behavior, and AR recompute.
The lifecycle coverage asserts both cancellation timing variants, final arrears
billing/cancellation, pre-boundary cancellation, pause, resume, the per-schedule
arrears deferral, and the cross-tenant drain exclusion.

### Verification

- `pnpm --filter @876/billing-api typecheck` — passed.
- `timeout 600 pnpm --filter @876/billing-api lint` — passed; emitted the
  existing pages-directory warning only.
- `pnpm --filter @876/billing-api boundaries` — passed: 605 modules, 1,929
  dependencies.
- `pnpm --filter @876/billing-api test` — passed: 90 files, 795 tests.
- `pnpm --filter @876/billing-api api:contract:check` — passed: 297 frozen and
  297 Express operations; no contract differences.
- `git diff --check` — passed.
