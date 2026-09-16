# Codex brief (pass 2): Sales Orders host UI, failing app tests, API test floors

**Repo:** `/root/projects/876` · **Branch:** `feature/billing-commercial-engine`
(stay on it) · **Model:** `gpt-5.6-terra`, medium effort

Pass 1 (`reports/codex/2026-09-13-finish-sales-orders.md`) fixed the API, SDK and
contract, and those changes are committed. Its host UI is partial and still
uncommitted in the working tree: `apps/billing/src/app/(app)/(sales)/sales-orders/`,
`apps/billing/src/app/api/sales-orders/`, `lib/client/sales-orders.ts`,
`types/sales-order.ts`, and edits to `quote-actions.tsx`, `detail-data.ts`,
`document-create-form.tsx`, `resource-manifest.ts`, `lib/client/index.ts`,
`lib/client/quotes.ts` and `lib/service/index.ts`. Start from that tree and keep
what is correct.

Binding context is the same as pass 1. Read
`briefs/codex/2026-09-13-finish-sales-orders.md`,
`briefs/gpt-web/2026-09-13-orchestrator-plan-adjustments.md` (A3–A5, A11, A14)
and `.claude/rules/app-layout.md` §5a (list/detail split and the height
checklist).

## Measured state at `ad6fd9810` (orchestrator, foreground)

- Green:
  - billing-api: typecheck, lint, boundaries, `api:contract:check`, tests (1049);
  - `@876/billing` (391), `@876/billing-ui` (552), `@876/core` (1100);
  - `@876/billing-app` typecheck;
  - `node scripts/check-app-structure.mjs`.
- **`pnpm --filter @876/billing-app test`: 5 failures.** Fix the code or the
  expectation, whichever is actually wrong, and say which in your report:
  - `src/components/shell/nav-config.test.ts` → "uses only permissions in the
    Billing permission catalog"
  - `src/lib/api/contract-baseline.test.ts` → "does not document paths absent
    from the implementation inventory"
  - `src/lib/client/resources.test.ts` → "exposes every resource facade on the
    root client"
  - `src/lib/modules/catalog.test.ts` → "is derived in the same order as the
    catalog"
  - `src/app/(app)/settings/(list)/_lib/module-settings-group.test.ts` → "adds
    canonical module settings destinations"

## Scope, in order

1. **Fix the 5 failing app tests.**
2. **Rebuild the host section to match Quotes exactly.** Quotes is
   `(list)/page.tsx`, `_components/{quotes-section,quotes-list,quotes-list-data,quotes-table}.tsx`,
   a section `layout.tsx` rendering the split, and `[quoteId]/{layout,page,edit/page,_components}`.
   Sales Orders currently has a flat `page.tsx`, no `(list)` group, no list/detail
   split and no edit route.
   - Mirror the Quotes structure under `sales-orders/`, using the same shared
     components (`ListDetailSection`/`ListDetailShell`, `DetailCard`,
     `ResourceToolbar`, `StatusFilterHeading`, `DataTableSkeleton`).
   - Add `[salesOrderId]/edit` for **draft only**: the edit action is hidden
     unless the order is a draft, and the route handler/API enforce it. Use
     `DocumentLineItemsEditor` via the existing document form components.
   - The status filter (draft/confirmed/completed/canceled) is applied
     server-side by the API `status` param.
   - Show derived `invoicingStatus`/`paymentStatus` as badges in the detail. A
     linked invoice is a link.
   - Detail actions: Confirm, Cancel, Complete, Convert to invoice. Show only
     the ones valid for the status. Each action's error renders beside the
     actions (`AppError`), never as a toast.
   - Follow the height checklist in `app-layout.md` §5a.
3. **Host tests: at least 10 new `it()` cases.** Cover:
   - navigation registry → route permission binding;
   - route guard denies without `sales-orders:read` (or whatever key the host
     uses; stay consistent with existing Billing host keys);
   - mutation route handlers reject without write permission, and pass through
     with it (use the existing `access-route-permissions.test.ts` pattern);
   - status → available-actions mapping;
   - the list data component keeps the toolbar/table shell mounted on error.

   Check `apps/billing/vitest.config.ts` for the environment before writing
   component tests.
4. **API test floors (A14).** Today there are only 19 Sales Order API tests
   (15 transition, 4 persistence). Add tests until:
   - **API ≥ 30 total**, including assembled-Express Supertest tests for the
     sales-order routes (auth required, tenant isolation returns 404 for another
     tenant's order, draft-only PATCH returns the registered conflict, and the
     list `status` filter reaches the repository query);
   - **conversions ≥ 12**:
     - quote → order: gate on quote status; a second conversion of the same
       quote is rejected or replayed per the unique `quoteId`;
     - order → invoice: requires confirmed; copies line snapshots without
       repricing; sets `billingReason SALES_ORDER` and `salesOrderId`; a second
       non-void invoice returns `billing/sales-order-already-invoiced`; a VOID
       invoice allows re-invoicing;
     - derived `paymentStatus` for OPEN/SENT/OVERDUE → `unpaid`,
       PARTIALLY_PAID → `partially-paid`, PAID → `paid`, and null when not
       invoiced;
     - list derivation issues one invoice query regardless of row count
       (assert the call count).

   Look at existing Billing API test patterns (`src/modules/documents/**/*.test.ts`,
   `src/http/**/__tests__`) and match them. Pass 1 noted flaky DocumentsService
   chaos tests. Do not touch them unless your change causes the flake, and report
   whether they failed.
5. **Migration audit.** Compare
   `prisma/migrations/20260913183000_sales_orders/migration.sql` against the
   Prisma schema **by reading both**. `migrate diff --from-migrations` needs a
   shadow database, and you must not connect to any database. List any column,
   index, FK or enum mismatch and fix the SQL. Then run
   `pnpm --filter @876/billing-api db:validate`.
6. **Update `plan.md`** checkboxes and Status to match reality.

## Verification (run all, foreground, and report pass/fail with counts)

```bash
pnpm --filter @876/billing-api typecheck
pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api api:contract:check
pnpm --filter @876/billing typecheck && pnpm --filter @876/billing test
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app lint
pnpm --filter @876/billing-app test
node scripts/check-app-structure.mjs
```

## Hard rules

- **Do not commit, push, branch, or open PRs.** Write no run logs.
- No new `eslint-disable`, `@ts-ignore`, `@ts-expect-error` or `as any`.
- Do not weaken tests or production signatures to get green.
- Do not touch `apps/invoice`, `docs/architecture/025-*`, or
  `.claude/rules/product-lineup.md`.
- Format only the files you changed.

## Report

Write `reports/codex/2026-09-13-sales-orders-host-and-test-floors.md` with:
- the model used;
- each fix and whether it was a code or a test defect;
- the files changed;
- **counted** new `it()` cases per area (API, conversions, host), and the new
  totals;
- the full verification results;
- migration audit findings;
- anything not done.
