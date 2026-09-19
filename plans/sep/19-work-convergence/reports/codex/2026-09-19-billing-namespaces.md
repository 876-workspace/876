# Billing namespaces: 9 built, 2 skipped

Date: 2026-09-19. Scope kept to `packages/billing` and `apps/billing-api`.
No change was needed in `apps/billing-api` — every route below already exists
there. The facade (`apps/billing/src/lib/service/`) and its 90 call sites are
untouched, as instructed.

## Summary

| Namespace | Verdict | Routes covered | Shape read from | `it()` count |
| --- | --- | --- | --- | --- |
| `products` | built (extended `catalog.ts`) | `GET/POST /api/v1/products`, `GET/PATCH/DELETE /api/v1/products/:productId` | `catalog.routes.ts` + `catalog.serializers.ts` (`serializeCatalog` passthrough) + `schemas/product.ts` | 3 |
| `plans` | built (extended `catalog.ts`) | same CRUD set under `/api/v1/plans` + `POST :planId/clone` (pre-existing) | `catalog.routes.ts` (`planQuerySchema`: `active`, `productId`) + `schemas/plan.ts` | 3 |
| `prices` | built (extended `catalog.ts`) | same CRUD set under `/api/v1/prices` | `catalog.routes.ts` (`priceQuerySchema`: `active`, `itemId`, `planId`, `addonId`) + `schemas/price.ts` | 3 |
| `addons` | built (extended `catalog.ts`) | same CRUD set under `/api/v1/addons` + clone/associations (pre-existing) | `catalog.routes.ts` (`planQuerySchema`: `active`, `productId`) + `schemas/addon.ts` | 3 |
| `priceLists` | built (extended `catalog.ts`) | same CRUD set under `/api/v1/price-lists` + resolve (pre-existing) | `catalog.routes.ts` (`activeQuerySchema`: `active`) + `schemas/price-list.ts` | 3 |
| `refunds` | built (`resources/refunds.ts`) | `GET /api/v1/refunds` (list), `POST /api/v1/refunds` (create) only | `payments.serializers.ts` (`serializeRefund`) + `payments/schemas/refund.ts` (`RefundCreateSchema`) | 5 |
| `vendors` | built (`resources/vendors.ts`) | full CRUD under `/api/v1/vendors` | `vendors.schemas.ts` (`vendorSchema`, create/update bodies, `vendorListQuerySchema`) + `vendors.serializers.ts` (`serializeVendor`) | 7 |
| `tenants` | built (server client) | `POST /internal/projections/tenants` (list, body `{ organizationIds }`) | `tenants.internal-routes.ts` (`tenantSchema`, `requestSchema`) | 3 |
| `dashboard` | built (server client) | `GET /internal/projections/tenants/:tenantId/dashboard` | `reporting.service.ts` (`dashboardOverview` return) + `reporting.repository.ts` (`currentMrrByCurrency`, `invoiceTotalsByCurrency`, `dashboardCounts`) | 3 |
| `financeConnections` | skipped — no server route | facade wants `GET /finance-connections/:appId`; server only serves `POST /admin/finance-connections/ensure`, `GET /admin/stats/apps[/:sourceAppId]`, and integration bank-accounts | `finance-connections.routes.ts`, v1 contract grep | 0 |
| `stats` | skipped — no server route | facade `stats` is `{}`; server only serves `GET /admin/stats/apps[/:sourceAppId]` (admin tier, different shape) | `finance-connections.routes.ts` | 0 |

Total new `it()`: 33, all passing.

## What changed

Tenant client (`packages/billing/src/client.ts`):

- Registered `refunds` (`resources/refunds.ts`) and `vendors`
  (`resources/vendors.ts`) beside the existing resources.
- Extended the five catalog resources in place (`resources/catalog.ts`) with
  typed list filters instead of new files: `ProductListParams{active}`,
  `PlanListParams{active,productId}`, `PriceQueryParams{active,addonId,itemId,
  planId}`, `AddonListParams{active,productId}`,
  `PriceListListParams{active}` (`types/catalog.ts`). The list serializers are
  passthrough (`serializeCatalog`), so the loose `CatalogResource`
  (`object`+`id`) already matches the server contract; only the missing query
  params were added.

Server client (`packages/billing/src/server/client.ts`, internal-key tier,
following the `members` precedent):

- `tenants.list({ organizationIds })` → `POST /internal/projections/tenants`
  (`types/tenant.ts`, `types/tenant.schema.ts`; `TenantSchema` is loose to
  mirror the server's passthrough `tenantSchema`).
- `dashboard.overview(tenantId)` → the internal dashboard projection
  (`types/dashboard.ts`, `types/dashboard.schema.ts`; money stays in integer
  minor-unit strings: `mrr`/`arr`, `totalIssued`/`totalOutstanding`,
  `netSales`, `overdue`).

New response Zod schemas are re-exported from `types/index.ts` and
`schemas.ts`. Every resource keeps the `{ data, error }` envelope with
failures as values, the literal `object` discriminator, `delete` (never
`del`), and existing v1 wire spellings (including `price_list_id`).

## Deliberate deviations from the facade (server is authoritative)

- `refunds` exposes **only** `list` + `create`. The facade's `crud('/refunds')`
  promises retrieve/update/delete, but `payments.routes.ts` serves just
  `GET`+`POST /refunds` — refunds are immutable once issued. A client method
  with no server route is worse than a missing one, so the other three verbs
  were not built.
- `vendors.create`/`update` return the **full** `vendor` resource, not
  `{object,id}`: `vendors.routes.ts` documents `vendorSchema` for both.
- `tenants`/`dashboard` live on the **server** client, not the tenant
  `client.ts`: both are internal-key (`kind: 'admin'`) routes the tenant
  runtime cannot authenticate to. `tenants.retrieve({ organizationId })` needs
  no work — the integration client already serves it as
  `organizations.retrieve` (`integration/resources/organizations.ts`).
- `tenants.retrieve({ slug })` (`GET /tenants/resolve`) has **no server
  route** (no match in routes or the generated v1 contract) — nothing built
  for it.

## Routes with no serializer

- Catalog list/retrieve (`serializeCatalog`/`catalogList` are generic
  object-spread helpers, not field-explicit serializers) — the Zod
  `resourceSchema(object).passthrough()` in `catalog.routes.ts` is the
  contract; the client mirrors it with a loose `CatalogResource`.
- Dashboard (`dashboardOverview` builds the object inline in
  `reporting.service.ts`; the route declares `{object:'billing_dashboard'}`
  passthrough) — the client schema was derived field-by-field from the
  service return and repository row types instead.

## Verification

- `tsc --noEmit` in `packages/billing`: exit 0.
- `vitest run` on the four new test files: 4 files, 33 tests, all pass.
- Full `packages/billing` suite: 441/443 pass. The 2 failures are
  **pre-existing and unrelated**: `types/__tests__/payment.schema.test.ts`
  expects `paymentMode.imageFileId` optional while `payment.schema.ts`
  requires a string. None of my files touch payments; left alone per scope.
- `tsc --noEmit` in `apps/billing-api`: exit 0 (no changes made there).
- `apps/billing-api` full suite: 1161/1166 pass across 130 files. The 5
  failures are pre-existing and unrelated — all in
  `documents.service.assessLateFees` / `documents.service.chaos` tests
  (late-fee feature-flag timing, ~5s timeouts each), files this change never
  touches. Left alone per scope.
- `grep -rn "\bany\b" packages/billing/src/resources | grep -vE
  "anyOf|company|\.test\."` → zero matches (exit 1). A second grep for
  `as any`, `as unknown as`, `eslint-disable`, `@ts-ignore`,
  `@ts-expect-error`, `: any` across all new/touched files → zero matches.

## Not verified

- The 5 `apps/billing-api` failures above were not bisected to a root cause
  (no changes exist in that workspace to bisect against); they look
  environmental (DB/feature-flag timing) but that is an inference, **not
  verified**.
- Catalog list-query ordering (`?active=true&productId=…`) is asserted
  exactly in tests and passes against the current `@876/core` query builder;
  if that builder ever reorders keys, those assertions will catch it.
