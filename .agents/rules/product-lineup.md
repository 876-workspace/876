# Finance & Commerce Product Lineup

Read this before adding a finance, subscription, inventory, storefront or
marketplace product, before splitting or renaming a finance app, and before
deciding which app or service a money/commerce capability belongs to. The full
decision, market evidence and open questions are in
`docs/architecture/025-finance-and-commerce-product-lineup.md`.

## The lineup

| Product         | Purpose                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| 876 Invoice     | Basic invoicing (a deliberately reduced Books)                                                               |
| 876 Books       | Bookkeeping & accounting: banking, expenses, vendors, purchases, payroll, sales orders, ledger, tax, reports |
| 876 Billing     | Subscription management: plans, prices, subscriptions, dunning, hosted checkout, subscriber portal           |
| 876 Inventory   | Stock, warehouses, sales-order fulfillment (pick/pack/ship), purchase orders                                 |
| 876 Commerce    | A merchant's own store: storefront, themes, custom domains, cart, checkout                                   |
| 876 Marketplace | The global 876 store: listings, discovery, reviews, the buyer's combined order                               |

Products are doors onto shared data, never silos with their own copy of it.

## Placement rules

1. **One financial plane.** `apps/billing-api` holds the canonical customers,
   catalog, prices, sales orders, documents, payments, subscriptions, tax, stock
   and ledger for **every** product above. See `billing-commercial-platform.md`.
2. **Service names are not product names.** `billing-api`, `@876/billing` and
   `@876/billing-ui` mean "the financial plane". Do not rename them or persisted
   module keys to match a product.
3. **Commerce and Marketplace are separate services when built.** They own only
   storefront/presentation, cart and checkout-session state (Commerce), and
   listings, discovery, reviews and buyer orders (Marketplace). They create
   customers, sales orders and payments through the financial plane's `service`
   entrypoint and reference them by opaque ID.
4. **Listing on the marketplace creates a pointer, never a copy.** A listing
   references the seller's Item. One buyer checkout creates one sales order per
   seller organization.
5. **One subscription engine.** SaaS subscriptions (Billing) and subscribe & save
   (Commerce/Marketplace) use the same engine. A cycle produces an invoice, or a
   sales order that Inventory fulfills. No product gets subscription tables.
6. **Charging and shipping hand off at the sales order.** Billing/Books own the
   charge and the invoice. Inventory owns picking, packing and shipment.
7. **Each product lists what it created. Books sees all financial records.** This
   is the same visibility rule customers follow (`customer-architecture.md`).

## Do not

- Do not create per-product customers, catalog, orders, invoices or subscription
  tables.
- Do not build a second subscription or recurring-order engine.
- Do not put storefront, cart, checkout-session or marketplace-discovery state in
  `billing-api`.
- Do not build Commerce, Marketplace, Inventory, or the Books/Billing app split
  ahead of a real requirement. This rule fixes placement only.
- Do not design marketplace seller payouts without first revisiting the
  "do not copy Stripe Connect" line in `billing-data-plane.md`.
