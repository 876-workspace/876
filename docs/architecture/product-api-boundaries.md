# Product-owned API boundaries

## Decision

First-party 876 product applications expose an application-owned API surface to their own frontend. A dedicated backend service remains the canonical data/business-logic owner, but its URL topology, service credentials, and cross-product authorization model do not leak into product feature code.

The browser should read like the product is speaking to itself:

```text
Invoice browser -> /api/customers -> Invoice server boundary -> Billing integration API
Billing browser -> /api/customers -> Billing server boundary -> Billing tenant API
```

The standalone Billing service keeps its canonical versioned API. This decision removes only the versioned/gateway aliases from the Next.js product applications.

## Public application vocabulary

Product browser requests use resource-oriented, same-origin URLs:

```text
/api/customers
/api/customers/:customerId
/api/items
/api/invoices
/api/payments
```

Domain commands remain resource-oriented when they are implemented, for example:

```text
POST /api/invoices/:invoiceId/finalize
POST /api/invoices/:invoiceId/void
```

A product app does not publish `/api/v1/*`, `/api/billing-gateway/*`, or Billing integration paths as its frontend contract.

## Route registration

Each top-level product capability is registered explicitly under `app/api/<resource>`. The current implementation uses a resource-scoped optional path handler beneath that named resource so existing nested Billing actions continue to pass through without recreating a service-wide arbitrary gateway.

This is intentionally different from the retired global `billing-gateway/[...path]`: the browser cannot select a top-level Billing resource that the product has not registered.

Do not add placeholder routes for planned features. A future capability receives an application route only after the backend capability and authorization contract exist.

## Server-side access

Server Components do not HTTP-loop back through the application's own API. They use a request-scoped product facade.

Invoice's facade binds the active organization to the approved `@876/billing/integration` resources so feature pages call:

```ts
const invoice = await getInvoice()
await invoice.customers.list()
await invoice.items.retrieve(itemId)
```

Feature pages do not construct the Billing integration client or pass the organization ID into Billing service paths.

## Authorization remains service-specific

A clean product API surface does not merge authorization models.

Billing app routes authenticate with the signed-in Billing user's access token and active Billing organization. Billing API tenant permissions remain authoritative.

Invoice app routes authenticate the user to Invoice, then authenticate the server-to-server hop as the Invoice product app. Billing integration scopes and the active app finance connection remain authoritative. Invoice does not gain access merely because a user is or is not a Billing workspace member.

## Current Invoice finance resources

Invoice currently registers the finance resources already supported by the Billing integration client:

- bank accounts;
- customers;
- invoices;
- items;
- payment modes;
- payments.

When Invoice later needs another shared finance resource, add the Billing integration endpoint/scope and typed integration resource first, then register the Invoice app route and bind it on the server facade.

## Current Billing browser resources

Billing registers each resource already represented by its browser client, including sales documents, customer/catalog resources, banking, payments, subscriptions, roles/members, taxes, currencies, and related settings. Product-local protocol routes such as auth and team invites keep their existing product-specific handlers.

## Regression contract

Tests must prevent the old topology from returning. At minimum:

1. Next.js product configs must not rewrite `/api/v1/*` to a Billing gateway.
2. Product apps must not contain a global `billing-gateway/[...path]` handler.
3. Browser resources must have named app-owned routes.
4. Billing browser transport must resolve legacy versioned client constants to the app-owned URL while those constants are migrated incrementally.
5. Invoice feature routes must not construct the Billing integration client directly.
6. Billing API permissions and integration scopes remain the final authorization boundary.
