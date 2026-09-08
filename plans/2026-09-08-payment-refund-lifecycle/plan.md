# Implementation Plan: Payment, Credit, Refund, and Customer Account Lifecycle

**Run ID:** `2026-09-08-payment-refund-lifecycle`  
**Branch:** `feature/payment-refund-lifecycle`  
**Base:** `main@c2a687efc458baf1d69a0dc6d42b3bc17fefbced`  
**Status:** COMPLETED — connector-side implementation complete; local verification pending

## Overview

Complete the shared customer-payment lifecycle across 876 Billing and 876 Invoice without replacing the existing Billing accounting model. The implementation keeps receipt, allocation, credit, refund, reversal, and statement effects as distinct financial events while fixing UI parity, money-correctness, source-scope, and response-contract gaps.

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
- `apps/billing-api/src/modules/documents/**` where settlement consumes customer credit
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
7. All money stays integer minor units / strings end-to-end; no JS floating-point money arithmetic in the implemented mutation forms.
8. A payment/customer/invoice remains one shared record across Billing and Invoice.
9. Shared finance presentation lives in `@876/billing-ui`; hosts own data, routing, authority, and mutations.
10. Customer statement remains ledger-backed and customer AR remains projection-backed.
11. Existing durable enum/status/wire contracts are not renamed in this run.
12. Provider-backed asynchronous refund execution remains an extension point; this run does not invent provider-specific refund execution state.
13. Tenant Billing authority sees the organization finance plane; app-scoped integration payment reads/mutations respect `sourceAppId` attribution.
14. API serializers explicitly allowlist public finance fields rather than reflecting complete Prisma rows.

## Implemented result

The completed canonical flow is:

```text
Invoice -> receivable
Payment -> cash/customer credit
PaymentAllocation -> applies existing cash to receivable
CreditNote -> non-cash credit / receivable reduction
CreditNoteAllocation -> applies credit to receivable
Refund -> cash out from available customer credit
CustomerLedgerEntry -> account history
```

### Refund/accounting result

- Payment-source refunds decrement `Payment.unappliedAmount` and increment `Payment.amountRefunded` atomically.
- A payment moves to `PARTIALLY_REFUNDED` after a partial refund and `REFUNDED` only when its full received amount has actually been returned.
- Repeated refunds may consume remaining unapplied payment credit.
- Credit-note refunds reduce only `CreditNote.balanceAmount`; fully consumed notes close.
- Customer/currency/source-balance/source-status guards remain inside the serializable refund transaction.
- Refund ledger evidence is `REFUND_ISSUED` / `DEBIT`, and customer AR is recomputed after the mutation.
- Partial-refund payments remain eligible sources of unapplied customer credit for AR projection and automatic settlement.

### Integration/source-boundary result

- Integration payment list/get continue to filter to the calling app's attributed payment rows.
- Integration payment update/delete/apply now enforce that same `sourceAppId` boundary instead of using tenant-only mutation lookup.
- Integration payment-linked refund creation enforces the same source boundary.
- Credit-note refunds remain tenant-finance operations because credit notes currently have no equivalent app-source attribution.
- Tenant Billing operations remain organization-wide, consistent with the shared financial plane and ADR-001.

### Response-contract result

- Payment responses now use an explicit public-field serializer allowlist rather than spreading Prisma payment rows.
- Payment modes, deposit accounts, invoices, refunds, and nested allocation data are projected to their public shapes without internal tenant/source/provider diagnostics leaking through.
- Integration payment responses add normalized `source` attribution without exposing source implementation columns.
- Refund list serialization is also explicitly allowlisted.
- Payment detail reads expose only a small optional refund-summary relation: refund id/number, amount, currency, reason, refund date, and creation date.
- List responses omit the refund relation to avoid unnecessary payload growth.

### Shared UI result

- Billing and Invoice payment details use the same `@876/billing-ui` payment detail presentation.
- Both show canonical status, received, allocated, unapplied, cumulative refunded amount, payment metadata, invoice allocations, and individual refund history when present.
- Invoice now has payment edit/reallocation parity using the existing shared Payments Received form.
- Billing and Invoice both expose payment-source refund workflows for available unapplied credit.
- The shared refund form collects amount, date, payment mode, funding/deposit account, reason, and notes using exact minor-unit parsing.

### Credit-note result

- Credit-note Apply no longer asks for a raw invoice ID; it presents eligible same-customer/same-currency collectible invoices.
- Apply amounts use currency-aware exact minor-unit parsing and support partial/multi-invoice application within the available credit balance.
- Credit-note Refund uses the shared exact-money refund form and supports partial refunds while retaining remaining credit.
- Existing credit-note detail continues to expose total, remaining balance, applications, and refund history.

### Customer account result

- Customer -> Transactions now consumes real ledger/account entries instead of `data={[]}`.
- Shared transaction sections include invoices, payments received, refunds, adjustments, and Billing-only credit notes where enabled.
- Billing and Invoice transaction surfaces retain their intentional product differences while sharing the renderer.
- The shared receivables panel now consumes existing account-projection fields for outstanding, overdue, available credit, net position, lifetime billed, and lifetime paid.
- Statement remains the chronological ledger-backed view and refund ledger lines remain visible there.

## Execution reports

| Tool | Report | Status |
| --- | --- | --- |
| GPT Web | `./reports/gpt-web/2026-09-08-payment-refund-lifecycle.md` | complete |

## Task checklist

### Phase 1 — Backend refund/accounting correctness

- [x] Increment `Payment.amountRefunded` for payment-source refunds in the refund transaction.
- [x] Verify/reinforce source-balance, customer, currency, lifecycle, and app-source guards.
- [x] Draft focused refund repository tests for partial/full/excess refunds and payment projection updates.
- [x] Verify refund ledger direction and customer-AR recomputation invariants in implementation/tests.

### Phase 2 — Money-safe credit-note actions

- [x] Reuse exact finance minor-unit parsing instead of `Number()` / `Math.round(*100)` for credit-note mutation inputs.
- [x] Make credit-note Apply/Refund inputs currency-decimal aware.
- [x] Remove raw floating-point balance checks from the replaced credit-note action flow.
- [x] Preserve the canonical backend apply/refund resources.

### Phase 3 — Shared payment detail and Invoice parity

- [x] Promote shared payment-detail presentation into `@876/billing-ui`.
- [x] Refactor Billing payment detail to use the shared presentation and real payment status.
- [x] Refactor Invoice payment detail to the same presentation.
- [x] Add Invoice payment edit/reallocation using the existing shared Payments Received form.
- [x] Keep host authorization/routing outside the shared package.

### Phase 4 — Payment refund workflow

- [x] Add payment-source refund UI for available `unappliedAmount`.
- [x] Collect amount, date, funding/deposit account, payment mode, reason, and notes using existing contracts.
- [x] Prevent refund of allocated cash by limiting payment-source refund to `unappliedAmount`.
- [x] Surface cumulative and individual refund history/context from payment detail.

### Phase 5 — Customer account experience

- [x] Wire real ledger/account records into Customer -> Transactions.
- [x] Add Payments Received and Refunds sections; retain product-specific Credit Notes behavior in Billing.
- [x] Expand the shared receivables panel with available credit, net position, lifetime billed, and lifetime paid from the account projection.
- [x] Keep Statement ledger-backed and refund events visible.

### Phase 6 — Credit-note apply/refund usability

- [x] Replace raw invoice-ID application with eligible same-customer/same-currency invoice selection.
- [x] Allow partial apply, partial refund, and remaining open credit.
- [x] Preserve/show credit-note total, application, refund, and remaining-balance evidence.

### Phase 7 — Documentation and handoff

- [x] Update accounting documentation for refunds, reallocation/correction, customer credit, refund history, and integration authority.
- [x] Review the branch diff for duplicate finance UI, compatibility residue, JS-number mutation money, swallowed errors, response leakage, source-scope gaps, and accidental status migration.
- [x] Draft focused tests: 34 test cases across 9 touched test files (8 new test files and 1 expanded Invoice client test file).
- [x] Write GPT Web final report with changed-file inventory, test inventory, risks, and verification commands.
- [x] Mark this plan COMPLETED after all feasible connector-side implementation is committed.

## Verification status

**Not executed from this GPT Web environment.** No formatter, linter, test, typecheck, build, Prisma command, database migration, database drift check, or API contract check is claimed as passing.

Run locally/orchestrator-side:

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

No database schema file or migration was changed by this branch, but the Billing API database validation/drift commands should still be run as part of the normal handoff.

## Multi-session continuity / handoff

The branch was cut from `main@c2a687efc458baf1d69a0dc6d42b3bc17fefbced`. The final pre-report connector comparison showed the branch ahead of that merge base and `behind_by: 0`. A final comparison is performed after the plan/report commits and recorded in the handoff response.

The local/orchestrator agent should preserve the accounting separation implemented here:

- receipt != allocation;
- refund != reversal;
- payment refund uses unapplied cash only;
- credit-note refund uses note balance only;
- customer Transactions != Statement;
- app-source integration scope != tenant Billing authority.

## PR preparation summary

Connector-side implementation and handoff documentation are complete. Runtime verification remains local/orchestrator responsibility. GPT Web did not open a pull request.
