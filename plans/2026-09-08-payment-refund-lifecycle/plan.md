# Implementation Plan: Payment, Credit, Refund, and Customer Account Lifecycle

**Run ID:** `2026-09-08-payment-refund-lifecycle`  
**Branch:** `feature/payment-refund-lifecycle`  
**Base:** `main@c2a687efc458baf1d69a0dc6d42b3bc17fefbced`  
**Status:** IN_PROGRESS

## Overview

Complete the shared customer-payment lifecycle across 876 Billing and 876 Invoice without replacing the existing Billing accounting model. The implementation keeps receipt, allocation, credit, refund, reversal, and statement effects as distinct financial events while fixing current UI parity and money-correctness gaps.

## Rules read

- [x] `CLAUDE.md`
- [x] `.agents/rules/gpt-web-operating-rules.md`
- [x] `.agents/rules/implementation-tracker.md`
- [x] `.agents/rules/git.md`
- [x] `.agents/rules/ai-code-quality.md`
- [x] `.agents/rules/naming.md`
- [x] `.agents/rules/types.md`
- [x] `.agents/rules/code-style.md`
- [x] `.agents/rules/testing.md`
- [x] `.agents/rules/error-handling.md`
- [x] `.agents/rules/api-backend.md`
- [x] `.agents/rules/sdk-conventions.md`
- [x] `.agents/rules/stripe-api-pattern.md`
- [x] `.agents/rules/shared-product-ui.md`
- [x] `.agents/rules/app-structure.md`
- [x] `.agents/rules/app-layout.md`
- [x] `.agents/rules/finance-app-parity.md`
- [x] `.agents/rules/billing-data-plane.md`

## Architectural scope

Primary owners:

- `apps/billing-api/src/modules/payments/**`
- `apps/billing-api/src/modules/customers/**`
- `apps/billing-api/src/modules/documents/**` where credit-note lifecycle is owned
- `packages/billing/**`
- `packages/billing-ui/**`
- `apps/billing/**`
- `apps/invoice/**`

### Invariants

1. Receiving money and applying it to an invoice are separate events.
2. Allocation never creates a second reduction in customer net position.
3. Payment refunds draw only from unapplied successful-payment credit.
4. Credit-note refunds draw only from open credit-note balance.
5. Refunds are cash-out events, not negative payments and not payment reversals.
6. Reallocating a payment moves allocation evidence without creating a refund.
7. All money stays integer minor units / strings end-to-end; no JS floating-point money arithmetic.
8. A payment/customer/invoice remains one shared record across Billing and Invoice.
9. Shared finance presentation lives in `@876/billing-ui`; hosts own data, routing, authority, and mutations.
10. Customer statement remains ledger-backed and customer AR remains projection-backed.
11. Existing durable enum/status/wire contracts are not renamed in this run.
12. Provider-backed asynchronous refund execution remains an extension point; this run must not invent provider-specific fields without an implemented execution owner.

## Verified current-state findings

- `Payment.unappliedAmount`, `Payment.amountRefunded`, allocations, refunds, and customer ledger relations already exist.
- Refund creation is serializable and validates customer, currency, source status, and source balance.
- Payment-source refunds currently decrement `unappliedAmount` but do not increment `amountRefunded`.
- Payment update/delete refuse to replace or cancel a payment after any refund exists.
- Payment application is already a distinct operation and only consumes `unappliedAmount`.
- Customer Statement is real and ledger-backed.
- Customer Transactions currently renders `data={[]}` and therefore never exposes the real records.
- Billing has payment edit/reallocation UI; Invoice does not.
- Credit-note Apply/Refund UI converts money with `Number()` and `Math.round(* 100)` and hard-codes two decimal places.

## Key design decisions

### Do not redesign the accounting model

The existing canonical flow remains:

```text
Invoice -> receivable
Payment -> cash/customer credit
PaymentAllocation -> applies existing cash to receivable
CreditNote -> non-cash credit / receivable reduction
CreditNoteAllocation -> applies credit to receivable
Refund -> cash out from available customer credit
CustomerLedgerEntry -> account history
```

### Fix stored payment refund evidence

A successful payment-source refund will decrement `unappliedAmount` and increment `amountRefunded` atomically in the same serializable transaction. The refund row remains the detailed evidence; `amountRefunded` is the payment projection.

### Keep refund execution manual/accounting-first in this run

The current Refund model has no provider execution state. This run will harden manual refund correctness and UI without adding a speculative provider state machine. Provider refund execution can extend the canonical refund later behind the Billing provider abstraction.

### Shared payment UI

Payment detail and mutation affordances shared by Billing and Invoice belong in `@876/billing-ui`. Host pages/adapters continue to resolve permissions, data, hrefs, and same-origin mutation transport.

### Customer Transactions versus Statement

Transactions is a resource-oriented grouped view (invoices, payments, credit notes, refunds). Statement remains a chronological ledger view. They must not be collapsed into one implementation.

## Execution reports

| Tool | Report | Status |
| --- | --- | --- |
| GPT Web | `./reports/gpt-web/2026-09-08-payment-refund-lifecycle.md` | pending |

## Task checklist

### Phase 1 — Backend refund/accounting correctness

- [ ] Increment `Payment.amountRefunded` for payment-source refunds in the refund transaction.
- [ ] Verify/reinforce source-balance, customer, currency, and lifecycle guards.
- [ ] Draft focused refund repository tests for partial/full/excess refunds and payment projection updates.
- [ ] Verify refund ledger direction and customer-AR recomputation invariants.

### Phase 2 — Money-safe credit-note actions

- [ ] Reuse/promote the existing finance minor-unit parser instead of `Number()` / `Math.round(*100)`.
- [ ] Make credit-note Apply/Refund inputs currency-decimal aware.
- [ ] Remove raw floating-point balance checks.
- [ ] Preserve the existing backend apply/refund contracts.

### Phase 3 — Shared payment detail and Invoice parity

- [ ] Promote shared payment-detail presentation into `@876/billing-ui`.
- [ ] Refactor Billing payment detail to use the shared panel and real payment status.
- [ ] Refactor Invoice payment detail to the same panel.
- [ ] Add Invoice payment edit/reallocation using the existing shared Payments Received form.
- [ ] Keep host authorization/routing outside the shared package.

### Phase 4 — Payment refund workflow

- [ ] Add payment-source refund UI for available `unappliedAmount`.
- [ ] Collect amount, date, funding/deposit account, payment mode when applicable, reason, and notes using existing contracts.
- [ ] Prevent refund of allocated cash until it becomes available customer credit.
- [ ] Surface refund history/context from payment detail.

### Phase 5 — Customer account experience

- [ ] Wire real records into Customer -> Transactions.
- [ ] Add Payments Received and Refunds sections; retain product-specific sections where supported.
- [ ] Expand the shared receivables panel with available credit, net position, lifetime billed, and lifetime paid when already supplied by the account projection.
- [ ] Keep Statement ledger-backed and ensure refund events remain visible.

### Phase 6 — Credit-note apply/refund usability

- [ ] Replace raw invoice-ID application with eligible same-customer/same-currency invoice selection where the existing service/client can support it without duplicating business logic.
- [ ] Allow partial apply, partial refund, and remaining open credit.
- [ ] Show credit-note refunded/applied/balance evidence consistently.

### Phase 7 — Documentation and handoff

- [ ] Update accounting/lifecycle documentation for refunds, unapply/reallocation, and customer credit.
- [ ] Review final diff for duplicate finance UI, compatibility residue, JS-number money, swallowed errors, and accidental status migration.
- [ ] Write GPT Web final report with exact changed files, drafted test count, risks, and verification commands.
- [ ] Mark this plan COMPLETED only after all feasible connector-side implementation is committed.

## Verification commands

GPT Web cannot execute these; verification is the orchestrator's responsibility.

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
pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app test
```

No formatter, linter, test, typecheck, build, Prisma command, database migration, or API contract check can be executed from this GPT Web seat.

## Multi-session continuity / handoff

Current branch was cut from `main@c2a687efc458baf1d69a0dc6d42b3bc17fefbced`. Rules and current payment/refund repositories have been reviewed. Implementation begins with backend refund evidence and money-safe shared UI because later host flows depend on those invariants.

## PR preparation summary

Pending implementation. GPT Web will not open a PR.
