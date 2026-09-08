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
- The unallocated remainder of a payment (`Payment.unappliedAmount`) is held as
  customer credit (advance or overpayment).
- A successful received payment posts **one** `PAYMENT_RECEIVED` customer-ledger
  credit for the full cash amount.
- Applying that payment later does **not** post another customer-ledger credit.
  Allocation only moves settlement between two existing projections:
  `Invoice.amountDue` decreases and `Payment.unappliedAmount` decreases by the
  same amount.
- Corrections append reversal events and retain allocation history instead of
  deleting the financial evidence.

### Cash receipt vs. allocation invariant

Receiving money and deciding which invoice it settles are separate events. The
customer's economic position changes when cash is received; applying the cash
must not change that net position a second time.

```text
Before payment:
  outstanding receivable 1,000
  unused credit              0
  net position            1,000

Receive 1,000 unapplied:
  outstanding receivable 1,000
  unused credit           1,000
  net position                0

Allocate 1,000 to invoice:
  outstanding receivable     0
  unused credit              0
  net position               0
```

This is why `PaymentAllocation` remains independent from `Payment`: one payment
may settle several invoices, settle one invoice partially, or remain wholly or
partly unapplied.

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

## 8. Customer account projection

`customer_account` is a read model over Billing-owned financial facts. It is not
a persisted account table and does not become a second source of truth.

The projection exposes:

- `lifetimeBilled`: finalized non-void invoice totals;
- `lifetimePaid`: successful received cash net of refunds;
- `outstandingReceivable`: the customer's current collectible invoice balance;
- `overdueReceivable`: the portion of that collectible balance whose `dueAt` has
  passed;
- `availableCredit`: the current unused-cash/credit projection;
- `netPosition`: `outstandingReceivable - availableCredit`;
- the latest bounded slice of append-only customer-ledger activity.

The API retains `unusedCredits` and `entries` compatibility aliases alongside
`availableCredit` and `statement` while callers migrate to the canonical typed
projection.

## 9. Customer statements

Statements are derived from `CustomerLedgerEntry`; hosts must not rebuild them
by merging invoices and payments independently.

Ledger direction determines the signed receivable movement:

```text
DEBIT  -> increases the customer balance
CREDIT -> decreases the customer balance
```

The API returns the latest 100 ledger entries, then presents that window in
chronological order. Because older history may exist outside the window, the
statement also returns an `openingBalance` representing the balance immediately
before the first displayed entry. Each displayed line carries its running
`balance`, and `closingBalance` is the balance after the final displayed entry.

That keeps a bounded statement arithmetically correct even when the account has
more history than the response includes:

```text
opening balance
+ signed displayed entry 1
+ signed displayed entry 2
...
= closing balance
```

The source identifiers (`invoiceId`, `paymentId`, `creditNoteId`, `refundId`)
remain on statement entries even when the first UI renders only date,
description, amount, and running balance. They are the link back to auditable
financial evidence.

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
