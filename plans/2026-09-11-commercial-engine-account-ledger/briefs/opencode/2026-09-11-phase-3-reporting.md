# Codex brief — Phase 3: Reporting data plane (backend + SDK + settings)

Run: `plans/2026-09-11-commercial-engine-account-ledger/` · Branch:
`feat/commercial-engine-account-ledger` (checked out; do not create/switch/push
branches). **Do not commit.** No AI attribution. Phases 1–2 (engine
correctness, recurring invoices) are on the branch already.

## Read first (binding)

`CLAUDE.md`, `.agents/rules/ai-code-quality.md`, `express-api.md`,
`api-backend.md`, `billing-data-plane.md`, `billing-commercial-platform.md`,
`module-settings.md`, `sdk-conventions.md`, `stripe-api-pattern.md`,
`naming.md`, `testing.md`, `error-handling.md`, `apps/billing/docs/accounting-model.md`
(sections 8–10), and `plan.md` → "Key design decisions" item 5.

## Premises (verified by the orchestrator)

- `apps/billing-api/src/modules/reporting/` has one internal admin route,
  `GET /internal/projections/tenants/:tenantId/dashboard`, whose repository
  loads **every** subscription (with items + prices) and **every** finalized
  invoice for the tenant into memory and aggregates in JS. It excludes Sales
  Receipts and credit notes and has no date range. `apps/billing` calls it via
  `service.dashboard.overview` in `apps/billing/src/lib/service/index.ts`
  (internal credential).
- There is **no tenant timezone** in Billing (`Tenant` has country/currency
  only). Core's organization has `timezone`, but Billing must not call Core for
  this.
- Tenant module preferences already exist: `ModulePreference` table, catalog in
  `packages/billing/src/settings-catalog.ts`, resolution pattern in
  `modules/catalog/repositories/item-preferences.ts` (missing row = default;
  only overrides stored). Canonical module identities live in
  `packages/core/src/modules.ts` (`FINANCE_MODULES`); `reports` is not there yet
  although both apps already gate Reports with a permission (`reports:read` in
  Billing, `reports.view` in Invoice).
- Date/amount sources: `Invoice.issueAt`/`status`/`totalAmount`/`taxAmount`/
  `discountAmount`; `SalesReceipt.receiptAt`/`status (PAID|VOID)`;
  `CreditNote.issueAt`/`status`; `Payment.paymentDate`/`status`/`amount`
  (and Sales-Receipt-linked payments are excluded from "Payments Received"
  surfaces — find how); `Refund.refundedAt`/`amount`; lines carry `itemId`,
  `variantId`, `quantity`, `totalAmount` on invoice, sales-receipt and
  credit-note lines. Missing indexes: invoices `(tenant_id, issue_at)`,
  credit notes `(tenant_id, issue_at)`, refunds `(tenant_id, refunded_at)`,
  invoice/sales-receipt/credit-note lines `(item_id)`.
- The customer account projection (`modules/customers/customer-account.*`)
  already exposes `lifetimeBilled`, `lifetimePaid`, outstanding, overdue,
  available credit; the accounting doc explicitly anticipates a
  `lifetimeSales` that includes Sales Receipts.

## Definitions (fixed — implement exactly, document in accounting-model.md)

- **Sales (gross)** = finalized, non-void invoices (`status` in the collectible
  or settled set, i.e. not `DRAFT`/`VOID`; `UNCOLLECTIBLE` still counts — the
  sale happened) by `issueAt` **+** non-void Sales Receipts by `receiptAt`.
  Use pre-tax `subtotal − discount` as `netAmount` and keep `taxAmount` and
  `totalAmount` separately so reports can show both.
- **Credits** = non-void credit notes by `issueAt`.
- **Net sales** = gross − credits (per currency, never summed across currencies).
- **Cash received** = succeeded/partially-refunded/refunded payments by
  `paymentDate` (exclude reversed/failed), split into `payments` (receivables
  cash) and `salesReceipts` (immediate-sale cash). **Refunds** by `refundedAt`.
  **Net cash** = received − refunds.
- **Receivables aging** as-of a date: open collectible invoices' `amountDue`
  bucketed by days past `dueAt`: `current`, `1-30`, `31-60`, `61-90`, `90+`.
- All money is minor-unit **strings**, grouped **per currency**. Never convert.

## Tasks

### 1. `reports` settings module

- Add `reports` to `FINANCE_MODULES` in `packages/core/src/modules.ts` (label
  "Reports", short description) and to the Billing settings catalog as
  `optional: false, enabledByDefault: true` with preferences:
  - `timezone` — `string`, default `America/Jamaica`, validated as an IANA zone
    (`Intl.supportedValuesOf('timeZone')` or a `try { new Intl.DateTimeFormat(…, { timeZone }) }` check);
  - `fiscal-year-start-month` — `integer` 1–12, default `1`.
  Keep existing anti-drift/catalog tests green; add the permission-key
  alignment only if the catalog test requires it.
- Billing API: `GET/PATCH /report-preferences` (+ integration mirror) following
  `item-preferences` exactly (store only overrides, missing = default).

### 2. Reporting service (extend `modules/reporting`, do not add a second module)

Tenant session routes under `/reports/*` and integration mirrors under
`/integrations/organizations/:organizationId/reports/*` (scope: reuse an
existing read scope that already grants invoices/sales — pick the narrowest
existing one and justify it; **no new scopes**). Endpoints:

| Route | Params | Returns (`object`) |
| --- | --- | --- |
| `GET /reports/sales-summary` | `from`, `to` (unix s, `to` exclusive, max 400 days), `groupBy` = `day`\|`week`\|`month`\|`none`, optional `customerId`, `itemId` | `sales-summary`: `{ timezone, from, to, groupBy, currencies: [{ currency, totals, buckets: [{ start, end, invoices: {count, netAmount, taxAmount, totalAmount}, salesReceipts: {…}, creditNotes: {…}, netSales }] }] }` |
| `GET /reports/cash-summary` | same range/groupBy, optional `customerId` | `cash-summary`: payments, salesReceipts, refunds, netCash per bucket per currency |
| `GET /reports/receivables-aging` | `asOf` (default now), optional `customerId`, `limit` for top customers | `receivables-aging`: per currency buckets + top customers by outstanding |
| `GET /reports/item-sales` | range, optional `itemId`, `limit` (≤100), cursor-free top-N | `item-sales`: per item (+variant) per currency `{ quantitySold, quantityReturned, netAmount, documentCount }` |
| `GET /reports/customer-sales` | range, `limit` (≤100) | `customer-sales`: top customers per currency with net sales |

Rules:
- Aggregate **in SQL** (`$queryRaw` with `Prisma.sql`, or Prisma `groupBy`) —
  never load rows to sum in JS. Bucket boundaries computed in the tenant
  timezone (`date_trunc(…, to_timestamp(x) AT TIME ZONE tz)`), and returned as
  unix seconds of the bucket start/end instants. Empty buckets are emitted
  (zero-filled) for `day`/`week`/`month` so charts need no gap-filling.
- Weeks start Monday. `fiscal-year-start-month` is exposed on the summary
  response for hosts but does not change `month` bucketing.
- Tenant isolation in every query; reject `from >= to` and oversized ranges
  with registered 422 errors.
- Only repositories touch Prisma; the service composes.
- Add the indexes above in a hand-written migration
  `prisma/migrations/20260911160000_reporting_indexes/migration.sql` (verify
  with `prisma migrate diff`).

### 3. Dashboard projection rewrite

Keep the internal dashboard route and its response contract (additive fields
only) but back it with SQL aggregates: subscription counts via `groupBy`, MRR/
ARR computed in SQL or from a bounded aggregate query (no unbounded row load),
issued/outstanding invoice totals via `groupBy(currency)`. Add additive
`salesThisMonth` (net sales per currency, month-to-date in tenant timezone,
reusing the sales-summary repository) and `receivablesOverdue` per currency.

### 4. Customer & item projections

- Customer account projection: add `lifetimeSales` (per the Sales definition,
  in the account currency or per currency — follow the projection's existing
  currency handling), `lifetimeCredits`, and `lastSaleAt`, reusing the
  sales-summary repository with `customerId`. Additive; SDK schema updated.
- Item: `GET /items/:itemId/sales-summary` (range optional → default last 12
  months) returning the `item-sales` row for that item plus monthly buckets —
  implement by calling the same service with `itemId`, not a new query.

### 5. SDK (`packages/billing`)

`reports` resource (`salesSummary`, `cashSummary`, `receivablesAging`,
`itemSales`, `customerSales`), `reportPreferences` (`retrieve`, `update`),
`items.salesSummary`, and the additive customer-account fields — at the
session/tenant client and the integration entrypoint, mirroring how
`sales-receipts` is exposed. Zod parse every response; money stays strings.

## Tests (minimum counts — count and report)

- definitions/SQL correctness (repository tests against the existing test DB
  harness if one exists; otherwise query-builder/unit tests plus service tests
  with fixtures): ≥ 14 — void invoice excluded, draft excluded,
  uncollectible included, sales receipt included, void receipt excluded, credit
  note subtracted, multi-currency never merged, timezone bucket edge (23:30
  Jamaica on the last day of a month lands in that month), zero-filled buckets,
  Monday week start, range validation (from ≥ to, > 400 days), tenant
  isolation, customer filter, item filter.
- cash summary: ≥ 5 (sales-receipt cash separated, refunds subtracted, reversed
  payments excluded, …).
- aging: ≥ 5 (each bucket boundary incl. day 0/1/30/31/90/91).
- item sales: ≥ 4 (returns via credit-note lines, variants separated, limit).
- dashboard: ≥ 3 (contract unchanged + additive fields; no unbounded findMany —
  assert the repository no longer uses `findMany` over subscriptions/invoices).
- preferences: ≥ 5 (default, override stored, reset removes row, invalid
  timezone 422, month bounds).
- routes via Supertest: ≥ 6 (auth tiers, integration scope, 422 envelopes
  without `httpStatus` leak).
- SDK: ≥ 8.

## Must not

No UI (Phase 4). No new permission keys or integration scopes. No FX
conversion. No `eslint-disable` / `as any` / `@ts-ignore`. No JS-side summing of
unbounded row sets. Do not touch `apps/billing` or `apps/invoice` except their
settings catalog consumers if a catalog test forces it.

## Verification (foreground, paste results)

```bash
pnpm --filter @876/billing-api db:generate && pnpm --filter @876/billing-api db:validate
pnpm --filter @876/billing-api typecheck
pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api api:contract:generate && pnpm --filter @876/billing-api api:contract:check
pnpm --filter @876/core test
pnpm --filter @876/billing typecheck && pnpm --filter @876/billing test
grep -rn "eslint-disable\|as any\|@ts-ignore" apps/billing-api/src packages/billing/src packages/core/src
```

## Report

`plans/2026-09-11-commercial-engine-account-ledger/reports/codex/2026-09-11-phase-3-reporting.md`
— files + why, migration SQL, the scope you reused and why, open decisions,
counted `it()` per group, verification output, what you could not do. Also
update `apps/billing/docs/accounting-model.md` with a "Reporting definitions"
section. No run logs.
