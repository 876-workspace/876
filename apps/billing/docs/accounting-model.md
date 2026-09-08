# Accounting Model

This document outlines the accounts-receivable (AR) and billing logic in the 876 Billing engine.

## 1. Intent vs. Receivable

- **Quotes, Estimates, and Subscriptions** represent intent to bill. They do not impact AR.
- **Only a finalized Invoice** creates a receivable. Draft invoices do not
  change AR.

## 2. Invoices & Receivables

- An invoice represents money owed by a customer.
- `Invoice.amountDue` tracks the remaining amount the customer owes.
- The persisted `InvoiceStatus` remains a compatibility projection across
  financial, settlement, due-date, and communication state. It is not permission
  for callers to set lifecycle values directly.
- Finalized collectible invoices use `OPEN`, `SENT`, `PARTIALLY_PAID`, or
  `OVERDUE`. Terminal financial states are `PAID`, `UNCOLLECTIBLE`, and `VOID`.
- Compatibility projection precedence for an otherwise collectible invoice is:

```text
amountDue = 0                          -> PAID
positive balance after dueAt          -> OVERDUE
positive balance after cash/credit    -> PARTIALLY_PAID
sentAt present                        -> SENT
otherwise                             -> OPEN
```

A partially settled invoice therefore remains `OVERDUE` when its due date has
passed. Sending an overdue or partially paid invoice records communication but
does not replace its financial state.

### Lifecycle commands

- `finalize` posts a draft invoice and creates AR.
- `send` records `sentAt` and communication evidence. For compatibility only,
  an otherwise plain `OPEN` invoice becomes `SENT`.
- payment and credit-note allocations reduce `amountDue` and project the next
  collectible status centrally.
- `void` reverses an unsettled receivable and its inventory sale movement while
  preserving invoice history. Invoices with settlement evidence must be
  corrected through the settlement/credit workflow instead.
- `write-off` clears the full remaining receivable, increments
  `amountWrittenOff`, moves the invoice to `UNCOLLECTIBLE`, records a `WRITE_OFF`
  ledger credit, and does **not** restore inventory because the underlying sale
  still occurred.

## 3. Settlement identity

Cash, credits, and write-offs remain distinct evidence even when they all reduce
AR:

```text
remaining receivable =
  totalAmount
  - amountPaid
  - amountCredited
  - amountWrittenOff
```

Reversals are append-only corrections and restore the invoice state captured by
the original allocation; financial history is not deleted.

## 4. Payments (Cash In)

- Payments represent actual cash received, recorded against a customer.
- Payments are allocated to open invoices via `PaymentAllocation`.
- The unallocated remainder of a payment (`Payment.unappliedAmount`) is held as customer credit (advance or overpayment).
- Corrections append reversal events and retain allocation history instead of
  deleting the financial evidence.

## 5. Credit Notes (No Cash)

- Credit notes reduce a customer's receivable without moving cash (e.g., for returns, overcharges).
- A credit note's `balanceAmount` can be applied to open invoices via `CreditNoteAllocation`, held as unused customer credit, or refunded.

## 6. Refunds (Cash Out)

- Refunds represent cash returned to the customer.
- A refund draws its funds from either a `CreditNote` balance or a `Payment`'s `unappliedAmount`.

## 7. Denormalized Customer AR

Customer AR position is denormalized directly on the `Customer` record for fast querying:

- `Customer.outstandingReceivable` = Sum of open invoice balances (`amountDue`).
- `Customer.unusedCredits` = Sum of unapplied cash (`Payment.unappliedAmount`) + open credit-note balances (`CreditNote.balanceAmount`).
- **Strict Consistency**: These values are recomputed from source rows by `recomputeCustomerAr` inside the transaction after every payment, credit note, refund, finalization, void, or write-off mutation that changes AR.

The Customers module intentionally keeps its local open-invoice status predicate
instead of importing the Documents lifecycle module. Documents already invokes
Customers to recompute AR; importing Documents back into Customers would create
a cross-module cycle. The two lists must remain contract-tested against the same
four durable collectible statuses until the dependency direction is redesigned.

## Flow Diagram

```text
 [Quote/Subscription]
          │
          │ (intent)
          ▼
      [Invoice] ─────────(creates)────────► [Receivable]
                                                 ▲
                                                 │ (reduces balance)
 [Payment / CreditNote / Write-off] ─────────────┘
          │
          │ (cash/credit corrections may reverse)
          ▼
      [Refund] ──────────(cash out)
```
