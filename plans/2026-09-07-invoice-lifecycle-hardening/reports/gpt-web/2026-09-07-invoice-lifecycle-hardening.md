# GPT Web Report: Invoice Lifecycle Hardening + Payments Received

**Run ID:** `2026-09-07-invoice-lifecycle-hardening`  
**Branch:** `feature/invoice-lifecycle-hardening`  
**Base:** `main@d0475b5da880d84f483f42bdd2d9f46b3ff6e5ae`  
**Execution environment:** GitHub connector only  
**Verification:** not executed; verification is the orchestrator's responsibility

## Outcome

This run hardened the existing 876 Billing invoice lifecycle and was then extended to complete the adjacent **Payments Received** and **accepted Quote → Invoice** workflows across 876 Billing and 876 Invoice.

The existing Billing commercial data plane remains the owner. No second payment model, invoice store, or quote-conversion table was introduced.

The combined implementation now provides:

- one canonical collectible invoice status projection;
- overdue-preserving partial settlement;
- explicit send and write-off invoice commands;
- hardened void behavior;
- customer-owned Payments Received with optional invoice allocations;
- unused received cash retained as customer credit through `Payment.unappliedAmount`;
- invoice → Record Payment entry with customer/invoice prefill;
- payment → invoice allocation navigation;
- a single shared Payments Received editor for Billing and Invoice;
- accepted-only quote conversion through the Billing service boundary;
- one-to-one quote conversion evidence through the existing `Quote.convertedInvoice` relation;
- separate permission checks for invoice mutation, payment creation, quote mutation/deletion, and invoice creation from an accepted quote.

No Prisma enum, model, SQL migration, or database migration was required.

## External product research used

Current Zoho Books / Zoho Invoice behavior was reviewed before the extension.

The relevant product pattern is:

- a payment received belongs to a customer and can be associated with one or more invoices;
- partial invoice payment is supported;
- excess or unapplied customer money can remain available for later use rather than being forced onto the current invoice;
- quote/estimate acceptance and invoice conversion are distinct workflow steps;
- an accepted quote/estimate can subsequently be converted to an invoice.

876 already had the accounting primitives needed for this model. The main implementation gap was presentation/workflow consistency rather than a missing financial schema.

## Invoice lifecycle contract

Persisted/API values remain:

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

For an otherwise collectible invoice, the compatibility projection is:

```text
amountDue = 0                       -> PAID
positive balance after dueAt       -> OVERDUE
cash or credit applied             -> PARTIALLY_PAID
sentAt exists                      -> SENT
otherwise                          -> OPEN
```

`VOID` and `UNCOLLECTIBLE` remain explicit command states.

A past-due partially settled invoice therefore remains `OVERDUE`; payment evidence remains available through `amountPaid` and allocations instead of being lost in one overloaded status.

## Lifecycle commands

### Finalize

The existing finalization workflow remains the accounting posting boundary. It retains payment-term/salesperson resolution, receivable posting, Inventory consumption, customer ledger evidence, AR recomputation, idempotency, and `invoice.finalized` emission.

### Mark sent

Additive tenant and integration commands record communication evidence. They preserve the first `sentAt`; only plain `OPEN` becomes compatibility `SENT`, while partial/overdue/paid financial state is preserved.

### Write off

The full remaining receivable can be explicitly written off with a required reason. The workflow increments `amountWrittenOff`, clears `amountDue`, sets `UNCOLLECTIBLE`, writes `WRITE_OFF` customer-ledger evidence, recomputes AR, and does not restore Inventory because the underlying sale still occurred.

### Void

Void remains distinct from write-off. It is for an unsettled posted invoice and reverses the sale's stock movement. Settled, paid, written-off, or terminal invoices are rejected. Because flattened `OVERDUE` may now also be partially settled, host UI only presents Void when status alone is safely unambiguous (`OPEN`/`SENT`); backend evidence remains authoritative.

## Payments Received

### Existing accounting model retained

The Billing engine already owned the correct underlying model:

```text
Customer
  |
  +-> Payment
        |
        +-> PaymentAllocation -> Invoice A
        +-> PaymentAllocation -> Invoice B
        +-> unappliedAmount    -> available customer credit
```

Important existing invariants were retained:

- `Payment.customerId` is required;
- allocation invoices must belong to the same customer;
- allocations must use the same currency as the payment;
- allocation cannot exceed an invoice's remaining amount due;
- payment creation can carry zero, one, or many allocations;
- a payment can have an unapplied remainder;
- customer AR/unused-credit projections are recomputed from financial evidence.

### UI mismatch corrected

Billing's existing New Payment form incorrectly required at least one invoice allocation even though the backend already supported an unallocated customer advance/payment.

That restriction was removed.

A Payment Received can now be saved with:

```text
amount received > 0
allocations = []
unappliedAmount = remaining payment value
```

The form makes that outcome explicit as **Unused / customer credit** rather than presenting it as an error.

### Invoice-prefilled payment entry

Collectible invoices now expose **Record payment**.

The action links into the same Payments Received workflow with:

```text
customerId
invoiceId
```

The form then preselects:

- the invoice customer;
- invoice currency;
- current `amountDue` as the received amount;
- current `amountDue` as the default allocation to that invoice.

The operator can change the amount or allocation and can distribute the payment across other outstanding invoices for the same customer/currency.

No `markPaid()` shortcut was introduced. Saving still creates a Payment + PaymentAllocation evidence and lets the canonical settlement projection update invoice state.

### Shared Billing / Invoice surface

The full reusable editor now lives at:

`packages/billing-ui/src/payment-received-form.tsx`

It owns only presentation, input parsing, allocation editing, and validation. It imports no backend/service client.

Billing's former large payment form is now a thin adapter that supplies Billing browser-client mutations and navigation.

Invoice gained a separate thin adapter and `/payments/new` host route using the same `@876/billing-ui/payment-received-form` component.

This follows the repository rule that the same finance screen rendered by two product hosts has one `@876/billing-ui` implementation.

### Invoice host transport

Invoice now has a same-origin Payments Received browser client:

`apps/invoice/src/lib/client/payments.ts`

Creation posts to:

```text
POST /api/payments
```

with an idempotency key. The existing Invoice resource proxy remains responsible for forwarding to the Billing boundary; the shared UI never receives service credentials or origins.

### Payment detail relationships

Billing already linked payment allocations back to invoice detail.

Invoice payment detail now does the same: active invoice allocations render under **Applied to invoices**, showing invoice number, status, allocated amount, and a link to the invoice.

The detail surface continues to show:

- customer;
- amount received;
- deposit account;
- payment mode;
- allocated amount;
- unapplied amount/customer credit;
- reference;
- notes.

## Customer ownership

Payments are explicitly customer-owned rather than invoice-owned.

This distinction is important because it supports:

- customer advances before an invoice exists;
- one payment settling several invoices;
- overpayments;
- later application of unused credit;
- refunds from unapplied cash;
- customer statements that show cash independently from the invoices it eventually settles.

Invoices merely receive settlement through `PaymentAllocation`.

## Quote acceptance and conversion

### Resulting workflow

```text
DRAFT
  -> SENT
      -> ACCEPTED
          -> convert
              -> Invoice(DRAFT)
```

Alternate quote outcomes remain `DECLINED`, `CANCELED`, and existing expiry behavior.

### Accepted-only service boundary

Before this extension, `invoices.create({ quoteId })` could reach the quote-copy repository even when the quote was not accepted.

`documentsService.createInvoice()` now verifies the source quote first and rejects conversion unless:

```text
quote.status === ACCEPTED
```

The rejection is a 409 `invoice/invalid-state` with the client-safe message that the quote must be accepted before conversion.

This matters because hiding Convert in the UI alone would not protect API or SDK callers.

### Existing conversion implementation retained

Conversion still uses the existing invoice-create path with only `quoteId` supplied.

That repository already:

- reads the source quote;
- copies customer/document/line snapshot values;
- creates an Invoice in `DRAFT`;
- sets `billingReason = QUOTE`;
- preserves the quote relation;
- rejects a second conversion when `convertedInvoice` already exists.

The quote remains `ACCEPTED`; conversion evidence is the one-to-one relation rather than a redundant new `INVOICED` status.

The converted invoice still has no AR impact until it is finalized.

### Host actions

Both Billing and Invoice accepted-quote detail actions now offer **Convert to invoice** and navigate to the resulting invoice.

Invoice additionally suppresses the conversion action when a `convertedInvoice` is already present, matching the one-to-one domain relationship instead of deliberately provoking a backend conflict.

## Permission boundaries

The extension review caught several places where adjacent finance actions could otherwise inherit the wrong authority.

Billing invoice detail now separates:

```text
sales:write       -> invoice lifecycle actions
payments:write    -> Record payment
```

Invoice uses its durable app permission catalog:

```text
payments.create   -> Record payment / /payments/new
quotes.edit       -> quote transitions/edit/cancel
quotes.delete     -> delete draft quote
invoices.create   -> accepted quote -> invoice conversion
```

The Invoice quote action component can therefore expose conversion to a user who is allowed to create invoices without implicitly granting quote mutation/deletion, and vice versa.

The existing broader invoice mutation check outside this extension was not redesigned wholesale.

## Shared lifecycle UI

`packages/billing-ui/src/invoice-lifecycle-actions.tsx` now owns:

- Print;
- Edit;
- Finalize;
- Record payment;
- Mark sent;
- Write off;
- Void;
- Delete.

Hosts supply hrefs/callbacks only when their caller has the appropriate authority.

A user-facing invoice event timeline remains deliberately deferred. Outbox rows are infrastructure, not an authorized lifecycle-history read API.

## Tests drafted

No test was executed from GPT Web.

New literal `it()` declarations drafted across the complete run:

| Area | New literal declarations |
| --- | ---: |
| Invoice lifecycle helper | 9 |
| Existing invoice workflow additions | 6 |
| Billing bounded SDK lifecycle resources | 2 |
| Shared invoice lifecycle UI | 7 |
| Invoice lifecycle browser client | 4 |
| Shared Payments Received form | 2 |
| Billing invoice → payment action | 1 |
| Invoice invoice → payment action | 1 |
| Billing service quote conversion | 2 |
| Invoice Payments Received browser client | 1 |
| **Total** | **35** |

The lifecycle helper also has parameterized `it.each` declarations, so runtime test cases exceed the literal declaration count. This is a drafted-test count only.

New extension coverage specifically checks:

- invoice payment prefill;
- saving a customer Payment Received with `allocations: []`;
- invoice Record Payment hrefs;
- accepted-only quote conversion at the service boundary;
- accepted quote reaching the existing invoice-create repository;
- Invoice same-origin payment POST + idempotency.

## Important extension files

### Billing API

- `apps/billing-api/src/modules/documents/documents.service.ts`
- `apps/billing-api/src/modules/documents/documents.service.test.ts`

### Shared finance UI

- `packages/billing-ui/src/payment-received-form.tsx`
- `packages/billing-ui/src/payment-received-form.test.tsx`
- `packages/billing-ui/src/invoice-lifecycle-actions.tsx`
- `packages/billing-ui/package.json`

### Billing host

- `apps/billing/src/features/payments/components/payment-form.tsx`
- `apps/billing/src/app/(app)/(sales)/payments/new/page.tsx`
- `apps/billing/src/app/(app)/(sales)/invoices/[invoiceId]/page.tsx`
- `apps/billing/src/app/(app)/(sales)/invoices/[invoiceId]/_components/invoice-actions.tsx`
- `apps/billing/src/app/(app)/(sales)/invoices/[invoiceId]/_components/invoice-actions.test.tsx`
- `apps/billing/src/app/(app)/(sales)/quotes/[quoteId]/_components/quote-actions.tsx`

### Invoice host

- `apps/invoice/src/app/(app)/payments/new/page.tsx`
- `apps/invoice/src/features/payments/components/payment-received-form.tsx`
- `apps/invoice/src/lib/client/payments.ts`
- `apps/invoice/src/lib/client/payments.test.ts`
- `apps/invoice/src/lib/client/index.ts`
- `apps/invoice/src/app/(app)/payments/[paymentId]/page.tsx`
- `apps/invoice/src/app/(app)/invoices/[invoiceId]/page.tsx`
- `apps/invoice/src/app/(app)/invoices/[invoiceId]/_components/invoice-actions.tsx`
- `apps/invoice/src/app/(app)/invoices/[invoiceId]/_components/invoice-actions.test.tsx`
- `apps/invoice/src/app/(app)/quotes/[quoteId]/page.tsx`
- `apps/invoice/src/app/(app)/quotes/[quoteId]/_components/quote-actions.tsx`

### Documentation / tracker

- `apps/billing/docs/invoice-lifecycle.md`
- `plans/2026-09-07-invoice-lifecycle-hardening/plan.md`
- this report

## Compatibility / architecture review

The extension was reviewed for the main failure modes relevant to the repository:

- no second payment entity or invoice-payment shortcut introduced;
- no `INVOICED` quote status added;
- no persisted enum rename;
- no schema or migration required;
- quote conversion remains `invoices.create({ quoteId })` rather than introducing a competing route/model;
- non-accepted quote conversion is rejected at the service boundary;
- existing one-to-one `convertedInvoice` remains the duplicate-conversion guard;
- Payments Received remains tied to customer first;
- zero allocations are accepted and explicitly presented as customer credit;
- shared product UI is implemented once rather than copied into Invoice;
- host-specific access and transport remain outside `@876/billing-ui`;
- invoice Record Payment permissions are independent from invoice-edit permissions;
- quote edit/delete/convert permissions are independent in Invoice;
- accidental no-op quote-schema churn created during implementation was restored to main exactly;
- no outbox infrastructure was exposed as user-facing history.

## Deliberate gaps

1. No user-facing invoice lifecycle timeline until an authorized read contract exists.
2. No server-provided invoice capability object yet; UI remains conservative.
3. No partial write-off; write-off clears the full remaining receivable.
4. Customer AR's collectible-status list remains local to avoid a Documents ↔ Customers module cycle.
5. No enum normalization/migration.
6. Mark sent still records communication evidence only; it does not claim provider delivery.
7. Invoice Payments Received currently implements creation; Billing retains its richer edit/delete payment workflow.
8. The Invoice Payments Received form currently loads candidate customer/account/mode/currency/invoice data for the form rather than adding new server-side search/filter contracts in this run.
9. Automatic quote acceptance → conversion preference was not introduced; acceptance and conversion remain explicit commands, which matches the default separation discussed in the plan.

## Verification not performed

GPT Web did **not** execute:

- Prettier;
- ESLint;
- TypeScript typecheck;
- Vitest;
- boundary/dependency checks;
- Next.js or Express builds;
- Prisma validate/generate/migrate;
- database drift checks;
- API contract checks/generation;
- browser/manual tests;
- CI workflows.

No statement in this report claims those checks pass.

## Orchestrator verification commands

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

Use the actual workspace/script names if a package differs. Commit only intentional formatter/generated-contract changes.

## Branch state

- Branch: `feature/invoice-lifecycle-hardening`.
- Base used: `main@d0475b5da880d84f483f42bdd2d9f46b3ff6e5ae`.
- No PR was opened or modified.
- No migration was created or executed.
- Runtime/toolchain/database verification remains for an environment with shell access.
