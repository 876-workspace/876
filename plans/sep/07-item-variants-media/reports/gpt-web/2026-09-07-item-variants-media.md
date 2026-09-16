# GPT Web Implementation Report — Item Variants + 876 Storage Media

**Run ID:** `2026-09-07-item-variants-media`  
**Branch:** `feature/item-variants-media`  
**Base:** `main` at `18b846b3a23ad19ecfd9afb84ed3e482ad838016`  
**Report checkpoint HEAD before this report commit:** `8f90990391e46555716d4c1ff4fbb1ecff673d91`  
**Status:** `PARTIALLY_IMPLEMENTED — BACKEND/CONTRACT FOUNDATIONS SUBSTANTIALLY COMPLETE; UI/TEST/HARDENING WORK REMAINS`  
**PR:** Not opened. No PR was authorized for this run.

## Executive summary

This branch implements the majority of the data-plane and contract foundation for optional Item variants and 876 Storage-backed Item media across the shared 876 Billing / 876 Invoice finance catalog.

The implementation preserves the existing architecture: Billing owns Item/Variant/catalog state, Invoice consumes the same records through Billing integration boundaries, and Storage owns file bytes/metadata. No separate Inventory product, duplicate Invoice catalog, or app-local media identity was introduced.

The most important completed behavior is now present at the backend boundary:

- existing Items remain single Items by default;
- product variants are controlled by an `items` module preference and default off;
- variant-mode Items have Item-local options, values, generated sellable variants, variant-level SKU/pricing/stock/media state;
- quote/invoice lines can snapshot `variantId`, `variantName`, and `variantSku`;
- invoice finalization consumes the selected Variant stock rather than the parent Item count;
- invoice void restores the exact stock target originally decremented;
- variant-mode Item creation and conversion respect the organization preference and lifecycle guards;
- Item/Variant image uploads use 876 Storage and retain opaque Storage `fileId` references as canonical identity;
- Billing and Invoice now expose parallel BFF/client routes for Item preferences, Variants, and media upload orchestration;
- the shared `@876/billing` package exposes direct and integration Item Variant / preference / media contracts.

The branch is **not yet complete as an end-user feature**. Shared variant/media presentation, both hosts' Item create/edit/detail/settings composition, variant-aware document picker UI, media detach/read orchestration, targeted tests, and final Storage resource-link authorization hardening still remain.

## Scope and architecture

### Owners

- `apps/billing-api`
  - Item and Variant domain
  - option/value topology
  - document line variant snapshots
  - stock enforcement and movements
  - media attachment metadata (`fileId`, order, optional Variant target)
  - Item preference persistence
- `apps/storage-api`
  - file lifecycle
  - upload sessions
  - R2 object ownership/delivery
  - typed resource links
- `packages/billing`
  - shared Billing/Invoice API contracts and clients
- `packages/storage`
  - typed Storage service/resource-link contracts
- `packages/billing-ui`
  - intended shared presentation owner; substantial Variant/media UI work remains
- `apps/billing`, `apps/invoice`
  - host authorization, BFF composition, screen composition

### Preserved invariants

1. Billing and Invoice use one shared Item/Variant data plane.
2. Variants are an Item preference, not a new module/product.
3. Existing Items remain `single` unless explicitly converted/created as variants.
4. A variant-mode Item is the shared parent/template; a Variant is the sellable SKU/stock unit.
5. Quotes do not reserve/decrement stock.
6. Invoice finalization is authoritative for stock decrement.
7. Historical document rendering uses line snapshots rather than live Variant names/SKUs.
8. Storage `fileId` is canonical media identity; R2 keys/provider URLs are not persisted in Billing as identity.
9. Item media is `attachment` media, not Drive-library content.
10. No Inventory app/module, warehouses, purchasing, supplier, fulfillment, lot/serial, or marketplace-sync scope was introduced.

## Implemented — Billing schema and migrations

### Billing migration

Added:

`apps/billing-api/prisma/migrations/20260907210000_item_variants_media/migration.sql`

The migration is additive and creates/extends the persisted structures needed for:

- Item variant mode;
- Item options;
- Item option values;
- generated Item variants;
- Variant-to-option-value assignments;
- Item/Variant media metadata;
- Item module preferences;
- nullable Variant references on Quote, Invoice, and Credit Note lines;
- immutable Variant snapshot columns on document lines;
- Variant-aware stock movements.

### New Prisma models

- `ItemOption`
- `ItemOptionValue`
- `ItemVariant`
- `ItemVariantOptionValue`
- `ItemMedia`
- `ModulePreference`

### Extended models

- `Item`
- `Tenant`
- `ItemStockMovement`
- `QuoteLine`
- `InvoiceLine`
- `CreditNoteLine`

The design keeps parent Item facts shared while allowing Variant-specific SKU, selling/cost amount, stock quantity, active status, and media.

## Implemented — organization Item preference

A Billing-owned module preference controls Variant availability:

- module: `items`
- preference key: `product-variants`
- default: `false`

Implemented repository/service/routes ensure:

- missing override means the default (`false`);
- enabling persists an override;
- disabling removes the override and returns to default;
- disabling is rejected while variant-mode Items exist, preventing active Variant records from being hidden by the setting;
- direct Item creation in `variant` mode also checks the preference, so callers cannot bypass the setting by skipping the UI.

Public error coverage includes stable codes for disabled/in-use Variant states.

## Implemented — Variant domain

### Item-local options

The first release models options locally to the Item rather than introducing a global attribute taxonomy.

Examples of intended topology:

- Size → Small / Medium / Large
- Color → Black / White
- Generated Variants → Small / Black, Small / White, etc.

The domain includes deterministic combination generation and enforces the first-release option-count/uniqueness rules.

### Variant operations

Billing API now exposes domain operations for:

- list Variants for an Item;
- retrieve a Variant;
- search active sellable Variants across Items;
- generate Variants from option topology;
- update Variant SKU/pricing/status fields;
- adjust Variant stock;
- list/attach/reorder/remove parent Item media;
- list/attach/reorder/remove Variant media.

Both direct tenant and integration callers have corresponding route coverage.

### Public serialization

Variant responses are normalized through a dedicated serializer rather than leaking raw Prisma relation rows. Public representations expose the useful parent/option/media summary and omit internal tenant/join-table relation details.

## Implemented — conversion lifecycle

Single → Variant conversion is intentionally conservative.

The conversion path:

- requires Variant preferences enabled;
- rejects an Item already in variant mode;
- preserves tracked stock only through explicit Variant allocation;
- requires the full current tracked count to be distributed across generated Variants;
- records Variant allocation movements;
- clears parent `stockQuantity` once Variant stock owns the count;
- blocks conversion when document/history conditions make historical meaning ambiguous in this release.

This avoids silently rewriting existing finalized stock/document semantics.

Variant → Single collapse is not implemented in this release.

## Implemented — document Variant snapshots

The document line builder now treats the concrete Variant as the sellable selection for variant-mode Items.

For a line referencing a variant-mode Item it:

- requires a valid Variant;
- validates that the Variant belongs to the parent Item and tenant;
- snapshots the selected `variantId`;
- snapshots immutable `variantName`;
- snapshots immutable `variantSku`;
- applies the Variant's default selling amount/currency as the default when there is no explicit Price selection;
- preserves explicit Price selection as authoritative where applicable.

Quotes remain non-binding for stock but preserve Variant selection.

Quote → Invoice conversion copies the Variant snapshots rather than re-resolving a current Variant name/SKU.

## Implemented — Variant-aware invoice stock

The stock repository now resolves a stock target rather than assuming every line decrements `Item.stockQuantity`.

### Single Items

Existing behavior remains:

- aggregate quantities by Item;
- enforce `allowOutOfStock`;
- decrement parent Item count;
- record `invoice-finalized` movement;
- restore parent count on eligible void.

### Variant Items

For Variant selections:

- aggregate duplicate lines by concrete Variant;
- resolve Variant stock and parent stock policy;
- enforce insufficient-stock behavior against Variant quantity;
- decrement `ItemVariant.stockQuantity`;
- write `ItemStockMovement.variantId`;
- use the Variant as the stock target key;
- restore the exact Variant quantity on invoice void.

Invoice finalization remains inside a serializable transaction, preserving the existing concurrency model.

## Implemented — Storage upload policies

Storage upload routes now include:

- `billing.itemImage`
- `billing.itemVariantImage`

Both routes are:

- `owner_type = organization`;
- `category = attachment`;
- `audience = public`;
- limited to PNG/JPEG/WebP;
- capped at 5 MiB;
- stored under Billing-specific organization Item-media key templates.

The browser never receives R2 credentials or chooses canonical object keys.

## Implemented — Storage resource links

A generic typed Storage resource-link domain was added:

- `storage_resource_links` model/table;
- exact-link uniqueness;
- list-by-resource indexes;
- create/list/delete repository methods;
- API schemas/routes;
- `@876/storage` resource-link types and client resource.

Item/Variant media uses:

- `app_id: 876-billing`
- `resource_type: item` or `item-variant`
- `relation: image`

This is intentionally the **owning bounded-context identity**, regardless of whether Billing or Invoice initiated the upload. The Storage File still records the initiating host in its `source_app_id` (`876-billing` or `876-invoice`).

That separation is important: the shared Item belongs to Billing, while upload provenance may come from either finance UI.

## Implemented — Billing/Invoice upload orchestration

Both apps now have server-only Storage clients and an app-owned Item-media upload endpoint.

Current upload workflow:

1. Host authenticates and authorizes Item write access.
2. Host verifies the parent Item through the shared Billing domain.
3. If supplied, host verifies the Variant belongs to the Item.
4. Host asks Storage to create the appropriate upload session.
5. Browser uploads file bytes directly to Storage/R2 using the signed upload result.
6. Host completes the Storage upload.
7. Host verifies the completed file is ready, organization-owned, belongs to the current org, and has the expected Item/Variant image purpose.
8. Host creates the canonical `876-billing` typed Storage resource link.
9. Host attaches the resulting `fileId` to the shared Billing Item or Variant media collection.

The completion path is designed to be retry-friendly: Storage completion, exact resource-link creation, and Billing media attach all target the same file/resource identity rather than requiring the user to upload bytes again.

## Implemented — `@876/billing` contracts and clients

The shared Billing package now includes Item Variant / media / preference contracts and runtime schemas.

Item resources include `variantMode` and Variant-aware summaries where appropriate.

Both direct and integration Item clients expose Variant/media/preference operations under the existing Item namespace rather than creating a top-level pseudo-product domain.

Representative surface:

```ts
billing.items.getPreferences()
billing.items.updatePreferences(...)
billing.items.listVariants(itemId, ...)
billing.items.searchVariants(...)
billing.items.retrieveVariant(itemId, variantId)
billing.items.generateVariants(itemId, ...)
billing.items.updateVariant(itemId, variantId, ...)
billing.items.adjustVariantStock(itemId, variantId, ...)
billing.items.listMedia(itemId, variantId?)
billing.items.attachMedia(itemId, ..., variantId?)
billing.items.reorderMedia(itemId, ..., variantId?)
billing.items.removeMedia(itemId, fileId, variantId?)
```

Invoice uses the same Billing-owned integration contracts rather than defining a second Variant model.

## Implemented — host BFF/client surfaces

Both `apps/billing` and `apps/invoice` now formally proxy:

- `item-preferences`
- `item-variants`

Existing catch-all `items` BFF routes continue to handle nested Item-specific Variant/media endpoints.

Both browser clients were expanded with parallel Item Variant/preference/media methods so shared UI can receive equivalent callbacks from either host without branching on product identity.

Both apps now include `@876/storage` as a server-only dependency for the upload orchestration endpoints.

## Partially implemented — document picker/UI

Backend Variant snapshots and pricing/stock behavior are implemented, but the shared document editor UI is not yet fully Variant-aware in this branch.

The required end state remains:

- search parent Items and direct Variant/SKU matches;
- display a parent → Variant chooser when a variant-mode Item is selected;
- persist both `itemId` and concrete `variantId` in the draft;
- display Variant label/SKU/stock metadata;
- aggregate draft stock validation by Variant for invoices;
- preserve quote behavior as non-binding;
- reuse the same shared editor in Billing and Invoice.

This must be finished before the feature should be considered user-ready.

## Not yet completed — shared UI / host composition

Still outstanding:

- shared Variant option builder in `@876/billing-ui`;
- generated Variant table/editor;
- shared Item/Variant image gallery and uploader presentation;
- Variant stock editing presentation;
- Billing Item create screen integration;
- Billing Item edit/detail integration;
- Invoice Item create screen integration;
- Invoice Item edit/detail integration;
- both products' Item settings UI for `product-variants`;
- image fallback/display URL resolution and detach controls;
- final shared document-picker Variant UX.

The feature therefore has a strong data/contract foundation but is not complete as a finished interactive workflow.

## Known gap — Storage resource-link authorization hardening

During implementation review, an authorization gap was identified in the new generic Storage resource-link API.

The current Storage `/v1` boundary authenticates callers using the shared internal key. Existing file read/delete logic already requires caller assertions such as source app, actor user, and actor org where required.

Resource-link **list/delete** still need equivalent ownership checks so possession of the internal key alone cannot be used to enumerate or delete associations for unrelated organizations/resources.

Required completion:

- require/assert the relevant organization/resource owner context for resource-link reads/deletes;
- resolve the linked Storage File;
- verify the asserted owner against the file owner using the same disclosure principles as the existing file authorization layer;
- preserve opaque not-found behavior where disclosure would reveal another tenant's file/link existence;
- add tests for cross-org denial.

This should be completed before broad deployment of the resource-link API.

## Other known decisions / edge cases

### Variant preference disable

Disabling `product-variants` while variant Items exist is rejected instead of hiding live catalog state.

### Parent stock for Variant Items

Parent `Item.stockQuantity` is not authoritative after conversion to Variant mode. Variant quantities own stock.

### Historical conversion safety

The implementation intentionally blocks ambiguous Single → Variant conversion cases rather than trying to rewrite historic invoice/quote/stock semantics.

### Media identity

Billing persists `fileId`; it does not persist R2 object key as identity. Public/delivery URLs can change independently of Item identity.

### Legacy `imageUrl`

Existing `imageUrl` remains a compatibility/read fallback during this migration. New Item/Variant media work should use Storage-backed media rows.

### No media snapshot on documents

Invoices/quotes snapshot Variant identity text/SKU, not product images. Media changes therefore do not mutate historical document identity.

### Pricing

Variant default selling/cost values are supported as Variant overrides. Existing explicit Price/price-list behavior remains authoritative where a Price is selected. Broader advanced Price targeting by Variant should be completed only where existing Billing pricing architecture requires it; Invoice should not acquire Billing-only pricing administration.

## Files changed at this checkpoint

Compared with base `18b846b3a23ad19ecfd9afb84ed3e482ad838016`, the branch is 95 commits ahead at the checkpoint and includes changes across the following areas.

### Billing API / Prisma

- `apps/billing-api/prisma/migrations/20260907210000_item_variants_media/migration.sql`
- `apps/billing-api/prisma/schema/item.prisma`
- `apps/billing-api/prisma/schema/item-option.prisma`
- `apps/billing-api/prisma/schema/item-option-value.prisma`
- `apps/billing-api/prisma/schema/item-variant.prisma`
- `apps/billing-api/prisma/schema/item-variant-option-value.prisma`
- `apps/billing-api/prisma/schema/item-media.prisma`
- `apps/billing-api/prisma/schema/module-preference.prisma`
- `apps/billing-api/prisma/schema/item-stock-movement.prisma`
- Quote/Invoice/Credit Note line Prisma models
- catalog routes/schemas/controllers/services/serializers
- Item preferences repository
- Item Variant/media/search/conversion/combination repositories
- document line builder
- invoice create/finalize stock integration
- Billing error registry

### Billing shared package

- `packages/billing/src/integration/types/item.ts`
- `packages/billing/src/integration/types/item.schema.ts`
- integration/direct Item resources
- integration schema/type exports
- Item settings catalog

### Storage

- Storage upload-route catalog
- Storage resource-link model/repository/API/migration
- `@876/storage` resource-link contracts/client surface

### Billing app

- Item preference / Variant BFF routes
- Item media upload orchestration route
- Item browser client expansion
- Storage service client
- resource manifest
- package dependency

### Invoice app

- Item preference / Variant BFF routes
- Item media upload orchestration route
- Item browser client expansion
- Storage service client
- resource manifest
- package dependency

### Planning

- `plans/2026-09-07-item-variants-media/plan.md`
- this report

## Verification status

### NOT RUN by GPT Web

No shell-backed commands were executed in this environment. I am **not claiming** that typecheck, lint, tests, builds, Prisma validation, migration drift, or API contract checks pass.

The branch must be pulled into a local/CI environment and verified.

Recommended minimum verification:

```bash
pnpm --filter @876/billing-api typecheck
pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api build
pnpm --filter @876/billing-api db:validate
pnpm --filter @876/billing-api db:drift
pnpm --filter @876/billing-api api:contract:check

pnpm --filter @876/storage typecheck
pnpm --filter @876/storage lint
pnpm --filter @876/storage test
pnpm --filter @876/storage-api test

pnpm --filter @876/billing typecheck
pnpm --filter @876/billing test
pnpm --filter @876/billing-ui typecheck
pnpm --filter @876/billing-ui test

pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app lint
pnpm --filter @876/billing-app test
pnpm --filter @876/billing-app build

pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app lint
pnpm --filter @876/invoice-app test
pnpm --filter @876/invoice-app build

node scripts/check-app-structure.mjs
```

Before running these, use the repository's normal Prisma generation/migration validation workflow so the newly added Prisma delegates/types exist locally.

## Tests still required

At minimum, add/verify coverage for:

### Variant domain

- preference defaults false;
- create/generate rejected while disabled;
- preference cannot disable with variant Items in use;
- max option dimension rule;
- option/value/combination uniqueness;
- deterministic combination generation;
- Variant SKU uniqueness against Item and Variant SKUs;
- conversion stock allocation must equal current parent stock;
- conversion blockers preserve historical semantics.

### Documents

- variant-mode Item requires Variant selection;
- selected Variant must belong to parent Item/tenant;
- Variant name/SKU snapshots are persisted;
- quote→invoice preserves Variant snapshots;
- Variant price override is used when no explicit Price exists;
- explicit Price remains authoritative.

### Stock

- duplicate lines aggregate by Variant;
- Variant insufficient-stock deny path;
- `allowOutOfStock=true` permits negative Variant stock;
- finalize decrements exactly once;
- movement includes `variantId`;
- void restores exact Variant target;
- single Item behavior remains unchanged;
- concurrent finalization remains safe under serializable isolation.

### Storage/media

- Item/Variant upload route policy validation;
- ready-before-attach behavior;
- file owner/purpose mismatch rejection;
- exact resource-link create idempotency;
- parent/Variant media ordering;
- wrong Variant/Item attachment rejection;
- cross-org resource-link read/delete denial after hardening.

### Shared UI / hosts

Once UI is implemented:

- preference off hides Variant authoring;
- Item option builder generates expected rows;
- Variant picker selection stores parent + Variant identity;
- invoice draft stock validation aggregates by Variant;
- quote editor remains non-binding;
- media upload retry does not require another byte upload;
- Billing/Invoice render the same media/Variant state.

## Remaining implementation order

Recommended order for continuing this branch:

1. Finish Storage resource-link list/delete authorization hardening and tests.
2. Finish shared document editor Variant draft model/search/selection/stock UX.
3. Add shared `@876/billing-ui` Variant option builder/table/detail/media components.
4. Integrate Item settings/create/edit/detail flows in Billing.
5. Integrate the same shared flows in Invoice.
6. Add media read/delivery resolution and detach/reorder UI.
7. Add targeted backend, SDK, Storage, and UI tests.
8. Run the full verification command set locally/CI and fix failures.
9. Re-read latest `main` and resolve any drift deliberately.
10. Update `plan.md` and this report to final completion state.

## Handoff note

Preserve the existing shared ownership boundaries when continuing:

- do not create app-local Invoice Variant records;
- do not move Item media identity into Storage URLs/R2 keys;
- do not bypass Billing's Item preference from host UI;
- do not decrement parent stock for variant-mode Items;
- do not re-resolve historical Variant labels from live data when rendering persisted documents;
- do not introduce a new Inventory module/product as part of this work.

If this branch is later split into focused PRs for review, preserve the dependency order: schema/domain → document/stock → Storage/media → SDK/BFF → shared UI/hosts → tests/hardening. Do not split in a way that temporarily makes invoice finalization or document persistence inconsistent with the schema.

## Current conclusion

The branch now contains a substantial and coherent backend/contracts implementation for Item Variants and Storage-backed Item media, including the critical historical-document and stock-accounting rules. It should **not yet be merged as a finished feature** until the remaining Storage authorization hardening, shared UI/host integration, and verification/tests are completed.
