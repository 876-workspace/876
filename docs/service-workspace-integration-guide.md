# Service workspace integration guide

This guide is the implementation contract for exposing one 876 service inside
another 876 product without accidentally granting the service's standalone
product entitlement.

CRM now has two deliberately different cross-product patterns:

1. **Platform support intake** is implemented in CRM, Billing, and Invoice. It is
   a narrow first-party service boundary that always writes to Efesto's CRM
   workspace.
2. **Embedded organization CRM** remains a future integration tier. It will write
   to the acting organization's own CRM workspace and must not grant the
   standalone `876-crm` product entitlement.

Do not combine those two flows just because both create CRM requests.

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

Before writing an embedded service integration, name each explicitly:

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

Platform support intake is different. Its service workspace is fixed to Efesto's
CRM organization; the caller's organization becomes a CRM customer in that
workspace instead of becoming the target tenant.

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

The same distinction exists for Work. Work is infrastructure/service state, not
an organization-facing product entitlement. Current fresh-organization
provisioning enables the Work service entitlement by default and the bootstrap
path ensures its workspace idempotently.

## 3. Add an integration tier only for a real organization-owned caller

A normal product application must **not** use the operator client above for its
runtime business-resource calls.

When an organization-owned CRM integration is implemented, add formal CRM
integration routes beside the existing operator routes and point them at the same
CRM service functions:

```text
/v1/organizations/:organizationId/requests
  operator/internal boundary today

/integrations/organizations/:organizationId/requests
  future integration guard + crm.requests.* scopes

/organizations/:organizationId/requests
  future session/member boundary
```

Start with the smallest scopes the host actually needs. Do not publish broad
scopes merely because another 876 product is the first caller. First-party
products are the integration contract's first customers.

### The support boundary is intentionally narrower

Platform support does **not** expose the general CRM resource graph. The typed
entrypoint is `@876/crm/support` and CRM API exposes only:

```text
GET  /v1/service/support/categories
GET  /v1/service/support/requests
POST /v1/service/support/requests
```

A host presents two server-only headers:

```text
x-876-service-app
x-876-service-key
```

`CRM_SUPPORT_SERVICE_KEYS` maps each allowed first-party app slug to its own key,
so a Billing key cannot authenticate as Invoice. The browser never receives
these credentials.

## 4. Keep platform support tenant routing explicit

The CRM API owns:

```text
CRM_SUPPORT_ORGANIZATION_ID=<Efesto organization id>
CRM_SUPPORT_SERVICE_KEYS={"876-crm":"...","876-billing":"...","876-invoice":"..."}
```

Each participating host owns:

```text
CRM_API_URL=<server-only CRM API origin>
CRM_SUPPORT_SERVICE_KEY=<that host's key only>
```

For a request raised by organization `org_customer` and account `usr_requester`:

```text
Efesto CRM workspace
  customer = BUSINESS / CORE_ORGANIZATION linked to org_customer
  request.customerId = that customer profile
  request.requesterUserId = usr_requester
  request.channel = WIDGET
```

The customer link is idempotent by source organization. Request history is
therefore organization-wide: two users from the same customer organization see
the same support queue, while requester attribution still records who submitted
each item.

The host BFF derives source organization, organization name, and requester user
from authenticated server context. These fields are not accepted from the
browser draft contract.

## 5. Keep browser URLs owned by the host product

The browser sees the host application's own boundary:

```text
/api/support
/api/support/categories
```

The same rule applies to future organization-owned embedded CRM:

```text
/api/requests
/api/packages/:packageId/requests
/api/customers/:customerId/requests
```

Never expose backend topology through browser URLs such as:

```text
/api/crm/*
/api/integrations/*
/api/v1/*
```

The Next.js route handler authorizes the signed-in host user, resolves acting
organization/context, and invokes the bounded server client. It contains no CRM
database or provider logic.

## 6. Share product UI, not host authority

`@876/crm-ui/support-widget` owns the reusable support popover. CRM, Billing, and
Invoice provide host-local transport callbacks that call their same-origin BFFs.

The shared component owns:

- request history rendering;
- create form and category picker;
- loading/error/empty states;
- host-copy customization;
- optional host request-detail href behavior.

The host owns:

- authentication and organization selection;
- same-origin API routes;
- service credential configuration;
- whether a created request has a local detail route.

Support data is loaded only when the popover opens. Do not block the application
layout on categories or request history.

## 7. Keep the future organization CRM module separate from support

Billing and Invoice declare a shared finance module key:

```text
crm
```

It is optional and disabled by default. It is a catalog seam for a future
organization-owned CRM surface; it does not currently create an entitlement,
service connection, or CRM workspace, and its disabled state must **not** hide
"Contact 876" support.

This distinction prevents a customer from losing platform support merely because
its own CRM module is disabled.

## 8. Model future cross-service context with opaque references

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

The CRM database does not join Couriers, Billing, or Invoice tables.
Human-readable details are resolved through the appropriate client/service
boundary.

Add contextual fields only when the first real embedded workflow requires them;
do not invent unused polymorphic fields in advance.

## 9. Build embedded surfaces around the host job

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

## 10. Required regression coverage

### Platform support

Source tests must prove:

```text
wrong host key                        -> 401
missing service key                   -> fail closed
support destination missing           -> crm/not-configured
source organization not yet customer  -> creates one linked BUSINESS customer
source organization already customer  -> reuses it
history                               -> filters by source-org customer
request create                        -> Efesto tenant + requester attribution
browser identity injection            -> rejected
signed-out host viewer                -> rejected by host BFF
```

### Future embedded organization CRM

When the first embedded CRM module becomes functional, tests must separately
prove:

```text
host product activation
  -> grants host entitlement
  -> ensures required service workspace
  -> creates/reconciles scoped service connection
  -> does NOT grant 876-crm entitlement

embedded request exists
  -> later grant 876-crm entitlement
  -> CRM tenant ensure reuses the same tenant
  -> embedded request remains visible
```

## Current implementation status

Implemented:

- CRM service and product identifiers remain distinct in `@876/crm`.
- `create876CrmWorkspaceClient()` retrieves/ensures a CRM workspace without
  granting a product entitlement.
- `@876/crm/support` is the narrow first-party platform-support client.
- CRM API has an app-bound support credential guard and a fixed Efesto support
  destination.
- CRM, Billing, and Invoice expose host-owned `/api/support` BFF routes.
- `@876/crm-ui/support-widget` is the single reusable support React surface.
- support history is source-organization-wide and requester attribution is kept.
- Billing and Invoice declare the disabled-by-default `crm` module seam.
- Invoice has PostHog/Core-backed feature flags for search, theme switcher,
  global add, app switcher, and organization switcher.

Not implemented:

- general CRM integration authentication/scopes for organization-owned embedded
  CRM resources;
- an enabled/persisted embedded CRM module in Billing or Invoice;
- embedded CRM UI in Couriers, Careers, or another contextual product workflow;
- a generic service-connection manifest replacing Finance-specific provisioning
  fields.

Those remain follow-ups and should be implemented only with a real organization-
owned caller so the scope and UI contracts stay minimal.
