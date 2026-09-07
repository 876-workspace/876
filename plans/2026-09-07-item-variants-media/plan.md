# Implementation Plan: Item Variants + 876 Storage Media

**Run ID:** `2026-09-07-item-variants-media`  
**Branch:** `feature/item-variants-media`  
**Base:** `main` at `18b846b3a23ad19ecfd9afb84ed3e482ad838016`  
**Status:** IN_PROGRESS

## Overview

Add optional Amazon/Zoho-style Item variants to the shared 876 finance Item domain and wire Item/Variant images through 876 Storage. The capability is shared by 876 Billing and 876 Invoice because both products render the same Item records from `apps/billing-api`.

This is a catalog enhancement, not a new Inventory product. The existing lightweight stock system remains the stock owner and is extended to variant-level counts where a variant is the sellable unit.

## Objectives

- Add an organization-controlled `items` preference that enables product variants, defaulting off.
- Preserve every existing Item as a single Item unless variants are explicitly enabled and selected.
- Model Item options, option values, generated sellable variants, and variant media without duplicating the parent Item.
- Keep common Item facts on the parent and variant-specific SKU/price/stock/media on the variant.
- Add 876 Storage upload routes and typed resource links for Item and Item Variant images.
- Make opaque Storage `fileId` references canonical; do not store R2 keys/provider URLs as identity.
- Extend Quote/Invoice/Credit Note line snapshots with nullable `variantId` and immutable variant description/SKU data.
- Move stock consumption from parent Item to the selected variant when an Item has variants.
- Expose one shared variant/media UI in `@876/billing-ui`, composed by both Billing and Invoice hosts.
- Preserve advanced Billing pricing while allowing variant-level price overrides/targeting without creating a second catalog.

## Architectural scope

### Owning service

- `apps/billing-api` — Item/Variant domain, document snapshot rules, stock integration.
- `apps/storage-api` — file metadata, upload policies, verification, R2 delivery.

### Shared contracts / clients

- `packages/billing`
- `packages/storage`

### Shared presentation

- `packages/billing-ui`

### Hosts

- `apps/billing`
- `apps/invoice`

## Invariants

1. Billing and Invoice read/write the same Item and Variant records.
2. Variants are an optional preference under the existing `items` module, not a separate module or feature flag.
3. Existing Items remain `single` and behave exactly as today.
4. A variant Item is a parent/template; the selected Variant is the sellable stock unit.
5. Parent Item stock is authoritative only for single Items. Variant Items derive aggregate display stock from active variants.
6. Quotes never reserve or decrement stock.
7. Invoice finalization remains the authoritative stock check/decrement point.
8. Historical documents render from snapshots, not live variant names/options.
9. Item/Variant media uses opaque 876 Storage `fileId` references and typed Storage resource links.
10. Product images are `attachment` files; they are not Drive-library files.
11. No browser or Billing/Invoice service receives R2 credentials or chooses object keys.
12. Existing `imageUrl` remains a temporary legacy read fallback only while Storage-backed Item media is introduced.
13. No Inventory app/module, warehouses, suppliers, purchasing, fulfillment, lots, serials, marketplace sync, or global attribute taxonomy is introduced.

## Key design decisions

- `Item.variantMode`: `single | variant` (persisted values kebab-case; Prisma/TS fields camelCase).
- Initial UI exposes variants for Goods; schema should not unnecessarily prevent future Service variants if business rules later need them.
- Up to three option dimensions per Item in the first release.
- Options/values are Item-local in the first release; reusable global attributes are deferred.
- Variants inherit parent description/unit/tax/stock policy and may override SKU, selling/cost amount, active status, stock quantity, and media.
- The same Storage file may be linked to multiple variants; do not duplicate object bytes for color-group assignment.
- Item/Variant images use public delivery but `attachment` category, matching the existing organization-logo pattern.
- Do not snapshot media onto documents in this phase; snapshot variant identity text/SKU only.
- Single → Variant conversion must explicitly distribute existing tracked stock; Variant → Single is rejected once variant transaction history exists.

## Rules read

- [x] `CLAUDE.md`
- [x] `.agents/rules/gpt-web-operating-rules.md`
- [x] `.agents/rules/implementation-tracker.md`
- [x] `.agents/rules/ai-code-quality.md`
- [x] `.agents/rules/naming.md`
- [x] `.agents/rules/types.md`
- [x] `.agents/rules/code-style.md`
- [x] `.agents/rules/testing.md`
- [x] `.agents/rules/error-handling.md`
- [x] `.agents/rules/module-settings.md`
- [x] `.agents/rules/finance-app-parity.md`
- [x] `.agents/rules/billing-data-plane.md`
- [x] `.agents/rules/shared-product-ui.md`
- [x] `.agents/rules/app-structure.md`
- [x] `.agents/rules/app-layout.md`
- [x] `.agents/rules/sdk-conventions.md`
- [x] `.agents/rules/api-backend.md`
- [x] `.agents/rules/stripe-api-pattern.md`
- [x] `.agents/rules/storage-architecture.md`
- [x] `.agents/rules/git.md`

## Phase checklist

### Phase 1 — verify current owners and merged stock baseline

- [ ] Inspect merged Item/stock Prisma models, schemas, serializers, repositories, routes, SDK, shared UI and both app hosts.
- [ ] Inspect module preference persistence/resolution for Billing/Invoice.
- [ ] Inspect Storage upload routes, resource links and service/client patterns.
- [ ] Inspect Quote/Invoice/Credit Note line schemas and document-line builder.

### Phase 2 — schema + migrations

- [ ] Add Item variant mode.
- [ ] Add Item option, option value, variant and variant-value models.
- [ ] Add Item media relation model with opaque `fileId` and optional `variantId`.
- [ ] Add nullable variant references/snapshots to applicable document lines.
- [ ] Extend stock movement with nullable `variantId`.
- [ ] Hand-write additive Billing migration.
- [ ] Add Storage upload routes for Item/Variant images.

### Phase 3 — organization preference

- [ ] Add `items` preference for variants, default false.
- [ ] Ensure both Billing and Invoice resolve the same preference from the Billing data plane.
- [ ] Keep module state separate from the variants preference.

### Phase 4 — variant domain

- [ ] Add Item create/update validation for variant mode/options.
- [ ] Generate deterministic option combinations transactionally.
- [ ] Enforce option/value/combination uniqueness and max-three-option rule.
- [ ] Add variant list/retrieve/update operations.
- [ ] Add single→variant conversion with explicit tracked-stock distribution.
- [ ] Guard destructive/ambiguous variant topology changes when document history exists.

### Phase 5 — media domain + Storage wiring

- [ ] Add Item/Variant media attach/list/reorder/remove operations in Billing API.
- [ ] Add same-origin host upload start/complete paths that authorize Item writes then call 876 Storage.
- [ ] Create typed Storage resource links for `item` / `item-variant` media.
- [ ] Preserve legacy `imageUrl` as read fallback only; new writes use Storage.
- [ ] Add replacement lifecycle with ready-before-switch semantics.

### Phase 6 — SDK/contracts

- [ ] Extend Item resource with variant summary/media.
- [ ] Add Variant contracts/resources.
- [ ] Add media contracts/resources.
- [ ] Extend Storage route-key types if the package hardcodes route keys.

### Phase 7 — shared UI + both hosts

- [ ] Add shared Item image/gallery presentation.
- [ ] Add shared option builder and generated variant table.
- [ ] Add shared variant detail/edit/media presentation.
- [ ] Integrate in Billing Item create/edit/detail/list.
- [ ] Integrate in Invoice Item create/edit/detail/list with parity.

### Phase 8 — document picker/snapshots

- [ ] Extend shared catalogue typeahead to return parent/variant metadata and thumbnails.
- [ ] Add parent→variant chooser and direct variant/SKU search.
- [ ] Store `variantId` plus immutable variant description/SKU snapshots on document lines.
- [ ] Keep Quote non-binding and preserve variant selection on Quote→Invoice conversion.

### Phase 9 — stock integration

- [ ] Aggregate invoice quantities by `(itemId, variantId)`.
- [ ] Decrement/restore variant stock for variant Items.
- [ ] Keep single Item stock behavior unchanged.
- [ ] Extend stock movements with `variantId`.
- [ ] Preserve serializable invoice finalize/void concurrency safety.

### Phase 10 — pricing integration

- [ ] Support parent default-price inheritance and variant overrides.
- [ ] Extend advanced Billing Price/price-list targeting only where required.
- [ ] Do not expose Billing-only price-list configuration in Invoice.

### Phase 11 — tests + review

- [ ] Add schema/domain tests for variant generation and invariants.
- [ ] Add document snapshot and Quote→Invoice variant tests.
- [ ] Add stock tests for variant decrement, oversell and void restoration.
- [ ] Add Storage route/media lifecycle tests.
- [ ] Add shared UI tests for variant states and media fallback.
- [ ] Review diff for duplicate contracts, ownership leaks and scope creep.
- [ ] Re-read latest `main` before final report.

### Phase 12 — report

- [ ] Write `reports/gpt-web/2026-09-07-item-variants-media.md`.
- [ ] Include migration SQL, file inventory, decisions, gaps, risks and exact verification commands.
- [ ] Mark this plan complete or honestly record remaining gaps.

## Verification commands for orchestrator

GPT Web cannot execute these. Local verification should include the commands that exist in each affected workspace, at minimum:

```bash
pnpm --filter @876/billing-api typecheck
pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api build
pnpm --filter @876/billing-api db:validate
pnpm --filter @876/billing-api db:drift
pnpm --filter @876/billing-api api:contract:check

pnpm --filter @876/storage-api test

pnpm --filter @876/billing typecheck
pnpm --filter @876/billing test
pnpm --filter @876/billing-ui typecheck
pnpm --filter @876/billing-ui test
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app test

node scripts/check-app-structure.mjs
```

Verification is not executed by GPT Web.

## Handoff state

Branch created from the latest `main` SHA after item-stock tracking merged. Rules are read. Repository owners are being inventoried before code changes.

## PR preparation summary

No PR is authorized or planned in this run.
