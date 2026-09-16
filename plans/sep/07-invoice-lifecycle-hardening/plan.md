# Implementation Plan: Invoice Lifecycle Hardening

**Run ID:** `2026-09-07-invoice-lifecycle-hardening`  
**Branch:** `feature/invoice-lifecycle-hardening`  
**Base:** `main@d0475b5da880d84f483f42bdd2d9f46b3ff6e5ae`  
**Status:** COMPLETED ✅ — verification pending orchestrator execution

## Overview

Harden the existing 876 Billing invoice lifecycle without replacing the commercial data plane that already landed on `main`. Billing remains the source of truth for quotes, invoices, receivables, payments received, credits, inventory side effects, and lifecycle commands. 876 Invoice and 876 Billing remain host surfaces over that bounded domain.

The implementation preserves the durable `InvoiceStatus` compatibility contract (`DRAFT`, `OPEN`, `SENT`, `PARTIALLY_PAID`, `OVERDUE`, `PAID`, `UNCOLLECTIBLE`, `VOID`) while centralizing what those values mean. This run was subsequently extended to make Payments Received a first-class cross-host workflow and to complete the accepted-quote → draft-invoice path.

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
- [x] `.agents/rules/api-backend.md`
- [x] `.agents/rules/sdk-conventions.md`
- [x] `.agents/rules/stripe-api-pattern.md`
- [x] `.agents/rules/shared-product-ui.md`
- [x] `.agents/rules/app-structure.md`
- [x] `.agents/rules/app-layout.md`

## Architectural scope

Primary owner:

- `apps/billing-api/src/modules/documents/**`
- `apps/billing-api/src/modules/payments/**`
- `packages/billing/**`
- `packages/billing-ui/**`
- `apps/billing/**`
- `apps/invoice/**`

### Invariants

1. Draft invoices have no AR impact and are the only invoices that may be deleted or financially rewritten.
2. Finalization is the posting boundary and creates the receivable exactly once.
3. Payment and credit allocations, write-offs, and reversals are the normal settlement mechanisms; callers cannot set `PAID` directly.
4. `sentAt` is communication evidence. `SENT` remains a compatibility projection, not a separate receivable state.
5. Overdue means a collectible posted invoice has a positive remaining balance after its due date.
6. Partial settlement does not erase delinquency: a past-due invoice with a positive balance remains `OVERDUE`.
7. `PAID` means the remaining receivable is zero through cash and/or credits. `amountPaid`, `amountCredited`, and `amountWrittenOff` remain distinct evidence.
8. `VOID` and `UNCOLLECTIBLE` remove an invoice from open AR without deleting history.
9. Financial mutations remain transactional and preserve BigInt/minor-unit arithmetic.
10. Existing API/SDK status values are not renamed in this run.
11. A Payment Received belongs to a customer first. Invoice allocations are optional and must target that same customer's invoices in the same currency.
12. Unallocated received money remains `Payment.unappliedAmount` / customer credit rather than being forced onto an invoice.
13. Quote acceptance is separate from conversion. Only `ACCEPTED` quotes may be converted, and conversion creates a draft invoice; AR still begins only at invoice finalization.
14. `Quote.convertedInvoice` is conversion evidence; no duplicate `INVOICED` quote status is introduced.

## Key design decisions

### Canonical collectible projection

```text
amountDue = 0                       -> PAID
positive balance after dueAt       -> OVERDUE
cash or credit applied             -> PARTIALLY_PAID
sentAt exists                      -> SENT
otherwise                          -> OPEN
```

### One lifecycle owner

`apps/billing-api/src/modules/documents/invoice-lifecycle.ts` owns the collectible status set, overdue candidate set, and compatibility projection. Payment allocation, credit-note allocation, automatic credit settlement, and overdue materialization reuse that owner.

The Customers AR repository intentionally keeps a local four-status predicate. Documents already depends on Customers for AR recomputation, so making Customers import Documents would create a prohibited module cycle.

### No enum migration

The uppercase invoice and quote enum values are existing durable contracts. This run does not migrate them.

### Commands and evidence, not status setters

Invoice lifecycle changes happen through finalization, payment/credit allocation, send, write-off, void, and reversal behavior. Payments Received remain separate customer-owned cash records. Quote conversion uses invoice creation from `quoteId` rather than mutating a quote into an invoice row.

### Payments Received mirrors the mature accounting workflow

The current Zoho Books/Invoice workflow was used as a reference: payments can be recorded at customer level, distributed across outstanding invoices, partially allocated, or left unapplied as advance/customer credit. The 876 backend already supported that accounting model; this extension removed a UI restriction that incorrectly required at least one allocation and exposed the model consistently in Billing and Invoice.

### Accepted quote conversion

Quote acceptance and conversion remain separate. `DRAFT → SENT → ACCEPTED` is the quote lifecycle; an accepted quote can then create one draft invoice. The Billing service rejects `quoteId` invoice creation when the quote is not `ACCEPTED`, so API callers cannot bypass the host UI rule. The existing one-to-one `convertedInvoice` relation remains duplicate-conversion evidence.

### Permission boundaries

Adjacent financial actions do not inherit authority from one another:

- Billing: invoice lifecycle uses `sales:write`; Record Payment uses `payments:write`.
- Invoice: Record Payment and `/payments/new` use `payments.create`.
- Invoice quote mutation uses `quotes.edit`, draft deletion uses `quotes.delete`, and accepted quote conversion uses `invoices.create`.
- Invoice suppresses Convert after `convertedInvoice` exists.

### Shared product UI

Lifecycle actions and the Payments Received form live in `@876/billing-ui`. Billing and Invoice provide host-only data loading, permissions, same-origin/browser transport, and navigation.

### Conservative void presentation

Because `OVERDUE` can represent a partially settled invoice, shared UI only presents Void for `OPEN` and `SENT`; the backend remains authoritative.

### Timeline deferred

Outbox events are not a user-facing history API. No invoice timeline was fabricated from infrastructure events.

## Execution reports

| Tool | Report | Status |
| --- | --- | --- |
| GPT Web | `./reports/gpt-web/2026-09-07-invoice-lifecycle-hardening.md` | complete |

## Task checklist

### Phase 1 — Lifecycle foundation

- [x] Located existing collectible/status logic across Documents, Payments, Credit Notes, overdue materialization, and Customer AR.
- [x] Added one canonical lifecycle helper without changing the durable enum.
- [x] Reused it from payment allocations, credit-note allocations, automatic settlement, and overdue materialization; documented the Customer AR cycle exception.
- [x] Added focused invariant tests, including overdue + partial settlement precedence.

### Phase 2 — Lifecycle command hardening

- [x] Preserved the existing finalization transaction, inventory consumption, ledger/AR effects, and idempotency.
- [x] Kept generic invoice updates free of financial status setters.
- [x] Added explicit invoice send and full-balance write-off commands.
- [x] Hardened void eligibility and preserved evidence.

### Phase 3 — Settlement consistency

- [x] Routed payment and credit-note allocations through the canonical lifecycle projection.
- [x] Routed automatic available-credit settlement through the same projection.
- [x] Kept cash, credits, and write-offs distinct.
- [x] Preserved unapplied overpayment/customer-credit behavior and allocation reversal evidence.

### Phase 4 — Contract and shared UI parity

- [x] Added bounded Billing SDK/integration/browser lifecycle commands.
- [x] Consolidated invoice lifecycle actions into `@876/billing-ui`.
- [x] Added lifecycle/UI/client coverage.
- [x] Deferred timeline UI until an authorized backend read contract exists.

### Extension — Payments Received + accepted quote conversion

- [x] Reviewed current Zoho Books/Invoice documentation for Payments Received, invoice payment allocation, customer advances/excess payments, quote acceptance, and quote-to-invoice conversion.
- [x] Confirmed `Payment.customerId`, invoice allocations, `unappliedAmount`, deposit account, payment mode, and invoice back-links already exist in the Billing engine.
- [x] Removed the Billing form's incorrect requirement that a received payment must have at least one invoice allocation.
- [x] Made unused received money explicit as customer credit in the form summary/copy.
- [x] Added invoice-prefill: customer, currency, remaining amount, and allocation default from `invoiceId`.
- [x] Added `Record payment` to collectible invoice actions in both Billing and Invoice.
- [x] Gated Billing Record Payment by `payments:write` rather than invoice mutation authority.
- [x] Promoted Payments Received presentation into `@876/billing-ui/payment-received-form` instead of copying the form between hosts.
- [x] Kept Billing and Invoice as thin host adapters for payment transport/navigation.
- [x] Added an Invoice-host `/payments/new` route using the shared form and Billing-owned data.
- [x] Gated Invoice payment entry by durable `payments.create` permission.
- [x] Added an Invoice same-origin Payments Received browser client with idempotency.
- [x] Kept payment creation customer-owned and allowed zero allocations.
- [x] Exposed payment → invoice allocation links in Invoice payment detail; Billing already exposed those links.
- [x] Added accepted-quote `Convert to invoice` actions in both Billing and Invoice.
- [x] Hardened the Billing service so invoice creation from `quoteId` requires quote status `ACCEPTED`.
- [x] Preserved the one-to-one `Quote.convertedInvoice` guard and draft invoice creation behavior.
- [x] Kept accepted quote and converted invoice as separate records; no quote-status enum migration.
- [x] Split Invoice quote permissions: `quotes.edit`, `quotes.delete`, `invoices.create`.
- [x] Suppressed Convert after the quote already has a converted invoice.
- [x] Added shared-form tests for invoice prefill and zero-allocation customer payments.
- [x] Updated Billing/Invoice invoice-action tests for customer/invoice payment links.
- [x] Added accepted-only quote-conversion service tests.
- [x] Added Invoice same-origin payment-client coverage.
- [x] Updated lifecycle documentation for quote conversion and Payments Received.

### Phase 5 — Documentation, compatibility review, and handoff

- [x] Updated Billing engine/accounting/lifecycle documentation.
- [x] Reviewed the branch for enum migrations, duplicate payment models, duplicated cross-host UI, unsafe status inference, and permission leaks.
- [x] Restored accidental SDK documentation churn and removed an initial self-import found earlier in the run.
- [x] Reconciled first-send semantics and conservative Void presentation.
- [x] Restored no-op quote-schema churn to `main` exactly.
- [x] Refreshed the GPT Web report with the Payments Received/quote-conversion extension.
- [x] Final compare against current `main`: branch is 103 commits ahead, 0 behind, with merge base `d0475b5da880d84f483f42bdd2d9f46b3ff6e5ae`.

## Test drafting summary

No test was executed from GPT Web.

Prior lifecycle work added **28 literal `it()` declarations**. This extension adds:

- shared Payments Received form: 2 declarations;
- Billing invoice action payment-link coverage: 1 declaration;
- Invoice invoice action payment-link coverage: 1 declaration;
- Billing service accepted-quote conversion: 2 declarations;
- Invoice same-origin Payments Received client: 1 declaration.

**Current run total: 34 direct `it()` calls plus 2 `it.each()` declaration sites (36 declaration sites total)**. This is a drafted-test count only.

## Verification commands

GPT Web cannot execute these. Verification is the orchestrator's responsibility.

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

No formatter, linter, test, typecheck, build, Prisma validation/generation/migration, drift check, API-contract generation/check, or browser test was run from this GPT Web seat.

## Multi-session continuity / handoff

Implementation state:

- Invoice lifecycle projection and financial commands remain centralized.
- Payments Received are now usable as customer-level cash records with optional allocations in both product hosts.
- Invoice actions enter one shared payment workflow rather than mutating invoice status.
- Unapplied received money remains customer credit.
- Payment detail exposes allocated invoice relationships.
- Only accepted quotes are convertible through the Billing service, and conversion produces one draft invoice tied by `quoteId` / `convertedInvoice`.
- Conversion is hidden after an accepted quote is already linked to its invoice.
- Finance actions use their own payment/quote/invoice permissions rather than sharing one broad UI authority.
- Billing and Invoice share lifecycle/payment presentation through `@876/billing-ui`.
- No database migration is required for either the lifecycle work or this extension.
- Final branch comparison is clean against current `main`: 103 ahead, 0 behind.

Remaining work is **runtime/toolchain/database verification only**.

## PR preparation summary

Implementation is complete but unverified.

- Base used for this run: `main@d0475b5da880d84f483f42bdd2d9f46b3ff6e5ae`.
- Branch: `feature/invoice-lifecycle-hardening`.
- Final compare: 103 commits ahead, 0 behind `main`.
- No PR was opened; GPT Web rules prohibit it.
- No migration SQL exists for this run.
- Before PR preparation, the orchestrator must run the verification commands above, inspect generated/API-contract output, and fix only concrete failures without weakening the lifecycle/payment invariants.
- Final report: `plans/2026-09-07-invoice-lifecycle-hardening/reports/gpt-web/2026-09-07-invoice-lifecycle-hardening.md`.
