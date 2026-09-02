# Billing Catalog List-Detail Split Report

## Section Status

| Section    | Status |
| ---------- | ------ |
| `products` | Done   |
| `plans`    | Done   |
| `addons`   | Done   |
| `coupons`  | Done   |
| `prices`   | Done   |

## File Changes

| File                                                                                                         | Change   | Reason                                                                                 |
| ------------------------------------------------------------------------------------------------------------ | -------- | -------------------------------------------------------------------------------------- |
| `apps/billing/src/app/(app)/(subscription-management)/(catalog)/products/_components/products-section.tsx`   | Added    | Renders the shared split layout using `StreamingResourceToolbar`.                      |
| `apps/billing/src/app/(app)/(subscription-management)/(catalog)/products/_components/products-list.tsx`      | Added    | Renders the detail segment pane or the full `ProductsTable`.                           |
| `apps/billing/src/app/(app)/(subscription-management)/(catalog)/products/_components/products-list-data.tsx` | Added    | Server component that fetches unfiltered product data and wraps `ProductsList`.        |
| `apps/billing/src/app/(app)/(subscription-management)/(catalog)/products/layout.tsx`                         | Added    | Provides the standard layout structure injecting the data fetch via `ProductsSection`. |
| `apps/billing/src/app/(app)/(subscription-management)/(catalog)/products/(list)/page.tsx`                    | Modified | Truncated to a null page while preserving metadata.                                    |
| `apps/billing/src/app/(app)/(subscription-management)/(catalog)/products/_components/products-table.tsx`     | Modified | Exported the `ProductRow` type for use in `ProductsList`.                              |
| `apps/billing/src/app/(app)/(subscription-management)/(catalog)/plans/_components/plans-section.tsx`         | Added    | Renders the shared split layout using `StreamingResourceToolbar`.                      |
| `apps/billing/src/app/(app)/(subscription-management)/(catalog)/plans/_components/plans-list.tsx`            | Added    | Renders the detail segment pane or the full `PlansTable`.                              |
| `apps/billing/src/app/(app)/(subscription-management)/(catalog)/plans/_components/plans-list-data.tsx`       | Added    | Server component that fetches unfiltered plan data and wraps `PlansList`.              |
| `apps/billing/src/app/(app)/(subscription-management)/(catalog)/plans/layout.tsx`                            | Added    | Provides the standard layout structure injecting the data fetch via `PlansSection`.    |
| `apps/billing/src/app/(app)/(subscription-management)/(catalog)/plans/(list)/page.tsx`                       | Modified | Truncated to a null page while preserving metadata.                                    |
| `apps/billing/src/features/catalog/components/plans-table.tsx`                                               | Modified | Exported the `PlanRow` type for use in `PlansList`.                                    |
| `apps/billing/src/app/(app)/(subscription-management)/(catalog)/addons/_components/addons-section.tsx`       | Added    | Renders the shared split layout using `StreamingResourceToolbar`.                      |
| `apps/billing/src/app/(app)/(subscription-management)/(catalog)/addons/_components/addons-list.tsx`          | Added    | Renders the detail segment pane or the full `AddonsTable`.                             |
| `apps/billing/src/app/(app)/(subscription-management)/(catalog)/addons/_components/addons-list-data.tsx`     | Added    | Server component that fetches unfiltered addon data and wraps `AddonsList`.            |
| `apps/billing/src/app/(app)/(subscription-management)/(catalog)/addons/layout.tsx`                           | Added    | Provides the standard layout structure injecting the data fetch via `AddonsSection`.   |
| `apps/billing/src/app/(app)/(subscription-management)/(catalog)/addons/(list)/page.tsx`                      | Modified | Truncated to a null page while preserving metadata.                                    |
| `apps/billing/src/features/catalog/components/addons-table.tsx`                                              | Modified | Exported the `AddonRow` type for use in `AddonsList`.                                  |
| `apps/billing/src/app/(app)/(subscription-management)/(catalog)/coupons/_components/coupons-section.tsx`     | Added    | Renders the shared split layout using `StreamingResourceToolbar`.                      |
| `apps/billing/src/app/(app)/(subscription-management)/(catalog)/coupons/_components/coupons-list.tsx`        | Added    | Renders the detail segment pane or the full `CouponsTable`.                            |
| `apps/billing/src/app/(app)/(subscription-management)/(catalog)/coupons/_components/coupons-list-data.tsx`   | Added    | Server component that fetches unfiltered coupon data and wraps `CouponsList`.          |
| `apps/billing/src/app/(app)/(subscription-management)/(catalog)/coupons/layout.tsx`                          | Added    | Provides the standard layout structure injecting the data fetch via `CouponsSection`.  |
| `apps/billing/src/app/(app)/(subscription-management)/(catalog)/coupons/(list)/page.tsx`                     | Modified | Truncated to a null page while preserving metadata.                                    |
| `apps/billing/src/app/(app)/(subscription-management)/(catalog)/coupons/_components/coupons-table.tsx`       | Modified | Exported the `CouponRow` type for use in `CouponsList`.                                |
| `apps/billing/src/app/(app)/(subscription-management)/(catalog)/prices/_components/prices-section.tsx`       | Added    | Renders the shared split layout using `StreamingResourceToolbar`.                      |
| `apps/billing/src/app/(app)/(subscription-management)/(catalog)/prices/_components/prices-list.tsx`          | Added    | Renders the detail segment pane or the full `PricesTable`.                             |
| `apps/billing/src/app/(app)/(subscription-management)/(catalog)/prices/_components/prices-list-data.tsx`     | Added    | Server component that fetches unfiltered price data and wraps `PricesList`.            |
| `apps/billing/src/app/(app)/(subscription-management)/(catalog)/prices/layout.tsx`                           | Added    | Provides the standard layout structure injecting the data fetch via `PricesSection`.   |
| `apps/billing/src/app/(app)/(subscription-management)/(catalog)/prices/(list)/page.tsx`                      | Modified | Truncated to a null page while preserving metadata.                                    |
| `apps/billing/src/features/catalog/components/prices-table.tsx`                                              | Modified | Exported the `PriceRow` type for use in `PricesList`.                                  |

## Verification Command Outputs

**`pnpm --filter @876/billing-app typecheck`**

```
$ tsc --noEmit
```

_(Code 0, no output. Note: The first run failed with Next.js stale route types error in `.next/dev/types/validator.ts` because Next.js had not regenerated types for the new nested layout files. I cleared the stale `.next` directory and re-ran it to resolve the stale types and achieve code 0)._

**`pnpm --filter @876/billing-app lint`**

```
$ eslint
...
✖ 14 problems (0 errors, 14 warnings)
```

_(Code 0, 0 errors. Warnings were pre-existing.)_

**`cd apps/billing && npx vitest run src/app/'(app)'/'(subscription-management)'`**

```
 RUN  v4.1.11 /root/projects/876/apps/billing

No test files found, exiting with code 1

filter: src/app/(app)/(subscription-management)
include: src/**/*.{test,spec}.{ts,tsx}
exclude:  **/node_modules/**, **/.git/**
```

_(No tests existed in these target directories, so vitest exits with 1 indicating no files found, which is expected here)._

**`node /root/projects/876/scripts/check-app-structure.mjs`**

```
app-structure: OK (console, billing, couriers, 876, enterprise, invoice, crm)
```

## Unfinished / Blocked

None. All required targets were fully converted.

## Judgement Calls

- For the `coupons` view, the original implementation did not pass an `emptyState` to `CouponsTable`. Instead, it rendered an empty state DOM node directly conditionally (`coupons.length ? <CouponsTable ... /> : <div ...>`). I preserved this approach within `CouponsList` (and provided the `div` in `CouponsListData`), correctly returning the equivalent layout when `selectedId` is null and no records exist.
- Instead of using a standalone toolbar component like `CustomersToolbar`, all five catalog sections utilize a shared layout wrapped in `<StreamingResourceToolbar>` mapped from `CATALOG_LISTS` since they didn't have their own isolated toolbar component previously, matching the existing app layout exactly.
- I had to export row types (e.g., `ProductRow`, `PlanRow`) from their respective table component files so they could be properly strongly typed inside the new `*-list.tsx` components.
- The brief requested test replacements if any `*-table-data` was deleted or pages changed. Since there were no existing tests covering these directories, there was nothing to replace or delete.
