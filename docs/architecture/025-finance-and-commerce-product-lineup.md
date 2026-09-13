# 025 — Finance and Commerce Product Lineup

**Status:** Accepted
**Date:** 2026-09-13
**Builds on:** [013 — Billing as the Financial + Commercial Data Plane](./013-billing-commercial-platform.md)

## Decision

876 separates its money and commerce offering into **focused products** that
all run on **one shared financial data plane**.

```text
Products (what an organization turns on)
  876 Invoice      basic invoicing
  876 Books        bookkeeping & accounting
  876 Billing      subscription management
  876 Inventory    stock, sales-order fulfillment, purchasing
  876 Commerce     a merchant's own online store
  876 Marketplace  the global 876 store
  (876 CRM, 876 Couriers, … plug into the same data)

Services (what those products run on)
  Financial plane  apps/billing-api    — shared by every product above
  Commerce service (future)            — storefronts, carts, checkout
  Marketplace service (future)         — multi-seller discovery and buyer orders
```

A product is a door onto shared data, not a silo with its own copy of it.

## Context

The 876 Billing app had grown to hold invoicing, subscriptions, banking,
payroll, purchases and, next, sales orders. Meanwhile the platform's direction is
ecommerce: merchants launching their own stores (eventually on their own
domains), listing on a global 876 marketplace with one click, and offering
Amazon-style "subscribe & save".

Two failure modes were on the table:

1. **One overcrowded app.** Billing becomes Books + Billing + Shopify in one
   navigation tree, hard to sell, price, or learn.
2. **Isolated products.** Commerce or Marketplace build their own customers,
   catalog, orders and subscriptions, and the organization reconciles them by
   hand. That is the single-use product pattern the platform deliberately avoids
   (see CRM being integrated into Invoice and Billing).

### Market evidence (researched 2026-09-13)

- **Zoho** sells Invoice, Books, Billing, Inventory and Commerce separately on
  one organization and data set. Its help centre states that
  [Zoho Commerce is built on top of Zoho Inventory and Zoho Books](https://www.zoho.com/commerce/kb/integrations/integrate-inventory-books-org/).
  Commerce items sync as Books items, and store orders sync as sales orders.
- **Zoho Billing** sells physical-product subscriptions (subscription boxes, wine
  clubs) with hosted checkout pages that capture shipping addresses. It does
  **not** fulfill: per its
  [Inventory integration](https://www.zoho.com/en-sg/billing/help/integrations/zoho-inventory.html),
  orders are confirmed and shipped "in Zoho Inventory using sales orders,
  packages, and shipments, while invoices continue through Zoho Billing".
- **Shopify** lists one catalog on external marketplaces through
  [Marketplace Connect](https://apps.shopify.com/marketplace-connect) and runs
  its own merchant marketplace, the [Shop app](https://apps.shopify.com/shop).
  Its subscriptions attach selling plans to products, and each billing attempt
  creates an order.

The pattern is consistent: separate products, shared records, and a clear
handoff between charging (finance) and shipping (fulfillment).

## The products

| Product             | Owns the experience of                                                                                                           | Does not own                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **876 Invoice**     | Quotes, invoices, payments received, basic items/customers                                                                       | Accounting, subscriptions, stock                                    |
| **876 Books**       | Everything in Invoice plus banking, expenses, vendors, bills, purchases, payroll, sales orders, ledger, tax, financial reports   | Subscription plans, storefronts                                     |
| **876 Billing**     | Plans, prices, subscriptions, recurring billing, dunning, usage/metered billing, hosted checkout pages and the subscriber portal | Ledger/banking (Books), shipping (Inventory), storefront (Commerce) |
| **876 Inventory**   | Stock levels, warehouses, picking/packing/shipments against sales orders, purchase orders and goods received                     | Invoices and payments                                               |
| **876 Commerce**    | Storefront, themes, custom domains, collections/SEO, cart, checkout                                                              | Canonical items, prices, orders, invoices, subscriptions            |
| **876 Marketplace** | Buyer-facing global store: listings, discovery/search, reviews, the buyer's combined order                                       | Sellers' catalogs and their per-seller orders                       |

Invoice remains a deliberately reduced Books. An organization may run any
combination; data entered in one appears in the others immediately because it is
the same record.

## The data plane stays whole

`apps/billing-api` is the **financial plane** for all six products. It keeps the
canonical records defined in 013: customers, items/variants/options/media,
prices and price lists, sales orders, quotes, invoices, credit notes, sales
receipts, payments, subscriptions, tax, stock quantities and movements, and the
ledger.

- The service and package names (`billing-api`, `@876/billing`,
  `@876/billing-ui`) are **not** renamed. They are durable identifiers, and a
  rename buys nothing. Read "billing" in those names as "the financial plane", not
  "the Billing app".
- Fulfillment, purchasing and advanced inventory join this plane as domains when
  876 Inventory is built. That is consistent with 013, and they are not a separate
  service.

## Services that will be separate, and why

Commerce and Marketplace become **their own services** when they are built,
because their workload is unlike back-office finance:

- public, anonymous, read-heavy traffic that is edge-cached;
- shoppers are consumer 876 accounts, not organization members;
- carts and checkout sessions are transient, high-churn state;
- storefront and discovery ship on a faster cadence than accounting.

They own only their operational and presentation data, and reference financial
records by opaque ID (`platform-services.md`):

- **Commerce service:** storefront pages, themes, domains, collections, cart,
  checkout session. A completed checkout calls the financial plane's `service`
  entrypoint to create the customer (if needed), the sales order and the payment.
- **Marketplace service:** listings (a pointer to a seller's item plus
  marketplace-specific fields), moderation, taxonomy, search index, reviews, and
  the buyer's combined order. One buyer checkout creates **one sales order per
  seller**, each in that seller's organization.
- "Sell on the global store with one click" is creating a listing that points at
  an existing item. Nothing is copied.

## Subscriptions are one engine

There is **one** subscription engine, in the financial plane. No product gets its
own subscription tables.

|                     | SaaS subscription | Subscribe & save                                                   |
| ------------------- | ----------------- | ------------------------------------------------------------------ |
| Surfaced by         | 876 Billing       | 876 Commerce / Marketplace checkout; also 876 Billing hosted pages |
| Each cycle produces | an **invoice**    | a **sales order**, fulfilled by 876 Inventory, plus its invoice    |
| Offered through     | plans and prices  | a selling option (interval + discount) on an Item/Variant          |

Planned extensions, built only when subscribe & save is real work:

1. A per-subscription **cycle output** setting: `invoice` (today) or
   `sales-order`.
2. **Selling options** on Items/Variants in catalog/pricing, next to price lists.

Subscription items already reference `Price`, and prices can reference Items, so
both extensions build on the existing model.

Each product lists the subscriptions it created. The finance view (Books) sees
every resulting invoice, order and payment, whichever product created them. This
is the same visibility rule customers follow (`customer-architecture.md`).

## Consequences

### Immediate

- The Sales Orders work in progress (`feature/billing-commercial-engine`) is
  unaffected. Sales orders belong in the financial plane.
- No app split is performed yet. The split happens in its own run.

### When the Billing app is split

- The current `apps/billing` becomes two products: **Books** (accounting,
  banking, purchases, payroll, sales orders) and **Billing** (subscriptions).
  Because screens are already shared panels in `@876/billing-ui`, the split is
  mostly navigation, module catalogs, entitlements and page composition.
- New app identities and module registries are added in `@876/core/modules`.
  Existing persisted module and permission keys are migrated only through the
  durable-identifier procedure in `module-settings.md`.
- `finance-app-parity.md` is rewritten from a two-app model (Invoice ⊂ Billing)
  to the lineup above: Invoice ⊂ Books, with Billing, Inventory, Commerce and
  Marketplace as siblings on the same plane.

### Open questions (decide before the relevant build)

- **Marketplace payouts.** A marketplace collects once and pays many sellers.
  `billing-data-plane.md` currently says "do not copy Stripe Connect". That rule
  must be revisited with a split-payment/payout design, and it depends on which
  Jamaican acquirers can split or hold funds.
- **Where Inventory's UI lives first.** It may start as a Books module before
  becoming its own product. The data placement above does not change either way.
- **Custom domains** for Commerce storefronts, including TLS and routing on
  Cloudflare. That is a Commerce service design, not a financial-plane concern.

## Do not

- Do not give Commerce, Marketplace, Inventory or any product its own customers,
  catalog, orders, invoices or subscription tables.
- Do not build a second subscription or recurring-order engine.
- Do not put storefront, cart, checkout-session or marketplace-discovery state in
  `billing-api`.
- Do not rename `billing-api`, `@876/billing` or persisted Billing module keys to
  match product names.
- Do not build Commerce, Marketplace, Inventory or the app split ahead of a real
  requirement. This document fixes placement only.
