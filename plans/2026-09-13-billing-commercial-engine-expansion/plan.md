# Implementation Plan: Billing Commercial Engine Expansion

**Run ID:** `2026-09-13-billing-commercial-engine-expansion`  
**Branch:** `feature/billing-commercial-engine`  
**Base:** `main` @ `848ac1c34057513222d8fdace4f9a211e01d9ca7`  
**Status:** IN_PROGRESS — host UI and its baseline tests are in place; API/conversion test floors remain incomplete.

## Overview

Expand 876 Billing's canonical commercial plane toward ecommerce/order-management use cases without creating a second commerce backend or duplicating capabilities that already exist.

The current `main` branch already contains the catalog foundation the initial concept called for: canonical Items, Item Variants/options/media, Prices/Price Lists, shared sellable resolution, lightweight stock state/movements, Quote/Invoice/Credit Note/Sales Receipt line snapshots, and the Billing commercial-platform architecture. This run therefore does **not** rename Item to Product or create parallel Product/Variant/Price/Inventory resources.

The first missing transactional capability is **Sales Orders**. A Sales Order is a commercial commitment distinct from an Invoice (receivable), Sales Receipt (immediate paid sale), Quote (proposal), and Fulfillment (future operational execution). Sales Orders are implemented as a sibling document inside the existing Billing `documents` module. Channels, carts, checkout, reservations, fulfillment, advanced inventory, Store/POS/Restaurant applications, and marketplaces remain deferred.

## Binding review adjustment — 2026-09-13

The orchestrator reviewed the first implementation pass and added `briefs/gpt-web/2026-09-13-orchestrator-plan-adjustments.md`. That brief is binding and overrides the earlier plan where they disagree.

The accepted work from the first pass is:

- Sales Orders belong in Billing and use `sales-order` vocabulary rather than generic `order`.
- Item/Product terminology remains unchanged.
- Order lines are immutable commercial snapshots with live catalog IDs retained only for lineage.
- Sales Order creation/confirmation does **not** consume or reserve stock.
- `commercial-lines/buildCommercialLines` is the shared Catalog + Pricing + money resolution seam.
- `@876/billing` receives a bounded `billing.salesOrders` resource; no global service facade or integration-client expansion is introduced.

The following first-pass choices are being replaced by this resync:

- remove the standalone `src/modules/sales-orders/` module and place the resource in `src/modules/documents/`;
- remove stored `paymentStatus` and `fulfillmentStatus` and derive invoice/payment state from linked invoices;
- reduce stored lifecycle to `draft`, `confirmed`, `completed`, `canceled`;
- remove `pending`, `processing`, and `processingAt`;
- fix the Sales Order → Customer relation to tenant-composite isolation;
- add quote provenance, integration/idempotency provenance, customer/address/salesperson/tax snapshots, line position/tax snapshots, and document numbering;
- add Quote → Sales Order and Sales Order → Invoice conversions using existing document precedents;
- use existing command idempotency instead of an order-specific replay mechanism;
- add the Billing-only `sales-orders` module/access/navigation contract before shipping host UI.

The existing migration `20260913183000_sales_orders` is **unapplied** and is edited in place; no corrective migration is added.

## Objectives

- Add canonical tenant-owned Sales Orders to the existing Billing `documents` bounded module.
- Snapshot customer, addresses, salesperson, Item/Variant/Price and tax facts so historical orders do not depend on mutable live records.
- Reuse current Catalog/Pricing/document-number/idempotency contracts rather than duplicate pricing, arithmetic, sequence, or replay logic.
- Keep only a real commercial lifecycle in persistence; derive invoicing/payment status from Invoice state.
- Preserve current public Billing/Invoice behavior and existing Item terminology.
- Expose Sales Orders through the bounded `@876/billing` SDK.
- Implement Quote → Sales Order and Sales Order → Invoice while preserving agreed snapshots.
- Add Billing-only module/access/navigation/host surfaces after persistence/API/SDK/conversion contracts are complete.
- Keep fulfillment, reservations, checkout, channels and order-payment allocation out of this phase.

## Binding architecture

- `apps/billing-api` remains the canonical financial + commercial data plane.
- Sales Orders live inside `apps/billing-api/src/modules/documents/` beside Quotes, Invoices and Sales Receipts.
- `@876/billing` remains the public bounded client.
- Sales Orders are commercial records; Invoices remain accounts-receivable records.
- Orders reference live Item/Variant/Price/Tax IDs for lineage but persist immutable snapshots.
- Sales Order `status` must not encode payment or fulfillment state.
- `invoicingStatus` is derived from whether a non-void Invoice references the order.
- `paymentStatus` is derived from that Invoice's status and is null while the order is not invoiced.
- No stock reservation/decrement is introduced merely by Sales Order creation or confirmation.
- No speculative `channels`, `fulfillments`, `inventory_levels`, carts, checkout, Store, POS, Restaurant, marketplace persistence, or order events are added.
- Existing snake_case physical SQL naming is preserved; new TS/JSON fields use camelCase and new 876-owned wire symbolic values use lowercase kebab-case.

## Current-state audit

Verified before implementation:

- `Item`, `ItemVariant`, Item options, Item media, and variant stock already exist.
- Price Lists and contextual pricing resolution already exist.
- Quote, Invoice, Credit Note, and Sales Receipt lines already establish transaction snapshot precedents.
- Sales Receipt establishes tenant-composite Customer/Salesperson relations, customer/address snapshots, provenance/idempotency columns, position/tax snapshots, and document-number allocation precedents.
- Existing quote conversion uses explicit commands and transaction locking.
- `docs/architecture/013-billing-commercial-platform.md` reserves Orders as the next Billing-owned commercial boundary.
- No Sales Order exists on `main`.

## Design decisions

### Resource vocabulary

Use **Sales Order** (`sales-order` object discriminator, `/sales-orders` route family, `billing.salesOrders`) rather than generic `Order`, preserving a separate future Purchase Order vocabulary.

### Stored lifecycle

Only this state is persisted:

- `draft`
- `confirmed`
- `completed`
- `canceled`

Allowed command transitions:

```text
draft      --confirm-->  confirmed
draft      --cancel-->   canceled
confirmed  --cancel-->   canceled   only when no non-void invoice references it
confirmed  --complete--> completed
```

All other transitions and any edit of a non-draft order use `billing/sales-order-invalid-state`.

There is no arbitrary status patch.

### Derived financial state

`invoicingStatus` is not persisted:

- `not-invoiced`
- `invoiced`

`paymentStatus` is not persisted and is null until an active Invoice exists:

- `unpaid` for `OPEN`, `SENT`, `OVERDUE` (and non-settled invoice states where applicable)
- `partially-paid` for `PARTIALLY_PAID`
- `paid` for `PAID`

The list implementation must derive these from a batched Invoice relation/query, never one Invoice query per Sales Order row.

### Order snapshots

The order header snapshots:

- customer name/email;
- billing and shipping address;
- salesperson identity;
- price-list identity;
- tax behavior;
- external reference/idempotency provenance;
- reference number.

Each line snapshots:

- Item/Variant/Price lineage;
- variant name/SKU;
- description/unit;
- position/quantity;
- unit/tax/discount/total amounts;
- tax-rate lineage, name, rate and inclusive behavior.

### Numbering

Sales Orders join the existing `DocumentType` sequence contract with `SALES_ORDER`; creation allocates the number through `nextDocumentNumber(...)` inside the transaction. No second `SO-...` numbering mechanism is permitted.

### Conversions

**Quote → Sales Order**

- command: `POST /quotes/:quoteId/convert-to-sales-order`;
- the quote must satisfy the same accepted-state conversion gate used by existing quote conversions;
- Sales Order stores `quoteId @unique` and reuses the existing quote-conversion locking workflow/repository.

**Sales Order → Invoice**

- command: `POST /sales-orders/:salesOrderId/convert-to-invoice`;
- requires `confirmed`;
- Invoice gets nullable, non-unique `salesOrderId` plus `InvoiceBillingReason.SALES_ORDER`;
- at most one **non-void** Invoice may reference an order in this phase, enforced transactionally;
- a voided Invoice frees the order for re-invoicing;
- Invoice lines copy the Sales Order's stored snapshots and do not re-resolve live pricing;
- conversion does not auto-complete the Sales Order.

### Editing and deletion

- PATCH is draft-only and may replace lines; replacement lines are resolved through `buildCommercialLines` using `DocumentLineCreateSchema`.
- Confirmed/completed/canceled snapshots are immutable.
- Only a draft may be hard-deleted. If the existing document delete precedent cannot be reused safely, delete is omitted rather than generalized.

### Stock and fulfillment

Sales Order creation, confirmation and conversion do not consume stock. Fulfillment and reservation persistence remain deferred until there is an owning operational domain.

### Events

No `sales-order.*` outbox events are added in this phase because there is no consumer contract yet.

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
- [x] `.agents/rules/finance-app-parity.md`
- [x] `.agents/rules/shared-product-ui.md`
- [x] `.agents/rules/app-layout.md`
- [x] `.agents/rules/module-settings.md`
- [x] `docs/architecture/013-billing-commercial-platform.md`
- [x] `briefs/gpt-web/2026-09-13-orchestrator-plan-adjustments.md`

## Implementation already landed before orchestrator resync

These are present on the branch but are not all final until the binding corrections below are complete:

- [x] Branch created from the requested `main` base.
- [x] Plan/current-state audit created.
- [x] Initial additive Sales Order Prisma model + hand-written migration created.
- [x] `SalesOrder`/`SalesOrderLine` IDs added to the Billing ID registry.
- [x] Shared `commercial-lines/buildCommercialLines` extracted and existing document-line preparation delegated to it.
- [x] Initial Sales Order public errors registered.
- [x] Initial Sales Order API/service/router implementation created (currently in standalone `src/modules/sales-orders/`; **must be moved/replaced under documents before Phase 2 is complete**).
- [x] Initial `@876/billing` Sales Order types/schemas/resource/client registration created.
- [x] Initial API/SDK tests created (below required test floors and must be expanded).
- [x] Existing Invoice/Quote/Item/Variant/Price/PriceList/Customer inverse relations touched where the initial schema required them.

## Phase checklist

### Phase 0 — current-state audit — COMPLETE

- [x] Verify existing Item/Variant/media foundation.
- [x] Verify Price List/Pricing ownership.
- [x] Verify lightweight Inventory ownership.
- [x] Verify transaction snapshot precedent.
- [x] Confirm Sales Orders do not already exist on `main`.
- [x] Read orchestrator corrections and resync this plan.

### Phase 1 — persistence — IN PROGRESS

- [x] Initial Sales Order/Sales Order Line schema created.
- [x] Initial additive migration created.
- [x] Sales Order IDs added to registry.
- [ ] Reduce `SalesOrderStatus` to DRAFT/CONFIRMED/COMPLETED/CANCELED.
- [ ] Remove stored payment/fulfillment enums/columns/indexes and `processingAt`.
- [ ] Add tenant-composite Customer relation and `[tenantId,id]` unique key.
- [ ] Add quote/provenance/customer/address/reference/tax/salesperson snapshots.
- [ ] Add line position + TaxRate snapshot/relations.
- [ ] Add orderedAt-required list indexes.
- [ ] Add Quote/Salesperson/TaxRate inverse relations.
- [ ] Add `DocumentType.SALES_ORDER`.
- [ ] Add `InvoiceBillingReason.SALES_ORDER`, nullable non-unique `Invoice.salesOrderId`, relation/index.
- [ ] Edit the unapplied migration in place to exactly match the final schema.
- [ ] Add persistence/serializer tests; floor: **4 counted `it()` cases**.

### Phase 2 — Billing API document domain — PARTIAL, RESTRUCTURE REQUIRED

- [x] `buildCommercialLines` shared resolver extracted.
- [x] Existing document line builder delegates to the shared commercial-line resolver.
- [x] Initial schemas/repository/service/controllers/routes written.
- [x] Initial lifecycle tests written.
- [ ] Move/rewrite Sales Order implementation under `src/modules/documents/` using existing document layout.
- [ ] Use `DocumentLineCreateSchema` as the line input contract.
- [ ] Add header/customer/address/salesperson/tax/provenance snapshot preparation using existing document precedents.
- [ ] Allocate Sales Order number through `nextDocumentNumber` inside transaction.
- [ ] Use existing `optionalCommandIdempotency` for create + lifecycle commands.
- [ ] Derive invoicing/payment state with a batched Invoice join/query.
- [ ] Implement only confirm/cancel/complete transitions; remove pending/start-processing.
- [ ] Enforce draft-only updates and tenant isolation.
- [ ] Remove standalone `src/modules/sales-orders/` after documents implementation owns all call sites.
- [ ] Expand API tests to floor: **30 counted `it()` cases**, including assembled Express auth and server-side filtering.

### Phase 3 — bounded SDK — PARTIAL

- [x] Initial `sales-order` public types created.
- [x] Initial Zod response schemas created.
- [x] Initial `billing.salesOrders` resource registered on `create876Client`.
- [x] Initial resource tests created.
- [ ] Resync types to final lifecycle and derived statuses.
- [ ] Resource verbs must be exactly `create`, `retrieve`, `list`, `update`, `confirm`, `cancel`, `complete`, `convertToInvoice` (plus draft delete only if API retains it).
- [ ] Add cursor/status/customer filters to `list`.
- [ ] Add `quotes.convertToSalesOrder` beside existing quote conversion methods.
- [ ] Do **not** modify `packages/billing/src/integration/client.ts`.
- [ ] Expand SDK tests to floor: **10 counted `it()` cases**, including malformed-response rejection per verb family.

### Phase 4 — conversions — NOT STARTED

- [ ] Quote → Sales Order command using existing quote-conversion transaction lock/gate.
- [ ] Prevent duplicate quote conversion via unique `quoteId` semantics/replay behavior.
- [ ] Sales Order → Invoice command requiring confirmed order.
- [ ] Copy Sales Order snapshots to Invoice/InvoiceLine without live repricing.
- [ ] Set `Invoice.billingReason = SALES_ORDER` and `salesOrderId`.
- [ ] Block a second non-void Invoice transactionally.
- [ ] Allow re-invoicing after the previous linked Invoice is VOID.
- [ ] Add derived invoicing/payment-state tests.
- [ ] Conversion test floor: **12 counted `it()` cases**.

### Phase 5 — Billing module/access/navigation/host — PARTIAL

- [ ] Add canonical `FINANCE_MODULES.salesOrders` identity and Billing-only settings/module projection.
- [ ] Add `sales-orders.view` / `sales-orders.edit` permissions and grant them to named Billing roles following current access-catalog conventions.
- [x] Add Sales Orders between Quotes and Invoices in Billing navigation, guarded by the Billing host `sales-orders:read` permission.
- [x] Add route-guard binding coverage.
- [x] Add `apps/billing/src/app/(app)/(sales)/sales-orders/` using the Quotes list/detail split pattern.
- [x] Add `/new` and `[salesOrderId]/edit` using the shared `DocumentLineItemsEditor`; no duplicate editor.
- [x] Route browser mutations through the existing product-owned Billing API route/proxy pattern.
- [ ] Keep 876 Invoice unchanged: Sales Orders are Billing-only in this phase.
- [x] Host test floor: **11 counted `it()` cases**.

### Phase 6 — architecture docs and review — NOT STARTED

- [ ] Update `docs/architecture/013-billing-commercial-platform.md` to move Orders from reserved/deferred to implemented.
- [ ] Update byte-identical `.claude/rules/billing-commercial-platform.md` and `.agents/rules/billing-commercial-platform.md` consistently.
- [ ] Keep carts, checkout, reservations, fulfillment and channels deferred.
- [ ] Review final diff for duplicate pricing/catalog logic, leaked persistence contracts, compatibility residue, swallowed errors, N+1 derived-status reads, or speculative behavior.

### Phase 7 — report/handoff — NOT STARTED

- [ ] Write `reports/gpt-web/2026-09-13-billing-commercial-engine-expansion.md`.
- [ ] Record every changed file, migration SQL, counted `it()` cases, gaps, risks, orchestrator adjustments, and unexecuted verification.
- [ ] Name deferred fulfillment/payment-allocation/events boundaries explicitly.
- [ ] Mark this plan `COMPLETED` only when implemented scope is complete; otherwise preserve exact handoff state.

## Required test floors

| Phase       | Floor | Required coverage                                                                                                                                    |
| ----------- | ----: | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Persistence |     4 | migration presence/order; serializer maps every enum value                                                                                           |
| API         |    30 | transition arrows + illegal states; draft-only update; tenant isolation; assembled Express auth; server-side status filter; batched derived statuses |
| SDK         |    10 | endpoint paths/params; malformed response rejection across verbs                                                                                     |
| Conversions |    12 | quote gate/duplicate; snapshot-copy invoice; second invoice blocked; void frees re-invoice; derived payment statuses                                 |
| Host        |    10 | nav binding; guard denial; toolbar during streaming; error keeps shell mounted                                                                       |

## Verification commands for orchestrator

GPT Web cannot execute shell verification from this connector. Generated Prisma/OpenAPI artifacts must be produced by repository scripts rather than hand-edited.

```bash
# Regenerate generated artifacts first
pnpm --filter @876/billing-api db:generate
pnpm --filter @876/billing-api api:contract:generate

# Billing API
pnpm --filter @876/billing-api typecheck
pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api build
pnpm --filter @876/billing-api db:validate
pnpm --filter @876/billing-api db:drift
pnpm --filter @876/billing-api api:contract:check

# Bounded client
pnpm --filter @876/billing typecheck
pnpm --filter @876/billing test

# Host only after Phase 5 exists
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app test
```

Verification status for this connector run: **not executed; verification remains the local/orchestrator responsibility**.

## Handoff state

As of this resync, the branch contains the first-pass persistence/API/SDK foundation plus the accepted shared `commercial-lines` extraction. The branch is **not merge-ready** because the first-pass Sales Order module and stored status model predate the binding orchestrator corrections.

Current work is Phase 1 persistence reconciliation. The next safe order is:

1. finish corrected schema + migration;
2. move/rebuild the API under `documents` and satisfy Phase 2 tests;
3. resync/complete the bounded SDK;
4. implement snapshot-preserving conversions;
5. only then add Billing module/access/navigation/UI.

No PR is created by this run unless the user explicitly asks for one.
