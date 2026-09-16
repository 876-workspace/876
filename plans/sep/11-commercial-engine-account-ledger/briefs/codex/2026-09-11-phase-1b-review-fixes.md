# Codex brief — Phase 1b: review fixes + missing tests

Same run/branch as Phase 1. Your Phase 1 work is in the working tree
(uncommitted) — keep it, fix on top. **Do not commit.** Read your own report at
`reports/codex/2026-09-11-phase-1-engine-correctness.md` and the Phase 1 brief.

## Defects found in orchestrator review (fix all)

1. **AR not recomputed on finalized consolidation.** `bill.ts` removed the
   trailing `recomputeCustomerAr`. The new-invoice path gets it from
   `applyInvoiceFinalizeEffects`, but appending to an already-finalized invoice
   raises `amountDue` and posts a ledger debit without recomputing
   `Customer.outstandingReceivable`. Recompute AR in that branch (via the public
   `@/modules/customers` API, as before).
2. **IN_ADVANCE cancel guard is too broad.** The guard skips whenever
   `cancelAtPeriodEnd && IN_ADVANCE && nextBillingAt <= asOf`. `cancel()` sets
   `cancelAtPeriodEnd` for *any* future cancel, including a specific date later
   than the next period start — that customer must still be billed for the next
   period. Skip only when a `SCHEDULED` `CANCEL` schedule exists with
   `effectiveAt <= nextBillingAt`. (Load that schedule regardless of whether it
   is due yet.)
3. **Lifecycle drain can pre-empt the final arrears invoice.** The sweep drains
   lifecycle schedules after subscription claims; if the claim loop stops on
   its limit/time budget first, the drain applies an `IN_ARREARS` period-end
   cancel and the final served period is never invoiced. The drain (and the
   per-schedule apply used by it) must **not** apply a `CANCEL` for an
   `IN_ARREARS` subscription that is `ACTIVE`/`TRIALING` with
   `nextBillingAt !== null && nextBillingAt <= schedule.effectiveAt` — leave it
   `SCHEDULED` for `billSubscription`, which already applies it after billing.
4. **Duplicated include.** `bill.ts` now repeats the ~40-line
   `subscription.findFirst` include verbatim for the re-read. Hoist it to one
   `const` (typed with `satisfies Prisma.SubscriptionInclude` or the existing
   pattern) and reuse it.

## Missing tests (the Phase 1 floors were not met — meet them now)

In `modules/subscriptions/__tests__/bill.test.ts` (or a sibling file matching
its style) and the billing-engine tests:

- consolidation ≥ 4: appended amount ledgered with the run-specific key; replay
  of the same run is a no-op (no second entry); `PARTIALLY_PAID` / `SENT`
  preserved through `projectCollectibleInvoiceStatus`; DRAFT target posts no
  ledger entry; AR recomputed (fix 1).
- lifecycle-aware billing ≥ 7: IN_ADVANCE period-end cancel → no next-period
  invoice and subscription canceled; IN_ADVANCE cancel dated *after* next
  period start → next period **is** billed (fix 2); IN_ARREARS period-end
  cancel → final period invoiced exactly once then canceled; due cancel before
  `nextBillingAt` → applied, nothing billed; scheduled pause applied when due;
  scheduled resume applied when due; drain leaves an unbilled IN_ARREARS
  period-end cancel `SCHEDULED` (fix 3).
- Assert exact call counts / exact ledger rows per `.agents/rules/testing.md`.

## Verification (foreground; lint needs a long timeout — do not stop at 30 s)

```bash
pnpm --filter @876/billing-api typecheck
timeout 600 pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api api:contract:check
```

Append a "Phase 1b" section to your existing report with the counted `it()`
cases and verification output. No run logs.
