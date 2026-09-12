# Banking Model

876 Banking is the cash-verification layer of the Billing financial data plane.
It records what a bank says happened separately from what the 876 commercial
engine has booked.

## Two kinds of evidence

### `BankTransaction` — booked cash

`BankTransaction` is canonical internal financial evidence. It is created by a
Billing workflow such as a received Payment or Sales Receipt, or by a Banking
command that intentionally books a manual cash movement, transfer, or deposit.

A `BankTransaction` is not a bank-feed row.

### `BankStatementLine` — external bank evidence

`BankStatementLine` is an immutable observation imported from a statement file,
a future feed provider, or another bank-data source. Importing one does not
create Accounts Receivable, customer credit, a Payment, or a ledger entry.

The normal lifecycle is:

```text
statement source
  -> BankStatementImport
  -> BankStatementLine
  -> match existing booked cash
     OR categorize through a canonical Billing command
  -> BankTransaction
  -> reconciliation period
```

## Matching versus categorization

Matching proves that an existing booked movement appeared at the bank. It never
creates or reallocates the matched Payment/Refund/transfer and therefore must not
change customer AR.

Categorization is used only when the statement line represents a real movement
that has not yet been booked. The categorization command creates the appropriate
canonical Billing resource and then matches the statement line to the resulting
`BankTransaction`.

For customer receipts the chain remains:

```text
BankStatementLine
  -> Payment
  -> BankTransaction
  -> optional PaymentAllocation(s)
  -> Invoice(s)
```

Receiving the cash and deciding which invoice it settles are separate events.
The Banking layer must not collapse them.

## Matching cardinality

A statement line can match more than one booked cash movement. This is required
for net/batched deposits and settlement groups. `BankStatementMatch` owns the
review action and `BankStatementMatchItem` owns the amount assigned to each
`BankTransaction`.

Unmatching reverses only the match evidence. The canonical financial rows remain.

## Reconciliation

Reconciliation is not another statement-line status. A reconciliation is a
period-level record that proves the account's cleared booked transactions agree
with an external closing balance.

A completed reconciliation is retained as historical evidence. Reopening it is
an explicit command; it is never deleted as ordinary CRUD.

## Compatibility

`BankTransaction.status` predates statement-line separation and is part of the
existing public API. New Banking workflow state belongs on
`BankStatementLine.status`. The legacy field remains until all first-party
callers migrate and a coordinated public-contract removal is scheduled.

New code must not treat `BankTransaction.status = MATCHED` as proof that a bank
statement was reconciled.

## Balance vocabulary

- **Books balance**: net canonical `BankTransaction` activity for the account.
- **Bank balance**: latest balance supplied by a statement/feed source.
- **Reconciled balance**: balance proven by the latest completed reconciliation.

These values may legitimately disagree while Banking work is outstanding.

## Provider boundary

File imports and future live feeds normalize into the same statement-line
contract. Provider-specific fields and credentials stay in provider adapters;
they never become accounting identity or leak into canonical Billing resources.