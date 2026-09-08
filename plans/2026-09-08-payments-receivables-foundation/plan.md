# Payments, Receivables & Customer Statements — implementation plan

**Date:** 2026-09-08  
**Branch:** `feature/payments-receivables-foundation`  
**Base:** `main` @ `cd67f490183bb155e3a53a708691ccf6f449f127`  
**Owner:** 876 Billing financial data plane  
**Implementation status:** complete; local verification and generated-contract refresh remain for the local orchestrator

## Objective

Harden the existing customer-to-cash foundation without turning this change into a general commerce, banking, or accounting build-out.

```text
Customer
  -> finalized Invoice / receivable
  -> Payment received
  -> PaymentAllocation
  -> invoice + customer AR projection
  -> customer account / receivables / statement
```

The key accounting invariant is that **receiving cash and allocating that cash are different events**. A received payment can remain unapplied. Applying it to an invoice settles a specific receivable; it must not credit the customer's economic position a second time.

## Binding repository rules used

- `CLAUDE.md`
- `.agents/rules/gpt-web-operating-rules.md`
- finance/customer/API/SDK/UI/testing/code-style rules referenced by those root rules

The user's explicit instruction to cut a new branch overrode the standing GPT-Web no-new-branch default for this run. All other connector-only restrictions remained in force: no shell, no Prisma execution, no package-manager commands, no PR, and no claims that local verification passed.

## Verified baseline

Current `main` already had the core financial primitives and they were preserved:

- `Payment`;
- `PaymentAllocation`;
- partial and multi-invoice payment allocation;
- unapplied cash through `Payment.unappliedAmount`;
- payment modes and deposit accounts;
- customer AR recomputation;
- append-only `CustomerLedgerEntry`;
- invoice settlement projection;
- payment reversal;
- shared customer receivables and statement panels.

No second payment model, customer-account table, ledger, or invoice-link source of truth was added.

## Fixed accounting decisions

### Receipt vs allocation

A successful payment receipt posts one `PAYMENT_RECEIVED` customer-ledger credit for the full received amount. Applying that cash later reduces `Invoice.amountDue` and `Payment.unappliedAmount` together and posts no second customer credit.

```text
Before payment:
  AR 1,000 - unapplied credit 0 = net 1,000

Receive 1,000 unapplied:
  AR 1,000 - unapplied credit 1,000 = net 0

Allocate 1,000:
  AR 0 - unapplied credit 0 = net 0
```

### AR projection

```text
outstandingReceivable = sum collectible invoice amountDue
availableCredit       = unapplied succeeded cash + open credit-note balance
netPosition           = outstandingReceivable - availableCredit
```

### Statements

Statements use the customer subledger, not ad-hoc invoice/payment merging. A bounded latest-100 statement remains arithmetically correct by returning an opening balance derived from complete ledger totals, running balances on the displayed chronological entries, and a closing balance.

## Implementation tracker

### Phase 1 — Canonical account and statement read model

- [x] Repair the customer-account API read model without adding a persisted account table.
- [x] Add dedicated repository/projection/service modules for the account projection.
- [x] Expose account currency.
- [x] Expose lifetime billed.
- [x] Expose lifetime paid.
- [x] Expose outstanding receivable.
- [x] Expose overdue receivable from remaining collectible invoice balances by due date.
- [x] Expose available credit.
- [x] Expose net position.
- [x] Return bounded ledger history with source references.
- [x] Present statement entries in deterministic chronological order.
- [x] Compute opening, running, and closing balances with integer minor-unit arithmetic.
- [x] Use grouped complete-ledger totals instead of loading unbounded history.
- [x] Add focused projection tests for receipt/allocation neutrality, reversals/refunds, and statement arithmetic.
- [x] Remove the obsolete duplicate `customerAccount()` service path after the controller moved to the new projection.

### Phase 2 — SDK and API contract alignment

- [x] Make `@876/billing` parse the actual richer customer-account response.
- [x] Add `CustomerAccountProjection` and `CustomerAccountStatementEntry` at the Billing package boundary.
- [x] Keep public money values as strings and financial arithmetic in integer minor units.
- [x] Align `billing-api`'s response Zod/OpenAPI source schema with the richer account response.
- [x] Preserve `unusedCredits` and `entries` as Express-cutover compatibility aliases.
- [x] Expand payment resource statuses to every persisted `PaymentStatus` value.
- [x] Add payment schema coverage for the expanded lifecycle.
- [x] Review `payments.update` callers and replacement behavior.

**Reviewed/deferred correction design:** the active Billing edit form uses `payments.update()` as a complete replacement operation. Narrowing it to metadata-only updates in this run would break an existing surface. The current implementation reverses prior economic effects, mutates the original payment row, increments a revision, and posts replacement effects. A follow-up should move this to an explicit immutable correction/replacement model rather than changing the endpoint incompatibly here.

### Phase 3 — Shared customer receivables UI

- [x] Reuse `@876/billing-ui/panels/customer-receivables-panel`.
- [x] Wire Billing customer overview to the Billing-owned account projection.
- [x] Wire Invoice customer overview to the same projection and panel.
- [x] Keep account and contact reads in separate Suspense boundaries rather than a sequential waterfall.
- [x] Preserve explicit error states instead of converting failed account reads into zero balances.
- [x] Avoid host-specific duplicate finance presentation.

### Phase 4 — Shared customer statement UI

- [x] Reuse `@876/billing-ui/panels/customer-statement-panel`.
- [x] Replace the Billing statement stub.
- [x] Replace the Invoice statement stub.
- [x] Render opening balance.
- [x] Render chronological activity.
- [x] Render signed debit/credit amounts.
- [x] Render running balance.
- [x] Render closing balance.
- [x] Keep ledger source references in the typed projection even though the first UI renders only presentation fields.
- [x] Preserve Billing/Invoice UI parity.

### Phase 5 — Documentation, review, and handoff

- [x] Update `apps/billing/docs/accounting-model.md` with receipt/allocation and statement invariants.
- [x] Add focused Billing API projection tests.
- [x] Add Billing SDK customer-account parsing coverage.
- [x] Add payment status parsing coverage.
- [x] Review final diff for duplicate finance logic, unsafe page-side arithmetic, and host-specific UI copies.
- [x] Confirm the branch is still ahead of and not behind current `main`.
- [x] Write the GPT-Web final report at `reports/gpt-web/2026-09-08-payments-receivables-foundation.md`.
- [x] Record generated-contract and verification commands for the local orchestrator.

## Explicitly out of scope / intentionally unchanged

- sales orders / order management;
- ecommerce or restaurant fulfillment;
- new payment providers;
- provider settlement and payout batching;
- bank feeds and reconciliation workflows;
- processing-fee accounting redesign;
- marketplace settlement;
- full double-entry GL;
- collection reminders/automation;
- broad FX accounting;
- payment replacement/revision schema redesign;
- decoupling the existing manual-payment `BankTransaction` `MATCHED` behavior from reconciliation.

## Database and compatibility strategy

No database migration is required for this implementation. Existing Payment, PaymentAllocation, Customer, Invoice, and CustomerLedgerEntry rows and identifiers remain authoritative.

The richer account response is an intentional repair of a previously incompatible API/SDK contract. The compatibility aliases that shipped during the Express cutover remain present.

The payment status change is additive and matches states already present in the persisted enum.

## Local verification still required

GPT Web did not run these commands and does not claim they pass:

```bash
pnpm --filter @876/billing-api typecheck
pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api build
pnpm --filter @876/billing-api db:validate
pnpm --filter @876/billing-api db:drift
pnpm --filter @876/billing-api api:contract:generate
pnpm --filter @876/billing-api api:contract:check

pnpm --filter @876/billing typecheck
pnpm --filter @876/billing test
pnpm --filter @876/billing-ui typecheck
pnpm --filter @876/billing-ui test
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/invoice-app typecheck
```

## Completion definition

The implementation is complete at the code level when:

- a received payment can remain unapplied without falsely settling an invoice;
- applying already-received cash remains economically neutral at the customer-ledger level;
- the typed customer account parses the real Billing API response;
- overdue/AR/account statement projections come from Billing-owned financial facts;
- Billing and Invoice render receivables and statements through the same shared finance UI;
- persisted payment lifecycle states no longer invalidate the typed payment resource.

Those code-level conditions are implemented on this branch. Generated contract refresh and executable verification remain the local orchestrator's final pre-merge gate.
