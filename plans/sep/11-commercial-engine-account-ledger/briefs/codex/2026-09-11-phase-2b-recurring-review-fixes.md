# Codex brief — Phase 2b: Recurring Invoices review fixes + missing tests

Same run/branch. Your Phase 2 work is uncommitted in the tree — keep it and fix
on top. **Do not commit.** Read your Phase 2 report and the Phase 2 brief.

## Defects found in orchestrator review (all verified in your code)

1. **`intervalCount` is ignored when advancing.**
   `generateDueRecurringInvoice` computes
   `addInterval(profile.startAt, profile.intervalUnit, count)` where `count` is
   the generated-invoice count. An "every 2 months" profile advances monthly.
2. **Pause/resume back-bills skipped periods.** The next run is derived from
   `generatedCount`, not from the calendar position of the run just made. After
   a pause, `resume` sets `nextRunAt` in the future, but the following
   generation computes `startAt + generatedCount` periods — a date in the past
   — so the next sweep immediately generates invoices for the paused months.
   Fix: the next run is the first anchor occurrence strictly after
   `scheduledFor`: smallest `k ≥ 1` with
   `addInterval(startAt, unit, intervalCount * k) > scheduledFor`. `maxCycles`
   still counts **generated** invoices.
3. **Month-end drift in `nextFutureRun`.** It steps
   `next = addInterval(next, …)`, so Jan 31 → Feb 28 → Mar 28. Always compute
   from `startAt` with a multiplied count (share one helper with fix 2).
4. **Draft generation drops the payment term.** `invoices.create` is not given
   `paymentTermId` (only finalize gets it), so `generationMode: 'draft'`
   invoices have no term/due date. Pass it at create (check the create params
   support it; if they do not, resolve it the same way manual draft invoices do).
5. **Layering.** `serializeRecurringInvoice` lives in the repository. Move it to
   `documents.serializers.ts` (or a `recurring-invoices.serializers.ts` beside
   the sales-receipt equivalents). Repositories do not serialize.
6. **Error convention.** The rest of `modules/documents` returns expected
   failures as `ServiceResult` values via `err(message, status)` and the
   controller maps them (see `workflows/create-sales-receipt.ts` and
   `sales-receipts.controller.ts`). Recurring invoices invent a
   `recurringError`/`asHttpError` throw path instead. Convert to the module's
   value convention; keep the stable codes (`billing/recurring-invoice-*`) if
   the module's `err()` supports a code, otherwise match how sales receipts
   surface codes. No ad-hoc `Error` objects with bolted-on fields.
7. **Unbounded list.** `listRecurringInvoices` has no `take`. Documents lists
   are not cursor-paginated (they use `documentList`, `has_more: false`); match
   that convention but cap at a documented bound (e.g. 200) and apply the same
   bound to `listRecurringInvoiceChildren`.
8. **Formatting.** New files are not Prettier-formatted (single 300-char lines).
   Run `npx prettier --write` over every file you created or changed.
9. **Pass-through alias.** `billing-engine/calculations.ts` now wraps
   `@876/core/timestamps` `addInterval` in a function that only forwards. Make it
   a re-export (or point callers at core) — no wrapper.

## Missing tests (Phase 2 floors — meet them now; count and report)

Style: follow `modules/subscriptions/__tests__/bill.test.ts` (mocked tx,
exact call assertions). Freeze the clock with `vi.useFakeTimers` +
`vi.setSystemTime` wherever `nowUnixSeconds()` is read; do not express fixtures
relative to a constant without freezing time. Use `mockResolvedValue` defaults
in `beforeEach`, not stacked `mockResolvedValueOnce` that can leak.

- generation ≥ 14: draft vs finalize vs finalize-and-send (finalize core called
  exactly once / not at all; send stamp only in the third); run row created
  then `SUCCEEDED` with `invoiceId`; replay of a `SUCCEEDED` run for the same
  `scheduledFor` is a no-op; `issueAt === scheduledFor` even when `asOf` is
  days later; **every-2-months advances two months** (fix 1); **month-end
  anchor Jan 31 → Feb 28/29 → Mar 31** (fix 3); **after pause+resume the next
  run is in the future and skipped months are not generated** (fix 2);
  `endAt` and `maxCycles` expiry → `EXPIRED`, `nextRunAt: null`; paused/stopped
  profile skipped; archived customer and disabled currency → run `FAILED`,
  `nextRunAt` unchanged, invoice not created; draft keeps payment term (fix 4);
  generated invoice carries `recurringInvoiceId` and `billingReason:
  RECURRING_INVOICE`.
- commands ≥ 10: pause/resume/stop valid transitions; each invalid transition
  → 409 envelope; delete blocked when `generatedCount > 0` (409) and soft-deletes
  otherwise; update recomputes `nextRunAt` forward only; tenant isolation 404;
  integration route rejects a token without `billing.invoices.write` (Supertest
  through the assembled app — follow `full-route-auth-matrix.test.ts`).
- sweep ≥ 3: recurring claim loop counted in the run result; a failed profile
  does not stop the loop; time budget respected across both loops.

## Verification (foreground; lint with a long timeout)

```bash
pnpm --filter @876/billing-api typecheck
timeout 900 pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api api:contract:check
pnpm --filter @876/core test
pnpm --filter @876/billing typecheck && pnpm --filter @876/billing test
```

Append a "Phase 2b" section to your Phase 2 report with counted `it()` per
group and verification output. No run logs.
