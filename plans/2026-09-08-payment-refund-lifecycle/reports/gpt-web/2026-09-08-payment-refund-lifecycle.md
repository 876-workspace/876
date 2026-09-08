# GPT Web Final Report — Payment, Credit, Refund, and Customer Account Lifecycle

**Run ID:** `2026-09-08-payment-refund-lifecycle`  
**Branch:** `feature/payment-refund-lifecycle`  
**Base:** `main@c2a687efc458baf1d69a0dc6d42b3bc17fefbced`  
**Implementation status:** COMPLETE for connector-side scope  
**Runtime verification:** NOT RUN from GPT Web  
**PR:** Not opened

## Executive summary

This branch completes the payment/credit/refund lifecycle work across 876 Billing and 876 Invoice without replacing the existing Billing accounting model.

The central accounting rule remains unchanged and is now enforced more consistently throughout the backend and UI:

```text
receiving money != allocating money
refund != reversal
payment credit != credit-note credit
Transactions != Statement
```

The implementation fixes payment refund projections, adds payment-source refund workflows, brings Invoice payment editing/reallocation into parity with Billing, removes floating-point money handling from the replaced credit-note mutation UI, wires real customer transactions, expands the receivables projection UI, adds refund history to payment details, and hardens API serialization/source scoping discovered during the final audit.

No database schema or migration file was changed in this branch.

## Accounting behavior after this branch

### Payment receipt

A received payment records cash once and creates one `PAYMENT_RECEIVED` ledger credit. Any unallocated portion remains `Payment.unappliedAmount` and therefore customer credit.

### Payment allocation

Applying received cash to invoices decreases both invoice receivable and payment unapplied credit by the same amount. It does not create another customer-ledger credit and therefore does not reduce net customer position twice.

### Payment correction/reallocation

Editing a successful, unrefunded payment remains a correction workflow. Existing allocation evidence is reversed and replacement evidence is recorded. A refunded payment cannot be replaced or canceled.

### Payment refund

A payment refund can consume only `Payment.unappliedAmount`. The mutation:

1. validates the active customer;
2. validates enabled currency;
3. validates refund method/account when supplied;
4. validates same-currency funding account;
5. validates payment source/customer/currency/status;
6. rejects refund above unapplied credit;
7. decrements `unappliedAmount`;
8. increments cumulative `amountRefunded`;
9. projects `PARTIALLY_REFUNDED` or `REFUNDED`;
10. creates the Refund evidence row;
11. records `REFUND_ISSUED` as a customer-ledger `DEBIT`;
12. recomputes customer AR/credit inside the transaction.

A payment with allocations can therefore have all *remaining* unapplied credit refunded and still be `PARTIALLY_REFUNDED`. It reaches `REFUNDED` only when the complete received amount has been returned.

### Credit-note refund

A credit-note refund consumes only open `CreditNote.balanceAmount`. Partial refund leaves the note open; consuming its remaining balance closes it. It does not mutate a Payment.

### Available customer credit

The fast AR projection now continues to treat both `SUCCEEDED` and `PARTIALLY_REFUNDED` payments with positive `unappliedAmount` as available cash credit. Automatic invoice settlement uses the same status rule.

## Backend changes

### Refund correctness

`apps/billing-api/src/modules/payments/repositories/refunds/create.ts`

- increments payment `amountRefunded`;
- projects partial/full refund payment statuses;
- retains serializable mutation semantics;
- reinforces payment source/customer/currency/status/balance checks;
- validates refund mode/account and account currency;
- supports source-app restriction for integration payment refunds;
- rejects app-scoped credit-note refund creation because credit notes do not currently carry equivalent app-source attribution;
- preserves ledger and AR recomputation in the same transaction.

`apps/billing-api/src/modules/payments/repositories/refunds/list.ts`

- supports optional app-source filtering through the related Payment, so app integrations see their own payment-linked refund evidence rather than the complete tenant refund ledger.

### Payment lifecycle/source scoping

The following repositories now accept the optional source-app restriction used by integration mutations:

- `apps/billing-api/src/modules/payments/repositories/payments/update.ts`
- `apps/billing-api/src/modules/payments/repositories/payments/delete.ts`
- `apps/billing-api/src/modules/payments/repositories/payments/apply.ts`

Tenant Billing calls continue without a source filter. Integration calls pass the authenticated app ID.

### Payment detail history

`apps/billing-api/src/modules/payments/repositories/payments/retrieve.ts`

- includes a small ordered refund-summary relation for detail reads only.

The summary deliberately selects only:

- refund id;
- number;
- amount;
- currency;
- reason;
- refunded date;
- creation date.

### Serializer hardening

`apps/billing-api/src/modules/payments/payments.serializers.ts`

The audit found that the original payment serializer spread the complete Prisma row. That was both a strict-client compatibility problem and an unnecessary data-exposure surface because payment rows contain internal fields such as source idempotency/hash information, provider diagnostics, payment snapshots, risk metadata, relation IDs, revision state, and tenant identity.

The serializer now explicitly allowlists the public Payment shape. Nested payment modes, deposit accounts, invoice allocations/invoices, refund summaries, and bank transactions are also projected to explicit public fields.

Integration payment serialization adds only the normalized public `source` object. Raw source implementation columns are not returned.

Refund list serialization was converted from reflected Prisma rows to an explicit public Refund allowlist as well.

### Service/controller/routes

Changed:

- `apps/billing-api/src/modules/payments/payments.service.ts`
- `apps/billing-api/src/modules/payments/payments.controller.ts`
- `apps/billing-api/src/modules/payments/payments.routes.ts`

The integration surface now supports payment update/delete/apply and refund list/create with the existing integration payment scopes while preserving tenant routes.

### AR/settlement projection

Changed:

- `apps/billing-api/src/modules/customers/customers-ar.repository.ts`
- `apps/billing-api/src/modules/documents/repositories/invoices/settlement.ts`

`PARTIALLY_REFUNDED` payments remain available sources when unapplied cash remains.

## SDK/type contract changes

Canonical Payment contracts now include:

- `amountRefunded`;
- the complete canonical payment status set including `PARTIALLY_REFUNDED` and `REFUNDED`;
- optional detail-only refund summaries.

Changed:

- `packages/billing/src/types/payment.ts`
- `packages/billing/src/types/payment.schema.ts`
- `packages/billing/src/integration/types/payment.ts`
- `packages/billing/src/integration/types/payment.schema.ts`
- `apps/billing-api/src/modules/payments/schemas/payment.ts`
- `apps/billing/src/types/payment.ts`

The strict schemas deliberately keep the refund summary optional because list endpoints do not fetch it.

## Billing + Invoice shared UI

### Shared payment detail

Added:

- `packages/billing-ui/src/payment-detail-card.tsx`

Both hosts now use the same payment presentation. It shows:

- actual payment status;
- amount received;
- allocated amount;
- unapplied amount;
- cumulative refunded amount;
- bank charges;
- payment mode;
- deposit account;
- reference/notes;
- invoice allocations;
- individual refund history when present;
- host-provided Edit/Refund links.

Host pages retain permission resolution, routing, data loading, and mutation authority.

Changed host pages:

- `apps/billing/src/app/(app)/(sales)/payments/[paymentId]/page.tsx`
- `apps/invoice/src/app/(app)/payments/[paymentId]/page.tsx`

### Shared refund form

Added:

- `packages/billing-ui/src/refund-form.tsx`

It performs exact decimal-string -> minor-unit parsing with `BigInt`, respects the configured currency decimal count, filters refund accounts to the refund currency, validates against available source credit, and collects refund settlement evidence.

No `Number(amount)` / `Math.round(amount * 100)` money conversion is used in the new flow.

## Payment workflow parity

### Billing

Added:

- `apps/billing/src/app/(app)/(sales)/payments/[paymentId]/refund/page.tsx`
- `apps/billing/src/features/payments/components/refund-form.tsx`

Billing payment detail now exposes Refund only for a writable `SUCCEEDED` or `PARTIALLY_REFUNDED` payment with positive `unappliedAmount`.

### Invoice

Added/changed:

- `apps/invoice/src/app/(app)/payments/[paymentId]/edit/page.tsx`
- `apps/invoice/src/app/(app)/payments/[paymentId]/refund/page.tsx`
- `apps/invoice/src/features/payments/components/payment-received-form.tsx`
- `apps/invoice/src/features/payments/components/refund-form.tsx`
- `apps/invoice/src/app/api/refunds/[[...path]]/route.ts`
- `apps/invoice/src/lib/api/resource-manifest.ts`
- `apps/invoice/src/lib/client/index.ts`
- `apps/invoice/src/lib/client/payments.ts`
- `apps/invoice/src/lib/client/refunds.ts`

Invoice can now edit/reallocate the shared Payment record and refund unapplied payment credit instead of being create-only.

## Credit-note UX changes

Changed/added:

- `apps/billing/src/app/(app)/(sales)/credit-notes/[creditNoteId]/_components/credit-note-actions.tsx`
- `apps/billing/src/app/(app)/(sales)/credit-notes/[creditNoteId]/apply/page.tsx`
- `apps/billing/src/app/(app)/(sales)/credit-notes/[creditNoteId]/apply/_components/credit-note-apply-form.tsx`
- `apps/billing/src/app/(app)/(sales)/credit-notes/[creditNoteId]/refund/page.tsx`
- `apps/billing/src/app/(app)/(sales)/credit-notes/[creditNoteId]/layout.tsx`

The prior inline dialogs used floating-point conversion and a raw Invoice ID input. The replacement Apply flow loads eligible same-customer/same-currency collectible invoices, accepts per-invoice exact-money allocations, rejects allocation above invoice due or total above note balance, and supports multiple partial allocations.

Refund uses the shared exact-money Refund form. Partial refund leaves remaining credit available.

The existing credit-note detail already exposes remaining balance, applications, and refund rows and remains the evidence view.

## Customer account experience

### Real Transactions

Changed:

- `packages/billing-ui/src/customer-transactions-accordions.tsx`
- `apps/billing/src/app/(app)/customers/[customerId]/transactions/page.tsx`
- `apps/invoice/src/app/(app)/customers/[customerId]/transactions/page.tsx`

The previous shared renderer always supplied `data={[]}`. It now consumes the real customer-account ledger entries.

Sections include:

- Invoices;
- Payments received/reversed;
- Refunds;
- Adjustments;
- Credit notes in Billing when enabled by the host.

Invoice deliberately does not gain a top-level Credit Notes product module from this work.

### Receivables overview

Changed:

- `packages/billing-ui/src/panels/customer-receivables-panel.tsx`
- `apps/billing/src/app/(app)/customers/[customerId]/page.tsx`
- `apps/invoice/src/app/(app)/customers/[customerId]/page.tsx`

The shared overview now surfaces the account projection's existing:

- outstanding receivable;
- overdue receivable;
- available credit;
- net position;
- lifetime billed;
- lifetime paid.

The frontend does not independently reconstruct those accounting values.

## Statement behavior

No second statement implementation was introduced. The Statement route remains ledger-backed. `REFUND_ISSUED` entries are part of the same account history and therefore reduce the customer's credit/economic position through the ledger's debit convention.

## Test work drafted

This branch touches **9 test files** containing **34 focused test cases** in the implemented/refactored areas: **8 new test files and 1 expanded existing Invoice client test file**.

### Backend

- `apps/billing-api/src/modules/payments/__tests__/refunds.repository.test.ts` — 13 cases
- `apps/billing-api/src/modules/payments/__tests__/payments.serializers.test.ts` — 3 cases

Coverage includes partial/full/repeated payment refunds, refund above available credit, customer/currency guards, funding-account validation, credit-note partial/full refunds, ledger/AR calls, and serializer allowlisting.

### Canonical/integration contracts

- `packages/billing/src/types/__tests__/payment.schema.test.ts` — 3 cases
- `packages/billing/src/integration/resources/__tests__/payments.integration.test.ts` — 2 cases

Coverage includes `amountRefunded`, partial/full refund statuses, strict invalid-response handling, and integration Payment parsing.

### Shared UI

- `packages/billing-ui/src/refund-form.test.tsx` — 4 cases
- `packages/billing-ui/src/payment-detail-card.test.tsx` — 2 cases
- `packages/billing-ui/src/customer-transactions-accordions.test.tsx` — 2 cases

Coverage includes funding-account currency filtering, exact minor-unit submission, refund maximum validation, 3-decimal currencies, mutation-link authorization, refund history, real refund transaction rendering, and Billing-only credit-note section behavior.

### Invoice client adapters

- `apps/invoice/src/lib/client/payments.test.ts` — 3 cases
- `apps/invoice/src/lib/client/refunds.test.ts` — 2 cases

Coverage includes same-origin create/update/delete payment transport, idempotency on creation, and payment/credit-note refund request bodies.

**These tests were drafted but not executed from this GPT Web environment.**

## Documentation

Changed:

- `apps/billing/docs/accounting-model.md`

It now explicitly documents:

- receipt vs allocation;
- correction/reallocation vs refund;
- cumulative `amountRefunded`;
- repeated partial payment refunds;
- `PARTIALLY_REFUNDED` payments retaining remaining credit;
- payment refund vs credit-note refund effects;
- refund funding provenance;
- customer AR effects;
- integration app-source authority;
- provider-refund execution remaining deferred.

Handoff artifacts:

- `plans/2026-09-08-payment-refund-lifecycle/plan.md`
- `plans/2026-09-08-payment-refund-lifecycle/reports/gpt-web/2026-09-08-payment-refund-lifecycle.md`

## Exact changed-file inventory

### Billing API / accounting

- `apps/billing-api/src/modules/customers/customers-ar.repository.ts`
- `apps/billing-api/src/modules/documents/repositories/invoices/settlement.ts`
- `apps/billing-api/src/modules/payments/__tests__/payments.serializers.test.ts`
- `apps/billing-api/src/modules/payments/__tests__/refunds.repository.test.ts`
- `apps/billing-api/src/modules/payments/payments.controller.ts`
- `apps/billing-api/src/modules/payments/payments.routes.ts`
- `apps/billing-api/src/modules/payments/payments.serializers.ts`
- `apps/billing-api/src/modules/payments/payments.service.ts`
- `apps/billing-api/src/modules/payments/repositories/payments/apply.ts`
- `apps/billing-api/src/modules/payments/repositories/payments/delete.ts`
- `apps/billing-api/src/modules/payments/repositories/payments/retrieve.ts`
- `apps/billing-api/src/modules/payments/repositories/payments/update.ts`
- `apps/billing-api/src/modules/payments/repositories/refunds/create.ts`
- `apps/billing-api/src/modules/payments/repositories/refunds/list.ts`
- `apps/billing-api/src/modules/payments/schemas/payment.ts`

### Billing docs/app

- `apps/billing/docs/accounting-model.md`
- `apps/billing/src/app/(app)/(sales)/credit-notes/[creditNoteId]/_components/credit-note-actions.tsx`
- `apps/billing/src/app/(app)/(sales)/credit-notes/[creditNoteId]/apply/_components/credit-note-apply-form.tsx`
- `apps/billing/src/app/(app)/(sales)/credit-notes/[creditNoteId]/apply/page.tsx`
- `apps/billing/src/app/(app)/(sales)/credit-notes/[creditNoteId]/layout.tsx`
- `apps/billing/src/app/(app)/(sales)/credit-notes/[creditNoteId]/refund/page.tsx`
- `apps/billing/src/app/(app)/(sales)/payments/[paymentId]/page.tsx`
- `apps/billing/src/app/(app)/(sales)/payments/[paymentId]/refund/page.tsx`
- `apps/billing/src/app/(app)/customers/[customerId]/page.tsx`
- `apps/billing/src/app/(app)/customers/[customerId]/transactions/page.tsx`
- `apps/billing/src/features/payments/components/refund-form.tsx`
- `apps/billing/src/types/payment.ts`

### Invoice

- `apps/invoice/src/app/(app)/customers/[customerId]/page.tsx`
- `apps/invoice/src/app/(app)/customers/[customerId]/transactions/page.tsx`
- `apps/invoice/src/app/(app)/payments/[paymentId]/edit/page.tsx`
- `apps/invoice/src/app/(app)/payments/[paymentId]/page.tsx`
- `apps/invoice/src/app/(app)/payments/[paymentId]/refund/page.tsx`
- `apps/invoice/src/app/api/refunds/[[...path]]/route.ts`
- `apps/invoice/src/features/payments/components/payment-received-form.tsx`
- `apps/invoice/src/features/payments/components/refund-form.tsx`
- `apps/invoice/src/lib/api/resource-manifest.ts`
- `apps/invoice/src/lib/client/index.ts`
- `apps/invoice/src/lib/client/payments.test.ts`
- `apps/invoice/src/lib/client/payments.ts`
- `apps/invoice/src/lib/client/refunds.test.ts`
- `apps/invoice/src/lib/client/refunds.ts`

### Shared Billing UI

- `packages/billing-ui/package.json`
- `packages/billing-ui/src/customer-transactions-accordions.test.tsx`
- `packages/billing-ui/src/customer-transactions-accordions.tsx`
- `packages/billing-ui/src/panels/customer-receivables-panel.tsx`
- `packages/billing-ui/src/payment-detail-card.test.tsx`
- `packages/billing-ui/src/payment-detail-card.tsx`
- `packages/billing-ui/src/refund-form.test.tsx`
- `packages/billing-ui/src/refund-form.tsx`

### Billing SDK/contracts

- `packages/billing/src/integration/resources/__tests__/payments.integration.test.ts`
- `packages/billing/src/integration/types/payment.schema.ts`
- `packages/billing/src/integration/types/payment.ts`
- `packages/billing/src/types/__tests__/payment.schema.test.ts`
- `packages/billing/src/types/payment.schema.ts`
- `packages/billing/src/types/payment.ts`

### Handoff

- `plans/2026-09-08-payment-refund-lifecycle/plan.md`
- `plans/2026-09-08-payment-refund-lifecycle/reports/gpt-web/2026-09-08-payment-refund-lifecycle.md`

## Deliberately deferred / not part of this implementation

### Provider-driven asynchronous refunds

The Refund model still represents accounting/manual refund evidence; this branch does not add a speculative provider execution state machine. A future provider implementation should add a provider-neutral boundary such as RefundAttempt/provider reference/idempotency/webhook reconciliation instead of branching core code on provider names.

### Dedicated refund detail/reporting module

Refund evidence is surfaced contextually through payment detail, credit-note detail, customer transactions, and statements. This branch does not add a top-level Refunds navigation/reporting module.

### Dedicated refund permission

The current host flows use existing payment write/edit permission boundaries. A future permission-catalog change may introduce a narrower `refunds:create`/approval model; that is deliberately not invented in this finance lifecycle branch.

### Credit-note app-source attribution

Credit notes currently do not carry the same source-app attribution contract as Payments. Therefore app-scoped integration refund creation is payment-source only. Billing tenant authority can continue to refund credit-note balances.

## Risks / local review priorities

1. **Compile/strict type compatibility:** several strict Payment schemas and response types were expanded. Run all package typechecks first.
2. **API contract generation:** routes were added/expanded in the Billing payments router; run `api:contract:check`.
3. **Serializer shape:** the explicit serializer is intentionally narrower than raw Prisma rows. Test both tenant and integration list/detail clients against real service responses.
4. **UI form imports/exports:** `@876/billing-ui` gained new subpath exports; package typecheck/build should confirm package export resolution.
5. **Permissions:** verify Invoice's `payments.edit` capability maps correctly to same-origin payment/refund write proxy authorization in the deployed permission setup.
6. **Currency behavior:** manually exercise a 0-decimal and 3-decimal enabled currency in addition to JMD/USD.
7. **Concurrency:** repository uses serializable transactions and retryable-conflict mapping, but concurrent double-refund behavior should be exercised against a real database.
8. **Existing payment data:** confirm old Payment rows have valid `amountRefunded` defaults and all current production/API responses satisfy the now-required canonical field.
9. **Source scope:** exercise two app connections within one tenant to confirm an integration cannot update/delete/apply/refund another app's attributed Payment while Billing tenant authority can still see the organization-wide finance plane.
10. **No migration expected:** no schema file changed, but still run Prisma validation/drift checks before merge.

## Verification commands

None of these were run by GPT Web. The local/orchestrator agent should run:

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

Then manually exercise at minimum:

1. payment with no initial allocations;
2. payment split across multiple invoices;
3. edit/reallocation in Billing;
4. edit/reallocation in Invoice;
5. partial refund of unapplied payment credit;
6. second refund of remaining payment credit;
7. full refund of a wholly-unapplied payment;
8. rejection of refund above available credit;
9. rejection of refund from wrong-currency funding account;
10. partial credit-note application;
11. partial credit-note refund with remaining balance;
12. customer Overview metrics after each mutation;
13. customer Transactions refund/payment sections;
14. Statement running balance after refund;
15. integration source-scope isolation across two product app connections.

## Handoff conclusion

Connector-side implementation is complete. The work preserves the existing Billing data plane rather than introducing a second accounting representation, and Billing/Invoice now share the payment/refund lifecycle presentation where their capabilities overlap.

The final remaining gate is local/orchestrator verification. Do not represent this branch as test-, build-, Prisma-, or contract-verified until the commands above have actually been run successfully.

No PR was opened by GPT Web.
