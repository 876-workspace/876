# Brief — Phase 2c: Recurring Invoices test suite (tests only)

Run: `plans/2026-09-11-commercial-engine-account-ledger/` · Branch
`feat/commercial-engine-account-ledger` (checked out). **Do not commit, do not
create/switch branches.** No AI attribution.

**Concurrency:** another agent is implementing Phase 3 (reporting) in the same
tree right now (`modules/reporting`, `modules/customers`, `modules/catalog`,
`packages/billing`, `packages/core/src/modules.ts`, prisma schema/migrations).
**You only create new test files** listed below. Do not modify production code.
If a test reveals a genuine production bug, do not fix it — write the test as
`it.fails`-free, leave it failing, and describe the bug precisely in your report.

## Read first

`.agents/rules/testing.md` (binding), `.agents/rules/billing-data-plane.md`,
and the code under test:

- `apps/billing-api/src/modules/documents/repositories/recurring-invoice-schedule.ts`
  (pure: `nextRecurringRunAfter`, `isRecurringScheduleExhausted`)
- `apps/billing-api/src/modules/documents/repositories/recurring-invoices.repository.ts`
  (`createRecurringInvoice`, `updateRecurringInvoice`,
  `transitionRecurringInvoice`, `deleteRecurringInvoice`,
  `generateDueRecurringInvoice`, `recordRecurringInvoiceFailure`)
- `apps/billing-api/src/modules/documents/recurring-invoices.{service,controller,routes,serializers}.ts`
- `apps/billing-api/src/modules/billing-engine/billing-engine.repository.ts`
  (the recurring claim loop with `handledRecurring`)
- existing style references: `modules/subscriptions/__tests__/bill.test.ts`,
  `modules/subscriptions/__tests__/lifecycle-schedules.test.ts`,
  `modules/billing-engine/__tests__/billing-engine.repository.test.ts`,
  `http/auth/__tests__/full-route-auth-matrix.test.ts`,
  `modules/documents/__tests__/recurring-invoice.schemas.test.ts`.

## Behaviour to pin (this is the contract — test exactly this)

- **Schedule helper** — occurrences are always `addInterval(startAt, unit,
  intervalCount * k)`; `nextRecurringRunAfter(s, after)` returns `startAt` when
  `startAt > after`, otherwise the smallest such occurrence `> after`.
  Every-2-months advances two months. Jan 31 anchor → Feb 28 (Feb 29 in 2028)
  → Mar 31. Weekly/daily/yearly. `isRecurringScheduleExhausted` is true when
  `generatedCount >= maxCycles` or `nextRunAt > endAt`.
- **create** — `nextRunAt = startAt` when `startAt >= now - 86_400`, else the
  next occurrence after now (no back-fill). Disabled currency → `err` with code
  `billing/recurring-invoice-currency-disabled` (422); inactive customer →
  `billing/recurring-invoice-customer-not-found` (404); invalid lines →
  `billing/recurring-invoice-invalid-lines`; `endAt < startAt` → 422.
- **update** — STOPPED/EXPIRED → 409 `billing/recurring-invoice-invalid-state`;
  changing `frequency`/`startAt` on an ACTIVE profile moves `nextRunAt` forward
  to the next occurrence after `max(now - 1, lastRunAt)`; a non-schedule edit
  keeps `nextRunAt`.
- **transitions** — pause only from ACTIVE; resume only from PAUSED and sets
  `nextRunAt` to the next occurrence after `max(now - 1, lastRunAt)` — skipped
  months are **not** generated; resume of an exhausted schedule → `EXPIRED`,
  `nextRunAt: null`; stop from ACTIVE/PAUSED → STOPPED, `nextRunAt: null`;
  anything else 409.
- **delete** — `generatedCount > 0` → 409
  `billing/recurring-invoice-delete-not-allowed`; otherwise soft delete
  (`deletedAt`, status STOPPED, `nextRunAt: null`) — never a hard delete.
- **generation** (`generateDueRecurringInvoice` with a mocked tx):
  skipped when not ACTIVE / `nextRunAt > asOf` / already `SUCCEEDED` for that
  `scheduledFor`; creates the run row then marks it `SUCCEEDED` with the
  invoice id; calls invoice create with `issueAt === scheduledFor` (even when
  `asOf` is days later) and internal `{ recurringInvoiceId, transaction }`;
  stamps the profile's payment term onto the draft; `draft` never calls
  finalize; `finalize` calls finalize exactly once; `finalize-and-send` also
  marks it sent; advances `nextRunAt` with the schedule helper (every-2-months
  case), increments `generatedCount`, sets EXPIRED at `maxCycles`/`endAt`;
  inactive customer / disabled currency → run `FAILED` with the right code,
  **no invoice created**, profile not updated; a finalize error throws (so the
  claim transaction rolls back).
- **recordRecurringInvoiceFailure** — upserts a FAILED run for the profile's
  current `nextRunAt`; no-op when `nextRunAt` is null.
- **invoice create** — an invoice created with internal `recurringInvoiceId`
  gets `billingReason: 'RECURRING_INVOICE'`; otherwise `'MANUAL'`
  (`repositories/invoices/create.ts`).
- **sweep** — a profile that returns `failed` or throws is claimed once per run
  (the SQL for the next claim excludes it), counted in
  `summary.recurringInvoices.failed`, and a thrown error calls
  `recordRecurringInvoiceFailure`; the loop continues to the next profile.
- **routes** (Supertest through the assembled app, following the auth matrix
  test) — 404 across tenants; a 409 transition returns the error envelope with
  the stable code and **no** `httpStatus` field; integration routes require
  `billing.invoices.write` for mutations.

## Test files to create (and minimum `it()` counts)

| File | Floor |
| --- | ---: |
| `apps/billing-api/src/modules/documents/__tests__/recurring-invoice-schedule.test.ts` | 10 |
| `apps/billing-api/src/modules/documents/__tests__/recurring-invoices.repository.test.ts` | 22 |
| `apps/billing-api/src/modules/documents/__tests__/recurring-invoices.routes.test.ts` | 6 |
| `apps/billing-api/src/modules/billing-engine/__tests__/billing-engine.recurring.test.ts` | 4 |

Rules: freeze time with `vi.useFakeTimers()` + `vi.setSystemTime()` whenever
the code reads `nowUnixSeconds()` and restore in `afterEach`; defaults in
`beforeEach` with `mockResolvedValue`, never leaking `mockResolvedValueOnce`
queues; assert exact args with `toHaveBeenCalledWith` and exact counts;
realistic fixtures (JMD, real-looking ids); no `as any` (use
`as unknown as T` only for mock tx objects); no `eslint-disable`.

## Verification (run in the foreground; all must pass except tests you
deliberately left failing for a real production bug)

```bash
cd apps/billing-api
pnpm exec vitest run src/modules/documents src/modules/billing-engine
pnpm typecheck
npx prettier --check <your new files>
```

## Report

Write `plans/2026-09-11-commercial-engine-account-ledger/reports/opencode/2026-09-11-phase-2c-recurring-tests.md`:
counted `it()` per file, the vitest output summary, and any production bug you
found (file:line, reproduction). No run logs.
