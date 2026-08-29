# 018 — Product entitlements and service workspaces

**Status:** accepted, 2026-08-29.
**Builds on:** ADR-017, `.claude/rules/platform-services.md`,
`.claude/rules/access-tiers.md`, `.claude/rules/workspace-control-plane.md`, and
`docs/org-provisioning.md`.

## Decision

876 separates a **product entitlement** from the **service workspace** and
**service capabilities** that product may use.

> A service workspace is infrastructure, not a product entitlement. A product
> may provision and consume another service's workspace through an authorized
> service connection without granting access to that service's standalone app.

The inverse is also true: activating a standalone product does not create a
second copy of data that already exists in its service workspace. The product
opens the same workspace and historical records.

## Fixed vocabulary

| Term                    | Meaning                                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **876 Workspace**       | The organization's overall 876 environment.                                                                      |
| **Product**             | A launchable standalone application such as 876 CRM, Billing, Invoice, or Couriers.                              |
| **Product entitlement** | Core subscription/access that authorizes an organization to launch and use a product.                            |
| **Service**             | A bounded backend context that owns capabilities and data, such as CRM or Finance.                               |
| **Service workspace**   | The organization's tenant/data inside one service. It may exist without the standalone product entitlement.      |
| **Capability**          | A resource or operation provided by a service, such as `requests.create` or `invoices.create`.                   |
| **Service connection**  | An organization-scoped, scope-limited grant allowing one product to use another service at the integration tier. |
| **Surface**             | UI inside a host application that exposes one or more capabilities.                                              |
| **Module**              | Org-controlled functional area inside a product, using the existing `module-settings.md` definition.             |
| **Add-on**              | Commercial packaging only. It is not an authorization tier, service, workspace, or UI architecture primitive.    |
| **Plan**                | Commercial pricing/configuration for a product.                                                                  |
| **Bundle / suite**      | Commercial package granting multiple product entitlements.                                                       |

Do not use `app`, `workspace`, `module`, and `entitlement` interchangeably.

## Product access remains explicit

Core subscriptions continue to answer one question:

> May this organization use this standalone product?

Examples:

```text
876-crm subscription      -> may launch 876 CRM
876-billing subscription  -> may launch 876 Billing
876-couriers subscription -> may launch 876 Couriers
```

A CRM tenant row, Finance workspace, customer-registry row, or service
connection is never evidence that the organization owns the corresponding
standalone product.

This extends the rule already established for embedded Finance: Couriers or
Invoice can require Finance without receiving a Billing entitlement.

## Service workspace lifecycle

A service workspace answers a different question:

> Does this service have an organization-scoped place in which its canonical
> data can exist?

CRM is the first non-Finance service to make that distinction explicit in its
public server package:

```ts
import {
  CRM_PRODUCT_APP_SLUG,
  CRM_SERVICE_KEY,
  create876CrmWorkspaceClient,
} from '@876/crm'

CRM_SERVICE_KEY // 'crm'
CRM_PRODUCT_APP_SLUG // '876-crm'

const crmWorkspace = create876CrmWorkspaceClient({
  baseUrl: process.env.CRM_API_URL,
  internalKey: process.env.CRM_INTERNAL_KEY,
})

await crmWorkspace.ensure(organizationId)
```

`ensure()` uses CRM's existing idempotent `POST /v1/tenants` operator endpoint.
It creates/reuses the CRM service workspace. It does **not** create a Core
subscription and cannot grant `876-crm` access.

Normal business resources stay on the resource/data plane:

```ts
await $876.requests.create(...)
await $876.customers.list(...)
```

Do not move CRUD to `workspace.crm.requests.*`. The workspace/control plane
prepares what the `$876` data plane operates on.

## Three legitimate access tiers remain unchanged

A service capability is implemented once and routed by authority:

```text
operator     876 itself / Console
integration one app acting for one organization
session     one signed-in user acting in their organization
```

The service function and repository do not fork by caller. Guards, credentials,
scopes, and serializers may differ by tier.

Console always uses the **operator** tier. A first-party product embedding CRM
later must use the **integration** tier with explicit scopes. It must not copy
Console's internal credential or call the operator endpoint as a shortcut.

## Standalone product versus embedded surface

A standalone product entitlement and an embedded surface are separate gates.

```text
Standalone 876 CRM
  requires: 876-crm product entitlement
  opens:    organization's existing CRM service workspace

Embedded CRM surface in a host product
  requires: host product entitlement
            + authorized CRM service connection/scopes
  opens:    only the capabilities that host was granted
  does not: grant 876-crm product entitlement
```

The embedded surface should be contextual and narrow. The standalone product is
the comprehensive interface over the service.

## Console's `/requests` surface

Console's former top-level `/support` route is now `/requests`.

The vocabulary moved together: the surface is Requests, its route is
`/requests`, and its Console permission is `console:requests`. The persisted
`console:support` key survives only as a one-way read alias so role rows written
before the rename continue to authorize the canonical permission. Catalogs,
role editors, navigation, and all new writes use only `console:requests`.

It is an **operator surface over 876's own CRM service workspace**. It is not a
second request system and it is not evidence that Console is subscribed to the
customer-facing 876 CRM product.

These three Console surfaces intentionally answer different questions:

```text
/requests
  876 staff operating requests in 876's own CRM workspace

/orgs/[slug]/support
  requests that customer organization has raised with 876
  (still stored in 876's CRM workspace, filtered to that customer)

/orgs/[slug]/workspace/crm/...
  records inside that customer organization's own CRM workspace
```

Do not merge or redirect the latter two into `/requests`; they have different
subjects and tenant direction.

## Historical continuity

When a product later receives its standalone entitlement, it must reuse the
service workspace that embedded integrations already used.

For example:

```text
Couriers creates request -> org CRM workspace -> request history

later: org activates 876 CRM
       -> Core grants 876-crm entitlement
       -> CRM workspace ensure is idempotent
       -> same request history is visible
```

There is no migration, copy, shadow table, or second tenant.

The same rule applies to Finance/Billing.

## Commercial packaging is above the service model

Plans, add-ons, and a future integrated suite such as 1876 may grant product
entitlements, connection scopes, quotas, or modules. They do not change service
ownership.

Do not put commercial names such as `addon` into CRM request tables or use an
add-on as an authorization primitive.

## Follow-up boundary

This ADR establishes the architecture and CRM workspace control surface. It does
**not** wire embedded CRM into Couriers, Billing, Invoice, Careers, or other
products yet.

When a host app is selected, follow `docs/service-workspace-integration-guide.md`
and add the CRM integration tier/scopes required by that real caller. Do not
pre-expose a broad generic gateway.
