# Phase 3 report — Reporting data plane (backend + SDK + settings)

- Run: `plans/2026-09-11-commercial-engine-account-ledger/`
- Branch: `feat/commercial-engine-account-ledger` (not created/switched/pushed; **nothing committed**)
- Delegate: opencode, brief `briefs/opencode/2026-09-11-phase-3-reporting.md`

## What was built

**1. `reports` settings module.**
`packages/core/src/modules.ts` gains `FINANCE_MODULES.reports` ("Reports",
"Review sales, cash, receivables, and subscription reports."). Registries and
commercial key lists are untouched, so no registry-order test changes were
needed. `packages/billing/src/settings-catalog.ts` gains the Billing-only
`reports` module as `optional: false, enabledByDefault: true` with
`timezone` (string, `America/Jamaica`) and `fiscal-year-start-month`
(integer 1–12, default 1, min/max bounded). Billing API
`GET/PATCH /report-preferences` (+ integration mirror) follows
`item-preferences` exactly: `ModulePreference` overrides only, missing row =
default, default-equivalent writes delete the row. Timezone validated as IANA
(`Intl.supportedValuesOf('timeZone')` with `Intl.DateTimeFormat` fallback);
malformed persisted rows degrade to defaults per module-settings resolution.

**2. Reporting service (same `modules/reporting`, no second module).**
Tenant routes under `/reports/*` plus `GET /items/:itemId/sales-summary` and
`GET/PATCH /report-preferences`; integration mirrors under
`/integrations/organizations/:organizationId/...`. New files:
`reporting.schemas.ts` (Zod query/response contracts, camelCase, kebab-case
`object` discriminators exactly as briefed), `reporting.repository.ts` (all
Prisma access; `$queryRaw` aggregates + bounded `groupBy`/counts, never
`findMany` over documents), `reporting.service.ts` (composition, range
validation, bucket alignment), `reporting.controller.ts`,
`report-preferences.repository.ts`, `mrr.ts` (the one shared annualising
rule). `reporting.routes.ts` keeps the internal dashboard route and adds
`createReportingRouter`, registered in `http/routes.ts`. Bucketing is
`date_trunc(…, to_timestamp(x) AT TIME ZONE tz)` in SQL (weeks start Monday),
bucket start/end returned as unix seconds, spines zero-filled from SQL
`generate_series`. `fiscal-year-start-month` is exposed on summaries and does
not alter month bucketing. Ranges reject `from >= to` and > 400 days with
`validation/invalid-request` (422, no `httpStatus` leak).

**2b. Subscriptions.** `sales-summary` invoice totals and buckets carry a
`bySource` split (`subscription` / `recurring-invoice` / `one-off`;
`OPENING_BALANCE` excluded from sales and documented).
`GET /reports/subscription-summary` returns current counts + shared MRR/ARR
per currency, per-bucket `new`/`canceled`/`ended`/`paused` (from
`startAt ?? createdAt` / `canceledAt` / `endedAt` / `pausedAt`),
subscription-source revenue, and `churnRate` (canceled ÷ active-at-start,
`null` on zero denominator). Historical MRR is not reconstructed (documented:
no subscription-history snapshots exist).

**3. Dashboard rewrite.** `dashboardOverview` keeps its contract and adds
`salesThisMonth` (MTD net sales per currency via the sales-summary
repository) and `receivablesOverdue` per currency. Subscription counts and
invoice totals come from bounded `groupBy`; MRR/ARR from the shared
`currentMrrByCurrency` SQL aggregate. No `findMany` remains.

**4. Customer & item projections.** `customer_account` gains `lifetimeSales`
(invoice + receipt nets), `lifetimeCredits` (issued credit-note totals),
`lastSaleAt`, `activeSubscriptionCount`, and per-currency `subscriptionMrr`
(all via the sales-summary/MRR repositories; single-string convention follows
the projection's existing handling, documented). `GET
/items/:itemId/sales-summary` defaults to the last 365 days and reuses the
same service with `itemId` (rows + per-currency monthly buckets).

**5. SDK (`packages/billing`).** `reports` (6 methods incl.
`subscriptionSummary`), `reportPreferences` (`retrieve`/`update`),
`items.salesSummary`, and the additive customer-account fields, on both the
tenant client and the integration entrypoint, mirroring `sales-receipts`.
Every response Zod-parsed; money stays strings.

## Migration SQL

`prisma/migrations/20260911160000_reporting_indexes/migration.sql`
(all `IF NOT EXISTS`):

```sql
CREATE INDEX IF NOT EXISTS "billing_invoices_tenant_id_issue_at_idx"
  ON "billing_invoices" ("tenant_id", "issue_at");
CREATE INDEX IF NOT EXISTS "billing_credit_notes_tenant_id_issue_at_idx"
  ON "billing_credit_notes" ("tenant_id", "issue_at");
CREATE INDEX IF NOT EXISTS "billing_refunds_tenant_id_refunded_at_idx"
  ON "billing_refunds" ("tenant_id", "refunded_at");
CREATE INDEX IF NOT EXISTS "billing_invoice_lines_item_id_idx"
  ON "billing_invoice_lines" ("item_id");
CREATE INDEX IF NOT EXISTS "billing_sales_receipt_lines_item_id_idx"
  ON "billing_sales_receipt_lines" ("item_id");
CREATE INDEX IF NOT EXISTS "billing_credit_note_lines_item_id_idx"
  ON "billing_credit_note_lines" ("item_id");
```

Matching `@@index` entries were added to `invoice.prisma`,
`credit-note.prisma`, `refund.prisma`. Verified with
`prisma migrate diff --from-empty --to-schema prisma/schema --script`, which
renders exactly these three new index names (the line `item_id` indexes
already existed, so their statements are documented no-ops). No live Postgres
is reachable in this environment, so `db:drift` against a real database and a
shadow-DB `migrate diff` of this single migration were not possible; the
Neon billing database still needs the migration applied at deploy time.

## Scope reused (no new scopes, no new permission keys)

- Tenant `/reports/*`, `/items/:itemId/sales-summary`,
  `GET /report-preferences`: existing `reports:read` (read-only finance
  permission both hosts already gate Reports with).
- Tenant `PATCH /report-preferences`: also `reports:read`. The finance
  catalog keeps `reports` read-only, so no `reports:write` exists; creating
  one would be a new permission key, which the brief forbids.
- Integration mirrors (reports + preferences): `billing.invoices.read` /
  `.write`. Justification: reports are read-only derivatives of the invoice,
  sales-receipt, credit-note, payment, and refund facts; `billing.invoices.read`
  is the narrowest existing scope whose holders already receive the invoice
  sales surface (the dominant input, including allocation-linked payment and
  credit data). Trade-off: holders of only `billing.sales-receipts.read`
  cannot call reporting without the invoices scope.

## Open decisions

- Credit-note net uses `subtotal_amount` (no discount column exists).
- Issued credit notes = `OPEN`/`CLOSED` (`DRAFT`/`VOID` excluded); payments
  counted = `SUCCEEDED`/`PARTIALLY_REFUNDED`/`REFUNDED`.
- `sales-summary` with `itemId` matches whole invoices having ≥ 1 line with
  that item (`EXISTS`); line-level precision lives in `item-sales`.
- `churnRate` decimal string uses up-to-6-decimal trimmed form (`0.25`,
  `0.333333`).
- Tenant preference PATCH behind `reports:read` (see above); revisit if a
  `reports:write` key is ever introduced through the coordinated migration.
- Customer `lifetimeSales`/`lifetimeCredits` sum across currencies into one
  string, following the projection's existing single-currency convention
  (as `lifetimeBilled` already does).

## Test counts (`it()` per group, all passing)

| Group | `it()` | Floor |
| --- | --- | --- |
| definitions/SQL correctness (`reporting.definitions`) | 14 | 14 |
| cash summary (`reporting.summary` 3 + `reporting.cash` 6) | 9 | 5 |
| aging (`reporting.aging`) | 8 | 5 |
| item sales (`reporting.items`) | 6 | 4 |
| dashboard (`reporting.dashboard`) | 4 | 3 |
| preferences (`report-preferences`) | 7 | 5 |
| routes via Supertest (`reporting.routes`) | 8 | 6 |
| §2b extra (`reporting.subscriptions` 5 + `reporting.subscription-summary` 5) | 10 | 8 |
| SDK (`packages/billing` `reports`) | 11 | 8 |
| customer projection additive (in `customer-account.service`) | 2 new | — |

Repository tests mock `@/db/client` (the established pattern — no live-DB
harness exists); SQL text/values are asserted for status sets, tenant
isolation, timezone bucketing, bucket boundaries, filters, and limits, while
service tests use fixtures over mocked repositories.

## Verification output (foreground)

```text
pnpm --filter @876/billing-api db:generate && pnpm --filter @876/billing-api db:validate
# Generated Prisma Client (7.9.1); schemas valid
pnpm --filter @876/billing-api typecheck        # clean
pnpm --filter @876/billing-api lint             # 0 errors, 3 pre-existing warnings
pnpm --filter @876/billing-api boundaries       # no violations (631 modules)
pnpm --filter @876/billing-api test             # 105 files, 941 tests passed
pnpm --filter @876/billing-api api:contract:generate && api:contract:check
# regenerated frozen contract + manifest; 0 missing/extra/changed
pnpm --filter @876/core test                    # 42 files, 1096 tests passed
pnpm --filter @876/billing typecheck            # clean
pnpm --filter @876/billing test                 # 36 files, 358 tests passed
grep eslint-disable|as any|@ts-ignore on src trees
# only pre-existing hits (generated Prisma client, older payment-method/intent
# and core fuzz/weird tests); none in new or edited files
```

Also ran `apps/billing` `catalog.test.ts` (forced pin update): 9 passed.

## What was not done / could not be verified

- No UI (Phase 4), no FX, no new permission keys/scopes, no `eslint-disable` /
  `as any` / `@ts-ignore` in new code, no JS-side summing of unbounded sets.
- Untouched per concurrency guard: `billing-engine/**`, all
  `recurring-invoices.*` and recurring schedules/schemas/tests,
  `packages/billing-ui`, `apps/invoice`, `packages/billing/src/navigation.ts`;
  in `packages/billing` only resources/schemas/settings-catalog/types plus
  the two-line client entrypoint wirings were touched. `apps/billing` only
  for the required accounting-model doc and the forced catalog pin.
- `apps/billing/docs/accounting-model.md` gained section 11 ("Reporting
  definitions").
- Auth-matrix pin moved 315 → 333 (18 new public operations: 9 tenant + 9
  integration).
- Could not run reporting SQL against a live database (no Postgres here);
  SQL was reviewed against the Prisma schema and the `migrate diff` render,
  but Neon behavior (e.g. `date_trunc` param binding, enum literal
  comparisons) should get one integration pass when a database is available.
- Not committed, no branches created/switched, nothing pushed, per brief.
