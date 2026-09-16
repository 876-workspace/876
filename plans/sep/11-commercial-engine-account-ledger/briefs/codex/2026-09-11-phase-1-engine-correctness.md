# Codex brief — Phase 1: Billing engine correctness & scheduling

Run: `plans/2026-09-11-commercial-engine-account-ledger/` · Branch:
`feat/commercial-engine-account-ledger` (already checked out — do not create,
switch, rebase or push branches). **Do not commit.** The orchestrator reviews and
commits. No AI attribution anywhere.

## Read first (binding)

`CLAUDE.md`, `.agents/rules/ai-code-quality.md`, `.agents/rules/express-api.md`,
`.agents/rules/api-backend.md`, `.agents/rules/billing-data-plane.md`,
`.agents/rules/billing-commercial-platform.md`, `.agents/rules/error-handling.md`,
`.agents/rules/testing.md`, `.agents/rules/naming.md`, `.agents/rules/env-configuration.md`,
and `apps/billing/docs/accounting-model.md`. Then read `plan.md` in the run
folder — its "Audit findings" section is the reason for this work.

## Context (verified by the orchestrator — each line has been checked in code)

- `apps/billing-api/src/modules/billing-engine/billing-engine.repository.ts`
  `runBillingSweep` claims one due subscription per Serializable transaction
  (`FOR UPDATE SKIP LOCKED`) and calls `billSubscription`
  (`modules/subscriptions/repositories/bill.ts`). It is only reachable through
  `POST /internal/billing-sweep` (scheduler key) and `POST /admin/billing/run`.
  Its only caller in history was the parked Cloudflare cron. Billing API is now
  deployed on **Vercel Hobby** → crons run at most once per day.
- `apps/api` already has the Vercel cron precedent: `apps/api/vercel.json`
  `crons`, `GET /billing/customer-sync/cron` with `security: 'scheduler'`, and
  `CRON_SECRET` in `apps/api/src/config/index.ts`. Mirror that shape.
- `processDueLifecycleSchedules` (`subscriptions/repositories/lifecycle.ts:808`)
  is exported but **called by nothing**.
- `cancel()` in the same file sets `cancelAtPeriodEnd = true` and a future
  `SubscriptionLifecycleSchedule` (`action: 'CANCEL'`). `billSubscription`'s
  non-advance path never looks at either.
- `bill.ts` posts `INVOICE_FINALIZED` with key `invoice:${invoiceId}:finalized`
  even when it consolidates into an existing finalized invoice; `recordLedgerEntry`
  (`modules/ledger/ledger.repository.ts`) upserts on that key with `update: {}`,
  so the second subscription's amount is silently dropped from the ledger.
  The same consolidation path writes `status: 'OPEN'` over `SENT` /
  `PARTIALLY_PAID`.
- `modules/documents/workflows/finalize-invoice.ts` is the canonical finalize:
  inventory `consumeInventory`, `markInvoiceFinalized`, ledger, credit
  auto-apply, `recomputeCustomerAr`, `enqueueBillingEvent`. `bill.ts` duplicates
  only part of it (no inventory, no billing event).
- `modules/documents/repositories/invoices/mark-overdue.ts` and the trailing
  `updateMany` in `runBillingSweep` are two implementations of the overdue flip.

## Tasks

### 1. Shared, transaction-scoped finalize core (D5)

Extract from `finalizeInvoiceWorkflow` a function that applies the finalize
side effects to an already-loaded invoice **inside a caller's transaction**
(inventory consumption, finalize stamp/status, `INVOICE_FINALIZED` ledger
entry, optional credit auto-apply, AR recompute, `invoice.finalized` billing
event). `finalizeInvoiceWorkflow` keeps its public behaviour and idempotency
claim and calls the core. `billSubscription` (AUTO_FINALIZE mode, new invoice)
calls the same core instead of its hand-rolled ledger/credit code. Export it via
`modules/documents/index.ts` only. Watch the documents↔subscriptions↔customers
dependency direction — `pnpm --filter @876/billing-api boundaries` must stay
clean (no new cycles). If the invoice-level `autoApplyCredits` semantics differ
between manual finalize and subscriptions, preserve each caller's current
choice via a parameter; do not change behaviour silently.

### 2. Consolidation ledger + status (D4)

When `billSubscription` appends to an existing **finalized** invoice, post an
`INVOICE_FINALIZED` DEBIT for exactly the appended `totalAmount` with an
idempotency key unique to that billing run (e.g.
`invoice:${invoiceId}:subscription-run:${runId}`), and re-project the invoice
status through the existing central status projection (the same one payments
and credit notes use — find it; do not write a new one) instead of forcing
`OPEN`. Appending to a DRAFT invoice posts nothing (finalize will post the full
total later). Recompute AR afterwards.

### 3. Lifecycle-aware sweep (D2, D3)

- Add a cross-tenant due-lifecycle-schedule step to the sweep, reusing
  `processDueLifecycleSchedules`'s per-schedule apply logic (refactor it to
  claim due schedules across all ACTIVE tenants with the same
  `SKIP LOCKED` / conditional-claim safety; keep the per-tenant export working
  if anything uses it, otherwise delete the dead signature).
- Required outcomes, each covered by a test:
  - `IN_ADVANCE` + cancel effective at period end → **no** invoice for the
    next period; subscription ends at `effectiveAt`.
  - `IN_ARREARS` + cancel effective at period end → the final served period
    **is** invoiced exactly once, then the subscription ends; no further period
    is opened.
  - Scheduled pause and resume become effective when due.
  - A due cancel whose `effectiveAt` is *before* `nextBillingAt` applies first
    and nothing is billed.
- Put the guard in `billSubscription` itself (not only in the sweep query) so
  `POST /admin/billing/run` and any direct caller get the same answer. Read
  `applyCancel` first: if it already generates a final/prorated invoice, reuse
  that; never invoice the same period twice.

### 4. Drain-until-done sweep + daily Vercel cron (D1, D6)

- `runBillingSweep` gains a time budget (default ~240 s, configurable) and keeps
  claiming until there is no due work, the row limit, or the budget is hit. The
  cron invocation passes a high limit; the existing request schema default stays
  for the POST routes. Report `hasMore: boolean` in the run result (additive
  field; update the strict Zod response schema and OpenAPI).
- Replace the trailing overdue `updateMany` with the existing
  `mark-overdue.ts` logic generalised for all active tenants (one
  implementation). Overdue must also exclude soft-deleted/inactive tenants.
- Add `GET /internal/billing-sweep/cron` (or the path that best mirrors
  `apps/api`) authorised by `Authorization: Bearer <CRON_SECRET>` using the
  existing hashed/timing-safe `secretsMatch`. Missing `CRON_SECRET` → fail
  closed (503 like the scheduler guard). Add `CRON_SECRET` to
  `src/config/index.ts` and `.env.example` (`# optional — only required when the Vercel cron is enabled`).
  Prefer extending the existing `scheduler` security kind to accept the bearer
  form over inventing a parallel guard.
- Add to `apps/billing-api/vercel.json`:
  `"crons": [{ "path": "<that path>", "schedule": "0 6 * * *" }]` (06:00 UTC =
  01:00 Jamaica). Keep the existing `ignoreCommand`.
- Update route inventories / OpenAPI artifacts the repo checks
  (`pnpm --filter @876/billing-api api:contract:generate` if the internal
  registry is part of the contract; check `api:contract:check`).

## Tests (minimum counts — count your `it()` cases and report them)

Follow the existing test style in `modules/subscriptions/__tests__/bill.test.ts`
and `modules/billing-engine/__tests__/billing-engine.repository.test.ts`.

- finalize core: ≥ 6 (manual path unchanged incl. event + inventory; subscription
  path now emits event; idempotent replay; DRAFT mode posts nothing)
- consolidation: ≥ 4 (appended amount ledgered with run key; second run replay
  is a no-op; PARTIALLY_PAID status preserved/projected; DRAFT target posts nothing)
- lifecycle-aware billing: ≥ 6 (the four required outcomes + pause + resume)
- sweep drain/budget/hasMore: ≥ 4
- cron guard: ≥ 5 (valid bearer, wrong bearer, missing header, unset secret →
  503, scheduler-key POST still works) — use Supertest through the assembled app.
- overdue: ≥ 2 (inactive tenant excluded; only collectible statuses flip)

## Must not

- no `eslint-disable`, `@ts-ignore`, `as any`; no new top-level layer folders;
- no raw provider/SQL error text in responses;
- no change to existing public v1 response shapes except the additive `hasMore`;
- do not touch `apps/billing`, `apps/invoice`, `packages/*` (except if an SDK
  type for the billing-run result exists and must gain `hasMore`);
- do not implement AUTO_CHARGE collection, recurring invoices or reporting —
  later phases.

## Verification (run all, in the foreground, and paste results in your report)

```bash
pnpm --filter @876/billing-api typecheck
pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api api:contract:check
grep -rn "eslint-disable\|as any\|@ts-ignore" apps/billing-api/src
```

## Report

Write `plans/2026-09-11-commercial-engine-account-ledger/reports/codex/2026-09-11-phase-1-engine-correctness.md`:
files changed + why, decisions the brief left open, counted `it()` per task,
verification output (pass/fail counts), and anything you could not do. Do not
write run logs anywhere in the repo.
