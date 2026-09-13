# Codex brief (pass 3): Sales Orders API and conversion test floors, list status filter

**Repo:** `/root/projects/876`, a **shared checkout**. A Commerce run is working
concurrently in `apps/commerce*`, `packages/commerce`, `packages/core/src/access`,
`apps/api/src/seeds`, the root `package.json`, `pnpm-lock.yaml`, `CLAUDE.md` and
`new-app-guide.md`. Do not touch those paths.
**Branch:** `feature/billing-commercial-engine` · **Model:** `gpt-5.6-terra`, medium effort

Passes 1 and 2 are committed (`d53c12497`). Their reports are in
`reports/codex/`. Binding context: `briefs/gpt-web/2026-09-13-orchestrator-plan-adjustments.md`
(A3–A5, A14) and `.claude/rules/testing.md`.

## Measured at `d53c12497` (orchestrator)

Green: billing-api (1049 tests), `@876/billing` (391), and the Billing app
(tsc, 1001 tests). What is missing is exactly what pass 2 reported as not done:

1. **API floor:** Sales Order API tests total 19 (15 transition + 4
   persistence) against the ≥ 30 required.
2. **Conversion floor:** 0 of ≥ 12.
3. **List status filter:** the Sales Orders list in the Billing app does not
   pass the selected `status` into the server-side list request.

## Do

1. **API tests (≥ 11 new, taking the total to ≥ 30).** Use assembled-Express
   Supertest tests for the sales-order routes, following existing patterns in
   `apps/billing-api/src/http/**/__tests__` and `src/modules/documents/**/*.test.ts`.
   Cover:
   - unauthenticated request → 401;
   - missing permission → 403;
   - another tenant's order → 404;
   - PATCH on a non-draft → the registered `billing/sales-order-invalid-state`
     conflict;
   - create validation errors;
   - list `status` and `customerId` filters reaching the repository query (assert
     the where-clause);
   - list derivation issues **one** invoice query regardless of row count (assert
     the call count).
2. **Conversion tests (≥ 12).**
   - **Quote → Sales Order:** the quote status gate; a second conversion of the
     same quote; line snapshots copied.
   - **Sales Order → Invoice:**
     - requires `confirmed`;
     - copies line snapshots including tax fields, with no repricing call;
     - sets `billingReason` to `SALES_ORDER` and `salesOrderId`;
     - a second non-void invoice returns `billing/sales-order-already-invoiced`;
     - a VOID prior invoice allows re-invoicing.
   - **Derived `paymentStatus`:** OPEN, SENT and OVERDUE → `unpaid`;
     PARTIALLY_PAID → `partially-paid`; PAID → `paid`; not invoiced → null. Also
     check `invoicingStatus`.

   Where a test exposes a real defect, **fix the code** and say so in the report.

3. **Status filter.** Make the status selected in the Sales Orders
   `StatusFilterHeading` reach the API `status` param server-side. Follow how the
   Quotes section does it; if Quotes filters client-side in the split layout
   (`app-layout.md` §5a allows that), match Quotes exactly and say so in the
   report. Add ≥ 1 test.
4. Update `plan.md` checkboxes and Status.

## Verification (foreground; report counts)

Use package scripts, or direct `npx tsc`/`npx vitest`/`npx eslint` inside the
package if pnpm is blocked by the other run's lockfile work.

```bash
pnpm --filter @876/billing-api typecheck && pnpm --filter @876/billing-api lint && pnpm --filter @876/billing-api boundaries && pnpm --filter @876/billing-api test && pnpm --filter @876/billing-api api:contract:check
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app test
```

## Hard rules

- Never run `git checkout/stash/reset/clean/commit/push`. Write no run logs.
- No `eslint-disable`, `@ts-ignore`, `@ts-expect-error` or `as any`.
- Do not weaken production code or existing tests.
- Write your report **only** to
  `plans/2026-09-13-billing-commercial-engine-expansion/reports/codex/2026-09-13-sales-orders-api-test-floors.md`,
  **not** to a root `reports/` directory. It must list counted new `it()`
  cases per area, defects found, verification results, and anything not done.
