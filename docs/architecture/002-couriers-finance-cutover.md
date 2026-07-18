# ADR-002: Retire Couriers finance ownership

## Status

Accepted

## Context

ADR-001 established one organization-linked finance workspace in Billing,
separate from paid Billing product access. Couriers still carried historical
Prisma models for catalog items, invoices, discounts, payment settings,
payments, bank accounts, and ledger entries. Leaving those models in place
would preserve two possible systems of record and make later Billing activation
an ambiguous merge.

## Decision

- Remove the duplicate Couriers finance models, contracts, seed data, and error
  surface in one full migration. Do not retain aliases or fallback reads.
- Keep courier customer enrollment as `CourierCustomerProfile`, with a required
  opaque link to the shared Billing customer.
- Keep package and cash-drawer operations in Couriers, but replace local finance
  foreign keys with opaque Billing invoice, bank-account, and payment IDs.
- Expose payment methods and deposit-account choices through the official
  organization-scoped Billing integration API under `billing.payments.read`.
  Deposit-account balances are deliberately excluded from this support
  projection.
- Block the destructive schema migration when any finance row has not been
  migrated. JMD-only defaults may be retired because Billing provisioning
  recreates the canonical JMD configuration.

## Consequences

- Couriers can create and retrieve finance resources only through Billing's
  scoped, source-attributed, idempotent HTTP boundary.
- Activating the paid Billing product later reveals the same customers,
  catalog, invoices, payments, and settings; it is an access change, not a data
  migration.
- A failed preflight is an intentional deployment stop. Operators must migrate
  and reconcile the reported environment before retrying instead of accepting
  silent row loss.
- Cash-session reporting must resolve current payment details from Billing.
  Couriers stores only the operational association needed for staff-shift
  accountability.

## Rejected alternatives

### Keep read-only legacy tables

Rejected because a read-only table still becomes an attractive compatibility
surface and can drift from Billing indefinitely.

### Copy Billing records back into Couriers

Rejected because synchronization does not remove dual ownership, and partial
failures would produce conflicting balances and document state.

### Put cash sessions in Billing

Rejected because drawer shifts are product operations tied to Couriers staff.
Only the payment, deposit account, and ledger consequences belong to Billing.
