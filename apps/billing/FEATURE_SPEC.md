# 876 Billing — Product and Feature Specification

## Purpose

876 Billing is a tenant-isolated SaaS billing domain for commercial catalogue,
customers, quotes, invoices, and subscriptions. 876 is the first tenant, but
the model must also work for external organizations with no other 876 product.

Billing is not an entitlement engine, payment processor, tax filing system, or
general ledger. It owns commercial billing, accounts-receivable records,
provider-neutral payment orchestration metadata, and lightweight banking
reconciliation. External providers move money; Billing remains the source of
truth for invoices, allocations, customer credit, and subscription schedules.

## Current implementation

- Authenticated, Console-style workspace, sidebar, dashboard, and reports.
- Versioned, idempotent tenant provisioning. New workspaces atomically receive
  JMD as base/default currency, English, Billing roles, payment modes, Tax
  Administration Jamaica, and the standard 15% GCT rate.
- Multi-currency tenant configuration. New workspaces enable and select JMD.
- Tenant tax authorities and immutable, effective-dated tax rates. New
  workspaces start with Tax Administration Jamaica and standard GCT as
  configurable defaults. Subscription invoices calculate line-level tax from
  the active default rate and stored taxability snapshots.
- Billing-local roles and user grants. Core organization membership establishes
  tenancy, while per-workspace roles control Billing resources and actions.
- External customers and optional opaque core-user/core-organization links.
- Items, products, plans, immutable prices, quotes, estimates, finalizable
  invoices, credit notes, received payments, refunds, and subscriptions.
- Provider-independent recurring billing with trials, billing anchors,
  in-advance/in-arrears timing, idempotent period runs, upcoming-invoice and
  proration previews, payment terms, discounts, promotion codes, and gifts.
- Customer account summaries, append-only subledger events, opening balances,
  partial payment allocation, overpayment credit, and automatic credit use.
- Payment-provider catalogue and tenant connection framework for Amber Pay,
  WiPay, Stripe, or custom adapters. Raw credentials are never stored in the
  Billing database.
- Subscription lifecycle history and currency-separated commercial reporting.
- Canonical, versioned API routes under `/api/v1` using the existing
  `{ data, error }` result pattern. The Next.js Billing app is presentation +
  authenticated BFF only; financial data lives in `@876/billing-api`.
- `@876/billing` tenant client for customer, invoice, and subscription writes,
  plus the server-only `@876/billing/admin` projection client used by Console.
- Internal admin surface (`POST /api/v1/admin/<resource>/ensure`) guarded by
  `x-internal-key`; resolves the platform tenant from `BILLING_PLATFORM_TENANT_SLUG`.
- `BillingPlan.entitlementReferenceId` and `BillingPrice.entitlementReferenceId`
  opaque reference columns; unique constraints keyed on tenant + reference fields.
- `BillingSubscription` unique on `[tenant, externalReference]`.
- One-way Console→Billing mirror: Console route handlers synchronously attempt
  idempotent ensure calls after their core writes complete. Subscription sync
  first repairs its referenced product, plan, and price projections, so delivery
  order cannot strand an otherwise valid agreement.
- New Product page fetches `product`-kind 876 apps for `sourceAppId` selection.

The release does not send documents, execute provider charges, process provider
webhooks, run dunning communications, file taxes, or synchronize entitlements.
See [BILLING_ENGINE.md](./BILLING_ENGINE.md) for the accounting rules and
provider-neutral architecture.

## Ownership and source of truth

| Concern                                                                     | Owner                 | Rule                                                     |
| --------------------------------------------------------------------------- | --------------------- | -------------------------------------------------------- |
| Identity, orgs, memberships, apps, API keys, access grants                  | `@876/api`            | Billing stores opaque IDs only.                          |
| Billing tenants, currencies, customers, catalogue, documents, subscriptions | 876 Billing datastore | Billing is authoritative.                                |
| App features, feature flags, behavioral access and entitlements             | Core/Console          | Billing may reference an app but never changes behavior. |
| Invoices, AR, payments, credits, refunds, subscriptions, reconciliation     | 876 Billing datastore | Billing is authoritative; providers only move money.     |

No Billing table may use a cross-database foreign key to core. Fields such as
`organizationId`, `userId`, `sourceAppId`, and `entitlementReferenceId` are
opaque strings.

### Console integration rule

Console mirrors its entitlement-catalog writes (products, plans, prices,
customers, subscriptions) into Billing through the `/api/v1/admin/*/ensure`
endpoints after every core write completes. The mirror is one-way and
idempotent; failures are logged and never fail the core write. Billing rows
store opaque entitlement references (`entitlementReferenceId`,
`externalReference`) keyed to core IDs — never cross-database foreign keys.
Money truth (amounts, subscriptions, invoices) lives in Billing; entitlement
and access truth lives in core.

Do not synchronize mutable catalogue rows in both directions. Existing core
product/price records are legacy or entitlement records until deliberately
migrated, not a second Billing catalogue.

## Data model

All timestamps are Unix seconds. Money is integer minor units (`BigInt` in
Prisma), never floats.

### Tenant and currency

- `BillingTenant` is the data-isolation boundary and can reference one core org.
- `BillingTenant.provisioningVersion` and `provisionedAt` record the application
  provisioning manifest applied to the workspace. Repeated setup requests return
  the existing workspace and never reset tenant-selected configuration.
- `BillingCurrency` is the supported global catalogue. Initial entries include
  JMD, USD, CAD, GBP, EUR, BBD, BZD, KYD, TTD, and XCD.
- `BillingTenantCurrency` enables one or more currencies and selects one default.
- Values never silently convert across currencies. FX needs policy first.
- `BillingTenant.countryCode` snapshots the initial tax jurisdiction from the
  core organization; missing country data falls back to Jamaica during setup.

### Tax configuration

- `BillingTaxAuthority` belongs to one tenant and records a country plus an
  optional ISO-style subdivision code. One active authority may be the default.
- Every new workspace receives `Tax Administration Jamaica` and the standard
  15% GCT rate as its initial defaults. Workspaces can replace those defaults
  with configuration appropriate to their actual jurisdiction and supplies.
- `BillingTaxRate` records a percentage to four decimal places, inclusive or
  exclusive behavior, optional tax type, authority, and optional effective
  start timestamp.
- Percentage, authority, behavior, and effective start are immutable. Legal
  changes are represented by archiving the old rate and creating a replacement.
- Subscription invoice generation uses the effective default rate only when a
  price, item, or plan snapshot is taxable. Filing and jurisdiction decisions
  remain outside this engine.

### Billing access

- `BillingRole` and `BillingMember` are tenant-local. Member rows contain only
  opaque core user IDs; identity remains in the core API.
- System roles are Owner, Administrator, Accountant, and Viewer. Viewer is the
  default for an organization member without an explicit Billing grant.
- Custom roles use resource-level read/write permissions. Write always implies
  the matching read permission, and every role includes `billing:access`.
- Route handlers and RSC layouts enforce permissions independently. Navigation
  filtering is presentation only, never the authorization boundary.
- The core organization owner always retains active Billing Owner access to
  prevent an unrecoverable tenant lockout.

### Customer

`BillingCustomer` has exactly one linkage mode:

- `EXTERNAL`: no core reference.
- `CORE_USER`: one opaque `userId`.
- `CORE_ORGANIZATION`: one opaque `organizationId`.

Contact details, billing address, default currency, and external reference are
Billing-owned. Core identity data is never copied into Billing.

### Catalogue

| Entity  | Role                                   | Example         |
| ------- | -------------------------------------- | --------------- |
| Item    | Reusable good/service document line    | Delivery fee    |
| Product | Subscription-family grouping           | 876 Couriers    |
| Plan    | Product cadence and lifecycle offering | Pro Monthly     |
| Price   | Immutable amount/currency offer        | JMD 5,000/month |

`BillingItem` supports good/service type, SKU, unit, image, description,
default sale/cost amount and currency, and taxability.

`BillingProduct` supports identity, description, type, notification recipients,
future checkout redirect URL, and optional opaque `sourceAppId`. The redirect
URL has no hosted-payment behavior today.

`BillingPlan` supports code, cadence (`DAY`, `WEEK`, `MONTH`, `YEAR` plus
count), optional finite billing cycles, trial days, setup fee, taxability, and
active state. One product can have many plans.

`BillingPrice` supports one-time/recurring type, flat/per-unit/volume/tiered/
package models, currency, amount, cadence, unit name, package size, and future
`BillingPriceTier` rows. Prices are immutable: create a replacement instead of
changing an amount used by a subscriber.

`BillingPlan.entitlementReferenceId` is unique per `[tenant, entitlementReferenceId,
intervalUnit, intervalCount]` (one Billing plan per core plan tier per cadence);
`BillingPrice.entitlementReferenceId` is unique per tenant. Both are opaque strings
added by migration `prisma/migrations/20260710000000_entitlement_references/`.

### Commercial documents

- Quotes and invoices snapshot their lines at creation so catalogue changes do
  not rewrite commercial history.
- New invoices also snapshot customer identity and billing/shipping addresses,
  resolved tax display, notes, terms, line ordering, units, and tax-rate labels.
- `BillingDocumentSequence` allocates tenant-scoped `Q-000001` and
  `INV-000001` numbers. Gaps are valid and never reused.
- Invoices start as `DRAFT` and do not affect receivables until finalization.
  Finalization changes the invoice to `OPEN`, snapshots payment terms and the
  optional salesperson, and posts the customer receivable.
- Invoices can be created from a quote or estimate. Conversion snapshots the
  source lines and is one-to-one.
- Partial allocations produce `PARTIALLY_PAID`; full settlement produces
  `PAID`. Unallocated payments remain customer credit. Finalized documents are
  voided or corrected with credit notes rather than deleted.
- Workspace invoice preferences configure tax-inclusive/exclusive display,
  default notes and terms, sent-header editing, and late-fee policy. Customers
  can override invoice defaults and can be exempted from late fees.
- Late-fee runs are idempotent per source invoice, calculate against the balance
  re-read inside the transaction, and return `hasMore` when the bounded run cap
  is reached.

### Subscriptions

`BillingSubscription` is a commercial agreement and schedule, not a receivable
by itself. A due billing period generates an invoice; invoice finalization is
what increases AR. The subscription stores its billing-cycle anchor, current
service period, next billing time, collection method, payment term, billing
timing, proration policy, discounts, and idempotent billing-run history.

Create rules require active fixed recurring prices sharing one currency and
cadence, including at least one plan-backed price. Item-backed recurring prices
are add-ons; price amount/currency are snapshotted onto subscription items.
Trials move the first billing time to the trial end. Month-end anchors remain
month-end when calendar months have different lengths.

The initial UI creates one-price subscriptions. The API model supports multiple
items so add-ons can be added later without a schema redesign.

## API and client pattern

The standalone FastAPI service owns versioned Billing operations, financial
business logic, provider calls, and database writes. The Billing UI publishes
an authenticated `/api/v1/*` BFF that delegates to `BILLING_API_URL`; it does
not publish a second set of resource route handlers.

FastAPI returns:

```ts
{ data: ResourceOrList, error: null }
{ data: null, error: { code, message } }
```

Browser code uses `src/lib/client/request.ts` through the BFF; reusable
integrations use `@876/billing` directly. Both expose
`client.<resource>.create()`, matching Console. Do not introduce a second
browser result or error shape.

| Canonical route                                              | Methods                          | Purpose                            |
| ------------------------------------------------------------ | -------------------------------- | ---------------------------------- |
| `/api/v1/currencies`                                         | `GET`, `POST`, `PATCH`           | List, enable, set default currency |
| `/api/v1/tax-authorities`                                    | `GET`, `POST`, `PATCH`           | Tenant revenue authorities         |
| `/api/v1/tax-rates`                                          | `GET`, `POST`, `PATCH`           | Effective-dated tax rates          |
| `/api/v1/roles`                                              | `GET`, `POST`, `PATCH`, `DELETE` | Billing-local roles                |
| `/api/v1/members`                                            | `PATCH`                          | Billing-local member grants        |
| `/api/v1/customers`                                          | `GET`, `POST`                    | Customers                          |
| `/api/v1/items`                                              | `GET`, `POST`                    | Items                              |
| `/api/v1/products`                                           | `GET`, `POST`                    | Products                           |
| `/api/v1/plans`                                              | `GET`, `POST`                    | Plans                              |
| `/api/v1/prices`                                             | `GET`, `POST`                    | Prices                             |
| `/api/v1/subscriptions`                                      | `GET`, `POST`                    | Subscriptions                      |
| `/api/v1/quotes`                                             | `GET`, `POST`                    | Quotes                             |
| `/api/v1/invoices`                                           | `GET`, `POST`                    | Invoices and quote conversion      |
| `/api/v1/invoice-preferences`                                | `GET`, `PATCH`                   | Invoice and late-fee policy        |
| `/api/v1/invoice-preferences/assess-late-fees`               | `POST`                           | Bounded late-fee assessment run    |
| `/api/v1/banking/accounts`                                   | `GET`, `POST`                    | Financial accounts                 |
| `/api/v1/banking/accounts/{id}`                              | `GET`, `PATCH`, `DELETE`         | One financial account              |
| `/api/v1/banking/accounts/{id}/transactions`                 | `GET`, `POST`                    | Account entries                    |
| `/api/v1/banking/accounts/{id}/transactions/{transactionId}` | `GET`, `PATCH`, `DELETE`         | One account entry                  |
| `/api/v1/payments/modes`                                     | `GET`, `POST`                    | Tenant payment methods             |
| `/api/v1/payments/modes/{id}`                                | `GET`, `PATCH`, `DELETE`         | One payment method                 |
| `/api/v1/payments`                                           | `GET`, `POST`                    | Received payments and allocations  |
| `/api/v1/payments/{id}`                                      | `GET`, `PATCH`, `DELETE`         | One received payment               |
| `/api/v1/openapi`                                            | `GET`                            | OpenAPI 3.1 integration contract   |

### Internal admin ensure routes

Auth: `x-internal-key` header must match `BILLING_INTERNAL_KEY` (constant-time
compare; empty/unset key rejects all requests). Owned by `@876/billing-api`
admin routes. Contracts: `src/types/sync.ts`. All routes are idempotent
create-or-reconcile:
repeated calls update mutable projection fields without creating duplicates, while
immutable price terms must still match the original price.

| Route                                     | Auth                                    | Purpose                                                        |
| ----------------------------------------- | --------------------------------------- | -------------------------------------------------------------- |
| `POST /api/v1/admin/products/ensure`      | `x-internal-key (BILLING_INTERNAL_KEY)` | Reconcile product; keyed on `sourceAppId`                      |
| `POST /api/v1/admin/plans/ensure`         | `x-internal-key (BILLING_INTERNAL_KEY)` | Reconcile plan; keyed on `entitlementReferenceId` + cadence    |
| `POST /api/v1/admin/prices/ensure`        | `x-internal-key (BILLING_INTERNAL_KEY)` | Reconcile price metadata/status; immutable terms must match    |
| `POST /api/v1/admin/customers/ensure`     | `x-internal-key (BILLING_INTERNAL_KEY)` | Reconcile customer; keyed on `organizationId`                  |
| `POST /api/v1/admin/subscriptions/ensure` | `x-internal-key (BILLING_INTERNAL_KEY)` | Reconcile subscription and items; keyed on `externalReference` |

Each entity owns its own type and Prisma file:

```text
src/types/customer.ts              prisma/schema/customer.prisma
src/types/currency.ts              prisma/schema/currency.prisma
src/types/tax.ts                   prisma/schema/tax.prisma
src/types/access.ts                prisma/schema/access.prisma
src/types/item.ts                  prisma/schema/item.prisma
src/types/product.ts               prisma/schema/product.prisma
src/types/plan.ts                  prisma/schema/plan.prisma
src/types/price.ts                 prisma/schema/price.prisma
src/types/quote.ts                 prisma/schema/quote.prisma
src/types/invoice.ts               prisma/schema/invoice.prisma
src/types/subscription.ts          prisma/schema/subscription.prisma
```

Shared Prisma enums live in `prisma/schema/enums.prisma`; shared primitives
live in focused files such as `src/types/common.ts` and `currency.ts`.

## Sidebar

```text
Home
Customers
Items
Sales
  ├─ Quotes
  └─ Invoices
Subscriptions
  ├─ Products
  ├─ Plans
  └─ Prices
Reports
Settings
```

The nav and route tree keep the two billing domains distinct. Items and Sales
are the invoicing domain: items are one-off goods and services placed on quotes
and invoices. Their pages live at `/items` and `/sales/*`. Subscriptions is the
recurring domain: the group label navigates to `/subscriptions`, and its
children live at `/products`, `/plans`, and `/prices` (products are the
sellable apps; plans and prices define their recurring terms). The App Router
organizes these pages under the URL-neutral `(invoicing)` and
`(subscription-management)` route groups.

Payments and banking have backed service and lifecycle rules. New engine
configuration screens may be introduced incrementally; hosted checkout,
expenses, and the customer portal remain outside the navigation for now.

## Customer and subscription presentation

Subscriptions remain the canonical one-row-per-agreement table. Repeating a
customer is intentional when that customer has several product agreements; the
row identifies the product, plan, recurring amount, cadence, status, and current
period instead of reducing the agreement to an unhelpful label such as “Free.”

Customers are the roll-up view. Each customer row shows subscription and document
counts and links to a customer detail page containing all of that customer's
subscriptions. Every subscription row also links to a dedicated agreement detail
page with items, lifecycle events, IDs, and linked invoice count.

## Reporting definitions

- Contracted recurring revenue: active/trialing subscription snapshots grouped
  by currency. Daily/weekly MRR/ARR is an estimate.
- Issued invoice value: invoices that have advanced from draft.
- Customer lifetime billed and net cash collected are available from auditable
  invoices, payments, and refunds. Revenue recognition and tax filing reports
  remain separate future projections.

## Explicitly not implemented

- Email, PDFs, public documents, customer portal, or hosted payment pages.
- Provider charge adapters, payment methods, hosted payment links, webhook
  processing, or dunning communications.
- Expenses, recurring expenses, journals, or a double-entry general ledger.
- Tax filing, automatic jurisdiction decisions, FX conversion, or revenue
  recognition.
- Automatic Billing-to-core feature flag, user access, or app-access changes.
- Usage metering, price lists, and tier calculation behavior.

## Future order

1. Complete retrieve/update/archive and document/subscription lifecycle actions,
   audit logging, and idempotency keys.
2. **Complete:** publish `@876/billing` with a server-only `/admin` tier and
   versioned `/api/v1` routes. Console imports the package and never accesses
   Billing's database.
3. Define an idempotent Billing-to-core entitlement outbox/reconciler.
4. Select Jamaica-appropriate payment providers before payment features.
5. Approve tax, FX, accounting, and revenue-recognition policy before financial
   operations.
6. Before external SaaS release, add scoped API keys, rate limits, audit logs,
   customer self-service, API docs, and physically isolated Billing infrastructure.

Native/tablet applications are public OAuth clients and must use authorization
code + PKCE through 876 identity; they must never embed `BILLING_INTERNAL_KEY`.
Server-side restaurant/order systems can use a future tenant-scoped secret key
through the same `@876/billing` resource surface after key scopes are defined.
