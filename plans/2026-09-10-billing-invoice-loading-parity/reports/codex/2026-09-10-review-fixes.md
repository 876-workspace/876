# Loading-parity review fixes

## Files changed

- `apps/billing/src/features/catalog/components/prices-skeleton-columns.ts`
- `apps/billing/src/features/catalog/components/prices-skeleton-columns.test.ts`
- `apps/billing/src/app/(app)/items/[itemId]/prices/page.tsx`
- `apps/billing/src/app/(app)/items/[itemId]/prices/page.test.tsx`
- `apps/billing/src/app/(app)/items/[itemId]/page.tsx`
- `apps/invoice/src/app/(app)/_lib/detail-data.test.ts`

## Tests added

- 8 new `it()` cases: 4 for price skeleton columns and 4 behavioral cases for `resolveItemDetail`.

## Verification

- `pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app test` — passed.
- `pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app test` — passed.
- `npx prettier --check <changed files>` — passed.
