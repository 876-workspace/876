# 013 — 876 Billing as the Financial + Commercial Data Plane

**Status:** Accepted  
**Date:** 2026-09-07

## Decision

876 Billing is the canonical **financial + commercial data plane** for 876 product applications.

This does not rename the Billing product or require a separate commerce service. It fixes ownership and dependency direction so Billing can serve today's Billing/Invoice products and future Store, Restaurant, POS, Marketplace, Order, Fulfillment, Purchasing, and advanced Inventory experiences without duplicating canonical commercial records.

The current implementation remains a modular monolith in `apps/billing-api`. New commercial capabilities are added as bounded modules only when a real product requirement exists.

## Why now

Billing already owns the canonical finance/catalog records used by more than one product surface:

- Customers;
- Items and Item Variants;
- Item media references backed by 876 Storage;
- Prices and Price Lists;
- Quotes, Invoices, and Credit Notes;
- Payments, subscriptions, tax, and ledger records;
- lightweight Item/Variant stock tracking.

The Item Variant and stock work exposed an architectural coupling that should be removed before additional product types depend on it: stock operations are currently named after Invoice lifecycle operations, and document-line code understands too much about Item/Variant resolution and price fallback.

The architecture therefore moves from:

```text
Invoice
  ├── understands Item/Variant rules
  ├── understands price fallback
  └── directly drives Invoice-named stock operations
```

toward:

```text
Application workflow
  ├── Catalog.resolveSellable()
  ├── Pricing.resolve()
  ├── BillingEngine.calculate()
  ├── Inventory.consume()/restore()
  ├── Ledger
  └── Domain events / idempotency
```

Invoice remains one workflow over those domains.

## Domain map

### Current domains

| Domain         | Current responsibility                                                                          |
| -------------- | ----------------------------------------------------------------------------------------------- |
| Catalog        | Items, Item Variants, options, media relationships, products/addons/plans where currently owned |
| Pricing        | canonical price selection and price-list resolution                                             |
| Inventory      | lightweight Item/Variant stock quantity, availability policy, stock movements, adjustments      |
| Billing Engine | deterministic monetary calculations                                                             |
| Documents      | Quotes, Sales Orders, Invoices, Credit Notes and their lifecycle/snapshots                      |
| Customers      | Billing customer registry and payer relationships                                               |
| Payments       | payment intents/payments/refunds/provider-independent money movement                            |
| Tax            | tax rules/rates and document tax inputs                                                         |
| Ledger         | durable financial movement lines                                                                |
| Commercial     | payment terms, salespeople and other commercial configuration                                   |

### Reserved future bounded domains

These names document insertion points only. They do **not** authorize tables, routes, SDK resources, folders, or UI until a real product requirement exists:

- Channels;
- Fulfillment;
- Purchasing;
- advanced Inventory.

## Canonical commercial ownership

An organization has one canonical Billing catalog/data plane.

```text
Organization
  └── Billing tenant
       ├── Customer
       ├── Item
       │    └── Variant
       ├── Price
       ├── Inventory state
       ├── Quote / Invoice / Credit Note
       ├── Payment
       └── Ledger
```

A product application must not create a second canonical copy of these resources.

### Future Restaurant application

Restaurant-specific resources may include:

- Menu;
- Menu Section;
- Menu Assignment;
- Table / Seat;
- Kitchen Station / Kitchen Ticket;
- Dining Option;
- preparation state.

A menu assignment points at a Billing sellable by opaque `itemId` and optional `variantId`. Restaurant does not own `restaurant_products` as a competing commercial catalog.

### Future Store application

Store may own storefront presentation such as pages, SEO, collections, merchandising, theme, navigation, search presentation, and listings. Store listings point at canonical Billing sellables.

### Future Marketplace

Marketplace may own marketplace listings/offers, moderation, marketplace taxonomy, seller publication state, discovery/ranking metadata, and marketplace-specific presentation. Seller Items remain organization-owned Billing catalog records.

## Shared commercial contracts

Billing introduces a small server-only commercial kernel. It is not a generic `common` dumping ground.

### `SellableReference`

Current sellables are:

```ts
interface SellableReference {
  itemId: string
  variantId: string | null
}
```

Callers do not need to understand `Item.variantMode` to sell an Item.

### `StockTarget`

Inventory receives a stock target rather than Invoice-specific Item/Variant arguments:

```ts
type StockTarget =
  { type: 'item'; id: string } | { type: 'variant'; id: string }
```

Today's implementation may still persist quantities on `Item` and `ItemVariant`. That physical storage is transitional and hidden behind Inventory ownership.

### `ResourceReference`

Commercial side effects identify their source independently from their semantic action:

```ts
interface ResourceReference {
  type: string
  id: string
}
```

Examples today are `invoice`, `stock-adjustment`, and similar existing resources. A future `order` reference requires no Inventory API redesign.

### `CommerceContext`

Server-side domain calls may carry contextual information such as tenant, actor, origin, customer and currency. `channelId` and `locationId` are reserved contextual seams only; this decision does not create Channel/Location persistence.

## Catalog responsibility

Catalog answers:

> What exactly is being sold?

`Catalog.resolveSellable()` is the canonical Item/Variant resolution path. It validates Item/Variant ownership and active state and returns canonical identity, SKU, unit/tax metadata, media fallback, pricing reference and stock target.

Catalog does not consume stock, calculate complete document totals, finalize invoices, or understand Restaurant/Store workflows.

## Inventory responsibility

Inventory owns all mutation and interpretation of stock state.

Current Inventory scope remains deliberately lightweight:

- track/not-track policy;
- current Item/Variant quantity;
- low-stock threshold;
- allow-out-of-stock policy;
- availability checks;
- manual adjustments;
- stock movements;
- consume/restore behavior.

Inventory operations are generic:

```text
checkAvailability
adjust
consume
restore
```

They receive a `ResourceReference` describing the caller. Inventory does not know Invoice lifecycle rules.

### Future Inventory evolution

Current:

```text
Sellable -> StockTarget -> quantity
```

Future, only when required:

```text
Sellable
  -> InventoryRequirement
  -> InventoryItem
  -> InventoryLevel
  -> StockLocation
```

No caller may assume one Sellable will forever equal one mutable integer quantity field.

## Pricing responsibility

Pricing answers:

> What does one unit of this sellable cost in this context?

Pricing resolution is separate from monetary total calculation. Current resolution may consider Item/Variant defaults, explicit Price resources and Price Lists. Future contextual adjustments such as promotions, customer groups, sales channels or locations may enter the pipeline later without changing Document/Order callers.

Billing Engine remains the deterministic calculator for subtotals, discounts, tax and totals after price inputs are resolved.

## Commercial line snapshots

Quote, Invoice and Credit Note persistence remains separate, but they resolve from one internal commercial-line contract.

Historical documents render from immutable snapshots. Changing Item/Variant names, SKU, pricing, tax or media later must not rewrite a finalized historical document.

## Application workflows

Multi-domain business operations belong in explicit service/application workflows, not repositories.

For Invoice finalization:

```text
validate lifecycle
  -> resolve lines
  -> validate pricing/tax snapshots
  -> Inventory.consume
  -> finalize document
  -> Ledger effects
  -> domain events
  -> commit
```

For Invoice void:

```text
validate lifecycle
  -> reverse accounting effects
  -> Inventory.restore
  -> domain events
  -> commit
```

Repositories never coordinate another bounded domain directly.

## Transactions

Cross-domain workflows use one Billing-owned transaction boundary. The transaction seam exists to ensure one atomic unit for current real workflows, not to create a generic framework.

Only repositories may own Prisma access. Cross-module service APIs may accept/use a transaction context through the established transaction infrastructure, but modules must not import another module's repository.

## Idempotency

Billing already owns canonical JSON hashing and source-app idempotency behavior. This decision extends that existing ownership rather than creating a second canonicalization implementation.

High-value commands may use persisted command replay keyed by tenant + operation + idempotency key. Same key plus the same request returns the same result; same key plus a different request hash is a conflict.

Idempotency infrastructure is added only for real current commands; it must not create speculative Order/Checkout behavior.

## Domain events

Billing records durable domain/integration events transactionally with the mutation they describe. An event must not claim a state change that rolled back.

Internal domain events and stable integration events are separate concepts. External product apps consume stable versioned event envelopes, not implementation-specific repository events.

Only events for existing real behavior are created. This decision does not invent `order.*` or `fulfillment.*` events.

## Storage

876 Storage remains the file owner.

Billing stores only opaque `fileId` references and Item/Variant media relationships. R2 keys, bucket identity and provider URLs never become canonical Billing data.

Future Billing-consuming apps use one Billing-owned Item-media workflow rather than each recreating Storage business orchestration. Browser bytes still upload directly to R2 through Storage-signed URLs; Billing never proxies file bytes.

## Capabilities

Domain existence is separate from organization usage.

Current capabilities may include concepts such as Item Variants or stock tracking and map onto existing module/preference contracts. Future capability namespaces may be documented but must not be seeded or exposed until implemented.

A module preference is not a feature flag.

## Public SDK boundary

`@876/billing` remains the bounded product SDK. Internal contracts such as `StockTarget`, transaction context, outbox rows and Unit of Work are server implementation details and do not leak into public SDK resources.

Future resource namespaces such as `billing.orders.*` are added only when the corresponding domain exists.

## Provider boundary

External processors/accounting/storage providers remain adapters. Provider DTOs/statuses/IDs do not become canonical Billing domain identity or vocabulary.

## Compatibility

This architecture refactor must preserve current public Billing API v1 contracts and first-party Billing/Invoice behavior unless a coordinated compatibility migration is explicitly required.

Internal APIs may change aggressively to establish the new ownership boundaries.

## Explicitly deferred

This decision does not implement:

- carts or checkout;
- warehouses/locations;
- inventory reservations/transfers;
- purchase orders;
- fulfillment/shipments;
- sales channels;
- menus/kitchen workflows;
- modifiers/bundles/combos;
- marketplace listings/offers;
- advanced inventory accounting/costing.

## Consequences

### Positive

- future products reuse canonical commercial truth;
- Invoice is no longer a dependency of Inventory semantics;
- Item/Variant behavior has one resolver;
- pricing can evolve independently from documents;
- stock persistence can evolve without redesigning every caller;
- Store/Restaurant/Marketplace apps can own presentation/workflow projections without duplicating catalog and finance data;
- future Orders can be added as a bounded domain instead of a platform rewrite.

### Costs

- deeper internal module boundaries add explicit service calls;
- current stock persistence remains temporarily located on catalog-owned tables even though Inventory owns mutations;
- some legacy public contracts remain intentionally less elegant than the new internal architecture;
- event/idempotency infrastructure adds operational tables that require monitoring and cleanup policies.

## Superseded generic example

`platform-services.md` historically listed `commerce/orders` as an example of a possible future shared service. For canonical commercial resources described by this ADR, that generic example is superseded: **Billing is the shared bounded service**. A future product-specific domain that is not canonical commercial truth may still be its own service under the normal platform-services placement rules.
