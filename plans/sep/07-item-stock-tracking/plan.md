# Implementation Plan: Billing + Invoice Item Stock Tracking

**Run ID:** `2026-09-07-item-stock-tracking`  
**Branch:** `feature/item-stock-tracking`  
**Base:** `main` at `2e9997b992e88ecc0a5a1f749c53e3fccca8a64f`  
**Status:** IMPLEMENTATION_COMPLETE — LOCAL_VERIFICATION_REQUIRED

## Overview

Add lightweight stock tracking to the shared Billing/Invoice `Item` resource. This is intentionally not a full inventory-management subsystem: no warehouses, suppliers, purchase orders, reservations, fulfillment, transfers, serials, lots, costing engines, or inventory app/navigation.

The shared Billing API remains the sole owner of Item state. Billing and Invoice consume the same records and shared `@876/billing-ui` presentation.

## Objectives

- Extend `Item` with stock-tracking configuration and current integer quantity.
- Record stock count changes in a small immutable movement table.
- Let tracked goods block overselling when configured, or permit negative stock when explicitly allowed.
- Keep draft invoices non-reserving; perform the authoritative stock check/decrement atomically when an invoice is finalized.
- Restore the exact stock removed by an eligible invoice when it is voided.
- Expose stock state and adjustment controls in both 876 Billing and 876 Invoice without creating a new Inventory module or app.

## Architectural scope

### Owning service

`apps/billing-api`

### Shared client/contracts

`packages/billing`

### Shared presentation

`packages/billing-ui`

### Hosts

- `apps/billing`
- `apps/invoice`

### Invariants

1. Billing and Invoice use the same Item record and stock state.
2. `SERVICE` items never track stock.
3. `GOOD` items may opt into stock tracking.
4. Draft invoices never reserve or decrement stock.
5. Finalization is the authoritative stock check and decrement point.
6. Finalization + stock changes + financial ledger writes are atomic.
7. Voiding an eligible finalized invoice restores only the stock that invoice actually removed.
8. `allowOutOfStock=false` remains safe under concurrent finalization through serializable transaction boundaries.
9. `allowOutOfStock=true` may produce negative stock.
10. Quantity adjustments while stock semantics are active are represented by movement records; Item type/configuration transitions are configuration changes, not inventory movements.
11. No Inventory module, app, navigation, warehouse model, purchasing model, or fulfillment model is introduced.

## Key design decisions

- Stock quantities are integers in this phase because `billing_invoice_lines.quantity` is currently `Int`. Fractional stock requires a coordinated future document-quantity migration.
- Stock configuration lives on `Item`: `trackStock`, `stockQuantity`, `lowStockThreshold`, `allowOutOfStock`.
- `stockQuantity` is nullable for records where stock is not applicable; tracked goods initialize to zero unless an opening quantity is supplied.
- Current quantity is not patched through generic Item update. A dedicated `stock-adjustments` operation owns manual count changes.
- A small `ItemStockMovement` ledger provides auditability, invoice idempotency, and exact void restoration. It is not a full inventory ledger/product.
- Quotes do not consume stock and are never blocked solely by insufficient current stock.
- Invoice editors provide advisory stock validation; Billing API finalization is authoritative.
- Low-stock threshold is display/warning state only; it never blocks a sale.
- Credit notes do not automatically restock because financial credit does not prove physical return.
- Disabling tracking on a Good preserves its dormant count, clears threshold/out-of-stock policy, and lets tracking resume later from the last count.
- Converting an Item to a Service clears all stock semantics, including the count.
- Invoice finalization and void both use serializable transactions for stock mutations.
- The existing `items` finance module owns this capability. No new `inventory` module is created.

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
- [x] `.agents/rules/express-api.md`
- [x] `.agents/rules/api-backend.md`
- [x] `.agents/rules/stripe-api-pattern.md`
- [x] `.agents/rules/sdk-conventions.md`
- [x] `.agents/rules/app-api-routing.md`
- [x] `.agents/rules/app-structure.md`
- [x] `.agents/rules/app-layout.md`
- [x] `.agents/rules/shared-product-ui.md`
- [x] `.agents/rules/finance-app-parity.md`
- [x] `.agents/rules/billing-data-plane.md`
- [x] `.agents/rules/git.md`

## Phase checklist

### Phase 1 — verify current owners/contracts

- [x] Inspect Item Prisma schema, schemas, serializer, repository, service/routes, and tests.
- [x] Inspect Billing SDK Item types/resources and integration surface.
- [x] Inspect both app Item list/create/edit/detail paths.
- [x] Inspect shared `ItemsTable` and document line-item editor.
- [x] Inspect invoice finalization/void paths and error registry.

### Phase 2 — schema and migration

- [x] Extend `Item` with lightweight stock fields.
- [x] Add `ItemStockMovement` model.
- [x] Hand-write additive migration SQL with indexes/checks/idempotency protection.

### Phase 3 — Billing API Item stock capability

- [x] Extend Item request/response schemas and serialization surface.
- [x] Enforce SERVICE/GOOD stock invariants.
- [x] Create initial-stock movement transactionally when opening stock is non-zero.
- [x] Add manual stock-adjustment service/repository/routes.
- [x] Add stock availability/decrement/restore operations at the catalog module public boundary.
- [x] Add canonical stock-related errors through the existing Billing error registry.
- [x] Preserve integration source-app ownership for stock mutations.

### Phase 4 — invoice lifecycle enforcement

- [x] ~~Validate tracked stock for invoice draft creation~~ — **reversed during review (2026-09-07).** Draft creation blocked with a 409 while draft *update* had no equivalent check, so qty 1 → edit to 999 bypassed it entirely: friction that guaranteed nothing. Drafts now never block, matching the documented advisory intent and the "quotes never block" rule. The editor still warns client-side and finalization remains the authoritative serializable check. The dead `validateInvoiceStock`/`validateAvailability` chain was removed with it.
- [x] Aggregate duplicate Item lines before stock checks.
- [x] Re-check and atomically decrement stock during invoice finalization.
- [x] Write one `invoice-finalized` movement per tracked Item.
- [x] Restore exact recorded stock changes during eligible invoice void.
- [x] Preserve current AR/ledger behavior in the same transaction.
- [x] Use serializable transaction isolation for finalization and void stock mutations.

### Phase 5 — SDK/contracts

- [x] Extend shared Item resource schemas/types.
- [x] Add stock-adjustment resource operations through tenant and integration clients.
- [x] Keep `stockQuantity` out of generic Item update contracts.
- [x] Preserve existing Item SDK documentation and integration compatibility.

### Phase 6 — shared UI and both hosts

- [x] Extend shared Items table with Stock column/status.
- [x] Add shared Item stock presentation suitable for both apps.
- [x] Add shared stock adjustment form.
- [x] Update Billing Item create/edit/detail/list adapters.
- [x] Update Invoice Item create/edit/detail/list adapters.
- [x] Add focused `/items/[itemId]/stock` routes in both hosts.
- [x] Extend shared document line-item selection/quantity validation with stock metadata.
- [x] Enable advisory stock validation only for invoice editors, never Quote.
- [x] Keep server-authoritative validation in Billing API.

### Phase 7 — tests and review

- [x] Add API schema tests for stock request invariants.
- [x] Add repository tests for duplicate-line aggregation, oversell, negative policy, ignored untracked items, and exact restoration.
- [x] Add shared UI tests for in/low/out/not-tracked states.
- [x] Perform static Billing/Invoice parity review and close discovered gaps.
- [x] Review diff for duplicate contracts/helpers, boundary violations, accidental SDK-doc churn, and scope creep.
- [x] Re-read latest `main`/branch state before final report; branch was 17 commits ahead and 0 behind before documentation commits.
- [ ] Execute live concurrency/database integration tests locally. GPT Web cannot execute repository commands or a database.
- [ ] Execute existing host-specific DOM suites locally. No new redundant host-only stock DOM suites were added because behavior is concentrated in shared UI and API tests.

### Phase 8 — report

- [x] Write `reports/gpt-web/2026-09-07-item-stock-tracking.md`.
- [x] Include complete migration SQL, files changed, decisions, gaps, risks, tests authored, and verification commands.
- [x] Mark this plan as implementation complete with local verification still required.

## Authored focused test cases

15 new focused cases were added:

- 5 Billing API Item stock schema cases.
- 5 Billing API stock repository/lifecycle cases.
- 5 shared `@876/billing-ui` stock-state cases.

These tests are committed but were not executed by GPT Web.

## Verification commands for orchestrator

GPT Web cannot execute these. Run from repository root:

```bash
pnpm --filter @876/billing-api generate
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

Do not run `prisma migrate deploy` blindly. Review migration status and the target environment first, then use the repository's normal deployment process.

## Known deferred scope

- warehouses / locations
- reservations / available vs committed balances
- purchasing / suppliers / goods receipts
- fulfillment / shipments
- transfers / counts / damage / write-offs workflows
- serial / lot / batch / expiry tracking
- FIFO / weighted-average costing / inventory valuation
- fractional stock quantities
- automatic stock return from credit notes
- inventory dashboard/navigation/app entitlement

## Handoff state

Implementation is committed on `feature/item-stock-tracking`. The final GPT Web report is at:

`plans/2026-09-07-item-stock-tracking/reports/gpt-web/2026-09-07-item-stock-tracking.md`

The local agent should pull the branch, run all verification commands above, inspect generated Prisma/API-contract changes, apply the migration only through the normal deployment process, and preserve the lightweight Item-owned boundary. Any warehouse/full-inventory expansion belongs in a separate architectural phase.

## PR preparation summary

No PR was authorized or created in this run.
