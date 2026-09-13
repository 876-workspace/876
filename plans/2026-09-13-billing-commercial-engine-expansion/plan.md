# Implementation Plan: Billing Commercial Engine Expansion

**Run ID:** `2026-09-13-billing-commercial-engine-expansion`  
**Branch:** `feature/billing-commercial-engine`  
**Base:** `main` @ `848ac1c34057513222d8fdace4f9a211e01d9ca7`  
**Status:** IN_PROGRESS

## Overview

Expand 876 Billing's canonical commercial plane toward ecommerce/order-management use cases without creating a second commerce backend or duplicating capabilities that already exist.

The current `main` branch already contains the foundation that the conceptual plan originally called Phase 1: canonical Items, Item Variants/options/media, Prices/Price Lists, shared sellable resolution, lightweight stock state/movements, Quote/Invoice/Credit Note/Sales Receipt line snapshots, and the Billing commercial-platform architecture. This run therefore does **not** rename Item to Product or create parallel Product/Variant/Price/Inventory resources.

The first missing transactional capability is **Sales Orders**. A sales order is a commercial commitment distinct from an Invoice (receivable), Sales Receipt (immediate paid sale), Quote (proposal), and Fulfillment (future operational execution). This run makes Sales Orders a real Billing-owned bounded domain and leaves Channels, Fulfillment, advanced Inventory, carts, checkout, Storefront UI, and purchasing deferred until their own concrete requirements exist.

## Objectives

- Add a canonical tenant-owned Sales Order resource to `apps/billing-api`.
- Keep order lifecycle, payment status, and fulfillment status independent.
- Snapshot Item/Variant/Price facts on order lines so historical orders do not depend on live catalog rows.
- Reuse current Catalog/Pricing/Billing Engine contracts rather than duplicating line pricing or sellable resolution.
- Preserve current public Billing/Invoice behavior and existing Item terminology.
- Expose Sales Orders through the bounded `@876/billing` SDK.
- Add focused Billing UI surfaces only after the owning API/SDK contracts exist.
- Document conversion seams (`Quote -> Sales Order`, `Sales Order -> Invoice`) without coupling order creation to invoice creation.

## Binding architecture

- `apps/billing-api` remains the canonical financial + commercial data plane.
- `@876/billing` remains the public bounded client.
- Sales Orders are commercial records; Invoices remain accounts-receivable records.
- Orders reference live Item/Variant IDs for lineage but store immutable line snapshots.
- Order status must not encode payment or fulfillment state.
- No stock reservation/decrement is introduced merely by order creation in this phase. Existing Invoice/Sales Receipt behavior remains unchanged until a dedicated reservation/fulfillment phase is implemented.
- No speculative `channels`, `fulfillments`, `inventory_levels`, carts, checkout, Store, POS, Restaurant, or marketplace persistence is added.
- Existing snake_case physical SQL naming is preserved; new TS/JSON fields use camelCase and new symbolic values use kebab-case where they are 876-owned wire values.

## Current-state audit

Verified on `main` before code edits:

- `Item`, `ItemVariant`, Item options, Item media, and variant stock already exist.
- Price Lists and contextual pricing resolution already exist.
- Quote, Invoice, Credit Note, and Sales Receipt lines already snapshot `itemId`, `variantId`, variant identity, amounts, tax, discounts, and totals.
- `docs/architecture/013-billing-commercial-platform.md` explicitly reserves Orders as the next Billing-owned commercial boundary.
- No current `SalesOrder` model/module/API exists.

## Design decisions

### Resource vocabulary

Use **Sales Order** (`sales-order` object discriminator, `/sales-orders` route family, `billing.salesOrders`) rather than a generic `Order` name so future Purchase Orders remain distinct.

### Lifecycle

Commercial status:

- `draft`
- `pending`
- `confirmed`
- `processing`
- `completed`
- `canceled`

Payment status is independent:

- `unpaid`
- `partially-paid`
- `paid`
- `partially-refunded`
- `refunded`

Fulfillment status is independent and intentionally coarse until the Fulfillment domain exists:

- `unfulfilled`
- `partially-fulfilled`
- `fulfilled`

This phase does not expose arbitrary status patching. Lifecycle commands own allowed transitions.

### Order lines

Each line keeps nullable lineage fields (`itemId`, `variantId`, `priceId`) plus immutable snapshot fields including description, variant name/SKU, quantity, unit amount, tax, discount, and total.

### Totals

Reuse the existing Billing commercial-line/pricing/calculation path. Do not create order-specific money arithmetic.

### Stock

Sales Order creation/confirmation does not consume current lightweight stock. Stock reservations are a later real Inventory capability. This avoids conflating commercial commitment with fulfillment/accounting behavior.

## Rules read

- [x] `CLAUDE.md`
- [x] `.agents/rules/gpt-web-operating-rules.md`
- [x] `.agents/rules/git.md`
- [x] `.agents/rules/implementation-tracker.md`
- [x] `.agents/rules/ai-code-quality.md`
- [x] `.agents/rules/naming.md`
- [x] `.agents/rules/types.md`
- [x] `.agents/rules/code-style.md`
- [x] `.agents/rules/testing.md`
- [x] `.agents/rules/error-handling.md`
- [x] `.agents/rules/api-backend.md`
- [x] `.agents/rules/stripe-api-pattern.md`
- [x] `.agents/rules/sdk-conventions.md`
- [x] `.agents/rules/billing-commercial-platform.md`
- [x] `docs/architecture/013-billing-commercial-platform.md`

## Phase checklist

### Phase 0 — current-state audit

- [x] Verify existing Item/Variant/media foundation.
- [x] Verify Price List/Pricing ownership.
- [x] Verify lightweight Inventory ownership.
- [x] Verify transaction snapshot precedent.
- [x] Confirm Sales Orders do not already exist.

### Phase 1 — persistence

- [ ] Add Sales Order status enums/models and relations.
- [ ] Add Sales Order line snapshot model.
- [ ] Hand-write additive migration SQL.
- [ ] Extend existing ID registry with Sales Order IDs if required.

### Phase 2 — Billing API domain

- [ ] Add schemas/serializers for Sales Order resources.
- [ ] Add repository operations for create/retrieve/list/update lifecycle data.
- [ ] Add service lifecycle operations with explicit transition validation.
- [ ] Reuse current customer/sellable/pricing/calculation owners.
- [ ] Add controllers/routes/OpenAPI wiring.
- [ ] Add registered public errors only where an existing Billing error does not already fit.

### Phase 3 — SDK

- [ ] Add Sales Order contracts to `@876/billing`.
- [ ] Add `billing.salesOrders.create/retrieve/list/update` and lifecycle verbs supported by the API.
- [ ] Preserve caller-authority entrypoint conventions.

### Phase 4 — conversions

- [ ] Add Quote -> Sales Order conversion using snapshot-preserving shared line preparation.
- [ ] Add Sales Order -> Invoice conversion without mutating historical order lines.
- [ ] Prevent duplicate conversion where the existing resource lifecycle requires a single target.

### Phase 5 — Billing host

- [ ] Add Sales Orders navigation under Sales using existing module/access patterns.
- [ ] Add list/detail/create/edit surfaces using shared app layout/data-loading conventions.
- [ ] Keep Invoice app unchanged unless a shared component contract requires parity.

### Phase 6 — tests and review

- [ ] Add schema/service/repository/API tests following local Billing test patterns.
- [ ] Add SDK contract tests.
- [ ] Add host tests for the new Sales Order surfaces.
- [ ] Review diff for duplicate pricing/catalog logic, leaked persistence contracts, compatibility residue, and swallowed errors.

### Phase 7 — report/handoff

- [ ] Write `reports/gpt-web/2026-09-13-billing-commercial-engine-expansion.md`.
- [ ] Record every changed file, migration SQL, counted `it()` cases, gaps, risks, and unexecuted verification.
- [ ] Mark this plan `COMPLETED` only when the implemented scope above is complete; otherwise leave exact handoff state.

## Verification commands for orchestrator

GPT Web cannot execute these. The orchestrator should run at minimum:

```bash
pnpm --filter @876/billing-api typecheck
pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api build
pnpm --filter @876/billing-api db:validate
pnpm --filter @876/billing-api db:drift
pnpm --filter @876/billing-api api:contract:check

pnpm --filter @876/billing typecheck
pnpm --filter @876/billing test

pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app test
```

Verification status for this connector run: **not executed; verification is the orchestrator's**.

## Handoff state

Branch and plan created. Current-state audit is complete. Persistence/API shape inspection is next before editing schema or code.

## PR preparation

No PR is created by this run unless the user explicitly asks for one.
