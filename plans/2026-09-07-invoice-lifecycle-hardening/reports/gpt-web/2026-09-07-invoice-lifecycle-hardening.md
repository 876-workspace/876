# GPT Web Report: Invoice Lifecycle Hardening

**Run ID:** `2026-09-07-invoice-lifecycle-hardening`  
**Branch:** `feature/invoice-lifecycle-hardening`  
**Base:** `main@d0475b5da880d84f483f42bdd2d9f46b3ff6e5ae`  
**Execution environment:** GitHub connector only  
**Verification:** not executed; verification is the orchestrator's

## Outcome

The existing 876 Billing invoice engine was hardened rather than replaced. The durable eight-value `InvoiceStatus` contract remains intact, while lifecycle semantics are now centralized and explicit across payment allocation, credit-note application, automatic available-credit settlement, overdue materialization, lifecycle commands, bounded SDKs, and the Billing/Invoice UI surfaces.

The core behavioral changes are:

- a partially settled invoice that is still past due remains `OVERDUE`;
- payment and credit allocations use one compatibility-status projection instead of independent `PAID`/`PARTIALLY_PAID` ternaries;
- sending is a communication command rather than a financial-state setter;
- the first `sentAt` is preserved while every subsequent successful mark-sent command can emit a fresh `invoice.sent` event;
- full remaining-balance write-off is a distinct accounting command that records `WRITE_OFF` evidence, clears AR, and does not pretend cash was received;
- void is restricted to unsettled collectible invoices and remains the operation that reverses the posted sale's inventory movement;
- Billing and Invoice render lifecycle actions through one `@876/billing-ui` owner instead of maintaining divergent action components.

No Prisma enum, schema, or database migration was required.

## Lifecycle contract

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

`VOID` and `UNCOLLECTIBLE` are explicit terminal command states and are not produced by the collectible projection.

This deliberately separates the concepts that the legacy-compatible enum flattens:

- financial state;
- settlement state;
- due state;
- communication state.

The detailed contract is documented in `apps/billing/docs/invoice-lifecycle.md`, `apps/billing/BILLING_ENGINE.md`, and `apps/billing/docs/accounting-model.md`.

## Lifecycle commands

### Finalize

The existing finalization workflow remains the posting boundary. It retains the commercial data-plane behavior that had already landed on `main`: payment-term/salesperson resolution, receivable posting, Inventory consumption, customer ledger evidence, AR recomputation, idempotency, and `invoice.finalized` emission.

Generic invoice PATCH remains limited to non-financial header fields; this run did not add any direct status/amount setter.

### Mark sent

New tenant and integration routes:

```text
POST /api/v1/invoices/:invoiceId/send
POST /api/v1/integrations/organizations/:organizationId/invoices/:invoiceId/send
```

Behavior:

- rejects `DRAFT`, `VOID`, and `UNCOLLECTIBLE`;
- permits finalized collectible invoices and `PAID` invoices;
- converts only plain `OPEN` to compatibility `SENT`;
- preserves `PARTIALLY_PAID`, `OVERDUE`, and `PAID` status;
- preserves the first `sentAt` rather than rewriting the original send milestone;
- emits `invoice.sent` on each successful command;
- supports command idempotency where the caller supplies idempotency context.

The UI deliberately says **Mark sent**, not Email/Send again. No communications provider was fabricated by this work; the command records communication evidence only.

### Write off

New tenant and integration routes:

```text
POST /api/v1/invoices/:invoiceId/write-off
POST /api/v1/integrations/organizations/:organizationId/invoices/:invoiceId/write-off
```

Body:

```json
{
  "reason": "Collection exhausted"
}
```

Behavior:

- requires a non-empty audit reason;
- requires a collectible invoice with `amountDue > 0`;
- writes off the complete remaining balance in this MVP;
- sets `amountDue` to zero;
- increments `amountWrittenOff`;
- sets status to `UNCOLLECTIBLE`;
- records a `WRITE_OFF` customer-ledger credit;
- recomputes customer AR inside the transaction;
- emits `invoice.written-off`;
- preserves the sale and does **not** restore Inventory.

A new write-off table was intentionally not added because the existing engine already owns `amountWrittenOff`, the `UNCOLLECTIBLE` status, `WRITE_OFF` ledger entries, metadata, and outbox evidence.

### Void

Void now explicitly rejects non-collectible terminal states, including `UNCOLLECTIBLE`, in addition to the pre-existing paid/allocation protections. It remains distinct from write-off:

- void cancels an unsettled posted invoice, clears the receivable, writes `INVOICE_VOIDED`, recomputes AR, restores the sale's Inventory movement, and preserves invoice history;
- write-off acknowledges that the sale occurred but the remaining receivable is no longer collectible, so stock is not restored.

Because `OVERDUE` can represent a partially settled invoice, flattened status alone cannot prove that an overdue invoice is safe to void. Shared UI therefore exposes Void only for `OPEN` and `SENT`; the backend remains authoritative.

## Settlement consistency

`apps/billing-api/src/modules/documents/invoice-lifecycle.ts` now owns:

- `collectibleInvoiceStatuses`;
- `overdueCandidateInvoiceStatuses`;
- `isCollectibleInvoiceStatus()`;
- `projectCollectibleInvoiceStatus()`.

This owner is reused by:

- manual Payment allocation validation/status projection;
- Credit Note application validation/status projection;
- automatic application of unapplied payments/customer credits;
- automatic application of open credit-note balances;
- overdue materialization.

Cash, credit, and write-off evidence stay separate:

```text
remaining receivable =
  totalAmount
  - amountPaid
  - amountCredited
  - amountWrittenOff
```

Existing unapplied payment/customer-credit behavior is preserved. Existing reversals continue restoring the pre-allocation invoice status and paid timestamp captured by the allocation evidence.

The Customers AR repository retains its local four-status collectible predicate intentionally. Documents already calls Customers to recompute AR; importing Documents back into Customers would create a prohibited cross-module cycle. This boundary exception is documented rather than hidden.

## SDK and integration surface

The bounded Billing client now exposes:

```ts
billing.invoices.finalize(...)
billing.invoices.send(...)
billing.invoices.void(...)
billing.invoices.writeOff(...)
```

The integration Billing resource exposes matching `send()` and `writeOff()` commands under organization-scoped invoice routes. `InvoiceWriteOffParams` / `BillingInvoiceWriteOffParams` require the audit reason.

Billing's browser client and Invoice's same-origin integration proxy also expose the lifecycle commands. Invoice continues routing through its own `/api/invoices/...` surface and does not bypass host transport/auth boundaries.

## Shared UI

`packages/billing-ui/src/invoice-lifecycle-actions.tsx` now owns the lifecycle action presentation used by both hosts:

- Print;
- Edit where host editability permits;
- Finalize for drafts;
- Mark sent for eligible finalized invoices;
- Write off with required reason;
- Void with optional reason, only when status safely implies no settlement (`OPEN`/`SENT`);
- Delete for deletable drafts.

Billing and Invoice action components are now thin host adapters that supply callbacks, navigation, and access decisions.

A user-facing invoice timeline was deliberately not implemented. Outbox events are delivery infrastructure, not an authorized history/read API. A future timeline should start with a durable invoice-event read contract rather than exposing the outbox directly.

## Test drafting summary

No test was executed from GPT Web.

New literal `it()` declarations drafted in this run:

| Area | New literal declarations |
| --- | ---: |
| Invoice lifecycle helper | 9 |
| Existing invoice workflow suite additions | 6 |
| Shared Billing UI lifecycle suite | 7 |
| Invoice same-origin lifecycle client additions | 4 |
| Billing bounded SDK resource additions | 2 |
| **Total** | **28** |

The lifecycle helper contains two `it.each` declarations, so that file expands from 9 literal declarations to 15 expected runtime cases. This is a drafted-test count only; no tests were run here.

## Important files changed

### Billing API

- `apps/billing-api/src/modules/documents/invoice-lifecycle.ts`
- `apps/billing-api/src/modules/documents/invoice-lifecycle.test.ts`
- `apps/billing-api/src/modules/documents/index.ts`
- `apps/billing-api/src/modules/documents/repositories/invoices/mark-overdue.ts`
- `apps/billing-api/src/modules/documents/repositories/invoices/settlement.ts`
- `apps/billing-api/src/modules/payments/repositories/payments/shared.ts`
- `apps/billing-api/src/modules/documents/repositories/credit-notes/shared.ts`
- `apps/billing-api/src/modules/documents/repositories/invoice-workflow.ts`
- `apps/billing-api/src/modules/documents/workflows/send-invoice.ts`
- `apps/billing-api/src/modules/documents/workflows/write-off-invoice.ts`
- `apps/billing-api/src/modules/documents/workflows/void-invoice.ts`
- `apps/billing-api/src/modules/documents/workflows/invoice-workflows.test.ts`
- `apps/billing-api/src/modules/documents/schemas/invoice.ts`
- `apps/billing-api/src/modules/documents/documents.service.ts`
- `apps/billing-api/src/modules/documents/documents.controller.ts`
- `apps/billing-api/src/modules/documents/documents.routes.ts`
- `apps/billing-api/src/modules/outbox/outbox.service.ts`

### Billing SDK / integration

- `packages/billing/src/types/invoice.ts`
- `packages/billing/src/types/index.ts`
- `packages/billing/src/resources/invoices.ts`
- `packages/billing/src/resources/__tests__/documents.test.ts`
- `packages/billing/src/integration/types/invoice-write-off.ts`
- `packages/billing/src/integration/types/index.ts`
- `packages/billing/src/integration/resources/invoices.ts`

### Hosts and shared UI

- `packages/billing-ui/src/invoice-lifecycle-actions.tsx`
- `packages/billing-ui/src/invoice-lifecycle-actions.test.tsx`
- `packages/billing-ui/package.json`
- `apps/billing/src/types/invoice.ts`
- `apps/billing/src/lib/client/invoices.ts`
- `apps/billing/src/app/(app)/(sales)/invoices/[invoiceId]/_components/invoice-actions.tsx`
- `apps/invoice/src/lib/client/documents.ts`
- `apps/invoice/src/lib/client/documents.test.ts`
- `apps/invoice/src/app/(app)/invoices/[invoiceId]/_components/invoice-actions.tsx`

### Documentation / handoff

- `apps/billing/BILLING_ENGINE.md`
- `apps/billing/docs/accounting-model.md`
- `apps/billing/docs/invoice-lifecycle.md`
- `plans/2026-09-07-invoice-lifecycle-hardening/plan.md`
- this report

## Compatibility and diff review

The final review specifically checked for the failure modes the repo rules call out:

- no persisted `InvoiceStatus` values were renamed;
- no database schema/migration was introduced;
- no create/update/finalize/void route was renamed;
- send/write-off routes are additive;
- generic invoice updates remain non-financial;
- accidental SDK JSDoc churn was restored so the type change is focused;
- an initial Documents self-import in the write-off workflow was removed;
- overdue/partial settlement precedence is centralized;
- the overdue materializer consumes the canonical candidate list;
- Customer AR's duplicated status list is documented as a dependency-cycle exception;
- shared UI does not infer Void eligibility from ambiguous overdue/partial status;
- repeated send commands preserve first `sentAt` while emitting fresh send evidence;
- the UI does not claim a message provider sent or delivered anything;
- no user-facing timeline was fabricated from the outbox.

## Deliberate gaps

1. No user-facing invoice timeline until an authorized read contract exists.
2. No server-provided lifecycle-capabilities object yet; UI is deliberately conservative.
3. No partial write-off; current command writes off the full remaining receivable.
4. Customer AR's collectible-status predicate remains local to avoid a Documents ↔ Customers module cycle.
5. No enum normalization/migration.
6. No email/SMS/WhatsApp delivery provider is wired by `send`; it records lifecycle communication evidence only.

## Verification not performed

GPT Web has no shell, package manager, database, runtime, or test runner in this repo workflow. The following were **not executed**:

- Prettier;
- ESLint;
- TypeScript typecheck;
- Vitest;
- dependency-cruiser boundaries;
- Next/Express builds;
- Prisma validate/generate/migrate;
- database drift checks;
- API contract checks/generation;
- browser/manual testing;
- CI workflows.

No statement in this report should be read as claiming those checks pass.

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

The orchestrator should use the actual package-script names if any workspace differs from these labels and commit only intentional formatter/generated-contract output.

## Branch state

- Branch: `feature/invoice-lifecycle-hardening`.
- Base used: `main@d0475b5da880d84f483f42bdd2d9f46b3ff6e5ae`.
- `main` was checked again during final review and was still at the same SHA, so this branch was not behind `main` at that check.
- No PR was opened or modified.
- No migration was executed or created.
- Remaining work is runtime/toolchain verification in an environment with shell and database access.
