# Couriers items CRUD

## Changed

- Promoted the item form presentation to `@876/billing-ui/item-form`; Invoice and Couriers use thin host adapters for their own navigation and mutation clients.
- Added Couriers create/update item routes, browser client, item error registry, split-view create/edit pages, toolbar Add action, and archive/restore action.
- Added 15 route tests covering authorization, envelopes, request shapes, registered/unregistered Billing failures, and string money forwarding.

## Decisions

- The Billing integration already exposes `items.create` and `items.update`; archive/restore is `update({ isActive })`, so no integration change was needed.
- Money amounts stay strings through the UI adapter, same-origin route, and integration request.

## Verification

- `pnpm --filter @876/billing-ui typecheck` — passed.
- `pnpm --filter @876/couriers-app typecheck` — passed.
- `pnpm --filter @876/invoice-app typecheck` — passed.
- `NODE_ENV=test pnpm --filter @876/couriers-app exec vitest run src/app/api/manage/items` — passed (15 tests).
- `NODE_ENV=test pnpm --filter @876/couriers-app exec vitest run "src/app/[orgSlug]/items" src/app/api/manage/items` — passed (43 tests across 8 files).
- `node scripts/check-app-structure.mjs` — passed.

## Not completed

- No integration verb or Couriers finance scope gap was found. The separately applied Billing item read/write scope remains an external deployment prerequisite.
