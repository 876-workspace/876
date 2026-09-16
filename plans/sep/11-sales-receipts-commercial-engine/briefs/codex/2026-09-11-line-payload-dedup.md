# Codex brief — Sales Receipts: remove the third copy of document line preparation

Branch: `feat/sales-receipts-commercial-engine` (checked out). Do not create or
switch branches, do not commit, do not write any log file. No `eslint-disable`,
`@ts-ignore`, or `as any`.

Read `.claude/rules/ai-code-quality.md` ("never write a third copy") and
`.claude/rules/finance-app-parity.md` ("Totals are computed by one shared pure
function… Two implementations of a subtotal is a defect").

## Problem (verified by the orchestrator)

- `apps/billing/src/features/documents/document-create-model.ts` exports
  `prepareDocumentLine(line, decimalPlaces, usePriceList)` — the complete
  draft-line → create-params mapping (percentage discounts via
  `resolvePercentageDiscount`, `MAX_PERCENT_BASIS_POINTS`, price-list lines,
  variant ids).
- `packages/billing-ui/src/sales-receipt-create-form.tsx` defines its own
  `prepareLine()` that re-implements the same mapping (and differs: percentage
  input scale, no basis-point cap).
- `packages/billing-ui/src/customer-sales-receipts-accordion.tsx` defines a
  private `formatMinorAmount` that duplicates the one in
  `packages/billing-ui/src/customer-transactions-accordions.tsx`.
- `apps/invoice/src/features/documents/document-create-model.ts` has an older,
  divergent `toInvoiceLine`. That divergence predates this branch — **leave
  Invoice's document create model alone**; just note it in the report.

## Do

1. Move `prepareDocumentLine` (and its test coverage from
   `apps/billing/src/features/documents/document-create-model.test.ts`) into
   `@876/billing-ui` as a pure module beside the line editor, e.g.
   `packages/billing-ui/src/document/document-line-payload.ts`, using
   billing-ui's own `parseMinorAmountInput` from `money-input.ts` (confirm it is
   behaviourally identical to `apps/billing/src/lib/format.ts`'s; if not, stop
   and report). Export it through a `package.json` subpath like the neighbouring
   `document/*` entries. No barrel.
2. Make Billing's `document-create-form.tsx` and the Sales Receipt create form
   both use it. Delete the Billing-local copy and the SR form's `prepareLine`.
   Keep `emptyDocumentLine` where it is unless it naturally moves with it.
3. Replace the accordion's private `formatMinorAmount` with one shared
   implementation (export the existing one, or use `formatMinorUnits` from
   `@876/core/money` if it produces identical output — check).
4. Tests: keep every moved test; add ≥4 `it()` covering the Sales Receipt
   form's use (percentage discount resolves against the line subtotal; discount
   above subtotal rejected; percentage above 100% rejected; variant id carried
   through). Check `packages/billing-ui/vitest.config.*` environment first.

## Verify (paste final lines in the report)

```bash
pnpm --filter @876/billing-ui typecheck && pnpm --filter @876/billing-ui test
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app test
node scripts/check-app-structure.mjs
pnpm check:transpile
```

Report to
`plans/2026-09-11-sales-receipts-commercial-engine/reports/codex/2026-09-11-line-payload-dedup.md`:
files changed with reasons, counted tests, verification output, anything not done.

## Additional tasks (from the orchestrator's verification of the first pass)

A. `@876/billing-app` tests — 2 failures to fix (update the inventory/expectation
the test owns; do not weaken the assertion):

- `src/lib/api/contract-baseline.test.ts` "does not document paths absent from
  the implementation inventory": the 10 new Sales Receipt / quote
  convert-to-sales-receipt paths are not in the implementation inventory.
  Find where that inventory lives and register them properly.
- `src/lib/client/resources.test.ts` "exposes every resource facade on the
  root client": add `salesReceipts: { create, refund, void }` to the expected
  facade.
  B. `@876/invoice-app` — `src/app/(app)/sales-receipts/_components/sales-receipts-list.test.tsx`
  "narrows the pane to the draft receipts when the status filter is draft" tests
  a status that no longer exists. Rewrite it for the real `PAID | VOID` filter
  (e.g. `?status=void` shows only void receipts). Keep the case count.
  C. Payments Received isolation tests in `apps/billing-api` (floor 4 `it()`,
  beside the existing payments repository tests, same mocked-Prisma style):
  the ordinary payment list excludes payments linked to a Sales Receipt;
  ordinary retrieve, update, and delete/cancel reject (or 404) a Sales Receipt
  payment; ordinary apply-to-invoice rejects it. Read
  `modules/payments/repositories/payments/{list,retrieve,update,delete,apply}.ts`
  to see how the exclusion is implemented and assert on that filter exactly.

Additional verification:

```bash
pnpm --filter @876/billing-api typecheck && pnpm --filter @876/billing-api boundaries && pnpm --filter @876/billing-api test
```

Some suites take longer than 30s; run them with a long enough timeout rather
than reporting "not completed".

## Orchestrator decision after the first attempt (supersedes the stop condition in Do §1)

Your parser finding was correct. Decision: `@876/core/money`
`parseDecimalToMinorUnits` is the canonical parser, so the moved
`prepareDocumentLine` uses billing-ui's core-backed `parseMinorAmountInput`.
The resulting widening (grouping commas, leading/trailing decimal point accepted
in Billing's document create form) is accepted — the API still validates every
amount. Keep `prepareDocumentLine`'s own `|| '0'` defaults so blank input
behaviour is unchanged. Record the widening in your report and add one test
pinning that `'1,000.50'` maps to `'100050'` at 2 decimals.

Tasks A, B and C are independent of the parser question — do them regardless.
Do everything in this brief now; overwrite your previous report.
