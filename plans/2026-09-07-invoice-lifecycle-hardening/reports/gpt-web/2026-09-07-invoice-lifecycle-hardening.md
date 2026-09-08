# GPT Web Final Report: Invoice Lifecycle Hardening + Payments Received

**Run ID:** `2026-09-07-invoice-lifecycle-hardening`  
**Branch:** `feature/invoice-lifecycle-hardening`  
**Base / merge base:** `main@d0475b5da880d84f483f42bdd2d9f46b3ff6e5ae`  
**Implementation status:** COMPLETE  
**Verification status:** PENDING LOCAL/ORCHESTRATOR EXECUTION

## Final outcome

This run hardened the 876 Billing invoice lifecycle and extended the same financial plane through 876 Billing and 876 Invoice with Payments Received and accepted Quote -> Invoice conversion.

The implementation deliberately keeps Billing as the commercial system of record. It does not introduce a second payment model, invoice store, quote-conversion table, or parallel accounting path.

The completed architecture provides:

- one canonical collectible invoice lifecycle projection;
- explicit finalize, mark-sent, void, and write-off behavior;
- overdue-preserving partial settlement;
- customer-owned Payments Received;
- zero, one, or many invoice allocations per received payment;
- unapplied received cash retained as customer credit;
- invoice -> Record payment entry with customer/invoice prefill;
- payment -> invoice allocation relationships;
- shared Billing/Invoice payment presentation through `@876/billing-ui`;
- accepted-only Quote -> Invoice conversion;
- one-to-one conversion evidence through `Quote.convertedInvoice`;
- converted quotes linking to their invoice rather than offering duplicate conversion;
- distinct permissions for invoice lifecycle, payment creation, quote mutation/deletion, and invoice creation.

No Prisma enum, model, SQL migration, or database migration was required.

## Invoice lifecycle

Persisted compatibility states remain:

```text
DRAFT
OPEN
SENT
PARTIALLY_PAID
OVERDUE
PAID
UNCOLLECTIBLE
VOID
```

For collectible invoices, the canonical projection is:

```text
amountDue = 0                       -> PAID
positive balance after dueAt       -> OVERDUE
cash or credit applied             -> PARTIALLY_PAID
sentAt exists                      -> SENT
otherwise                          -> OPEN
```

This intentionally means a partially settled invoice that is past due remains `OVERDUE`. Payment evidence is represented by amounts and allocations rather than being lost because one flattened status can only carry one label.

### Finalize

Finalization remains the accounting posting boundary. Draft invoices do not create receivables. Finalization retains the existing payment-term/salesperson resolution, receivable posting, inventory consumption, customer-ledger evidence, AR recomputation, idempotency, and `invoice.finalized` event behavior.

### Mark sent

The new send command records communication evidence without pretending that delivery occurred. The first `sentAt` is preserved on repeat sends. Plain `OPEN` becomes compatibility `SENT`; partially paid, overdue, and paid financial states are not overwritten merely because the document was sent again.

### Write off

The explicit write-off command clears the full remaining receivable with a required reason, increments `amountWrittenOff`, transitions the invoice to `UNCOLLECTIBLE`, records `WRITE_OFF` ledger evidence, recomputes AR, and does not restore inventory because the sale still occurred.

### Void

Void remains different from write-off. It cancels an unsettled posted sale and reverses its inventory movement. Settled/paid/written-off/terminal invoices cannot be voided. Shared UI conservatively presents Void for `OPEN` and `SENT`; backend financial evidence remains authoritative.

## Payments Received

The existing Billing model was retained:

```text
Customer
  |
  +-> Payment
        |
        +-> PaymentAllocation -> Invoice A
        +-> PaymentAllocation -> Invoice B
        +-> unappliedAmount    -> customer credit
```

A Payment Received belongs to a customer first. An invoice is not the owner of the payment.

That supports:

- customer advances before an invoice exists;
- one receipt settling multiple invoices;
- partial invoice settlement;
- overpayments;
- unused credit that can be applied later;
- customer statements showing cash independently from the invoices it settles.

The retained invariants are:

1. A payment belongs to exactly one customer.
2. Allocated invoices belong to that same customer.
3. Payment and allocated invoice currency must match.
4. Allocations cannot exceed the invoice amount due.
5. Aggregate allocations cannot exceed the payment amount.
6. A received payment may have zero allocations.
7. Any unused amount remains `Payment.unappliedAmount` / customer credit.
8. Invoice financial status is projected from settlement evidence rather than directly mutated by the payment UI.

### Payment entry

The Billing form's old UI restriction requiring an invoice allocation was removed. A customer payment may now be recorded with `allocations: []`.

Collectible invoice detail exposes **Record payment** and supplies both `customerId` and `invoiceId`. The shared form can prefill the customer, invoice currency, amount due, and default allocation while still allowing the operator to change the receipt or distribute it across other eligible invoices.

Customer detail exposes **Payment Received**, prefilled to that customer.

### Shared Billing / Invoice UI

The reusable form is implemented once in:

`packages/billing-ui/src/payment-received-form.tsx`

Billing and Invoice remain thin host adapters responsible for their own permissions, data loading, browser transport, and navigation.

Invoice gained its own `/payments/new` host route and same-origin payment client. It does not bypass the Invoice host boundary or expose Billing service credentials to shared UI.

### Payment relationships

Payment detail exposes active allocations back to invoices. Invoice settlement therefore remains traceable in both directions:

```text
Invoice -> PaymentAllocation -> Payment
Payment -> PaymentAllocation -> Invoice
```

## Accepted Quote -> Invoice

The resulting workflow is:

```text
DRAFT -> SENT -> ACCEPTED -> convert -> Invoice(DRAFT)
```

Acceptance and conversion remain distinct commands.

The Billing service now rejects `invoices.create({ quoteId })` unless the quote is `ACCEPTED`. This protects SDK/API callers in addition to hiding invalid actions in the UI.

Conversion continues through the existing Billing-owned invoice creation path. It copies the quote's customer/document/line snapshot into a draft invoice, sets the quote relationship, and relies on the existing one-to-one `Quote.convertedInvoice` relationship to prevent a second conversion.

No `INVOICED` quote status was added. The accepted quote remains historical evidence; the explicit relation records conversion.

Billing quote retrieval now includes `convertedInvoice`, allowing an already converted accepted quote to show **View invoice** rather than repeatedly offering **Convert to invoice**. Invoice surfaces the same conversion relationship.

The converted invoice remains a draft and has no AR impact until normal invoice finalization.

Automatic accepted-quote -> invoice conversion remains deliberately deferred as an organization preference rather than coupling acceptance and conversion in this run.

## Permissions

The extension keeps adjacent financial actions independently authorized.

Billing separates invoice lifecycle authority from `payments:write` for Record Payment.

Invoice uses its app permission catalog so payment creation, quote editing, quote deletion, and invoice creation are not implicitly granted by one broad quote/invoice UI permission.

Shared `@876/billing-ui` components receive only the actions/hrefs the host has authorized.

## Important implementation areas

### Billing API

- `apps/billing-api/src/modules/documents/invoice-lifecycle.ts`
- `apps/billing-api/src/modules/documents/documents.service.ts`
- `apps/billing-api/src/modules/documents/documents.controller.ts`
- `apps/billing-api/src/modules/documents/documents.routes.ts`
- `apps/billing-api/src/modules/documents/repositories/invoice-workflow.ts`
- `apps/billing-api/src/modules/documents/repositories/invoices/settlement.ts`
- `apps/billing-api/src/modules/documents/repositories/invoices/mark-overdue.ts`
- `apps/billing-api/src/modules/documents/repositories/quotes/retrieve.ts`
- `apps/billing-api/src/modules/documents/workflows/send-invoice.ts`
- `apps/billing-api/src/modules/documents/workflows/void-invoice.ts`
- `apps/billing-api/src/modules/documents/workflows/write-off-invoice.ts`
- `apps/billing-api/src/modules/payments/repositories/payments/shared.ts`

### Shared UI / SDK

- `packages/billing-ui/src/invoice-lifecycle-actions.tsx`
- `packages/billing-ui/src/payment-received-form.tsx`
- `packages/billing/src/resources/invoices.ts`
- `packages/billing/src/resources/payments.ts`
- `packages/billing/src/integration/resources/invoices.ts`

### Billing host

- invoice detail/action adapter;
- Payments Received create flow;
- customer Payment Received action;
- quote conversion and converted-invoice navigation.

### Invoice host

- invoice lifecycle/action adapter;
- `/payments/new` Payments Received route;
- same-origin payment browser client;
- payment allocation detail;
- quote conversion and converted-invoice presentation.

### Documentation / tracking

- `apps/billing/BILLING_ENGINE.md`
- `apps/billing/docs/accounting-model.md`
- `apps/billing/docs/invoice-lifecycle.md`
- `plans/2026-09-07-invoice-lifecycle-hardening/plan.md`
- `plans/2026-09-07-invoice-lifecycle-hardening/payments-received-extension.md`
- this final report.

## Test coverage drafted

Tests were written but were not executed from this environment.

The run includes focused coverage for:

- lifecycle projection and overdue/partial-settlement precedence;
- invoice workflow behavior;
- Billing bounded SDK lifecycle commands;
- shared invoice lifecycle UI;
- Invoice same-origin lifecycle commands;
- Payments Received invoice prefill;
- zero-allocation customer payments;
- invoice -> Record Payment links;
- accepted-only quote conversion at the service boundary;
- accepted quote reaching invoice creation;
- Invoice same-origin Payment Received creation and idempotency.

The implementation report previously counted 35 new literal `it()` declarations plus parameterized lifecycle cases. This remains a drafted-test count, not a passing-test claim.

## Compatibility and architecture review

The final implementation preserves these boundaries:

- no second payment entity;
- no invoice `markPaid()` shortcut;
- no second invoice store;
- no competing quote-conversion endpoint/model;
- no new `INVOICED` quote enum state;
- no persisted invoice-status rename;
- no schema migration;
- no outbox rows exposed as user-facing history;
- Payments Received remains customer-first;
- unused received money remains credit;
- settlement continues through allocation evidence;
- Billing and Invoice reuse shared finance UI rather than copying it;
- host auth/transport stays outside `@876/billing-ui`;
- quote conversion produces a draft and does not bypass finalization.

## Deliberate deferrals

1. User-facing invoice lifecycle timeline, pending a durable authorized history/read contract.
2. Server-provided invoice capability object; UI remains conservative.
3. Partial write-offs; current write-off clears the entire remaining receivable.
4. Moving Customer AR's collectible-status predicate into Documents, because doing so naively would create a Documents <-> Customers module cycle.
5. Persisted invoice-status normalization/migration.
6. Real email/SMS/WhatsApp delivery for Mark sent; current command records communication evidence only.
7. Full Invoice-host payment edit/delete parity; Invoice now covers payment creation while Billing retains the richer payment management workflow.
8. New server-side search/filter contracts solely for the Invoice Payments Received form.
9. Automatic quote acceptance -> invoice conversion preference.

## Verification status

No formatter, linter, TypeScript typecheck, Vitest suite, dependency/boundary check, Next/Express build, Prisma validation/generation, database drift check, API contract check/generation, browser test, migration, or CI workflow was executed from this GPT Web environment.

Therefore this report claims **implementation complete, verification pending** — not that the branch is runtime-verified.

Required orchestrator verification:

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

Use the actual package/script names if a workspace differs. Fix concrete failures without weakening the lifecycle/payment invariants above.

## Final branch handoff

At the final comparison immediately before this report update:

- branch: `feature/invoice-lifecycle-hardening`;
- base / merge base: `main@d0475b5da880d84f483f42bdd2d9f46b3ff6e5ae`;
- branch state: **110 commits ahead, 0 behind `main`**;
- no PR was opened or modified;
- no migration was created or executed.

The implementation portion of this run is complete. The remaining handoff is local/toolchain/database verification and correction of any concrete failures found there.