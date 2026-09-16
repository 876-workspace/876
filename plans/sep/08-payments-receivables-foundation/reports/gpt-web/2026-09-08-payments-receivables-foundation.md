# GPT Web Final Report — Payments, Receivables & Customer Statements

**Date:** 2026-09-08  
**Branch:** `feature/payments-receivables-foundation`  
**Base:** `main` @ `cd67f490183bb155e3a53a708691ccf6f449f127`  
**PR:** none opened  
**Database migration:** none required or added

## Outcome

This run hardened the existing customer-to-cash path rather than creating a second payments or customer-account model.

The completed path is:

```text
Customer
  -> finalized invoice / receivable
  -> payment received
  -> unapplied cash and/or PaymentAllocation
  -> invoice settlement + customer AR projection
  -> customer account / receivables / statement
```

The central accounting invariant is preserved: **cash receipt changes the customer's economic position once; allocating that already-received cash does not credit the customer a second time.**

## What was already present and intentionally preserved

Repository inspection showed that current `main` already had the important financial primitives:

- `Payment` and `PaymentAllocation`;
- partial and multi-invoice allocation;
- `Payment.unappliedAmount` for advances and overpayments;
- payment modes and deposit accounts;
- invoice settlement totals and status projection;
- payment reversal behavior;
- denormalized customer AR and unused-credit projections;
- the append-only `CustomerLedgerEntry` subledger;
- shared receivables and statement panels in `@876/billing-ui`.

No parallel payment model, invoice link field, customer-account table, or second ledger was introduced.

## Implemented changes

### 1. Canonical customer-account projection

Added a dedicated read-model path in `apps/billing-api/src/modules/customers/`:

- `customer-account.repository.ts`
- `customer-account.projection.ts`
- `customer-account.service.ts`

The projection is built from existing Billing-owned facts and exposes:

- account currency;
- lifetime billed;
- lifetime paid;
- outstanding receivable;
- overdue receivable;
- available credit;
- net customer position;
- opening statement balance;
- closing statement balance;
- latest 100 statement entries in chronological presentation order;
- running balance on each displayed entry.

The projection uses full-ledger grouped totals for lifetime/closing arithmetic and loads only the latest 100 individual rows for presentation. This prevents a bounded statement window from producing an incorrect opening balance.

`overdueReceivable` is computed from positive remaining `amountDue` on collectible invoices whose `dueAt` is before the projection time. It does not rely only on a persisted `OVERDUE` status, so crossing a due date without another invoice mutation does not hide overdue AR.

### 2. Restored API contract after the Express regression

Before the Express cutover, the customer-account service returned lifetime billed, lifetime paid, available credit, net position, and statement rows. The current Express implementation had regressed to only:

```text
outstandingReceivable
unusedCredits
entries[]
```

while `@876/billing` still expected the richer shape.

This run restores the richer account projection and keeps the current Express fields as compatibility aliases:

- `unusedCredits` aliases `availableCredit`;
- `entries` aliases the raw newest-first bounded ledger slice.

The customer route now delegates to the single new account service. The obsolete `customerAccount()` implementation was removed from `customers.service.ts` so duplicate financial logic does not remain.

`customers.schemas.ts` was also updated so the Billing API's Zod/OpenAPI source-of-truth describes the actual richer response instead of the old cutover-era response.

### 3. Typed Billing SDK account contract

Added `packages/billing/src/types/customer-account.ts` with:

- `CustomerAccountProjection`;
- `CustomerAccountStatementEntry`.

`customers.account(customerId)` now returns the richer projection and `CustomerAccountSchema` parses:

- overdue balance;
- opening/closing balances;
- statement running balances;
- existing invoice/payment/credit-note/refund source references.

The projection types are exported from the public `@876/billing` package surface.

### 4. Payment lifecycle status alignment

The database already supports these `PaymentStatus` values:

```text
PENDING
REQUIRES_ACTION
AUTHORIZED
PROCESSING
SUCCEEDED
FAILED
CANCELED
PARTIALLY_REFUNDED
REFUNDED
DISPUTED
```

The API/SDK resource contract previously accepted only four of them. Valid persisted provider/refund/dispute states could therefore make a payment list or retrieve response fail typed parsing.

The API resource type, public Billing type, and public Zod schema now cover the full persisted lifecycle. A focused SDK schema test covers the expanded states.

This change does **not** add or modify provider settlement, payment attempts, refunds, or disputes themselves.

### 5. Billing customer receivables UI

The Billing customer overview now loads `billing.customers.account(customerId)` and renders the existing shared `CustomerReceivablesPanel` with:

- outstanding AR;
- overdue AR;
- lifetime paid;
- account currency.

The existing contacts panel remains separately suspended so receivables and contacts do not create a sequential data waterfall.

Errors remain explicit panel errors; an account request failure is not converted into zero balances.

### 6. Invoice customer receivables UI

876 Invoice now uses the same `@876/billing-ui` receivables panel and the same Billing-owned account projection. Invoice owns only its auth/context/data adaptation.

No Invoice-specific finance calculation or duplicate panel was introduced.

### 7. Billing and Invoice statement tabs

Both previous statement stubs now render the shared `CustomerStatementPanel`.

Each host adapts the canonical account projection into presentation data:

- opening balance;
- chronological ledger activity;
- signed amount presentation (`DEBIT` positive, `CREDIT` negative);
- running balance;
- closing balance.

The statement remains a view of `CustomerLedgerEntry`; hosts do not merge invoice and payment collections independently.

### 8. Accounting documentation

`apps/billing/docs/accounting-model.md` now records:

- the distinction between receiving cash and allocating it;
- why allocation is economically neutral after receipt;
- how outstanding AR, available credit, and net position relate;
- customer-account projection semantics;
- bounded-statement opening/running/closing balance semantics;
- preservation of ledger source references.

## Accounting invariants preserved

### Unapplied payment

```text
Invoice finalized:       AR 1,000; credit 0;     net 1,000
Receive 1,000 unapplied: AR 1,000; credit 1,000; net 0
```

The receipt posts one `PAYMENT_RECEIVED` ledger credit.

### Allocation

```text
Allocate the 1,000:      AR 0; credit 0; net 0
```

The allocation decreases invoice `amountDue` and payment `unappliedAmount`. It does not post a second customer credit.

### Bounded statement

For the displayed latest-100 window:

```text
openingBalance
+ signed displayed entries
= closingBalance
```

`openingBalance` is derived from complete ledger totals minus the displayed window, so older history outside the response remains represented correctly.

## Tests added

### Billing API projection tests

`apps/billing-api/src/modules/customers/__tests__/customer-account.service.test.ts`

Covers:

- unapplied cash changes net customer position once;
- later allocation remains economically neutral;
- truncated statement windows derive the correct opening balance;
- running/closing balance arithmetic;
- overdue projection exposure;
- payment reversal/refund effects on lifetime paid.

### Billing SDK account test

`packages/billing/src/resources/customers.account.test.ts`

Covers parsing the real richer account response and the customer-account route.

### Payment status schema test

`packages/billing/src/types/payment.schema.test.ts`

Covers valid persisted payment lifecycle states beyond the old four-state public contract.

## Final review findings and decisions

### Payment replacement remains a follow-up redesign

The existing `PATCH /payments/:paymentId` path is not a metadata-only edit. Billing's active payment edit form calls `payments.update()` with the complete payment replacement payload. The repository implementation reverses the previous economic effects, mutates the original `Payment` row to the new economic values, increments a revision, and posts the replacement effects.

That leaves ledger evidence but means the original payment row itself is not immutable. Narrowing the endpoint in this run would break the existing Billing edit surface, while creating a replacement-payment relation would require a coordinated schema/API/UI migration that is larger than this receivables correction.

Therefore this run **reviewed but intentionally did not alter** replacement semantics. A follow-up should model payment correction explicitly — for example, immutable payment revisions/replacement linkage or a dedicated correction command — and migrate the edit UI with it.

### Manual payment / bank matching remains unchanged

Manual payment create/update currently creates or updates a `BankTransaction` with `MATCHED` status. That coupling predates this work. Decoupling recorded cash from bank-feed reconciliation belongs to the banking/reconciliation phase and was intentionally not mixed into this AR work.

## Compatibility

- No existing Payment or PaymentAllocation rows are migrated.
- No database table or enum migration was added.
- Customer `outstandingReceivable` / `unusedCredits` remain the current denormalized AR projections.
- Existing Express `unusedCredits` and `entries` account response fields remain as compatibility aliases.
- The richer account response is an intentional repair of an API/SDK contract that was already impossible to parse end-to-end.
- Payment status expansion is additive and matches states already persisted by Billing.

## Generated contract artifacts

The Billing API response Zod schema changed. GPT Web did not run repository generators or package-manager commands, so checked-in generated/frozen contract artifacts were **not** regenerated by pretending to have executed the generator.

The local orchestrator should regenerate and review the contract artifacts, confirming that the customer-account response change is the only intended contract delta from this work.

## Verification not executed here

GPT Web operated through the GitHub connector and did not run shell, package-manager, Prisma, database, build, or test commands. The tests above were written but are **not claimed as passing**.

Run locally:

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

## Final branch review

At final review, `main` remained at the same commit this branch was cut from. The feature branch was ahead and not behind, so no concurrent-main rebase was required.

No PR was opened and nothing was merged to `main`.
