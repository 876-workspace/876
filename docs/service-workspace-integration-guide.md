# Service workspace integration guide

This guide is the implementation contract for exposing one 876 service inside
another 876 product without accidentally granting the service's standalone
product entitlement.

The first concrete service using the terminology is CRM. No product other than
Console is wired to embedded CRM by this change; the examples below describe the
required pattern for a later implementation.

Read first:

- `CLAUDE.md`
- `docs/architecture/018-product-entitlements-and-service-workspaces.md`
- `.claude/rules/platform-services.md`
- `.claude/rules/access-tiers.md`
- `.claude/rules/product-api-boundary.md`
- `.claude/rules/app-api-routing.md`
- `.claude/rules/sdk-conventions.md`
- `.claude/rules/workspace-control-plane.md`

## 1. Identify the four separate things

Before writing code, name each explicitly:

```text
host product entitlement
service workspace
service connection/scopes
embedded UI surface
```

Example for a future Couriers + CRM integration:

```text
host product       876 Couriers
host entitlement   subscription to 876-couriers
service            CRM
service workspace  courier organization's CRM tenant
connection         Couriers -> CRM, org-scoped
surface            package/customer Requests panel
```

There is **no** `876-crm` entitlement in that list.

## 2. Ensure infrastructure without granting the product

CRM's operator lifecycle client is:

```ts
import { create876CrmWorkspaceClient } from '@876/crm'

const crmWorkspace = create876CrmWorkspaceClient({
  baseUrl: process.env.CRM_API_URL,
  internalKey: process.env.CRM_INTERNAL_KEY,
})

const result = await crmWorkspace.ensure(organizationId)
```

This calls the existing idempotent CRM tenant ensure operation.

Use it only from an authorized server-side orchestration/control-plane path.
Never expose the CRM internal key to a browser, and never treat `result.data` as
proof of an `876-crm` subscription.

Product activation is separately controlled by Core entitlement APIs.

## 3. Add the integration tier only for a real caller

A normal product application must **not** use the operator client above for its
runtime resource calls.

When a host product is implemented, add formal CRM integration routes beside the
existing operator routes and point them at the same CRM service functions:

```text
/v1/organizations/:organizationId/requests
  operator guard

/integrations/organizations/:organizationId/requests
  integration guard + crm.requests.* scopes

/organizations/:organizationId/requests
  session/member guard
```

Start with the smallest scopes the host actually needs, for example:

```text
crm.requests.create
crm.requests.read
crm.requests.update
crm.customers.read
crm.intake.submit
```

Do not publish broad scopes merely because another 876 product is the first
caller. First-party products are the integration contract's first customers.

## 4. Keep the data-plane resource vocabulary flat

At application call sites, the owning service remains an implementation detail.
Use the canonical resource vocabulary:

```ts
await $876.requests.create(...)
await $876.requests.list(...)
```

Do not introduce:

```ts
$876.crm.requests.create(...)
workspace.crm.requests.create(...)
```

`workspace` prepares or connects the environment. `$876` operates on business
resources.

## 5. Compose the correct tier into the host server facade

A later product integration should add a CRM **integration client**, authenticated
as that host app for one organization and limited by the service connection.
Compose it through the host application's canonical `$876` server facade.

Feature/page code must not construct a CRM service client directly.

Console is the exception only in authority, not in resource shape: Console uses
CRM's operator tier because it acts as 876 itself.

## 6. Keep browser URLs owned by the host product

The browser sees the host product vocabulary:

```text
/api/requests
/api/packages/:packageId/requests
/api/customers/:customerId/requests
```

Never expose backend topology through:

```text
/api/crm/*
/api/integrations/*
/api/v1/*
```

The Next.js route handler authorizes the host user, resolves organization/context,
and calls the server `$876` facade. It contains no CRM business logic.

## 7. Model cross-service context with opaque references

A request related to another product resource should reference that resource by
opaque service/resource/id values rather than a cross-database foreign key.

Conceptual shape:

```ts
{
  service: 'couriers',
  resource: 'package',
  id: 'pkg_...'
}
```

The CRM database does not join Couriers tables. Human-readable details are
resolved through the appropriate client/service boundary.

Add this only when the first contextual host integration is implemented; do not
invent unused polymorphic fields in advance.

## 8. Build the embedded surface around the host job

An embedded CRM surface is not a miniature copy of the entire CRM product.
Expose only the contextual workflow the host needs.

Example future package surface:

```text
Package
  Overview
  Tracking
  Billing
  Customer
  Requests
    - existing package requests
    - create request
```

The standalone 876 CRM product remains the broad workspace for customers,
requests, intake, teams, routing, settings, reporting, and automation.

## 9. Distinguish product support from an organization's own CRM

Two flows can both say "request" but target different CRM workspaces.

### 876 support intake

```text
customer in any 876 product
  -> Contact 876
  -> request in 876/Efesto CRM workspace
```

Console `/requests` is the operator view of those and other requests in 876's
CRM workspace.

### Embedded organization CRM

```text
organization user in a host product
  -> create request about its customer/package/invoice
  -> request in that organization's CRM workspace
```

Never infer the target tenant from the word `support`. Resolve it deliberately.

## 10. Required regression tests for a host integration

When the first non-Console product is wired, tests must prove all of these:

```text
host product activation
  -> grants host entitlement
  -> ensures required service workspace
  -> creates/reconciles scoped service connection
  -> does NOT grant the service's standalone product entitlement
```

For CRM specifically:

```text
Couriers (example) activation
  -> may ensure CRM workspace
  -> may grant crm.requests.* integration scopes
  -> MUST NOT create an 876-crm subscription
```

Then prove historical continuity:

```text
embedded request exists
  -> later grant 876-crm entitlement
  -> CRM tenant ensure reuses the same tenant
  -> embedded request remains visible
```

Also verify tier boundaries:

```text
Console          -> operator
host product     -> integration
standalone CRM   -> session
```

## Current implementation status

Implemented now:

- CRM service and product identifiers are distinct in `@876/crm`.
- `create876CrmWorkspaceClient()` can retrieve/ensure a CRM workspace through
  the existing internal tenant lifecycle endpoint without granting a product
  entitlement.
- Console's top-level operator surface is `/requests`, not `/support`.
- Shared Console request components derive their host route rather than sending
  deletes back to a hard-coded `/support` path.

Not implemented now:

- CRM integration authentication/scopes for another product app.
- Embedded CRM UI in Couriers, Billing, Invoice, Careers, or any other product.
- A generic service-connection manifest replacing Finance-specific provisioning
  fields.
- Task/reminder/calendar extraction into a future Work service.

Those are follow-ups and should be implemented only with a real caller so the
published scope and UI contracts stay minimal.
