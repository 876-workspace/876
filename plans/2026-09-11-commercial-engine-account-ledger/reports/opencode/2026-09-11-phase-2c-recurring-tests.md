# Report — Phase 2c: Recurring Invoices test suite

Branch `feat/commercial-engine-account-ledger`. Tests only: no production file
was modified, nothing was committed, no branches were created or pushed.

## Files created (`it()` counted per file, floors met)

| File | `it()` | Floor |
| --- | ---: | ---: |
| `apps/billing-api/src/modules/documents/__tests__/recurring-invoice-schedule.test.ts` | 15 | 10 |
| `apps/billing-api/src/modules/documents/__tests__/recurring-invoices.repository.test.ts` | 37 | 22 |
| `apps/billing-api/src/modules/documents/__tests__/recurring-invoices.routes.test.ts` | 7 | 6 |
| `apps/billing-api/src/modules/billing-engine/__tests__/billing-engine.recurring.test.ts` | 5 | 4 |

Conventions followed: `vi.useFakeTimers()` + `vi.setSystemTime()` wherever
`nowUnixSeconds()` is read (restored in `afterEach`); defaults in `beforeEach`
with `mockResolvedValue` (sequential mock values use explicit
`mockImplementation` counters, no `*Once` queues); exact args asserted with
`toHaveBeenCalledWith` plus exact call counts; JMD fixtures with realistic
prefixed ids; `as unknown as T` only for mock tx objects; no `as any`, no
`eslint-disable`. One assertion needed a correction during development
(`markInvoiceSent` takes the transaction as its first argument); no production
bug was involved.

## Verification summary (all run in the foreground)

- `pnpm exec vitest run src/modules/documents src/modules/billing-engine`:
  **29 test files passed, 230 tests passed, 0 failed.**
- `npx prettier --check` on the four new files: **all pass.**
- `pnpm typecheck`: the four new files are clean, but the command exits
  non-zero because of errors in the concurrent Phase 3 agent's untracked files
  `src/modules/reporting/__tests__/reporting.summary.test.ts` and
  `src/modules/reporting/__tests__/reporting.subscriptions.test.ts`
  (e.g. `Property 'code' does not exist on type …` in
  `reporting.summary.test.ts`). Those files are outside this brief's scope, so
  they were left untouched.

## Production bugs found

None. Every pinned behaviour held; no test was left failing and no
`it.fails`-style placeholder was needed.
