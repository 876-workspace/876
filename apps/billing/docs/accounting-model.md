# Accounting Model

This document outlines the accounts-receivable (AR) and billing logic in the 876 Billing engine.

## 1. Intent vs. Receivable

- **Quotes, Estimates, and Subscriptions** represent intent to bill. They do not impact AR.
- **Only a finalized Invoice** creates a receivable. Draft invoices do not
  change AR.

## 2. Invoices & Receivables

- An invoice represents money owed by a customer.
- `Invoice.amountDue` tracks the remaining amount the customer owes.
- **Status Transitions**:
  - `OPEN` (Finalized initial state)
  - `SENT` (Legacy-compatible open state after communication)
  - `PARTIALLY_PAID` (Payment or credit partially applied)
  - `PAID` (`amountDue` reaches zero)
  - `OVERDUE` (Past due date)
  - `VOID` (Canceled)

## 3. Payments (Cash In)

- Payments represent actual cash received, recorded against a customer.
- Payments are allocated to open invoices via `PaymentAllocation`.
- The unallocated remainder of a payment (`Payment.unappliedAmount`) is held as customer credit (advance or overpayment).
- Corrections append reversal events and retain allocation history instead of
  deleting the financial evidence.

## 4. Credit Notes (No Cash)

- Credit notes reduce a customer's receivable without moving cash (e.g., for returns, overcharges).
- A credit note's `balanceAmount` can be applied to open invoices via `CreditNoteAllocation`, held as unused customer credit, or refunded.

## 5. Refunds (Cash Out)

- Refunds represent cash returned to the customer.
- A refund draws its funds from either a `CreditNote` balance or a `Payment`'s `unappliedAmount`.

## 6. Denormalized Customer AR

Customer AR position is denormalized directly on the `Customer` record for fast querying:

- `Customer.outstandingReceivable` = Sum of open invoice balances (`amountDue`).
- `Customer.unusedCredits` = Sum of unapplied cash (`Payment.unappliedAmount`) + open credit-note balances (`CreditNote.balanceAmount`).
- **Strict Consistency**: These values are recomputed from source rows by `recomputeCustomerAr` inside the transaction after every payment, credit note, or refund mutation.

## Flow Diagram

```text
 [Quote/Subscription]
          │
          │ (intent)
          ▼
      [Invoice] ─────────(creates)────────► [Receivable]
                                                 ▲
                                                 │ (reduces balance)
 [Payment / CreditNote] ─────────────────────────┘
          │
          │ (draws unapplied cash / credit)
          ▼
      [Refund] ──────────(cash out)
```
