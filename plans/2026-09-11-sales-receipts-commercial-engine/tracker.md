# Sales Receipts Commercial Engine Tracker

**Run:** `2026-09-11-sales-receipts-commercial-engine`  
**Branch:** `feat/sales-receipts-commercial-engine`  
**Status:** IN_PROGRESS

## Repository preparation

- [x] Read `CLAUDE.md` on `main`.
- [x] Read `.agents/rules/gpt-web-operating-rules.md`.
- [x] Read implementation tracker/autonomy/reuse/naming/types/style/testing/error/git guidance.
- [x] Read Express/API/Stripe-pattern/SDK guidance.
- [x] Read app structure/layout/module/access guidance.
- [x] Read finance-app parity, Billing data-plane, and Billing commercial-platform guidance.
- [x] Create `feat/sales-receipts-commercial-engine` from `main` with explicit user authorization.
- [x] Create committed implementation plan before code edits.

## Evidence inventory

- [x] Verify Sales Receipts canonical module exists.
- [x] Verify Invoice Sales Receipts list/detail scaffold exists.
- [x] Verify no Billing API `SalesReceipt` Prisma model exists.
- [x] Verify ordinary Payment create semantics post customer A/R credit/unapplied cash.
- [x] Verify invoice workflow orchestration pattern.
- [x] Verify generic Inventory reference pattern.
- [x] Verify Credit Note + Refund separation.
- [x] Verify document numbering owner.
- [ ] Inventory exact Documents API route/controller/service/schema/repository shapes.
- [ ] Inventory `@876/billing` client/resource/schema patterns.
- [ ] Inventory Billing and Invoice Sales Receipt host files and shared `@876/billing-ui` document components.

## Phase 1 — Persistence

- [ ] `DocumentType.SALES_RECEIPT`
- [ ] `SalesReceiptStatus`
- [ ] `SalesReceipt` model
- [ ] `SalesReceiptLine` model
- [ ] Payment relation
- [ ] Quote relation
- [ ] Credit Note relation
- [ ] additive migration SQL
- [ ] sequence prefix + test updates

## Phase 2 — Payment seam

- [ ] shared settled-payment persistence/validation seam identified
- [ ] ordinary Payments Received behavior preserved
- [ ] Sales Receipt payment writes zero unapplied credit
- [ ] no PaymentAllocation for Sales Receipt
- [ ] no ordinary customer A/R ledger credit

## Phase 3 — Create workflow

- [ ] schemas
- [ ] repository persistence
- [ ] inventory consume
- [ ] payment/bank evidence
- [ ] idempotency
- [ ] outbox event
- [ ] transaction rollback semantics
- [ ] tests

## Phase 4 — API/resource reads

- [ ] list
- [ ] retrieve
- [ ] create route/controller/service
- [ ] serializer/contracts
- [ ] status/pagination filters
- [ ] tenant isolation tests

## Phase 5 — Void

- [ ] void workflow
- [ ] inventory restore
- [ ] payment/bank correction evidence
- [ ] refund/return guardrails
- [ ] event
- [ ] tests

## Phase 6 — Quote conversion

- [ ] accepted Quote conversion contract
- [ ] direct Sales Receipt creation
- [ ] no intermediate Invoice
- [ ] source relation/idempotency
- [ ] tests

## Phase 7 — Returns/refunds

- [ ] Credit Note Sales Receipt source relation
- [ ] refund orchestration using existing Refund primitive
- [ ] explicit returned-stock behavior
- [ ] derived refund presentation state
- [ ] tests

## Phase 8 — SDK

- [ ] resource types/schemas
- [ ] `billing.salesReceipts`
- [ ] lifecycle methods
- [ ] quote conversion method where appropriate
- [ ] authority entrypoint exports
- [ ] SDK tests

## Phase 9 — Product UI

- [ ] Billing Sales Receipts surface
- [ ] Invoice Sales Receipts backed by real data
- [ ] shared finance UI promoted only where both hosts consume it
- [ ] create route/form
- [ ] detail view
- [ ] correct list filters
- [ ] in-context mutation errors
- [ ] host guards/module gating preserved

## Phase 10 — Customer/reporting

- [ ] customer transaction projection
- [ ] A/R remains neutral
- [ ] available customer credit remains neutral
- [ ] existing sales reports extended where applicable
- [ ] A/R reports exclude Sales Receipts

## Phase 11 — Finalization

- [ ] accounting model docs
- [ ] product docs where needed
- [ ] duplicate/compatibility/error/scope diff review
- [ ] final report under `reports/gpt-web/`
- [ ] plan/tracker final state

## Verification

All executable verification is **not executed; verification is the orchestrator's**. Exact commands live in `plan.md` and must be run by the local/orchestrating agent after this branch is pulled.
