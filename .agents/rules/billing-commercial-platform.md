# Billing Commercial Platform

Read this before changing Billing Catalog, Pricing, Inventory, Documents, commercial transactions, Item/Variant media workflows, or before creating a product app that consumes Billing commercial data.

This rule is companion to `billing-data-plane.md`, `platform-services.md`, `express-api.md`, `sdk-conventions.md`, `module-settings.md`, and `storage-architecture.md`.

## Position

**876 Billing is the canonical financial + commercial data plane for 876 product applications.**

Billing remains one modular bounded service (`apps/billing-api`) with internal bounded domains. A future Store, Restaurant, POS, Marketplace, or other product consumes Billing commercial resources instead of creating competing canonical copies.

The generic `commerce/orders` example in `platform-services.md` is superseded for canonical commercial resources: Sales Orders are implemented in Billing; future Channels, Fulfillment, Purchasing, and advanced Inventory belong inside the Billing commercial plane when they are actually implemented. Product-specific operational domains that are not canonical commercial truth still follow the normal platform-services placement rules.

## Canonical ownership

Billing owns shared commercial truth such as:

- Customers and payer relationships;
- Items, Item Variants, options and Item/Variant media relationships;
- Prices and Price Lists;
- current lightweight stock state and movements;
- Quotes, Invoices and Credit Notes;
- payments, subscriptions, tax and ledger records.

A product app must not create its own canonical duplicate of these resources.

Future app-specific projections are allowed and expected:

- Restaurant may own Menu/MenuSection/MenuAssignment, Table/Seat, KitchenStation/KitchenTicket and preparation state, pointing to Billing sellables by opaque ID.
- Store may own storefront pages, collections presentation, SEO, merchandising, navigation, theme and listing presentation, pointing to Billing sellables by opaque ID.
- Marketplace may own listing/offer publication, moderation, marketplace taxonomy, discovery/ranking and marketplace presentation, pointing to seller-owned Billing sellables by opaque ID.

Never create `restaurant_products`, `store_products`, or `marketplace_products` as competing catalog masters.

## Current vs future domains

Current Billing domains include Catalog, Pricing, lightweight Inventory, Billing Engine/calculation, Documents, Customers, Payments, Tax, Ledger and Commercial configuration.

Reserved future boundaries include Channels, Fulfillment, Purchasing and advanced Inventory. Sales Orders are a Billing Documents resource; carts and checkout remain deferred.

**A reserved future boundary is documentation only.** Do not create empty folders, tables, routes, SDK namespaces, settings, events or UI for it until a real feature is being implemented.

## Domain direction

Invoice is a consumer of the commercial platform, not the center of it.

Application workflows orchestrate public domain APIs:

```text
Workflow
  -> Catalog
  -> Pricing
  -> Billing Engine
  -> Inventory
  -> Ledger
  -> Events
```

Repositories do not coordinate another domain. Cross-module imports use the owning module's `index.ts` public API only.

## Shared server contracts

Keep a deliberately small server-only commercial kernel for concepts whose centralized definition preserves an invariant:

- `CommerceContext` — tenant plus trusted actor/origin and optional commercial context;
- `ActorContext` — authenticated user/service/app attribution;
- `ResourceOrigin` — source app/external-system provenance;
- `ResourceReference` — `{ type, id }` source of a side effect;
- `SellableReference` — current `{ itemId, variantId }` selection;
- `StockTarget` — Inventory-owned stock subject.

Do not turn the kernel into a generic helpers/common package. Domain-specific schemas/types stay with their owning module/package.

`channelId` and `locationId` may exist as optional context seams before those future domains exist, but that does not authorize Channel/Location persistence.

## Catalog

Catalog answers **what is being sold**.

There must be one canonical `resolveSellable()` path for Item/Variant selection. It owns:

- Item existence/tenant isolation;
- active/sellable state;
- Variant-required and Variant-belongs-to-Item validation;
- canonical Item/Variant name and SKU;
- unit/tax metadata;
- media fallback identity;
- pricing reference;
- stock-target identity.

Catalog does not consume stock, finalize documents, calculate full transaction totals, or implement Store/Restaurant workflows.

## Inventory

Inventory owns all mutation and interpretation of stock state, even while current physical quantity columns remain on Item/ItemVariant tables.

Current lightweight scope only:

- track/not-track policy;
- current quantity;
- low-stock threshold;
- allow-out-of-stock policy;
- availability checks;
- manual adjustments;
- stock movements;
- consume/restore behavior.

Generic Inventory operations are `checkAvailability`, `adjust`, `consume`, and `restore`. They receive a generic `ResourceReference`; Inventory must not know Invoice lifecycle semantics.

Do not add advanced Inventory resources until required.

Future evolution may become:

```text
Sellable
  -> InventoryRequirement
  -> InventoryItem
  -> InventoryLevel
  -> StockLocation
```

No current caller may assume one Sellable will forever equal one mutable integer quantity field.

## Pricing

Pricing answers **what one unit costs in this context**.

Central price resolution may currently consider Item/Variant defaults, explicit Price resources and Price Lists. It is separate from document/transaction total calculation.

Billing Engine remains the deterministic calculation owner for subtotal, discount, tax and total arithmetic once price inputs are resolved.

Do not build promotions/channel/location pricing merely because the resolver can support them later.

## Commercial line snapshots

Quote, Invoice and Credit Note persistence remain separate resources, but line construction should share one internal commercial-line resolution contract.

Finalized historical records render from snapshots, never live Item/Variant/Price/Tax rows.

## Application workflows

Multi-domain lifecycle operations live in explicit service/application workflows, not repositories.

Invoice finalization and void are the first reference workflows. They coordinate current real domains inside one transaction and call each domain through its public API.

Do not build a generic workflow/state-machine framework. Add the smallest explicit workflow needed by real behavior.

## Transactions

Cross-domain workflows use one Billing-owned transaction seam. Only repositories import/use Prisma persistence directly according to `express-api.md`; modules must not import another module's repository.

Avoid a god Unit of Work or factory whose only purpose is renaming Prisma. Add transaction composition only where it centralizes real multi-domain behavior.

## Idempotency

Reuse Billing's existing canonical JSON/idempotency hashing. Never create a second request-hash implementation.

Persisted command idempotency, where added, is tenant + operation + key scoped:

- same key + same canonical request -> replay the same outcome;
- same key + different canonical request -> conflict;
- never global across tenants.

Adopt it for high-value real commands before broad CRUD. Do not invent Checkout/Order semantics.

## Events

A durable domain/integration event describing a mutation must be recorded atomically with that mutation. An event must not claim a change that rolled back.

Internal domain events and stable versioned integration events are different contracts. Product apps integrate against the stable envelope, not repository implementation details.

Only emit events for behavior that exists. Do not create future `order.*`, `fulfillment.*`, `channel.*`, or similar events early.

## Storage/media

876 Storage owns File identity, object bytes, upload verification, R2 and delivery policy. Billing owns Item/Variant media relationships and stores opaque `fileId` references only.

Future Billing-consuming apps must reuse the Billing-owned Item-media workflow rather than recreate Storage business orchestration in every host.

The browser still uploads bytes directly to R2 with a Storage-signed URL. Billing never proxies binary upload bytes.

## Capabilities

Domain existence is independent from organization usage.

Existing module/preferences are the source of truth for current opt-in capabilities such as Item Variants. Centralize capability evaluation where it prevents duplicate policy checks; do not aesthetically rename persisted keys.

Future capability namespaces may be documented but must not be seeded/evaluated as live capabilities before the feature exists.

Modules/preferences are not feature flags.

## SDK boundary

`@876/billing` remains the explicit bounded Billing product client. Internal types such as `StockTarget`, transaction context, outbox rows and persistence ports do not leak into public SDK resource contracts.

Do not add empty future `billing.orders`, `billing.inventory`, `billing.fulfillments`, or `billing.channels` namespaces before those resources exist.

## Provider boundaries

Processors, accounting providers and 876 Storage remain adapters. Provider DTO fields/statuses/IDs do not become canonical Billing domain vocabulary or identity.

## Compatibility

Architecture refactors preserve existing Billing v1 public contracts and first-party Billing/Invoice behavior unless a coordinated compatibility migration explicitly says otherwise.

Internal APIs may change aggressively to establish correct ownership.

## Do not

- Do not make Invoice-specific behavior the Inventory API.
- Do not let Catalog repositories mutate Inventory as a business operation.
- Do not let Documents import Catalog/Inventory/Pricing repositories.
- Do not duplicate Item/Variant resolution in each workflow/app.
- Do not duplicate pricing resolution in each document type/app.
- Do not let product apps become canonical owners of Billing commercial records.
- Do not create speculative future commerce tables/routes/SDK namespaces/UI.
- Do not persist R2 keys/provider URLs as Billing media identity.
- Do not create a second idempotency canonicalization implementation.
- Do not emit integration events outside the transaction that commits the state they describe.

See `docs/architecture/013-billing-commercial-platform.md` for the full decision and future insertion examples.
