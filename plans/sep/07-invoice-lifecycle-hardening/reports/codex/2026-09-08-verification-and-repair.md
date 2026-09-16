# Invoice Lifecycle Hardening — Verification and Repair

Date: 2026-09-08

## Outcome

All completed verification checks pass. Two unsharded UI/app test invocations
exceeded this environment's 30-second foreground command ceiling, but every
discovered test file was subsequently executed in passing foreground batches or
Vitest shards. No branch, commit, migration, pull, push, or rebase was made.

## Commands

| Command | Result | Notes |
| --- | --- | --- |
| `pnpm --filter @876/billing-api exec prisma generate` | PASS | Run before the first typecheck; generated Prisma Client 7.9.1. |
| `pnpm --filter @876/billing-api typecheck` | PASS after repair | Initially failed on Prisma JSON input typing. |
| `pnpm --filter @876/billing-api lint` | PASS | Three pre-existing unused-argument warnings in `src/http/errors.ts` and Zoho Books provider errors. |
| `pnpm --filter @876/billing-api boundaries` | PASS | 560 modules / 1,748 dependencies; no cycle or boundary violation. |
| `pnpm --filter @876/billing-api test` | PASS after repair | 72 files, 681 tests. Initial run exposed stale frozen API-contract artifacts. |
| `pnpm --filter @876/billing-api build` | PASS | Regenerated Prisma client and built with tsup. |
| `pnpm --filter @876/billing-api db:validate` | PASS | Prisma schema valid. |
| `pnpm --filter @876/billing-api api:contract:check` | PASS after repair | Frozen and Express contracts both contain 268 operations. |
| `pnpm --filter @876/billing typecheck` | PASS after repair | Initially referenced a nonexistent `currency.schema` module. |
| `pnpm --filter @876/billing test` | PASS | 28 files, 315 tests. |
| `pnpm --filter @876/billing-ui typecheck` | PASS after repair | Test callback mock type was too broad initially. |
| `pnpm --filter @876/billing-ui test` | INCONCLUSIVE as one command | The unsharded process exceeded the 30-second foreground ceiling. All 36 discovered files then passed in two foreground batches: 389 tests total. |
| `pnpm --filter @876/billing-app typecheck` | PASS | — |
| `pnpm --filter @876/billing-app test` | INCONCLUSIVE as one command | The unsharded process exceeded the 30-second foreground ceiling. All three foreground Vitest shards passed: 84 files, 859 tests total. |
| `pnpm --filter @876/invoice-app typecheck` | PASS | It failed once while the concurrently updated worktree had an incomplete QuoteActions call; the immediate rerun passed after that call contained its required props. No local change was made for this transient condition. |
| `pnpm --filter @876/invoice-app test` | PASS | 53 files, 392 tests. |

Additional foreground verification: `api:contract:generate` and
`api:contract:manifest:generate` both passed to deliberately update the frozen
OpenAPI contract and generated manifest. The targeted shared UI lifecycle suite
was rerun after the routing-boundary repair: 7/7 tests passed. Both host
adapter suites were also rerun: Billing 6/6 and Invoice 3/3 passed.

Skipped: `pnpm --filter @876/billing-api db:drift`, as required. It needs a live
database and was not run.

## Repairs

| Failure | Root cause | Repair |
| --- | --- | --- |
| Billing API typecheck: `Record<string, unknown>` was not a Prisma JSON input value. | The void/write-off repository narrowed persisted JSON metadata to an arbitrary record, losing the JSON-value guarantee Prisma requires. | Typed the helper and both inputs as `Prisma.JsonValue` / `Prisma.JsonObject` in `apps/billing-api/src/modules/documents/repositories/invoice-workflow.ts`. No assertion escape was added. |
| Billing API tests/OpenAPI contract: four new invoice lifecycle operations were extra. | The intentional endpoints had not refreshed the frozen OpenAPI contract, generated manifest, or auth-matrix operation count. | Regenerated `apps/billing/contracts/v1/openapi.json` and `v1-contract.generated.ts`; updated the auth matrix from 264/263 to 268/267 operations. |
| Billing package typecheck: missing `./currency.schema`. | A changed barrel export referenced a file that does not exist; currency schemas are exported from `currency.ts`. | Restored the barrel module specifier to `./currency` in `packages/billing/src/types/index.ts`. |
| Billing UI typecheck: `vi.fn()` did not satisfy the required async submit callback. | The test gave its helper Vitest's broad mock return type. | Typed the mock and helper with `PaymentReceivedFormProps['onSubmit']`; production signature remains required. |
| Billing UI lifecycle tests: matcher methods were absent. | The package had jsdom and Jest-DOM installed, but its Vitest config did not load Jest-DOM. | Added the existing `@testing-library/jest-dom/vitest` setup module to `packages/billing-ui/vitest.config.ts`. |
| Billing app contract-baseline test: four documented paths had no implementation-inventory allowance. | The additive send/write-off routes were omitted from the explicit post-legacy allow-list. | Added both tenant and integration paths to `apps/billing/src/lib/api/contract-baseline.test.ts`. The test was correct; its intentional inventory was incomplete. |
| Shared UI routing boundary. | `@876/billing-ui` imported `next/link`, contrary to the shared-product UI rule and this brief. | Replaced the two links with plain anchors using host-supplied href props in `packages/billing-ui/src/invoice-lifecycle-actions.tsx`. The package now imports no routing, service client, or session module. |

No `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `as any`, or new
`as unknown as T` was introduced.

## Lifecycle review

- The canonical helper in `apps/billing-api/src/modules/documents/invoice-lifecycle.ts` implements the required order: zero due -> `PAID`; positive past-due balance -> `OVERDUE`; cash/credit -> `PARTIALLY_PAID`; sent -> `SENT`; otherwise `OPEN`.
- Payment allocations, credit-note allocations, automatic available-credit settlement, and overdue materialization use that owner. The boundary check passed, so the intentional Customers local predicate did not introduce a module cycle.
- `sendInvoiceWorkflow` preserves the stored `sentAt` through `markInvoiceSent` while enqueueing a fresh `invoice.sent` event for every successful call.
- `voidInvoiceWorkflow` rejects `UNCOLLECTIBLE` through the collectible-state guard and rejects settled allocations; it restores inventory only after eligibility passes.
- `writeOffInvoiceWorkflow` atomically clears the remaining receivable, increments `amountWrittenOff`, assigns `UNCOLLECTIBLE`, records a `WRITE_OFF` credit ledger entry, recomputes AR, and emits its event. It does not restore inventory or record cash/credit.
- Financial mutations, ledger evidence, AR recomputation, events, and command idempotency all execute under the Billing transaction seam. Controllers only adapt validated transport to service calls.
- Both host action components are adapters over the one shared lifecycle component; neither forks the presentation.

## Added test declarations

The original lifecycle subset has the claimed 28 declaration sites when the two
parameterized declarations are included: 26 direct `it()` calls plus two
`it.each()` declarations. The helper's two parameterized declarations expand to
eight runtime cases, so that file has 15 runtime tests.

| File | New direct `it()` | New `it.each()` | New declaration sites |
| --- | ---: | ---: | ---: |
| `apps/billing-api/src/modules/documents/invoice-lifecycle.test.ts` | 7 | 2 | 9 |
| `apps/billing-api/src/modules/documents/workflows/invoice-workflows.test.ts` | 6 | 0 | 6 |
| `packages/billing/src/resources/__tests__/documents.test.ts` | 2 | 0 | 2 |
| `packages/billing-ui/src/invoice-lifecycle-actions.test.tsx` | 7 | 0 | 7 |
| `apps/invoice/src/lib/client/documents.test.ts` | 4 | 0 | 4 |
| `packages/billing-ui/src/payment-received-form.test.tsx` | 2 | 0 | 2 |
| `apps/billing/src/app/(app)/(sales)/invoices/[invoiceId]/_components/invoice-actions.test.tsx` | 1 | 0 | 1 |
| `apps/invoice/src/app/(app)/invoices/[invoiceId]/_components/invoice-actions.test.tsx` | 2 | 0 | 2 |
| `apps/billing-api/src/modules/documents/documents.service.test.ts` | 2 | 0 | 2 |
| `apps/invoice/src/lib/client/payments.test.ts` | 1 | 0 | 1 |
| **All changed tests** | **34** | **2** | **36** |

Unfixed finding: the plan's current-run count says 35 new literal `it()`
declarations at `plans/2026-09-07-invoice-lifecycle-hardening/plan.md:201`.
The diff contains 34 direct `it()` calls (and two `it.each()` declaration
sites), not 35. The original 28 lifecycle declaration-site claim is accurate
only when its two parameterized declarations are counted. This is reporting
metadata, so it was left unchanged.

## Remaining limitations

I could not verify completion of the exact single-process unsharded
`@876/billing-ui test` and `@876/billing-app test` commands because this
environment terminates foreground output at 30 seconds. Equivalent complete
foreground executions of every discovered test file passed, as recorded above.
`db:drift` was intentionally not verifiable without a live database.
