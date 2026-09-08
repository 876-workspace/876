# Invoice Lifecycle

876 Billing owns invoice lifecycle and accounts-receivable state. Billing and Invoice are host surfaces over this domain; neither host may invent lifecycle transitions locally.

## Compatibility status model

The persisted/API `InvoiceStatus` values remain:

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

These values are retained as durable compatibility contracts. They are a flattened projection of several independent concepts, not eight mutually exclusive business dimensions.

## Lifecycle dimensions

### Financial state

```text
DRAFT -> OPEN -> PAID
          |       
          +-> UNCOLLECTIBLE
          +-> VOID
```

- `DRAFT` has no receivable impact.
- Finalization posts the invoice and creates accounts receivable.
- `PAID` means the remaining receivable reached zero through payment and/or credit allocations.
- `UNCOLLECTIBLE` means the remaining receivable was explicitly written off.
- `VOID` cancels an unsettled finalized invoice while retaining history and reversing the sale's stock movement.

### Settlement state

Settlement is evidenced by separate amounts and allocations:

```text
amountPaid
amountCredited
amountWrittenOff
amountDue
```

Cash, credits, and write-offs are never interchangeable evidence. A zero `amountDue` does not imply that the full invoice total was received as cash.

### Due state

An invoice is overdue when it is collectible, has a positive `amountDue`, and its `dueAt` is earlier than the evaluation time. `OVERDUE` remains materialized as a compatibility status, but overdue behavior is a due-state projection rather than a different kind of receivable.

### Communication state

`sentAt` records the first time a finalized invoice was marked sent. Repeated send actions preserve that first timestamp and emit additional `invoice.sent` events. Sending never creates a second receivable and never replaces `PARTIALLY_PAID`, `OVERDUE`, or `PAID` merely to display `SENT`.

The current `send` command records communication evidence. It does not claim that an email, SMS, or messaging provider delivered the invoice. A future communications adapter may consume the same domain event/command boundary.

## Flattened status precedence

When a collectible invoice changes through payment or credit allocation, Billing projects its compatibility status in this order:

```text
PAID
OVERDUE
PARTIALLY_PAID
SENT
OPEN
```

Terminal states (`VOID`, `UNCOLLECTIBLE`) are entered only by their explicit commands and are not passed through the collectible projection.

This means a partially settled invoice with a positive past-due balance remains `OVERDUE`; paid/credited amounts remain visible through their separate fields and allocation records.

## Commands and invariants

### Finalize

`POST /invoices/:invoiceId/finalize`

- Only a draft can be finalized.
- Finalization is transactional and idempotent when an idempotency key is supplied.
- It resolves payment terms and salesperson snapshots, posts the receivable, consumes tracked inventory, writes the customer ledger, recomputes AR, and emits `invoice.finalized`.
- A draft remains non-posting if finalization fails.

### Send

`POST /invoices/:invoiceId/send`

- Allowed for finalized invoices except `VOID` and `UNCOLLECTIBLE`.
- `OPEN` projects to `SENT`; other financial/due/settlement statuses are preserved.
- The first `sentAt` remains stable across repeated send records.
- Each successful command emits `invoice.sent`.

### Payment allocation

- Only collectible invoices accept allocations.
- Allocation increments `amountPaid` and decreases `amountDue` transactionally.
- Remaining status is projected centrally.
- Any unapplied payment remains customer credit rather than being forced onto an invoice.

### Credit-note allocation

- Only collectible invoices accept allocations.
- Allocation increments `amountCredited` and decreases `amountDue`.
- It moves no cash.
- Remaining status is projected through the same lifecycle function used by payments.

### Write off

`POST /invoices/:invoiceId/write-off`

- Only an invoice with a positive collectible balance may be written off.
- The current command writes off the full remaining balance.
- `amountWrittenOff` increases, `amountDue` becomes zero, and status becomes `UNCOLLECTIBLE`.
- A `WRITE_OFF` customer-ledger credit and `invoice.written-off` event preserve the evidence.
- Inventory is not restored because the underlying sale still occurred.
- A reason is required and retained as audit metadata/event data.

### Void

`POST /invoices/:invoiceId/void`

- Drafts are deleted rather than voided.
- Paid, written-off, or already void invoices cannot be voided.
- Active payment or credit allocations block voiding; settlement must be corrected first.
- Voiding clears the remaining receivable, records `INVOICE_VOIDED`, recomputes AR, restores sale inventory, and emits `invoice.voided`.

## Customer AR

The denormalized customer AR position remains a projection over source records:

```text
outstandingReceivable = sum(amountDue for collectible invoices)
unusedCredits = unapplied successful payments + open credit-note balances
```

Every financial mutation that changes this position must recompute it inside the same transaction.

## Host/UI ownership

Lifecycle presentation shared by Billing and Invoice belongs in `@876/billing-ui`. Hosts supply authority, routing, transport callbacks, and navigation. The Billing API remains authoritative for command eligibility; UI visibility is a convenience and never an authorization or accounting boundary.

## Future evolution

The compatibility enum may eventually be simplified after all callers stop depending on communication/due/settlement concepts as primary persisted states. That is explicitly out of scope for this implementation. Any future migration must preserve existing wire/storage values until all external and internal consumers are migrated deliberately.
