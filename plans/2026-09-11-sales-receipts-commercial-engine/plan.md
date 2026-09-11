# Implementation Plan: Sales Receipts Commercial Engine

**Run ID:** `2026-09-11-sales-receipts-commercial-engine`  
**Branch:** `feat/sales-receipts-commercial-engine`  
**Base:** `main`  
**Status:** IN_PROGRESS

## Overview

Implement Sales Receipts as a first-class 876 Billing commercial resource shared by 876 Billing and 876 Invoice. A Sales Receipt represents an immediate paid sale: the commercial sale, payment evidence, banking evidence, inventory movement, and durable event are committed together without creating Accounts Receivable, customer unused credit, an Invoice, or a PaymentAllocation.

The implementation must reuse the canonical Billing commercial plane. It must not create an Invoice-local model, a second payment model, duplicate line-item calculation, or speculative Orders/POS resources.

## Rules read

- `CLAUDE.md`
- `.agents/rules/gpt-web-operating-rules.md`
- `.agents/rules/implementation-tracker.md`
- `.agents/rules/execution-autonomy.md`
- `.agents/rules/ai-code-quality.md`
- `.agents/rules/naming.md`
- `.agents/rules/types.md`
- `.agents/rules/code-style.md`
- `.agents/rules/testing.md`
- `.agents/rules/error-handling.md`
- `.agents/rules/git.md`
- `.agents/rules/express-api.md`
- `.agents/rules/api-backend.md`
- `.agents/rules/stripe-api-pattern.md`
- `.agents/rules/sdk-conventions.md`
- `.agents/rules/app-structure.md`
- `.agents/rules/app-layout.md`
- `.agents/rules/module-settings.md`
- `.agents/rules/access-control.md`
- `.claude/rules/finance-app-parity.md` / mirrored agent rule
- `.claude/rules/billing-data-plane.md` / mirrored agent rule
- `.claude/rules/billing-commercial-platform.md` / mirrored agent rule

The user explicitly authorized creating a new branch from `main`; that instruction overrides only the standing GPT-Web no-new-branch default for this run. No PR will be opened.

## Existing architecture verified

- Billing is the canonical financial and commercial plane; Invoice is a reduced host over the same data.
- `sales-receipts` already exists as a canonical finance module and an Invoice UI/navigation scaffold.
- Quotes, invoices, sales receipts, credit notes, and expenses are defined as shared document concepts for UI/calculation reuse.
- `Payment` already owns payment mode, deposit account, provider/payment method metadata, bank transaction, refunds, attempts, and disputes.
- Ordinary `payments.create()` intentionally posts a `PAYMENT_RECEIVED` customer-ledger credit, creates allocations, and exposes unapplied cash as customer credit; it therefore cannot be reused unchanged for Sales Receipt creation.
- `finalizeInvoiceWorkflow()` is the reference cross-domain workflow: idempotency + inventory + financial evidence + customer projection + outbox in one transaction.
- Inventory accepts generic `ResourceReference` evidence and must not learn document lifecycle policy.
- Credit Notes and Refunds are distinct existing primitives: a credit changes economic value; a refund moves cash out.
- Document numbering is centralized through `nextDocumentNumber()` and `DocumentType`.

## Core invariants

1. `SalesReceipt = immediate sale + settled payment evidence`.
2. A created Sales Receipt is financially `PAID`; communication state is separate.
3. Creating a Sales Receipt creates no Invoice and no Accounts Receivable.
4. The linked Payment has `unappliedAmount = 0` and no `PaymentAllocation` rows.
5. The embedded Payment must not post an ordinary `PAYMENT_RECEIVED` customer-ledger credit or create available customer credit.
6. Inventory is consumed exactly once for tracked sellables and restored only by an explicit correction/return workflow.
7. The Sales Receipt and payment/bank/inventory/outbox side effects are atomic.
8. Issued Sales Receipts are not hard-deleted; correction is explicit and auditable.
9. Returns use Credit Note semantics; cash returned uses Refund semantics.
10. Billing and Invoice render the same canonical record and share reusable finance UI.
11. All money remains integer minor units; historical documents render from snapshots.
12. No speculative Orders, checkout, POS, cash-drawer, location, channel, or fulfillment domain is added.

## Architectural scope

### Billing API

- Prisma: Sales Receipt/line persistence, enum/sequence relations, Payment/Quote/Credit Note linkage.
- Documents: Sales Receipt schemas, serialization, repositories, routes/controllers/service facade, create/void/refund/quote-conversion workflows.
- Payments: extract/reuse a settled-payment persistence seam that does not force A/R semantics.
- Inventory: extend generic reference typing only where needed; keep lifecycle decisions outside Inventory.
- Customers/reporting: keep A/R neutral and expose Sales Receipts through transaction/sales projections where current projection architecture supports it.
- Outbox/idempotency: durable Sales Receipt events and replay-safe commands.

### `@876/billing`

- Add canonical Sales Receipt types/schemas and plural `billing.salesReceipts` resource methods.
- Add quote conversion method only if the existing quote resource exposes lifecycle verbs there.

### Billing + Invoice hosts

- Replace the unbacked Sales Receipt scaffold with real Billing-backed list/create/detail behavior.
- Share product UI through `@876/billing-ui` where both hosts need the same rendering/form behavior.
- Preserve host-owned routing, guards, session resolution, module gating, and data loading.
- Correct the placeholder status filtering so communication state is not mixed with financial state.

## Domain model target

### SalesReceipt

Required concepts:

- tenant/source attribution and idempotency metadata consistent with other integration-created finance resources;
- customer and optional source Quote linkage;
- unique Sales Receipt number generated by the existing document sequence;
- receipt date/currency;
- immutable line snapshots and resolved totals;
- `PAID | VOID` financial lifecycle;
- one linked Payment;
- optional salesperson snapshot following current document conventions;
- customer/seller/payment display snapshots where the existing document model supports them;
- void metadata and timestamps.

### SalesReceiptLine

Use separate historical persistence, but construct lines through the existing Catalog/Pricing/Billing Engine ownership rather than duplicating resolution or arithmetic.

### Payment relationship

The Sales Receipt Payment is durable money-movement evidence, not an ordinary `Payments Received` credit balance. It must be excluded from the default Payments Received surface while remaining available to banking/provider/audit/reporting code.

## Planned phases

### Phase 0 — Baseline, plan, and evidence

- [x] Read binding rules.
- [x] Create branch from `main` per user authorization.
- [x] Verify module/UI scaffold, accounting model, Payment behavior, invoice workflow, commercial ownership, and document numbering.
- [ ] Inventory exact API/SDK/UI files before each edit.

### Phase 1 — Schema and migration

- [ ] Add `SALES_RECEIPT` to `DocumentType` and document prefix mapping.
- [ ] Add `SalesReceiptStatus`.
- [ ] Add `SalesReceipt` and `SalesReceiptLine` models with tenant-safe indexes/relations.
- [ ] Add one-to-one Payment relation.
- [ ] Add optional source Quote relation and optional Credit Note source relation where return semantics require it.
- [ ] Hand-write additive migration SQL; do not run Prisma generation/migration.
- [ ] Add/update document-number tests.

### Phase 2 — Payment recording seam

- [ ] Locate the smallest reusable Payment-owned primitive for validating payment mode/deposit account and writing Payment + BankTransaction.
- [ ] Extract only if two real workflows need it; do not add a pass-through abstraction.
- [ ] Preserve ordinary Payments Received behavior byte-for-byte at the public contract.
- [ ] Ensure embedded Sales Receipt payments use `unappliedAmount = 0`, no allocations, and no customer A/R ledger credit.

### Phase 3 — Sales Receipt create workflow

- [ ] Add strict schemas/contracts.
- [ ] Resolve customer/currency/sellables/pricing/tax through existing owners.
- [ ] Generate `SR-` number through `nextDocumentNumber()`.
- [ ] Persist receipt + immutable lines.
- [ ] Consume inventory with `{ type: 'sales-receipt', id }` evidence.
- [ ] Record settled payment/bank evidence.
- [ ] Keep customer A/R and available credit unchanged.
- [ ] Enqueue `sales-receipt.created` in the same transaction.
- [ ] Add command idempotency/replay support consistent with invoice finalization.

### Phase 4 — Retrieve/list/API integration

- [ ] Add list/retrieve/create routes and controllers under the existing Documents module.
- [ ] Add tenant isolation and status/cursor filtering consistent with neighboring document resources.
- [ ] Add serializer/OpenAPI contracts following existing v1 family conventions.
- [ ] Add API contract/route/service tests including negative space and rollback-sensitive behavior.

### Phase 5 — Void/correction

- [ ] Add explicit `voidSalesReceiptWorkflow`.
- [ ] Reverse eligible payment/bank evidence without manufacturing A/R activity.
- [ ] Restore inventory exactly once.
- [ ] Block misleading voids when returns/refunds/financial evidence require a correction workflow instead.
- [ ] Emit `sales-receipt.voided` atomically.

### Phase 6 — Quote conversion

- [ ] Add accepted Quote → Sales Receipt conversion using copied historical commercial values and supplied payment details.
- [ ] Never create an intermediate Invoice.
- [ ] Enforce conversion/idempotency rules compatible with existing Quote → Invoice behavior.

### Phase 7 — Returns/refunds

- [ ] Link Credit Notes to Sales Receipts without removing existing standalone/invoice-linked credit-note use cases.
- [ ] Implement refund orchestration as Credit Note/return value correction plus existing Refund cash-out evidence.
- [ ] Restore stock only for explicit returned quantities, not every monetary credit.
- [ ] Derive `none | partially-refunded | refunded` presentation state rather than overloading Sales Receipt financial status.

### Phase 8 — SDK

- [ ] Add Sales Receipt schemas/types/resources to `@876/billing`.
- [ ] Expose `billing.salesReceipts.create/retrieve/list` plus implemented lifecycle verbs using established authority entrypoints.
- [ ] Keep `$876` free of Billing product resources.

### Phase 9 — Billing and Invoice UI

- [ ] Replace placeholder list/detail data with host-owned Billing client loading.
- [ ] Add shared create/detail/list presentation in `@876/billing-ui` only where both hosts genuinely consume it.
- [ ] Keep create/edit as routes, not dialogs.
- [ ] Preserve the list/detail shell and Suspense/loading strategy already used by the finance apps.
- [ ] Replace placeholder `draft/sent` financial filters with real paid/refund/void projections as supported by API data.
- [ ] Render mutation failures in-context and keep the form/shell mounted.

### Phase 10 — Customer/reporting integration

- [ ] Include Sales Receipts in customer transaction/activity projections where those projections are canonical.
- [ ] Do not add Sales Receipts to open/overdue/A/R aging.
- [ ] Include them in actual sales reporting only where current reporting infrastructure exists and can be extended without speculative new subsystems.
- [ ] Keep `lifetimeBilled` semantics stable unless a coordinated rename/new metric is explicitly implemented.

### Phase 11 — Documentation and final review

- [ ] Update `apps/billing/docs/accounting-model.md` with intent vs credit sale vs immediate paid sale.
- [ ] Update Sales Receipt-facing product docs where necessary.
- [ ] Review diff for duplicate helpers/types/services, compatibility residue, swallowed errors, unsafe assertions, and scope creep.
- [ ] Write final GPT Web report with counted tests and all unexecuted verification.
- [ ] Mark this plan completed only when the implemented scope is internally coherent.

## Out of scope

- Orders/carts/checkout sessions.
- POS registers/cash drawers/shifts.
- Store locations/channels/fulfillment.
- Promotions/gift cards/loyalty.
- Restaurant tables/kitchen tickets.
- Marketplace order orchestration.
- New payment processor adapters.
- Broad Billing API error-model migrations unrelated to Sales Receipts.

## Verification commands for the orchestrator

GPT Web cannot execute these. They are required after implementation:

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
pnpm --filter @876/invoice typecheck
pnpm --filter @876/invoice test
```

Use the actual workspace names from each affected `package.json` if they differ from the labels above.

## Handoff state

Current work is active on `feat/sales-receipts-commercial-engine`. The plan is the unit of completion. Before each code edit, inspect the exact neighboring implementation and preserve current public compatibility. Verification is not executed by GPT Web and must never be reported as passing from this run.

## PR preparation summary

Not ready. No PR is authorized or planned from this GPT Web run.
