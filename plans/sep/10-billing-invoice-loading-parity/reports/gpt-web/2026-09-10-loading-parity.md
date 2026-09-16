# GPT Web Report: Billing and Invoice Loading Parity

**Run:** `2026-09-10-billing-invoice-loading-parity`  
**Branch:** `perf/billing-invoice-loading-parity`  
**Base:** `main` at `2db0b39b217d76d5a41c4604122e60ba0176c7cb`  
**Status:** implementation complete; local verification pending

## Summary

Billing and Invoice customer/item detail routes now follow the Console loading contract more consistently: stable detail chrome and tabs stay available while live regions resolve behind Suspense; current placeholder tabs no longer render blank pages; Billing item pages no longer wait at the top-level page boundary for item data; and Invoice item header/body retrieval is request-deduplicated through React `cache()`.

The work deliberately treats today's page content as provisional. Skeletons match the current UI closely enough to preserve structure and avoid blank navigation states, but no future Invoice/Quote document-view layout was designed or implemented.

## Phase Status and Test Count

| Phase | Status | New `it()` cases |
| --- | --- | ---: |
| Shared customer placeholder/skeleton reuse | complete | 2 |
| Billing + Invoice customer tab loading coverage | complete | 2 |
| Billing item Overview/Prices/Transactions/Audit streaming | complete | 10 |
| Invoice item Overview streaming + request deduplication | complete | 6 |
| **Total** | **complete** | **20** |

The counts above are literal new `it()` blocks added in this run. Tests were **not executed; verification is the orchestrator's**.

## What Changed

### Shared Billing UI

- `packages/billing-ui/src/panels/customer-timeline-panel.tsx`
  - Added caller-owned `title` and `emptyMessage` props while preserving Activity defaults.
  - Made the existing skeleton accept the same title, so placeholder tabs can render a shape-matched panel without duplicating product UI in each host.
- `packages/billing-ui/src/panels/customer-timeline-panel.test.tsx`
  - Added coverage for caller-owned empty copy and caller-owned skeleton titles.

### Billing customer detail

- `apps/billing/src/app/(app)/customers/[customerId]/subscriptions/page.tsx`
- `apps/billing/src/app/(app)/customers/[customerId]/requests/page.tsx`
- `apps/billing/src/app/(app)/customers/[customerId]/mails/page.tsx`
- `apps/billing/src/app/(app)/customers/[customerId]/activity/page.tsx`
  - Replaced literal `return null` routes with honest empty placeholder panels using the shared finance panel owner.
- `apps/billing/src/app/(app)/customers/[customerId]/subscriptions/loading.tsx`
- `apps/billing/src/app/(app)/customers/[customerId]/requests/loading.tsx`
- `apps/billing/src/app/(app)/customers/[customerId]/mails/loading.tsx`
- `apps/billing/src/app/(app)/customers/[customerId]/activity/loading.tsx`
  - Added leaf-level, title-correct loading panels for the unfinished tabs.
- `apps/billing/src/app/(app)/customers/[customerId]/layout.test.tsx`
  - Added a regression assertion that placeholder tabs cannot regress to `return null` and must keep their leaf loading skeleton.

The existing Billing customer Overview, Transactions, and Statement routes already used the desired inner Suspense pattern, so they were intentionally left alone.

### Invoice customer detail

- `apps/invoice/src/app/(app)/customers/[customerId]/requests/page.tsx`
- `apps/invoice/src/app/(app)/customers/[customerId]/mails/page.tsx`
- `apps/invoice/src/app/(app)/customers/[customerId]/activity/page.tsx`
  - Replaced literal `return null` routes with shared empty placeholder panels.
- `apps/invoice/src/app/(app)/customers/[customerId]/requests/loading.tsx`
- `apps/invoice/src/app/(app)/customers/[customerId]/mails/loading.tsx`
- `apps/invoice/src/app/(app)/customers/[customerId]/activity/loading.tsx`
  - Added leaf-level placeholder skeletons.
- `apps/invoice/src/app/(app)/customers/[customerId]/layout.tsx`
  - Replaced the generic bordered-div customer header fallback with a real `DetailCardHeader` skeleton matching the loaded header chrome, including the close affordance and action footprint.
- `apps/invoice/src/app/(app)/customers/[customerId]/layout.test.tsx`
  - Added a regression assertion for visible placeholder content plus leaf loading skeletons.

The existing Invoice customer Overview, Transactions, and Statement routes already streamed their live data behind dedicated skeletons and were intentionally preserved.

### Billing item detail

- `apps/billing/src/app/(app)/items/[itemId]/page.tsx`
  - Converted the top-level Item Overview page from blocking async rendering to a synchronous shell with `ItemOverviewData` behind Suspense.
  - Added a route-local skeleton matching the current metric cards, stock section, item-workspace rows, and item-information facts.
- `apps/billing/src/app/(app)/items/[itemId]/page.test.tsx`
  - Added coverage for a synchronous page shell, dedicated fallback, and live reads living inside the streamed data child.
- `apps/billing/src/app/(app)/items/[itemId]/prices/page.tsx`
  - Converted the blocking page to a synchronous shell with `ItemPricesData` behind Suspense.
  - Added a six-column `DataTableSkeleton` matching the actual Prices table columns.
  - Preserved concurrent item validation and price listing through `Promise.all`.
- `apps/billing/src/app/(app)/items/[itemId]/prices/page.test.tsx`
  - Added coverage for the synchronous shell, real table skeleton columns, and concurrent requests.
- `apps/billing/src/app/(app)/items/[itemId]/transactions/page.tsx`
  - Moved item/context validation behind Suspense while preserving the current empty-state content.
  - Added a placeholder-shaped fallback rather than inventing transaction functionality.
- `apps/billing/src/app/(app)/items/[itemId]/transactions/page.test.tsx`
  - Added coverage for the synchronous shell and fallback.
- `apps/billing/src/app/(app)/items/[itemId]/audit/page.tsx`
  - Moved item/context resolution behind Suspense and added an Audit Trail skeleton that preserves the real labels while only shimmering the values.
- `apps/billing/src/app/(app)/items/[itemId]/audit/page.test.tsx`
  - Added coverage for the synchronous shell and label-preserving skeleton.

Billing's existing `resolveItem` already uses React `cache(service.items.retrieve)`, so the existing request-deduplication owner was reused instead of adding another helper.

### Invoice item detail

- `apps/invoice/src/app/(app)/_lib/detail-data.ts`
  - Added `resolveItemDetail(itemId)` using React `cache()` with a primitive cache key.
  - The resolver uses the existing Invoice facade, performs one item retrieve, and returns both the facade and result so header/body consumers share the same request-scoped work.
- `apps/invoice/src/app/(app)/_lib/detail-data.test.ts`
  - Added coverage for React caching, primitive cache arguments, and use of the existing Invoice facade.
- `apps/invoice/src/app/(app)/items/[itemId]/layout.tsx`
  - Kept the layout limited to `params` + static tab construction.
  - Switched the streamed item header to the request-cached detail resolver.
  - Improved the header fallback to use the real `DetailCardHeader`/`DetailCardIcon` structure and preserve action/close footprints.
- `apps/invoice/src/app/(app)/items/[itemId]/page.tsx`
  - Converted Item Overview from a blocking top-level async page to a synchronous shell with `ItemOverviewData` behind Suspense.
  - Reused the same cached detail resolver as the header.
  - Added a route-local DetailCard-body skeleton matching the current headline, description, stock, item, and billing sections.
- `apps/invoice/src/app/(app)/items/[itemId]/page.test.tsx`
  - Added coverage for the synchronous shell, dedicated skeleton, and use of the cached resolver rather than a second direct item retrieve.

Invoice Item Transactions remains a static empty-state route with no live I/O. No fake Suspense or fake delay was added merely for visual symmetry.

### Planning

- `plans/2026-09-10-billing-invoice-loading-parity/plan.md`
  - Tracks the implementation scope, constraints, decisions, and orchestrator verification commands.
- `plans/2026-09-10-billing-invoice-loading-parity/reports/gpt-web/2026-09-10-loading-parity.md`
  - This report.

## Decisions Made

1. **No parent `[customerId]/loading.tsx` or `[itemId]/loading.tsx` was added.** Those detail segments own multiple child routes/tabs. The repository's navigation rule warns against broad loading boundaries that cover nested layouts/routes and produce misleading or stacked fallbacks. The implemented pages instead use inner Suspense around real live regions, and the unfinished customer tabs receive leaf `loading.tsx` files where the fallback is unambiguous.
2. **No fake async work was added to placeholder tabs.** A route that has no live data renders its honest empty placeholder immediately. Suspense remains tied to actual asynchronous work.
3. **Shared customer placeholder presentation stays in `@876/billing-ui`.** Billing and Invoice render the same product-domain concept, so the existing product UI owner was extended instead of copying panels into both apps.
4. **Item skeletons remain host/route-local for now.** Billing and Invoice currently render meaningfully different Item bodies. Sharing those skeletons now would turn provisional page designs into a premature cross-app contract.
5. **Invoice item detail reads are deduplicated request-locally, not globally cached.** The new resolver follows the repository's React `cache()` rule and uses a primitive `itemId` argument.
6. **`NavProgress` was not changed.** Both Billing and Invoice already mount the shared navigation progress component in their app shells.
7. **Authorization remains blocking.** Billing's workspace context and Invoice's context resolution already use request caching. This pass did not move authorization below Suspense or broaden access to improve perceived speed.
8. **Invoice/Quote document views were left untouched.** Their future PDF/document-oriented surface is intentionally a separate design/implementation project.

## Migration SQL

None. No database, API contract, schema, migration, dependency, or package-manager changes were required.

## Verification Not Performed

This GPT Web environment has GitHub repository access but no project shell/runtime. Therefore the following were **not executed; verification is the orchestrator's**:

- Prettier
- ESLint
- TypeScript typecheck
- Vitest
- Next.js builds
- `scripts/check-app-structure.mjs`
- Browser/manual navigation testing
- Cloudflare/OpenNext deployment verification

I also could not measure actual click-to-fallback or click-to-content timings in a running Billing/Invoice instance. The changes address the known architectural blockers; perceived latency still depends on authorization and backend query latency.

## Orchestrator Verification Commands

```bash
node scripts/check-app-structure.mjs

pnpm --filter @876/billing-ui typecheck
pnpm --filter @876/billing-ui test

pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app test
pnpm --filter @876/billing-app lint

pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app test
pnpm --filter @876/invoice-app lint
```

If final integration policy calls for builds, also run:

```bash
pnpm --filter @876/billing-app build
pnpm --filter @876/invoice-app build
```

Run Prettier over the changed source/test files before the final commit/integration review; do not format unrelated repository files.

## Deliberate Gaps

- Customer Requests/Mails/Activity and Billing Subscriptions remain product placeholders. They now render stable, non-blank panels with matching loading states, but no backend feature was invented.
- The Item Overview skeleton can show Description/Stock structure while the eventual resolved item may omit one of those conditional sections. This is acceptable for the current provisional UI and should be refined alongside the final Item design.
- Invoice Item Transactions remains a static empty state until real transaction data is implemented.
- No generic Invoice/Quote document skeleton exists yet; that should be designed with the future document viewer rather than borrowed from ordinary detail pages.

## Reviewer Risks to Check First

1. Run `scripts/check-app-structure.mjs` to confirm every new leaf loader satisfies the current structural checker.
2. Confirm the new Invoice `resolveItemDetail(itemId)` dedupes the header/body retrieve in an actual Next.js request and preserves the existing typed result/error behavior.
3. Visually inspect list-detail navigation for customers/items to confirm the current skeleton heights do not create distracting jumps, especially GOOD versus SERVICE items.
4. Run the existing Invoice item layout tests after the import change; the layout now reaches `getInvoice()` transitively through the cached detail helper rather than importing it directly.
5. Confirm no formatter/typecheck issue arises from JSX line length in the new route-local skeletons; Prettier was not available in this seat.

## Scope Review

The final diff is limited to Billing/Invoice customer and item loading behavior, shared Billing UI used by both hosts, focused tests, and this run's plan/report. No Invoice/Quote document-view implementation, backend business logic, API contract, database schema, feature flag, module, dependency, or unrelated UI work was added.
