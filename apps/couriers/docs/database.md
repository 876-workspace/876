# Couriers operational database

The Couriers database stores shipping operations for courier companies. Core
876 remains authoritative for accounts, organizations, memberships, and product
entitlements. 876 Billing is authoritative for shared customers, catalog
items, currencies, taxes, discounts, invoices, payment methods, payments, bank
accounts, balances, and ledger entries.

This is a hard ownership boundary. Couriers does not keep a fallback finance
store and does not infer cross-database identity from names or email addresses.

## Cross-service references

Cross-database references are opaque strings, never foreign keys:

| Couriers field                                  | Authoritative resource | Purpose                                            |
| ----------------------------------------------- | ---------------------- | -------------------------------------------------- |
| `tenants.org_id`                                | Core organization      | Stable tenant identity and entitlement lookup      |
| `courier_customer_profiles.user_id`             | Core user              | Person enrolled with a courier                     |
| `courier_customer_profiles.billing_customer_id` | Billing customer       | Required shared finance customer                   |
| `packages.billing_invoice_id`                   | Billing invoice        | Optional invoice covering an operational package   |
| `cash_sessions.billing_deposit_account_id`      | Billing bank account   | Account selected for drawer settlement             |
| `cash_session_payments.billing_payment_id`      | Billing payment        | Payment collected during an operational cash shift |

Billing resources are resolved through `@876/billing/integration` using the
Core organization ID and the calling app's server-only credential. Couriers
never joins directly to the Billing database.

## Retained tables

| Area                    | Tables                                                                                                                |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Tenant routing          | `tenants`, `domains`                                                                                                  |
| Customer operations     | `courier_customer_profiles`, `customer_addresses`, `contacts`, `customer_id_types`, `customer_documents`, `mailboxes` |
| Shipping                | `packages`, `package_documents`, `package_notes`, `package_categories`, `sellers`, `carriers`, `manifests`            |
| Locations and workforce | `warehouses`, `branches`, `staff_positions`, `staff_members`                                                          |
| Cash-shift operations   | `cash_sessions`, `cash_session_payments`                                                                              |

The customer profile contains courier-specific facts such as home branch, TRN,
commercial-account classification, and enrollment status. It intentionally
does not duplicate the customer's name, email, billing address, balances, or
commercial history.

Packages retain customs, routing, receipt-condition, weight, dimensions, and
collection facts. Monetary assessments on a package are operational customs
snapshots; the receivable and payment lifecycle belongs to Billing.

Cash sessions represent staff accountability for a physical drawer. They
snapshot the session currency and reference the Billing deposit account. The
join table records only which Billing payments were collected in the session;
it does not copy amounts, payment status, payment methods, account balances, or
ledger transactions.

## Removed finance ownership

The full cutover removes these former Couriers tables:

- `currencies`
- `items`
- `invoices` and `invoice_line_items`
- `coupons` and `coupon_redemptions`
- `payment_modes` and `tenant_payment_modes`
- `payments`
- `bank_accounts`
- `account_transactions`

Their corresponding Prisma models, generated client models, Zod contracts,
seed data, and error aliases are removed too. New code must use the official
Billing integration client; there is no backward-compatible local surface.

## No-loss migration contract

Migration `20260714050000_remove_local_finance_ownership` is one-way and fails
before changing the schema if it finds any local catalog, document, discount,
payment, banking, ledger, cash-session, package-invoice-link, or unlinked
customer-profile data. Those rows must first be moved to Billing and linked by
their Billing IDs.

JMD-only currency defaults are removable because the versioned Billing
provisioning manifest creates the same shared default whenever the finance
workspace is ensured. Any non-JMD local currency blocks deployment and must be
migrated explicitly.

## Lifecycle rules

- Creating or activating a Couriers entitlement provisions a headless Billing
  finance workspace plus a Couriers connection with explicit scopes.
- The finance workspace does not grant the paid Billing product entitlement.
- Activating Billing later reuses the same organization-linked workspace and
  adds UI access without copying or resetting app-originated data.
- Deactivating Couriers revokes its connection; it does not delete shared
  financial records.
- Billing cancellation removes standalone Billing access but does not delete a
  workspace still required by another connected product or retention policy.
