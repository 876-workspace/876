# Backend and contract repair report

## 1. Item stock fixtures and variant coverage

Updated `apps/billing-api/src/modules/catalog/repositories/items/stock.test.ts` so every invoice line supplies the required `variantId`, including `null` for a single Item. The transaction fake now has the `itemVariant` delegate required by stock resolution.

Added 7 `it()` cases (12 total in the file): duplicate lines aggregate by selected variant; selected variants decrement without touching the parent; insufficient variant stock is denied; allowed out-of-stock variant sales can go negative; movements persist `variantId`; void restores that exact variant; and single-Item behavior remains unchanged. Existing cases were strengthened to assert complete results and exact Prisma arguments.

## 2. Authenticated route matrix

Updated the frozen route counts to 254 total and 253 protected operations. The only unprotected operation remains the intentional Zoho Books OAuth callback. All 32 newly registered operations have a route security declaration and were exercised by the assembled middleware matrix.

The 32 operations are 16 tenant routes and these 16 integration counterparts:

- `GET`/`PATCH /item-preferences`
- `GET /item-variants`
- `GET /items/{itemId}/variants`
- `POST /items/{itemId}/variants/generate`
- `GET`/`PATCH /items/{itemId}/variants/{variantId}`
- `POST /items/{itemId}/variants/{variantId}/stock-adjustments`
- `GET`/`POST`/`PUT /items/{itemId}/media`
- `DELETE /items/{itemId}/media/{fileId}`
- `GET`/`POST`/`PUT /items/{itemId}/variants/{variantId}/media`
- `DELETE /items/{itemId}/variants/{variantId}/media/{fileId}`

Integration routes use the matching `/integrations/organizations/{organizationId}` prefix. No authentication guard defect was found.

## 3. Frozen OpenAPI contract

Regenerated the contract using `pnpm --filter @876/billing-api api:contract:generate`; this updated the generated operation manifest and frozen OpenAPI document. I reviewed the resulting path diff: it adds only the intended preference, variant, item-media, and variant-media paths (and integration counterparts), with no removed paths or changes to existing paths.

Added `it()` cases in this item: 0.

## 4. Billing module settings catalog

Updated `packages/billing/src/settings-catalog.test.ts` to pin the exact `items` preference: `product-variants`, boolean, default `false`, including its declared label and hint. All other Billing modules remain constrained to no preferences.

Added `it()` cases in this item: 0.

## 5. Billing Item SDK resource

This was a fixture bug, not a resource bug. `packages/billing/src/resources/items.ts` still uses the canonical `Request` transport, returning `{ data, error }`; it also preserves the established legacy Item list contract. The fixture lacked the newly required Item fields (`variantMode`, stock-tracking fields, and stock policy fields), so schema parsing correctly returned `billing/invalid-response`. The test now supplies the complete Item resource and asserts both sides of each result envelope.

Added `it()` cases in this item: 0.

## 6. Storage frozen surface

Added the two service codes by name to both frozen code lists: `storage/file-not-ready` and `storage/resource-link-not-found`. Both are namespaced kebab-case values and are registered in the owning Storage client error catalog; the service uses them for file readiness and resource-link lookup failures. Updated the public client-surface test name and exact namespace set to include `resourceLinks` alongside `uploads` and `files`.

Added `it()` cases in this item: 0.

## Verification

```text
pnpm --filter @876/billing-api typecheck
$ tsc --noEmit

pnpm --filter @876/billing-api boundaries
$ depcruise src --config .dependency-cruiser.cjs
✔ no dependency violations found (525 modules, 1647 dependencies cruised)

pnpm --filter @876/billing-api test
Test Files  63 passed (63)
Tests       634 passed (634)

pnpm --filter @876/billing-api api:contract:check
Frozen operations: 254; Express operations: 254
Document metadata mismatches: 0
Missing component schemas: 0
Extra component schemas: 0
Changed component schemas: 0
Missing operations: 0
Extra operations: 0
status-code mismatches: 0
request schema mismatches: 0
response schema mismatches: 0

pnpm --filter @876/billing-api db:validate
Prisma schema loaded from prisma/schema.
The schemas at prisma/schema are valid

pnpm --filter @876/billing typecheck
$ tsc --noEmit

pnpm --filter @876/billing test
Test Files  25 passed (25)
Tests       288 passed (288)

pnpm --filter @876/storage typecheck
$ tsc --noEmit

pnpm --filter @876/storage test
Test Files  15 passed (15)
Tests       391 passed (391)
```

Scoped lint checks for the changed files are clean. The known pre-existing Billing API lint failure remains in `src/modules/access/__tests__/finance-catalog-drift.test.ts:27`: `@next/next/no-assign-module-variable` on `module`; it was not changed. No scoped failures remain.
