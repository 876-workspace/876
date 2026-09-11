# Implementation Plan: Commercial Engine — Account Ledger, Scheduling, Recurring Invoices, Reporting

- **Run ID:** `2026-09-11-commercial-engine-account-ledger`
- **Branch:** `feat/commercial-engine-account-ledger` (cut from `main` @ `b649f9175`)
- **Status:** IN_PROGRESS
- **Delegate:** Codex (`gpt-5.6-terra`, high), one phase at a time — every phase
  touches `apps/billing-api` schema/route registration, so phases run
  sequentially, never in parallel.

## Overview

The user asked whether the Billing commercial engine is actually wired
together: are invoices, payments, sales receipts, credit notes and refunds tied
to the customer account and statement; does the subscription engine really
bill on its date; do recurring invoices exist; and is the infrastructure there
for reporting (sales per day, customer/item overviews, dashboard).

## Audit findings (orchestrator, 2026-09-11, verified in code)

### What is correctly tied together

| Event                                   | Customer ledger (statement)          | Customer AR recompute | Notes                                                       |
| --------------------------------------- | ------------------------------------ | --------------------- | ----------------------------------------------------------- |
| Manual invoice finalize                 | `INVOICE_FINALIZED` DEBIT            | yes                   | `workflows/finalize-invoice.ts`; also inventory + outbox    |
| Invoice void / write-off                | `INVOICE_VOIDED` / `WRITE_OFF`       | yes                   |                                                             |
| Payment received / reversed             | `PAYMENT_RECEIVED` / `_REVERSED`     | yes                   | allocation does not double-post (documented invariant)      |
| Credit note issued / voided             | `CREDIT_NOTE_ISSUED` / `_VOIDED`     | yes                   |                                                             |
| Refund                                  | `REFUND_ISSUED` DEBIT                | yes                   |                                                             |
| Sales receipt                           | none (by design — no AR)             | unchanged             | appears in customer Transactions, not the AR statement      |
| Subscription invoice (auto-finalize)    | `INVOICE_FINALIZED` DEBIT            | yes                   | `subscriptions/repositories/bill.ts` — see defects D3/D4    |

Statements are derived from `CustomerLedgerEntry` with opening/running/closing
balances; `customer_account` projection gives lifetime billed/paid,
outstanding, overdue, available credit and net position. That foundation is
sound.

### Defects found

- **D1 — Nothing schedules the billing sweep in production.** The only caller of
  `POST /internal/billing-sweep` was the parked Cloudflare Worker cron
  (`parked/cloudflare/apps/billing-api/worker/index.ts`, `*/5 * * * *`). Billing
  API now runs on Vercel with no `crons` in `apps/billing-api/vercel.json`.
  **Subscriptions are not being invoiced on their billing date**, and the
  overdue-status flip never runs.
- **D2 — Scheduled lifecycle changes never apply.**
  `processDueLifecycleSchedules` (`subscriptions/repositories/lifecycle.ts:808`)
  has no caller. Scheduled pause/resume/cancel stay `SCHEDULED` forever.
- **D3 — Cancel-at-period-end still bills the next period.** `cancel()` sets
  `cancelAtPeriodEnd` and a future `CANCEL` schedule, but the non-advance path of
  `billSubscription` never checks either. For `IN_ADVANCE` billing the next
  period's invoice is generated at the exact moment the subscription should end.
- **D4 — Consolidated subscription invoices under-post the ledger.** When a
  second subscription consolidates into an already-finalized invoice, the
  ledger idempotency key is `invoice:${invoiceId}:finalized` — identical to the
  first — so the upsert no-ops and the added amount never reaches the customer
  statement, while `amountDue` did increase. Consolidation also resets the
  invoice status to `OPEN`, discarding `SENT` / `PARTIALLY_PAID`.
- **D5 — Subscription invoices skip half the finalize side effects.**
  `bill.ts` hand-rolls finalization (ledger, credits, AR) instead of sharing the
  canonical finalize core, so subscription invoices never enqueue the
  `invoice.finalized` billing event and never consume tracked inventory.
- **D6 — Duplicate overdue logic.** The sweep has its own `updateMany` beside
  `repositories/invoices/mark-overdue.ts`.

### Missing capabilities

- **M1 — No native Recurring Invoices.** Only a Zoho provider mapper exists.
  Subscriptions need recurring Prices; a recurring invoice is a schedule over
  free-form document lines (Zoho Books "Recurring Invoice").
- **M2 — No reporting data plane.** `reporting` module has one admin-only
  dashboard projection that loads *every* subscription and invoice into memory,
  has no date range, excludes Sales Receipts and credit notes, and no tenant
  timezone exists for "sales per day". Invoice's Reports page is an empty state.
- **M3 — `AUTO_CHARGE` collection is inert.** Nothing charges a saved payment
  method. Deliberately **out of scope** — no processor is live and
  `billing-data-plane.md` parks money-collecting automation.

## Key design decisions

1. **Scheduling on Vercel Hobby.** The team is on the Hobby plan (verified via
   API), so a Vercel cron runs at most **once a day**. The sweep therefore must
   drain all due work in one invocation under a time budget rather than
   processing 25 rows. Invoice `issueAt` already uses `nextBillingAt`, so a late
   run still dates documents correctly. The cron mirrors the `apps/api`
   precedent (`GET …/cron`, `Authorization: Bearer CRON_SECRET`). The existing
   `POST /internal/billing-sweep` (scheduler key) stays for any external,
   more frequent scheduler.
2. **Sweep order is lifecycle-aware, not "schedules first".** `IN_ARREARS` must
   bill the final served period before a period-end cancel applies;
   `IN_ADVANCE` must not bill a period that begins at/after the cancel.
3. **One finalize core.** Manual finalize, subscription billing and recurring
   invoices share a transaction-scoped finalize-effects function (ledger,
   inventory, credits, AR, billing event). No third copy.
4. **Recurring invoices are their own resource inside the `invoices` module**
   (no new module key, no new permission keys): a profile holding customer,
   currency, template lines, cadence, start/end, and generation mode
   (draft / finalize / finalize-and-send). Generation goes through the
   canonical invoice create + finalize core, idempotent per
   `(recurringInvoiceId, scheduledFor)` run row. Billing and Invoice both get
   the UI (finance-app parity).
5. **Reporting extends the existing `reporting` module** (no second module):
   SQL aggregation only, bounded ranges, money as strings, tenant timezone from
   a new `reports` settings module (`timezone`, `fiscal-year-start-month`).
   Sales = finalized non-void invoices + non-void sales receipts − non-void
   credit notes. Customer `lifetimeSales` extends the existing account
   projection instead of a parallel endpoint.

## Dispatched briefs

| Phase | Delegate | Brief |
| ----- | -------- | ----- |
| 1     | codex    | [briefs/codex/2026-09-11-phase-1-engine-correctness.md](./briefs/codex/2026-09-11-phase-1-engine-correctness.md) |
| 1b    | codex    | [briefs/codex/2026-09-11-phase-1b-review-fixes.md](./briefs/codex/2026-09-11-phase-1b-review-fixes.md) |
| 2     | codex    | [briefs/codex/2026-09-11-phase-2-recurring-invoices.md](./briefs/codex/2026-09-11-phase-2-recurring-invoices.md) |
| 3     | codex    | [briefs/codex/2026-09-11-phase-3-reporting.md](./briefs/codex/2026-09-11-phase-3-reporting.md) |

## Execution reports

| Phase | Delegate | Report |
| ----- | -------- | ------ |
| 1, 1b | codex    | [reports/codex/2026-09-11-phase-1-engine-correctness.md](./reports/codex/2026-09-11-phase-1-engine-correctness.md) |

## Phase checklist

- [x] **Phase 1 — Engine correctness & scheduling** (D1–D6)
  - Orchestrator review found 3 defects in the first pass (AR not recomputed on
    finalized consolidation; over-broad IN_ADVANCE cancel guard; drain could
    pre-empt the final IN_ARREARS invoice) → fixed in 1b. Orchestrator also
    raised the cron drain limit (100 → 5,000, time budget is the bound),
    folded the duplicated overdue query, and deleted the dead per-tenant
    schedule processor. billing-api: 795 tests, lint/boundaries/contract green.
- [ ] **Phase 2 — Recurring invoices: data plane** (M1 backend + SDK)
- [ ] **Phase 3 — Reporting data plane** (M2 backend + SDK + `reports` settings)
- [ ] **Phase 4 — Host UI** (recurring invoices, reports pages, dashboard, customer & item overview panels — Billing + Invoice)
- [ ] Docs: `apps/billing/docs/accounting-model.md`, `apps/billing-api/README.md` scheduling section

## Verification commands

```bash
pnpm --filter @876/billing-api typecheck
pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api db:validate
pnpm --filter @876/billing-api api:contract:check
pnpm --filter @876/billing typecheck && pnpm --filter @876/billing test
pnpm --filter @876/billing-ui test
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app test
node scripts/check-app-structure.mjs
```

## Handoff state

Phase 1 committed. Phase 2 (recurring invoices) running in Codex.

## Deployment notes (not code)

- Set `CRON_SECRET` on the `billing-api` Vercel project (and keep
  `BILLING_SCHEDULER_KEY` for external schedulers), then redeploy manually —
  deploys are manual-only.
- Migrations from Phases 2–3 must be applied to the Billing Neon database.
