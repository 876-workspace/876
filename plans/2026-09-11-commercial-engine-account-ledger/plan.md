# Implementation Plan: Commercial Engine — Account Ledger, Scheduling, Recurring Invoices, Reporting

- **Run ID:** `2026-09-11-commercial-engine-account-ledger`
- **Branch:** `feat/commercial-engine-account-ledger` (cut from `main` @ `b649f9175`)
- **Status:** COMPLETED ✅ (branch scope; not pushed, no PR)
- **Delegates:** Codex (`gpt-5.6-terra`, high) for Phases 1–2 until its usage
  limit (reset 20:12); then opencode running `muse-spark-1.3-contributor-free`
  (user's choice), which — unlike the Muse CLI — can execute commands here.
  Runs are parallelised only across non-overlapping file scopes.

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
| 2b    | codex → orchestrator | [briefs/codex/2026-09-11-phase-2b-recurring-review-fixes.md](./briefs/codex/2026-09-11-phase-2b-recurring-review-fixes.md) (Codex hit its usage limit; the orchestrator applied the fixes) |
| 2c    | opencode (Muse 1.3) | [briefs/opencode/2026-09-11-phase-2c-recurring-tests.md](./briefs/opencode/2026-09-11-phase-2c-recurring-tests.md) |
| 3     | opencode (Muse 1.3) | [briefs/opencode/2026-09-11-phase-3-reporting.md](./briefs/opencode/2026-09-11-phase-3-reporting.md) |
| 4a    | opencode (Muse 1.3) | [briefs/opencode/2026-09-11-phase-4a-recurring-invoices-ui.md](./briefs/opencode/2026-09-11-phase-4a-recurring-invoices-ui.md) |
| 4b    | opencode (Muse 1.3) | [briefs/opencode/2026-09-11-phase-4b-reporting-ui.md](./briefs/opencode/2026-09-11-phase-4b-reporting-ui.md) |
| 4c    | codex    | [briefs/codex/2026-09-11-phase-4c-finish-ui.md](./briefs/codex/2026-09-11-phase-4c-finish-ui.md) (4a/4b were interrupted; Codex finished both) |

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
- [x] **Phase 2 — Recurring invoices: data plane** (M1 backend + SDK)
  - Codex built schema/migration/routes/SDK but wrote 0 of 25 generation,
    command and sweep tests. Orchestrator review found: `intervalCount`
    ignored when advancing; pause/resume back-billed skipped periods; month-end
    drift on resume; draft runs lost the payment term; generated invoices
    tagged `MANUAL` instead of `RECURRING_INVOICE`; the sweep re-claimed a
    failing profile until its time budget ran out and recorded nothing on a
    thrown error; serializer in the repository; ad-hoc thrown errors. All fixed
    by the orchestrator (2b); error codes registered in `@876/core`.
- [ ] **Phase 3 — Reporting data plane** (M2 backend + SDK + `reports` settings)
- [x] **Phase 2c — recurring tests** (Muse: 64 tests; orchestrator mutation-checked the frequency and sweep-exclusion fixes — both caught) · **Phase 3 — reporting** (now also subscriptions: revenue by source, new/canceled/churn, MRR, per-customer) 
- [x] **Phase 4 — Host UI** — 4a/4b (Muse) interrupted without reports; Codex 4c finished. Orchestrator re-ran every gate and removed one new unused import.
- [x] Phase 4 (original line) (recurring invoices, reports pages, dashboard, customer & item overview panels — Billing + Invoice)
- [x] Docs: `apps/billing/docs/accounting-model.md` §1a generated invoices, `apps/billing-api/README.md` scheduled sweep
- [x] Docs: reporting definitions (Phase 3, accounting-model §11)
- Phase 3 orchestrator review: preference PATCH moved from `reports:read` to
  `sales:write` (+ negative test); lifetime sales restricted to the account
  currency instead of summing currencies; recurring-invoice FK names aligned
  (schema ↔ migration drift = 0).
- **Real-database verification (orchestrator):** all 46 migrations applied on
  Postgres 17 via PGlite + `pglite-socket`; `prisma migrate diff` shows no
  drift for this branch; the reporting service ran against seeded edge cases
  (23:30 Sep 30 Jamaica sale → Sep 30 bucket; 00:30 Oct 1 excluded;
  draft/void/opening-balance excluded; uncollectible counted; USD separate;
  aging buckets; void-receipt cash excluded) — every figure matched a hand
  calculation.

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

All phases committed on `feat/commercial-engine-account-ledger`. Final
verification (orchestrator, foreground): billing-api 941 tests + lint (0
errors) + boundaries + contract + db:validate; @876/core 1096; @876/billing
358; @876/billing-ui 493; @876/billing-app 930; @876/invoice-app 523;
check:transpile OK; app-structure only the pre-existing ConsoleHome issue.

Next: push, open the PR, and handle the deployment notes below.

## Deployment notes (not code)

- Set `CRON_SECRET` on the `billing-api` Vercel project (and keep
  `BILLING_SCHEDULER_KEY` for external schedulers), then redeploy manually —
  deploys are manual-only.
- Migrations from Phases 2–3 must be applied to the Billing Neon database.
