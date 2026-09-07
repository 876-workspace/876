# Implementation Plan: Billing + Invoice Item Stock Tracking

**Run ID:** `2026-09-07-item-stock-tracking`  
**Branch:** `feature/item-stock-tracking`  
**Base:** `main` at `2e9997b992e88ecc0a5a1f749c53e3fccca8a64f`  
**Status:** IN_PROGRESS

## Overview

Add lightweight stock tracking to the shared Billing/Invoice `Item` resource. This is intentionally not a full inventory-management subsystem: no warehouses, suppliers, purchase orders, reservations, fulfillment, transfers, serials, lots, costing engines, or inventory app/navigation.

The shared Billing API remains the sole owner of Item state. Billing and Invoice consume the same records and shared `@876/billing-ui` presentation.

## Objectives

- Extend `Item` with stock-tracking configuration and current integer quantity.
- Record every stock mutation in a small immutable movement table.
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
8. `allowOutOfStock=false` must remain safe under concurrent finalization.
9. `allowOutOfStock=true` may produce negative stock.
10. Every stock counter mutation has an immutable movement record.
11. No Inventory module, app, navigation, warehouse model, purchasing model, or fulfillment model is introduced.

## Key design decisions

- Stock quantities are integers in this phase because `billing_invoice_lines.quantity` is currently `Int`. Fractional stock requires a coordinated future document-quantity migration.
- Stock configuration lives on `Item`: `trackStock`, `stockQuantity`, `lowStockThreshold`, `allowOutOfStock`.
- `stockQuantity` is nullable for untracked records; tracked goods initialize to zero unless an opening quantity is supplied.
- Current quantity is not normally patched through generic Item update once stock is active. A dedicated `stock-adjustments` operation owns manual count changes.
- A tiny `ItemStockMovement` ledger is included for auditability, idempotency, and exact void restoration. It is not a full inventory ledger/product.
- Quotes do not consume stock and must not be rejected merely because current stock is insufficient. Invoice-specific stock validation must not be placed unconditionally in a generic document-line builder.
- Low-stock threshold is display/warning state only; it never blocks a sale.
- Credit notes do not automatically restock in this phase because financial credit does not prove physical return.
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

- [ ] Inspect Item Prisma schema, schemas, serializer, repository, service/routes, and tests.
- [ ] Inspect Billing SDK Item types/resources and integration surface.
- [ ] Inspect both app Item list/create/edit/detail paths.
- [ ] Inspect shared `ItemsTable` and document line-item editor.
- [ ] Inspect invoice finalization/void paths and error registry.

### Phase 2 — schema and migration

- [ ] Extend `Item` with lightweight stock fields.
- [ ] Add `ItemStockMovement` model.
- [ ] Hand-write additive migration SQL with indexes/checks/idempotency protection.

### Phase 3 — Billing API Item stock capability

- [ ] Extend Item request/response schemas and serializer.
- [ ] Enforce SERVICE/GOOD stock invariants.
- [ ] Create initial-stock movement transactionally.
- [ ] Add manual stock-adjustment service/repository/route.
- [ ] Add stock availability/decrement/restore operations at the catalog module public boundary.
- [ ] Add canonical stock-related errors through the existing Billing error pattern.

### Phase 4 — invoice lifecycle enforcement

- [ ] Validate tracked stock for invoice draft creation paths without affecting Quotes.
- [ ] Aggregate duplicate Item lines before stock checks.
- [ ] Re-check and atomically decrement stock during invoice finalization.
- [ ] Write one invoice-finalized movement per Item.
- [ ] Restore exact recorded stock changes during eligible invoice void.
- [ ] Preserve current AR/ledger/idempotency behavior.

### Phase 5 — SDK/contracts

- [ ] Extend shared Item resource schemas/types.
- [ ] Add stock-adjustment resource operation through the proper bounded client entrypoints.
- [ ] Preserve integration contract compatibility.

### Phase 6 — shared UI and both hosts

- [ ] Extend shared Items table with Stock column/status.
- [ ] Add shared Item stock presentation suitable for both apps.
- [ ] Add shared/lightweight stock adjustment UI where the host pattern supports it.
- [ ] Update Billing Item create/edit/detail/list adapters.
- [ ] Update Invoice Item create/edit/detail/list adapters.
- [ ] Extend shared invoice line-item selection/quantity validation with stock metadata.
- [ ] Keep all server-authoritative validation in Billing API.

### Phase 7 — tests and review

- [ ] Add/extend API schema/repository/lifecycle tests.
- [ ] Add race/idempotency coverage where the existing test harness supports it.
- [ ] Add shared UI tests for in/low/out/not-tracked states.
- [ ] Add both-host parity/adapter tests where appropriate.
- [ ] Review diff for duplicate contracts/helpers, boundary violations, and scope creep.
- [ ] Re-read latest `main`/branch state before final report.

### Phase 8 — report

- [ ] Write `reports/gpt-web/2026-09-07-item-stock-tracking.md`.
- [ ] Include complete migration SQL, files changed, decisions, gaps, risks, and verification commands.
- [ ] Mark this plan `COMPLETED` or honestly record remaining gaps.

## Verification commands for orchestrator

GPT Web cannot execute these. The orchestrator/local agent should run the commands that exist in the affected workspaces, including at minimum:

```bash
pnpm --filter @876/billing-api typecheck
pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api build
pnpm --filter @876/billing-api db:validate
pnpm --filter @876/billing-api db:drift
pnpm --filter @876/billing-api api:contract:check

pnpm --filter @876/billing test
pnpm --filter @876/billing-ui test

pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app test

pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app test

node scripts/check-app-structure.mjs
```

Verification is not executed by GPT Web.

## Handoff state

Branch created from the exact current `main` SHA above. Rules are read. Current repository owners and call paths are being inventoried before code changes.

## PR preparation summary

Not ready. No PR is authorized or planned in this run.
