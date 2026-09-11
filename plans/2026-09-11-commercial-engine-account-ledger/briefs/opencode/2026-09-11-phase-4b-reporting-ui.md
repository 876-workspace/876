# Codex brief — Phase 4b: Reporting UI (reports pages, dashboard, customer & item overviews, report settings)

Run: `plans/2026-09-11-commercial-engine-account-ledger/` · Branch:
`feat/commercial-engine-account-ledger` (checked out; do not create/switch/push
branches). **Do not commit.** No AI attribution. Phase 3 put the reporting API,
`reports` settings module and SDK (`reports.*`, `reportPreferences`,
`items.salesSummary`, customer-account `lifetimeSales`) on this branch — read
`reports/opencode/2026-09-11-phase-3-reporting.md` for the real method names and
shapes before writing anything.

Another Codex run (Phase 4a, recurring invoices UI + navigation) may be editing
the tree concurrently. **Stay inside the scope below.** Never edit
`packages/billing/src/navigation.ts`, `**/recurring-invoices/**`, invoice
detail pages, or `packages/billing-ui/src/recurring-invoice*`.

## Read first (binding)

`CLAUDE.md` (UI Copy, UI Design, Loading States), `.agents/rules/app-structure.md`,
`app-layout.md`, `shared-product-ui.md`, `finance-app-parity.md`,
`data-loading.md`, `error-handling.md`, `module-settings.md` (settings nav),
`access-control.md`, `testing.md`, and the `dataviz` guidance below.

## Scope

### 1. Shared report panels (`packages/billing-ui/src/panels/`, new files)

Panels render plain props with a discriminated `state` (`ready | empty | error`),
own their skeletons, take href builders as props, never fetch:

- `sales-summary-panel.tsx` — per-currency totals (invoices split by source:
  subscription / recurring / one-off; sales receipts; credit notes; **net
  sales**) + a bar chart of `netSales` per bucket.
- `cash-summary-panel.tsx` — payments, sales-receipt cash, refunds, net cash.
- `receivables-aging-panel.tsx` — bucket bars (current / 1–30 / 31–60 / 61–90 /
  90+) + top customers table (customer name links via href prop).
- `subscription-summary-panel.tsx` — current active/trialing/paused, MRR/ARR,
  new vs canceled per bucket (paired bars), churn rate for the range.
- `item-sales-panel.tsx` — top items table (qty sold, qty returned, net amount).
- `customer-sales-summary-panel.tsx` — lifetime sales, lifetime credits, last
  sale date, sales in the selected range with monthly bars.
- `item-sales-summary-panel.tsx` — quantity sold/returned and net sales with
  monthly bars.

Charts: check whether the repo already has a chart primitive (`grep -rn
"recharts\|<svg" packages/ui/src packages/billing-ui/src`). Reuse it if present;
otherwise render simple accessible inline-SVG/CSS bars in `@876/ui` style — **do
not add a charting dependency**. Every bar has an accessible label with the
formatted value. One series colour from the design tokens; no green bars
(green is status-only). Money formatting via the existing shared formatter —
never `Number()` on a minor-unit string for display maths; bar heights may use
a BigInt ratio converted once to a percentage.

Multi-currency: render one block per currency; never add currencies together.

### 2. Reports pages (both apps — parity)

`/reports` in `apps/billing` and `apps/invoice`: keep the existing toolbar /
heading chrome real; add a date-range control (presets: Today, This week, This
month, Last month, This quarter, This year, Custom) that writes `from`/`to`/
`groupBy` to the URL (server-resolved in the page, tenant timezone from report
preferences for preset boundaries — compute presets server-side through a
small pure helper with tests, not in the browser clock); each panel in its own
`<Suspense>` (independent boundaries — a slow aging query must not block the
sales panel). Replace Billing's current two `ReportCard`s and Invoice's empty
state. Guards unchanged (`reports:read` / `reports.view`).

### 3. Billing dashboard (`apps/billing/src/app/(app)/(overview)/page.tsx`)

Keep existing metric cards; add "Sales this month" (from the additive
dashboard field or `reports.salesSummary`) and "Overdue receivables" cards and
a compact sales-summary panel for the last 30 days, each in its own Suspense
boundary. Remove the prose sub-lines under section headings while touching them
(`CLAUDE.md` UI Copy).

### 4. Customer overview (both apps)

The Billing reports page also renders `SubscriptionSummaryPanel` (Billing only —
Invoice has no subscriptions module; that is the sanctioned product difference).

Add `CustomerSalesSummaryPanel` (including active subscription count and MRR
when non-zero, Billing host only) beside the existing receivables panel on the
customer overview route, in its own Suspense boundary, fed by the extended
customer account projection / sales summary with `customerId`.

### 5. Item overview (both apps)

Add `ItemSalesSummaryPanel` to the item overview route in its own Suspense
boundary, fed by `items.salesSummary`.

### 6. Report settings

Settings page for the `reports` module (timezone select from a curated
`Intl.supportedValuesOf('timeZone')` list with search, fiscal-year start
month select) at `/settings/modules/reports` or wherever each host renders
module preference pages today — follow the existing module-settings page
pattern (e.g. items/product-variants or quotes preferences). Mutation via the
host's thin route handler → `reportPreferences.update`.

## Tests (minimum counts — count and report)

- panels: ≥ 18 (each: ready/empty/error distinct; multi-currency blocks; bar
  accessible labels; href props used; no currency summing).
- preset range helper: ≥ 8 (each preset in `America/Jamaica`, month/year
  boundaries, Monday week start, custom range validation).
- each host: ≥ 6 (reports page threads URL params into SDK calls exactly;
  independent boundaries render error in one panel without hiding others;
  customer & item overview panel data wiring; settings route handler authorizes
  then updates once).

## Must not

No new dependencies, no green buttons/bars, no prose under headings, no
client-side fetch for initial data, no `eslint-disable`/`as any`/`@ts-ignore`,
no edits to `apps/billing-api`.

## Verification (foreground, paste results)

```bash
pnpm --filter @876/billing-ui typecheck && pnpm --filter @876/billing-ui test
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app test
pnpm check:transpile
node scripts/check-app-structure.mjs
grep -rn "eslint-disable\|as any\|@ts-ignore" packages/billing-ui/src apps/billing/src apps/invoice/src
```

## Report

`reports/opencode/2026-09-11-phase-4b-reporting-ui.md` — files + why, decisions,
counted `it()` per group, verification output, gaps. No run logs.
