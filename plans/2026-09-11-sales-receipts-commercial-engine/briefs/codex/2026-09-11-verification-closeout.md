# Codex brief — Sales Receipts: verification closeout and merge blockers

Branch: `feat/sales-receipts-commercial-engine` (already checked out). Do not
create, switch, rebase, or push branches. Do not commit — the orchestrator
commits. Do not write any log/transcript file anywhere.

GPT web wrote this whole branch without executing anything. The orchestrator has
now run the checks and reviewed the design. **The architecture is sound — do not
redesign it.** Your job is to make it compile, pass boundaries/contract checks,
close the one real correctness gap, and add the missing workflow tests.

Read first: `CLAUDE.md`, `.claude/rules/ai-code-quality.md`,
`.claude/rules/testing.md`, `.claude/rules/error-handling.md`,
`.claude/rules/express-api.md`, `.claude/rules/billing-data-plane.md`,
`.claude/rules/billing-commercial-platform.md`, then
`plans/2026-09-11-sales-receipts-commercial-engine/reports/gpt-web/2026-09-11-local-handoff.md`
sections 20–25.

Hard rules: no `eslint-disable`, no `@ts-ignore`/`@ts-expect-error`, no `as any`.
`as unknown as T` only at a genuine library boundary, and justify it in your
report. Do not weaken production signatures to make tests easier. Money stays
`bigint`/strings. Do not touch files outside the scope listed per task without
naming why in the report.

## Verified baseline (run by the orchestrator, 2026-09-11)

- `@876/billing-api` typecheck: 11 errors
  - `workflows/create-sales-receipt.ts:139-140` — address snapshots typed
    `Record<string, unknown>` passed to Prisma `InputJsonValue`.
  - `create-sales-receipt.ts:173-177`, `refund-sales-receipt.ts:192-196`,
    `void-sales-receipt.ts:91-95` — `sales-receipt.created|refunded|voided`
    events and `sales-receipt` resource type are not in the outbox event
    registry (`src/modules/outbox/outbox.service.ts`).
- `@876/billing-api` boundaries: 12 `no-circular` errors. Cause: the pre-existing
  `payments/repositories/payments/shared.ts` imports
  `isCollectibleInvoiceStatus`/`projectCollectibleInvoiceStatus` from
  `@/modules/documents`, and documents now imports `@/modules/payments`
  (settled payment, reversal, credit-note refund). Break the cycle without
  duplicating logic — e.g. move those pure invoice-status helpers to a
  dependency-free location both modules may import (check
  `.dependency-cruiser.cjs` for what is allowed), or another minimal fix.
- `@876/billing-api` tests: 735 pass, 2 fail —
  `src/test/openapi-contract.test.ts` and
  `src/http/auth/__tests__/full-route-auth-matrix.test.ts`. The new routes are
  not in the frozen contract artifacts. Run `pnpm --filter @876/billing-api
api:contract:generate`, review the generated diff (it must contain only the
  new Sales Receipt routes/schemas, the quote conversion route, and the new
  scopes — anything else is a defect to report), update the auth matrix
  expectations the test's own instructions require, then `api:contract:check`.
- `@876/billing` typecheck: `src/integration/types/sales-receipt.schema.ts`
  declares a loose `{object, id}` schema with `satisfies z.ZodType<SalesReceipt>`
  that does not match the `SalesReceipt` type; used in
  `integration/resources/sales-receipts.ts` and `integration/resources/quotes.ts:179`.
  Mirror how the tenant `src/types/sales-receipt.schema.ts` and neighbouring
  integration schemas (e.g. invoice/credit note in `src/integration/types/`) do
  it — reuse, don't restate.
- `@876/billing-app` and `@876/invoice-app` typecheck: null-narrowing errors in
  `sales-receipts/new/page.tsx` and `sales-receipts/[salesReceiptId]/refund/page.tsx`
  in both apps (the combined `failure ?? …` check does not narrow each
  `.data`), plus `apps/invoice/.../sales-receipts-list.test.tsx:78` still uses
  a removed `DRAFT` status. Fix by narrowing properly (keep the existing
  in-page `AppError` behaviour — errors are values and must not throw).
  Also confirm the `'sales-receipt/not-found'` code the pages check is the code
  the Billing API actually returns for a missing receipt; if not, make them
  agree (fix the API error code if it is the one that is wrong).
- `@876/billing-ui` typecheck: clean.

## Task 1 — make every check green

Scope: the files named above plus whatever the fixes strictly require.
Also, per `CLAUDE.md` "UI Copy": remove the explanatory `<PageDescription>`
paragraphs from the new Sales Receipt `new` and `refund` pages in both apps.

## Task 2 — Quote conversion cross-kind exclusivity (merge blocker)

A Quote has two independent one-to-one relations, `convertedInvoice` and
`convertedSalesReceipt`. Quote→Invoice (`repositories/invoices/create.ts`,
`createFromQuote`) and Quote→Sales Receipt
(`workflows/create-sales-receipt.ts`, `prepareFromQuote`) each check only their
own relation, outside the write transaction. A quote can therefore become both
an Invoice and a Sales Receipt, sequentially or concurrently.

Required: one Documents-owned conversion guard used by **both** paths, executed
**inside** each path's write transaction, that takes a row lock on the quote
(`SELECT … FOR UPDATE` via the repository layer — only repositories may touch
Prisma) and re-checks both relations after the lock. Either conversion existing
→ 409 with a clear message ("This quote has already been converted to an
invoice/Sales Receipt."). Keep the existing same-kind idempotent replay
behaviour (unique-constraint recovery paths) intact. Do not add a new column or
table unless you find the lock approach is impossible — if so, stop and explain.

Tests (floor: 6 `it()`): invoice-then-receipt rejected; receipt-then-invoice
rejected; the guard is called inside the transaction client (not the root
client) for both paths; lock query issued before the relation re-check;
same-kind retry still replays; declined/canceled/unaccepted quotes still
rejected as before.

## Task 3 — workflow tests (use the existing mocked-Prisma patterns in

`workflows/invoice-workflows.test.ts` / `transition-quote.test.ts`)

Floors are counted `it()` cases:

- **create** (floor 8): creates one Sales Receipt + one Payment with
  `unappliedAmount = 0n`; no `paymentAllocation` writes; no customer ledger
  entry (`recordLedgerEntry`/`PAYMENT_RECEIVED` never called); inventory
  consumed with `{ type: 'sales-receipt', id }`; one `sales-receipt.created`
  event; stock failure aborts the transaction and returns the stock error;
  total ≤ 0 rejected; bank charges ≥ total rejected; integration replay returns
  `replayed: true` without writing.
- **void** (floor 6): reverses payment (status CANCELED, bank tx EXCLUDED) and
  restores inventory; rejects already-void; rejects when a credit note or refund
  exists; command-idempotency replay returns without writing; emits
  `sales-receipt.voided`; `SettledPaymentReversalError` maps to its status.
- **refund** (floor 7): creates linked Credit Note + Refund; amount above
  `total − credited` rejected; proportional tax split pinned with exact bigint
  values; return line not on receipt → 404; return quantity above sold → 422;
  line without item/variant cannot restore stock → 422; non-PAID receipt → 409.
- **Payments Received isolation** (floor 4): the ordinary payment list excludes
  Sales Receipt payments; ordinary retrieve/update/delete(cancel)/apply reject a
  Sales Receipt payment.

Assert exact arguments and call counts, not `toHaveBeenCalled()`. Every test
must fail if the line it covers is deleted.

## Task 4 — migration check

Compare the hand-written
`apps/billing-api/prisma/migrations/20260911120000_sales_receipts_commercial_engine/migration.sql`
against what Prisma expects: produce the expected SQL with
`prisma migrate diff --from-schema <schema dir exported from main> --to-schema prisma/schema --script`
(export main's schema with `git show main:<path>` into a temp dir **outside the
repo**). Do **not** connect to any database and do **not** run `db:drift`,
`migrate deploy`, or `migrate dev`. Fix any real mismatch (missing index, FK
name, column type, default) in the hand-written file. Report the comparison
result, including intentional differences.

## Verification you must run and paste results of in your report

```bash
pnpm --filter @876/billing-api typecheck
pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api api:contract:check
pnpm --filter @876/billing-api db:validate
pnpm --filter @876/billing typecheck && pnpm --filter @876/billing test
pnpm --filter @876/billing-ui typecheck && pnpm --filter @876/billing-ui test
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app test
node scripts/check-app-structure.mjs
```

## Report

Write `plans/2026-09-11-sales-receipts-commercial-engine/reports/codex/2026-09-11-verification-closeout.md`:
per-task status, counted `it()` added per file, every file changed with reason,
the exact final output line of each verification command, the migration
comparison result, decisions the brief did not settle, and anything you could
not do. A truthful "not done" beats a confident claim.
