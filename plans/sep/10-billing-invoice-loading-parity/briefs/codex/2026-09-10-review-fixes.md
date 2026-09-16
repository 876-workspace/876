# Codex brief: loading-parity review fixes

Branch `perf/billing-invoice-loading-parity` (already checked out). Do not commit, branch, or push. Do not add `eslint-disable`, `@ts-ignore`, or `as any`. Stay inside the files listed.

Read first: `.claude/rules/testing.md`, `.claude/rules/ai-code-quality.md`, root `CLAUDE.md` section "Loading States & Suspense Placement".

## Fix 1 — Prices skeleton columns live beside the table
CLAUDE.md: a table's skeleton column list lives in a `*-skeleton-columns.ts` beside the table so fallback and table cannot drift.
- Create `apps/billing/src/features/catalog/components/prices-skeleton-columns.ts` exporting `PRICES_SKELETON_COLUMNS: DataTableSkeletonColumn[]` with exactly the six entries now inlined as `priceSkeletonColumns` in `apps/billing/src/app/(app)/items/[itemId]/prices/page.tsx`. Verify they match the headers in `prices-table.tsx` (same folder) in order.
- Update the prices page to import it; delete the inline constant.
- Add `prices-skeleton-columns.test.ts` beside it modeled on `apps/billing/src/app/(app)/items/_components/items-skeleton-columns.test.ts` (length, labels in order with `toEqual`, Status is `badge`, Actions `toEqual({ label: 'Actions', srOnly: true, width: '3rem' })`). At least 4 `it()`.
- Update `apps/billing/src/app/(app)/items/[itemId]/prices/page.test.tsx` so its assertions reference the new import rather than the inline literals.

## Fix 2 — Billing item overview skeleton reuses DetailField
In `apps/billing/src/app/(app)/items/[itemId]/page.tsx`, `ItemOverviewSkeleton`'s "Item information" section hand-rolls `<div><dt><dd>` rows. Replace them with `<DetailField label={label} value={<Skeleton className="h-4 w-28" />} />` (the same component the loaded section and the audit skeleton use), keeping the same label list. Remove any markup this makes dead.

## Fix 3 — Behavioral test for resolveItemDetail
`apps/invoice/src/app/(app)/_lib/detail-data.test.ts` only greps source text. Replace it with behavior tests (vitest env is `node`). Mock `@/lib/invoice` with `vi.hoisted` + `vi.mock`, `vi.clearAllMocks()` in `beforeEach`. Cases (at least 4 `it()`):
1. returns `null` and never calls `items.retrieve` when `getInvoice()` resolves `null`;
2. returns `{ invoice, result }` with the exact facade and result, and calls `items.retrieve` exactly once with the item id;
3. passes an error result through unchanged as a value (`{ data: null, error: { code: 'billing/item-not-found', message: '...' } }`), does not throw;
4. propagates a rejection from `items.retrieve` (`rejects.toThrow`).
Note: outside an RSC request React `cache` does not memoize, so do not assert dedup.

## Fix 4 — Prettier
Run `npx prettier --write` over exactly the files in `git diff --name-only origin/main...HEAD -- '*.ts' '*.tsx'` plus files you created. No other files.

## Verification you must run and report
```
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app test
npx prettier --check <changed files>
```
Write a short report to `plans/2026-09-10-billing-invoice-loading-parity/reports/codex/2026-09-10-review-fixes.md`: files changed, counted new `it()` cases, command results.
