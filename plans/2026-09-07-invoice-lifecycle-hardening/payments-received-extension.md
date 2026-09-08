# Payments Received + Accepted Quote Conversion Extension

**Parent run:** `2026-09-07-invoice-lifecycle-hardening`  
**Branch:** `feature/invoice-lifecycle-hardening`  
**Base:** `main@d0475b5da880d84f483f42bdd2d9f46b3ff6e5ae`  
**Status:** IMPLEMENTED — UNVERIFIED

## Research basis

The implementation follows the finance behavior documented by Zoho Books / Zoho Invoice:

- Payments Received are customer-level cash receipts that can be applied to one or more outstanding invoices.
- A payment does not have to be fully allocated when received; the unused amount remains customer credit/advance value.
- Invoice detail and payment detail both expose their relationship through payment allocations.
- Quotes are accepted first, then converted to an invoice when appropriate.
- Conversion copies the accepted quote into an invoice instead of re-keying customer/line details.
- The quote remains a historical document and is linked to the converted invoice.

## Implemented architecture

### Payments Received

- [x] Keep `Payment` as the single customer-owned cash receipt (`customerId`).
- [x] Keep `PaymentAllocation[]` as the invoice settlement link.
- [x] Allow `allocations: []` when cash is received before it is assigned to an invoice.
- [x] Persist the remainder as `Payment.unappliedAmount` / customer credit.
- [x] Preserve payment mode, payment date, deposit account, reference, notes, bank charges, currency, and payment number.
- [x] Recompute customer AR after payment/allocation mutations.
- [x] Continue using the invoice lifecycle projection after allocations instead of directly setting invoice payment status.

### Billing UI

- [x] Shared Payments Received form lives in `@876/billing-ui/payment-received-form`.
- [x] Billing `/payments/new` supports `customerId` and `invoiceId` prefill.
- [x] Invoice detail exposes **Record payment** and passes both customer and invoice IDs.
- [x] Customer detail exposes **Payment Received** and pre-fills the customer.
- [x] Unapplied amount is presented as unused/customer credit.

### Invoice host

- [x] Added Invoice-host `/payments/new` using the shared form.
- [x] Added same-origin payment client wiring and coverage.
- [x] Invoice detail exposes the same Record Payment workflow.
- [x] Payment detail exposes allocated invoice relationships.

### Accepted quote -> invoice

- [x] Billing service requires `Quote.status === 'ACCEPTED'` before quote-backed invoice creation.
- [x] Conversion creates a draft invoice through the existing Billing-owned invoice creation path with `quoteId`.
- [x] Existing one-to-one `Quote.convertedInvoice` relationship prevents duplicate converted invoices.
- [x] Billing quote retrieval now includes the converted invoice link.
- [x] Billing quote UI shows **Convert to invoice** only before conversion and **View invoice** afterward.
- [x] Invoice host also surfaces quote conversion and converted-invoice information.
- [x] No new `INVOICED` persisted quote status was introduced; conversion linkage remains explicit through the relation.

## Invariants

1. A payment belongs to exactly one customer.
2. Every allocation must point to an invoice belonging to that same customer and currency.
3. Total allocations cannot exceed the payment amount.
4. Unallocated received cash remains customer credit rather than disappearing or marking an invoice paid.
5. Invoice `PAID` / `PARTIALLY_PAID` / `OVERDUE` projection remains owned by the invoice lifecycle code.
6. A quote must be accepted before conversion.
7. A quote may have only one converted invoice.
8. Conversion creates a draft invoice; finalization remains a separate accounting boundary.
9. The quote remains preserved after conversion.
10. No database migration or enum rename is required for this extension.

## Deliberate deferrals

- Automatic accepted-quote -> invoice conversion preference is not added yet. Acceptance and conversion remain separate commands.
- No partial write-off changes are part of this extension.
- No new customer-payment entity is introduced; the existing `Payment` model is the source of truth.
- No provider-delivery claim is added to invoice send behavior.

## Verification status

GPT Web did not run formatter, lint, typecheck, Vitest, builds, Prisma validation/generation, database drift checks, API contract checks, browser testing, or migrations.

Required local/orchestrator verification:

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

## Final branch snapshot for this extension

At the final compare performed in this continuation, `feature/invoice-lifecycle-hardening` was **108 commits ahead and 0 behind `main`**, with merge base `d0475b5da880d84f483f42bdd2d9f46b3ff6e5ae`.

No PR was opened.
