# Payments, Receivables & Customer Statements — implementation plan

**Date:** 2026-09-08  
**Branch:** `feature/payments-receivables-foundation`  
**Base:** `main` @ `cd67f490183bb155e3a53a708691ccf6f449f127`  
**Owner:** 876 Billing financial data plane

## Objective

Harden the existing customer-to-cash foundation without turning this change into a general commerce, banking, or accounting build-out.

The production path for this run is:

```text
Customer
  -> finalized Invoice / receivable
  -> Payment received
  -> PaymentAllocation
  -> invoice + customer AR projection
  -> customer account / statement
```

The key accounting invariant is that **receiving cash and allocating that cash are different events**. A received payment can remain unapplied. Applying it to an invoice settles a specific receivable; it must not credit the customer's economic position a second time.

## Binding repository rules read before implementation

- `CLAUDE.md`
- `.agents/rules/gpt-web-operating-rules.md`
- `.agents/rules/execution-autonomy.md`
- `.agents/rules/ai-code-quality.md`
- `.agents/rules/naming.md`
- `.agents/rules/types.md`
- `.agents/rules/code-style.md`
- `.agents/rules/testing.md`
- `.agents/rules/error-handling.md`
- `.agents/rules/git.md`
- `.agents/rules/customer-architecture.md`
- `.agents/rules/billing-data-plane.md`
- `.agents/rules/finance-app-parity.md`
- `.agents/rules/api-backend.md`
- `.agents/rules/sdk-conventions.md`
- `.agents/rules/stripe-api-pattern.md`
- `.agents/rules/app-structure.md`
- `.agents/rules/app-layout.md`
- `.agents/rules/shared-product-ui.md`
- `.agents/rules/data-fetching.md`
- `.agents/rules/data-loading.md`
- `.agents/rules/performance.md`
- `.agents/rules/performance-waterfalls.md`

The user's explicit instruction to cut a new branch overrides the standing GPT-Web no-new-branch default for this run. All other connector-only and verification restrictions remain in force: no shell, no package-manager commands, no Prisma generation/migration execution, no PR, and no claims that local checks passed.

## Verified baseline from current `main`

The earlier conceptual plan assumed more missing infrastructure than the repository actually has. Current `main` already contains the core money and AR primitives:

| Capability | Current state | Decision for this run |
| --- | --- | --- |
| `Payment` | Exists in Billing API with amount, currency, date, mode, deposit account, provider fields, and `unappliedAmount` | Preserve and harden |
| `PaymentAllocation` | Exists as the many-to-many settlement link between payments and invoices | Preserve |
| Partial/multi-invoice payment | Supported | Preserve and test |
| Unapplied/overpayment cash | Supported through `Payment.unappliedAmount` | Preserve |
| Payment modes | Existing Billing-owned resource and integration surface | Do not rebuild |
| Customer AR | `Customer.outstandingReceivable` + `Customer.unusedCredits`, recomputed from source rows | Preserve |
| Customer subledger | Append-only `CustomerLedgerEntry` with invoice/payment/credit/refund references | Use for account history and statements |
| Invoice settlement projection | Allocation updates `amountPaid`, `amountDue`, status, and `paidAt` transactionally | Preserve |
| Payment reversal | Existing cancellation path reverses allocations, posts `PAYMENT_REVERSED`, and retains history | Preserve |
| Shared finance UI | `@876/billing-ui` already has receivables and statement panels | Wire; do not duplicate |
| Statement routes | Billing + Invoice statement pages exist but return `null` | Implement |

### Verified accounting behavior to preserve

Current payment creation posts one `PAYMENT_RECEIVED` customer-ledger credit for the **full received payment**, including unapplied cash. Later `apply` operations reduce both invoice `amountDue` and payment `unappliedAmount`, but do **not** post another customer-ledger credit.

That is the correct economic invariant:

```text
Before payment:
  AR 1,000 - unapplied credit 0 = net customer position 1,000

Receive 1,000 unapplied:
  AR 1,000 - unapplied credit 1,000 = net customer position 0

Allocate 1,000:
  AR 0 - unapplied credit 0 = net customer position 0
```

Allocation changes *where the settlement sits*; it does not change the customer's net position again.

## Concrete gaps found on `main`

### G1 — Customer-account API and SDK contracts are incompatible

`@876/billing` expects `customers.account()` to parse:

- `currency`
- `lifetimeBilled`
- `lifetimePaid`
- `outstandingReceivable`
- `availableCredit`
- `netPosition`
- `statement[]`

The Billing API currently returns:

- `outstandingReceivable`
- `unusedCredits`
- `entries[]`

The SDK therefore cannot parse the real response. This is already documented as a repo defect and currently blocks the shared account/statement UI from using the typed client.

### G2 — Statement pages are stubs

Both:

- `apps/billing/src/app/(app)/customers/[customerId]/statement/page.tsx`
- `apps/invoice/src/app/(app)/customers/[customerId]/statement/page.tsx`

return `null`, even though `@876/billing-ui` already owns a shared `CustomerStatementPanel`.

### G3 — Receivables panel exists but is not wired

`CustomerReceivablesPanel` exists in `@876/billing-ui`, but customer overview pages currently render contacts only. No second implementation should be created in either host.

### G4 — Account history is capped but does not expose statement opening/closing semantics

The current account service lists up to 100 ledger rows in reverse chronological order. A customer statement needs deterministic chronological presentation and an opening/closing balance that remains correct when history exists before the displayed rows/period.

### G5 — The public payment status contract is narrower than the persisted lifecycle

The database enum includes `REQUIRES_ACTION`, `AUTHORIZED`, `PROCESSING`, `PARTIALLY_REFUNDED`, `REFUNDED`, and `DISPUTED`, while the payment API/SDK resource type currently declares only `PENDING | SUCCEEDED | FAILED | CANCELED`. A provider-backed or refunded payment can therefore become valid persisted state that the typed public schema rejects.

### G6 — Payment replacement is a financial-history risk

The current payment update path reverses ledger/allocation effects and then mutates the original `Payment` row in place with new amount/customer/currency/date details before posting the replacement effect. Ledger evidence remains, but the original payment fact itself is no longer immutable. This conflicts with the platform's append-oriented financial-history rule.

This run will not invent a replacement-payment relation without repository support. The safe first step is to narrow update semantics to non-economic metadata or explicitly defer full correction-command redesign after verifying all UI/API callers.

### G7 — Bank matching is coupled to manual payment recording

The current manual payment repository creates/upserts a `BankTransaction` marked `MATCHED` during payment create/update. This is distinct from the customer-AR correctness work and risks conflating recorded cash with bank-feed reconciliation. Do not expand banking in this run. Any decoupling must be done only if repository tests/contracts show it can be safely isolated.

## Fixed design decisions

### D1 — Do not create a new persisted `CustomerAccount` table

The repository's customer architecture is explicit: Billing `Customer` is the organization-scoped commercial relationship of record. `customer_account` is a read-model/API projection over that customer, its receivables, credits, payments, and ledger.

### D2 — Keep Payment and PaymentAllocation independent

Do not add `invoiceId` as the payment's source of truth. The allocation table remains authoritative for invoice settlement.

### D3 — Payment receipt changes net customer position once

`PAYMENT_RECEIVED` remains the customer-ledger event for received cash. Allocation must not add a second customer credit. Allocation reduces `Invoice.amountDue` and `Payment.unappliedAmount` together.

### D4 — AR and available credit remain separate projections

```text
outstandingReceivable = sum collectible invoice amountDue
availableCredit       = unapplied succeeded cash + open credit-note balance
netPosition           = outstandingReceivable - availableCredit
```

A customer can therefore simultaneously owe invoices and hold unapplied cash.

### D5 — Statements use the customer subledger, not ad-hoc invoice/payment merging

Invoice, payment, credit, refund, write-off, and reversal events stay identifiable through their ledger types and source IDs. Running balances are statement presentation over those entries; source rows remain authoritative.

### D6 — Invoice lifecycle remains the existing compatibility projection

Do not create a second invoice status system in this change. `Invoice.amountDue`, settlement totals, due date, sent evidence, and the centralized collectible-status projector remain authoritative.

### D7 — Billing and Invoice share the same finance UI implementation

Shared panels live in `@876/billing-ui`. Each host owns auth, routing, data loading, formatting/adaptation, and mutations.

## Scope

### In scope

1. Repair the typed customer-account contract end-to-end.
2. Provide a correct statement projection, including deterministic order and opening/closing/running balances.
3. Provide customer receivables summary values needed by the shared panel, including overdue balance and paid cash.
4. Wire customer receivables into Billing and Invoice overview pages.
5. Wire customer statements into Billing and Invoice statement tabs.
6. Correct the public payment status contract to cover persisted states.
7. Add focused tests around account/statement arithmetic and payment/allocation invariants.
8. Update accounting documentation and produce a GPT-Web final report.

### Explicitly out of scope

- sales orders / order management
- ecommerce fulfillment
- restaurant order flows
- new payment providers/gateways
- provider settlement and payout batching
- bank feeds and reconciliation workflows
- processing-fee accounting redesign
- chargebacks beyond representing existing payment status
- marketplace/seller settlement
- full double-entry general ledger
- new credit-note/refund product features beyond consuming existing ledger effects
- collection automation / reminder schedules
- broad multi-currency FX accounting

## Implementation phases

### Phase 1 — Canonical account and statement read model

**Goal:** make the existing customer financial history safe to consume through the Billing API and `@876/billing`.

Tasks:

- [ ] Inspect/fix `customers.account()` API/SDK wire contract without creating a second customer-account source of truth.
- [ ] Add repository-level aggregate/projection helpers rather than page-side finance arithmetic.
- [ ] Expose:
  - [ ] account currency
  - [ ] lifetime billed
  - [ ] lifetime paid
  - [ ] outstanding receivable
  - [ ] overdue receivable
  - [ ] available credit
  - [ ] net position
- [ ] Return ledger rows with all source identifiers needed by the statement UI.
- [ ] Build deterministic chronological statement rows.
- [ ] Compute opening, running, and closing balances from ledger directions using integer minor units only.
- [ ] Keep the API bounded; do not load unrelated customer domains.
- [ ] Add tests for debit/credit direction, reversals, unapplied cash, and opening/closing balance math.

**Acceptance invariants:**

```text
invoice 1,000 finalized      => net position 1,000
payment 1,000 unapplied      => net position 0; AR 1,000; credit 1,000
allocate payment 1,000       => net position 0; AR 0; credit 0
reverse payment/allocation   => original economic position restored
```

### Phase 2 — SDK contract and payment lifecycle alignment

- [ ] Make `CustomerAccountSchema` match the owning API contract.
- [ ] Add any statement/receivables types at the Billing package boundary, not inline in hosts.
- [ ] Keep public money values as decimal strings; request money remains bigint/minor-unit safe.
- [ ] Expand payment resource status types/schemas to all persisted `PaymentStatus` values.
- [ ] Review `payments.update` callers and prevent silent mutation of posted economic facts if a safe compatibility-preserving restriction can be made in this run.
- [ ] Do not redesign provider attempts, settlement, refunds, or reconciliation.

### Phase 3 — Shared customer receivables UI

- [ ] Reuse `@876/billing-ui/panels/customer-receivables-panel`.
- [ ] Billing overview: load account/receivables through its bounded Billing client/service and render beside existing customer detail content without blocking stable chrome.
- [ ] Invoice overview: perform the same adaptation through its Billing client.
- [ ] Show truthful error/empty states; do not turn an API failure into zero balances.
- [ ] Avoid request waterfalls and N+1s.

### Phase 4 — Shared customer statement UI

- [ ] Reuse `@876/billing-ui/panels/customer-statement-panel`.
- [ ] Replace the two `return null` statement routes.
- [ ] Render opening balance, chronological rows, running balance, and closing balance.
- [ ] Preserve ledger/source references in the typed data even if the first UI only renders description/date/amount/balance.
- [ ] Keep Billing/Invoice visual and behavioral parity.

### Phase 5 — Accounting docs, tests, and handoff

- [ ] Update `apps/billing/docs/accounting-model.md` with the payment-receipt vs allocation invariant and account-statement semantics.
- [ ] Add/extend focused API, SDK, and shared-panel tests where behavior changes.
- [ ] Review the final branch diff for duplicate logic, unsafe money coercions, lifecycle drift, and host-specific UI copies.
- [ ] Write `plans/2026-09-08-payments-receivables-foundation/reports/gpt-web/2026-09-08-payments-receivables-foundation.md`.
- [ ] Record all unexecuted verification commands for the local orchestrator.

## Migration strategy

No database migration is planned from the verified baseline. The required primitives already exist in Prisma. If implementation inspection discovers a schema change is genuinely required, it must be additive and accompanied by hand-written SQL; GPT Web will not run Prisma generation, migrations, drift checks, or database commands.

## Compatibility strategy

- Preserve existing Payment and PaymentAllocation rows and identifiers.
- Preserve customer AR denormalization semantics.
- Preserve invoice settlement projection behavior.
- Prefer correcting the Billing API/SDK mismatch at the owning contract boundary over page-side workarounds.
- Do not dual-write financial state.
- Do not delete/recreate historical payment evidence.
- If an existing frozen v1 contract must change to repair a demonstrably impossible SDK/API pairing, document the intentional compatibility correction and leave exact contract-regeneration commands in the final report rather than pretending generated artifacts were refreshed without the required tooling.

## Verification commands for the local orchestrator

GPT Web cannot execute these. The final report will repeat the exact affected subset after implementation.

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

pnpm --filter @876/billing-ui typecheck
pnpm --filter @876/billing-ui test

pnpm --filter @876/billing-app typecheck
pnpm --filter @876/invoice typecheck
```

Use the actual workspace package names from `package.json` if any of the host filters differ.

## Completion definition

This run is complete when a received payment can remain unapplied without falsely settling an invoice, allocations continue to settle invoices without double-crediting the customer, the typed customer account can be parsed from the real API response, and both Billing and Invoice render customer receivables and statements from the same Billing-owned read model and shared UI implementation.
