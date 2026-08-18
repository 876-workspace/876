# Product API Boundary Rules

Read this before adding or changing data access in a first-party 876 product app that is backed by a dedicated service, including `apps/billing` and `apps/invoice`.

## Core Rule

**A product app must present its own API and resource vocabulary to its own frontend. Dedicated service topology is a server-side implementation detail.**

Browser-visible requests use product-owned URLs:

```text
/api/customers
/api/customers/:id
/api/invoices
/api/invoices/:id
```

Do not expose service-oriented URLs from a Next.js product app:

```text
/api/v1/*
/api/billing-gateway/*
/api/integrations/*
```

The standalone service may continue to expose versioned and integration routes on its own origin. The rule applies to the product application boundary, not to the service API itself.

## Browser Boundary

- Browser code calls the product's typed `src/lib/client` resources.
- Those clients must resolve to same-origin `/api/<resource>` URLs.
- Do not add a Next.js rewrite that aliases `/api/v1/*` to another service.
- Do not add a global `[...path]` gateway that lets the browser choose an arbitrary top-level service path.
- A resource-scoped optional path route such as `app/api/customers/[[...path]]/route.ts` is allowed only when the top-level resource is fixed in server code and the backend remains the authoritative operation/permission boundary.
- Register each top-level resource explicitly. Adding a backend route does not automatically expose it through a product app.

## Server Component Boundary

Server Components must not HTTP-loop back through their own `/api` routes, and feature code must not construct cross-service clients directly.

Use a request-scoped product facade instead:

```ts
const invoice = await getInvoice()
const customers = await invoice.customers.list()
```

The facade may bind organization context and call the formal service client internally. Feature pages should not need to know service URLs, integration paths, API keys, or organization path parameters.

## Route Handler Responsibilities

Product route handlers are transport adapters only. They may:

- validate the product session;
- resolve the active organization/workspace;
- resolve the request ID;
- select the product's approved service credential;
- forward request/response bodies and approved transport headers.

They must not own financial/domain business logic, database access, or provider logic. Those remain in the dedicated backend service.

## Billing vs Invoice Authorization

The same public app route may use different internal authorization models.

### `apps/billing`

- Uses the signed-in Billing user's access token.
- Resolves `billing_active_org` with the session organization as fallback.
- Calls tenant Billing API resources such as `/api/v1/customers`.

### `apps/invoice`

- Validates the Invoice user session first.
- Authenticates the server-to-server hop as the 876 Invoice product app.
- Calls Billing's formal integration boundary under the active organization.
- Authorization is determined by the Invoice finance connection and published Billing integration scopes, not by a Billing workspace `Member` row.

Do not collapse these authorization models merely because both apps expose `/api/customers`.

## Adding a New Shared Finance Capability

When a first-party product needs a Billing capability that is not exposed yet:

1. Add or verify the canonical operation in `apps/billing-api`.
2. Add the formal integration endpoint and scope if the caller is another product app.
3. Add the typed operation to `@876/billing` or `@876/billing/integration` as appropriate.
4. Add the product's named `/api/<resource>` boundary.
5. Add/bind the resource on the product's server facade.
6. Add/update the product browser client when client-side interaction is needed.
7. Add boundary and authorization regression tests.

Do not create placeholder `501 Not Implemented` product endpoints for future ideas. Future-proof the naming and boundary rules; expose a route only when the capability exists.

## Regression Requirements

Product apps using this architecture should test that:

- no `/api/v1` rewrite exists in the Next.js app;
- no global service gateway exists;
- every browser resource has an app-owned route;
- browser transport resolves to `/api/<resource>`;
- feature routes do not construct cross-service clients directly;
- the backend still enforces tenant permissions or integration scopes.
