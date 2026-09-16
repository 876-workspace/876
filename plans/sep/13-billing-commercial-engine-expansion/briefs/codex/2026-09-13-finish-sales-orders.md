# Codex brief: finish the Billing Sales Orders implementation

**Repo:** `/root/projects/876` · **Branch:** `feature/billing-commercial-engine`
(already checked out; stay on it) · **Model:** `gpt-5.6-terra`, medium effort

You are finishing a feature that GPT web started and could not execute. You
**can** run commands, so every claim you make must come from output you saw.

## Read first (binding)

1. `plans/2026-09-13-billing-commercial-engine-expansion/plan.md`, for scope,
   phases and the checklist.
2. `plans/2026-09-13-billing-commercial-engine-expansion/briefs/gpt-web/2026-09-13-orchestrator-plan-adjustments.md`.
   This is **binding and overrides plan.md**. Pay particular attention to
   A3 (status model), A5 (conversions), A7 (naming), A8 (schema), A11
   (access/nav/UI) and A14 (test floors).
3. Rules: `.claude/rules/billing-commercial-platform.md`, `express-api.md`,
   `api-backend.md`, `error-handling.md`, `testing.md`, `naming.md`,
   `sdk-conventions.md`, `app-structure.md`, `app-layout.md`, `data-loading.md`,
   `access-control.md`, `finance-app-parity.md`, `app-api-routing.md`,
   `ai-code-quality.md`, `code-style.md`.

## Current state (measured by the orchestrator at `8ab2570d0`)

Prisma client generates and schema validates (after an orchestrator fix).
Already written: the Prisma schema and migration
`prisma/migrations/20260913183000_sales_orders/`, the documents-module
repositories, service, controller, routes and workflows for create, update,
transitions, quote→order and order→invoice, the SDK resource, core
permissions/modules, and navigation entries. No Billing **host UI** exists yet,
and neither do the docs updates or the final report.

### Failing now — fix all of these first

**`pnpm --filter @876/billing-api typecheck`**
- `src/modules/documents/workflows/create-sales-receipt.ts:384`: the snapshot
  array lacks `taxRateId, taxName, taxRate, taxInclusive`, which
  `CommercialLineSnapshot` now requires. Fix it at the source (how Sales Receipt
  lines get tax), not with casts.
- `src/modules/documents/workflows/update-sales-order.ts:122-128`:
  `prepared.data` is possibly null. Narrow it on the error branch correctly.

**`pnpm --filter @876/billing-api boundaries`** (layer violation: only
repositories may import `@/db/client`)
- `src/modules/tax/commercial-reference.ts` → `src/db/client.ts`
- `src/modules/documents/workflows/convert-quote-to-sales-order.ts` →
  `src/db/client.ts`

Move those queries into repositories.

**`pnpm --filter @876/billing-api test`**: 3 failures
- `src/test/openapi-contract.test.ts` "matches the frozen FastAPI contract" and
  `src/http/auth/__tests__/full-route-auth-matrix.test.ts`. The new routes are
  intentional. Regenerate with `pnpm --filter @876/billing-api
  api:contract:generate`, add the new operations to the auth matrix with the
  correct security, and confirm `api:contract:check` passes. Do not weaken the
  tests.
- `src/modules/documents/repositories/quotes/conversion.test.ts` "uses the
  provided transaction client for the Sales Receipt conversion check". Fix the
  code or update the test to the new lock query, whichever is correct. Explain
  which in your report.

**`pnpm --filter @876/billing test`**: 3 failures
- `src/settings-catalog.test.ts` (Billing-only module keys: add `sales-orders`
  to the expectation if it is correctly Billing-only),
  `src/resources/__tests__/documents.test.ts`, and
  `src/resources/__tests__/recurring-invoices.test.ts` (invoice response
  parsing, likely the new `salesOrderId` field or a billing-reason enum missing
  from the SDK invoice schema). Fix the contract, not the fixtures, unless the
  fixture is what is wrong.

Also check the lint warning `sales-orders.serializers.ts:10`
(`invoiceStatusSchema` used only as a type).

## Then complete the remaining scope

Go in order. Each phase must be green before you start the next.

1. **Audit phases 1–4 against the adjustments file.** Check that:
   - the status model is exactly draft/confirmed/completed/canceled, with no
     stored payment or fulfillment status;
   - derived `invoicingStatus`/`paymentStatus` come from **one batched** invoice
     query per list, not one per row;
   - update is draft-only;
   - numbers come from `nextDocumentNumber`/`DocumentType.SALES_ORDER` inside
     the transaction;
   - `optionalCommandIdempotency` is on create, lifecycle and convert;
   - order→invoice copies line snapshots (no repricing), sets
     `billingReason SALES_ORDER` and `salesOrderId`, blocks a second non-void
     invoice transactionally, and re-allows after VOID;
   - quote→order uses the existing quote conversion lock and gate;
   - list `status`/`customerId` filtering is done in the repository query;
   - the migration SQL exactly matches the Prisma schema. Run
     `pnpm --filter @876/billing-api exec prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema --script`.
     If it needs a shadow DB and cannot run, say so. Do not run `migrate dev`
     or `migrate deploy`, and do not connect to any database: dev and
     production share one database.
2. **Permission consistency.** `apps/billing-api` uses `sales-orders:read/write`
   and core uses `sales-orders.view/.edit` (check the actual keys). Confirm they
   map the same way existing `sales:read` ↔ `invoices.view`/`quotes.view` do.
   Confirm a role actually grants them, and that the API routes require them.
3. **Test floors (A14):**
   - API ≥ 30, including assembled-Express Supertest auth and tenant isolation;
   - conversions ≥ 12;
   - SDK ≥ 10;
   - persistence ≥ 4.

   Count `it(` cases and report the counts. Tests must be able to fail. Follow
   `testing.md`, and do not mock the unit under test.
4. **Billing host UI** at `apps/billing/src/app/(app)/(sales)/sales-orders/`:
   - Copy the **Quotes** section's structure (list/detail split, `new`, and edit).
   - Use `DocumentLineItemsEditor` from `@876/billing-ui`. Do not write a new
     line editor.
   - Add the route guard for `sales-orders.view`, and require `.edit` on
     mutation routes.
   - Add `apps/billing/src/app/api/sales-orders/...` route handlers following
     exactly how `api/quotes` is done, including the lifecycle actions and
     convert-to-invoice.
   - Add a convert-to-sales-order action on the quote detail, if quotes expose
     their other convert actions there.
   - Put status badges and actions on the detail.
   - Host tests ≥ 10, including the navigation registry→route binding test
     (`access-route-permissions.test.ts` and any nav binding test must include
     the new route).
   - Run `node scripts/check-app-structure.mjs`.
   - No green buttons. Add button is `primaryVariant="info"` with the label
     `Add`.
5. **Docs** (a separate commit group from code):
   - `docs/architecture/013-billing-commercial-platform.md`: take Orders out of
     reserved/deferred and describe what exists. Carts, checkout, reservations,
     fulfillment and channels stay deferred.
   - Update `.claude/rules/billing-commercial-platform.md` **and**
     `.agents/rules/billing-commercial-platform.md` identically. Verify with
     `cmp`.
6. **Update `plan.md`:** tick boxes to reflect reality and set the Status.

## Verification you must run and report (foreground, exact output summary)

```bash
pnpm --filter @876/billing-api db:validate
pnpm --filter @876/billing-api db:generate
pnpm --filter @876/billing-api typecheck
pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api api:contract:check
pnpm --filter @876/billing typecheck && pnpm --filter @876/billing test
pnpm --filter @876/billing-ui typecheck && pnpm --filter @876/billing-ui test
pnpm --filter @876/core typecheck && pnpm --filter @876/core test
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app lint && pnpm --filter @876/billing-app test
node scripts/check-app-structure.mjs
```

Skip `db:drift` (it reads the live DB).

## Hard rules

- **Do not commit, push, create branches, or open PRs.** The orchestrator does
  all of that.
- Do not write run logs or transcripts anywhere in the repo.
- No `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, or `as any`. Use
  `as unknown as T` only for a genuine library mismatch, and justify it in the
  report.
- Do not weaken production code or tests to get green.
- Do not touch `apps/invoice`: Sales Orders are Billing-only.
- Do not add integration-client methods, outbox events, fulfillment, payment
  allocation to orders, or stock reservation.
- Format only the files you change (`npx prettier --write <paths>`).

## Report (required)

Write `plans/2026-09-13-billing-commercial-engine-expansion/reports/codex/2026-09-13-finish-sales-orders.md`
with:
- the model used;
- each failing check and how you fixed it;
- every file changed and why;
- counted `it()` cases per phase;
- the final result of every verification command (pass/fail with counts);
- decisions you made that the brief did not settle;
- what you could not verify;
- remaining gaps and risks.

A truthful "not done" beats a confident claim.
