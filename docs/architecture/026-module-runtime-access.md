# ADR-017: Module-aware application runtime access

## Status

Accepted

## Context

ADR-016 established code-owned canonical application-module identity and a narrower commercial materialization in Core. Product app startup still had a gap: `AccessContext` carried effective user permissions and feature decisions but did not carry module availability, so navigation and route guards could not distinguish:

- an organization that is subscribed to an app but whose plan does not include a capability;
- a user who has a permission key for a capability;
- a rollout feature that happens to use a similar name.

876 Projects exposed the drift clearly. It had eight local permission/UI areas (`dashboard`, `projects`, `issues`, `comments`, `labels`, `members`, `reports`, `settings`) but no canonical commercial modules in Core. Treating all eight as modules would make navigation structure define commercial packaging.

876 Commerce had the opposite timing problem. Its product direction needs a broad Shopify-class capability vocabulary, but most commerce domains are not implemented yet. Materializing every declared capability immediately would let Console compose plans around inert entitlements.

## Decision

### Runtime access has separate module and permission slots

`AccessContext` may carry:

```ts
interface AccessContext {
  subject: { userId: string; accountType?: string | null }
  modules?: readonly string[]
  permissions: readonly string[]
  features: readonly string[]
  experiments: Readonly<Record<string, string>>
}
```

`modules` represents module keys available to the organization for the current request. It is never derived from permission prefixes. `permissions` remains the acting user's effective app permission set and is never derived from module entitlement.

A module-backed product surface requires both when both concepts apply:

```text
app entitlement
AND module availability
AND effective user permission
AND rollout feature when one exists
```

Feature flags may only subtract access. Experiments never authorize.

### Product apps use the self app-membership read

Product surfaces must not call the privileged modules administration resource to discover their own access. The self app-membership response may include `entitled_modules` alongside `effective_permissions`.

The Core app-access self path resolves the acting member first, then resolves commercial module entitlements for that organization/app. If the app itself is not entitled, the module result is empty and no module entitlement query is performed.

This keeps the access bootstrap session-scoped and lets Projects/Commerce receive permissions and modules in one product-safe response.

### Navigation is declarative but not authoritative

Navigation requirements may declare:

```ts
requires: {
  module?: string
  permission?: string
  feature?: string
  anyPermission?: readonly string[]
}
```

Declared requirements are ANDed; `anyPermission` is ORed internally. Missing module data fails closed for a module-gated entry.

Navigation filtering is UX only. Pages, route handlers, and APIs repeat the required authorization check. Projects therefore uses module-aware guards for `projects` and `issues` pages and create APIs.

### Projects capability split

Canonical Projects application modules are:

- `projects`
- `issues`
- `reports`

The local eight-item Projects catalog is a UI/permission surface catalog, not a module registry. `dashboard`, `comments`, `labels`, `members`, and `settings` remain permission/navigation domains.

Current commercial materialization is narrower:

- `projects`
- `issues`

`reports` stays canonical but is not commercially materialized while the current Projects surface marks reporting unavailable.

The initial `876-projects-free` plan receives `projects` and `issues` only when those module rows are first bootstrapped. Later operator changes to plan composition are not repaired by seed reruns.

### Commerce capability split

Commerce declares the stable capability vocabulary now so future implementation does not create independent product taxonomies:

- `catalog`
- `orders`
- `customers`
- `inventory`
- `storefront`
- `checkout`
- `payments`
- `discounts`
- `shipping`
- `fulfillment`
- `returns`
- `markets`
- `marketing`
- `analytics`
- `pos`
- `b2b`
- `subscriptions`
- `channels`
- `automation`

The Commerce commercial projection is intentionally empty at adoption time. Declaring capability identity does not make an unfinished feature sellable.

Commerce permission namespaces are allowed to be finer than this list. For example, `products`, `collections`, `themes`, and `domains` are permission domains under broader product capabilities and are not automatically `application_modules`.

### System role copies follow the canonical permission catalog

Product permission catalogs are code-owned and may grow as a product gains real capabilities. Platform role templates are regenerated from that catalog, so an organization-scoped copy of a platform-managed system role cannot be allowed to freeze an older permission set forever.

The app-access seed therefore synchronizes **only** `permissions` for live organization roles where all of these are true:

- the role is a system role;
- its `template_key` matches the canonical platform role key;
- the app and role key match the template being seeded;
- the role is not deleted.

Repeated entitlement provisioning applies the same rule to the organization being provisioned. Missing roles are still created normally.

This synchronization deliberately does **not** overwrite custom roles, role names, descriptions, positions, defaults, or other organization data. It is a migration of platform-owned authorization vocabulary, not a general organization-role reset.

### Console shows both planes without merging them

Console continues to use persisted `application_modules` as the plan-selectable commercial plane.

For registry-managed apps, Console may additionally show canonical registry entries that have no materialized row as read-only **Declared capabilities**. These entries are informational only:

- they cannot be added to plans;
- they have no rollout/position controls;
- they do not create entitlement;
- they disappear from the declared-only projection once a real materialized row exists.

This lets Commerce be visibly configured without creating inert plan options.

## Consequences

- Projects no longer needs a parallel product-module identity catalog.
- Projects navigation, page reads, and create APIs can require both module entitlement and user permission.
- Commerce starts with the correct long-term vocabulary while preserving an empty commercial module projection.
- Product apps receive module entitlements through their self access bootstrap rather than an admin endpoint.
- Existing organization system-role copies can receive newly declared canonical permissions without modifying custom roles or presentation metadata.
- Permissions can remain more granular than commercial packaging.
- Feature flags remain operational rollout controls rather than entitlement substitutes.
- Existing apps that do not yet participate in module gating may omit `AccessContext.modules`; any new module-gated entry fails closed until that app populates the field.

## Follow-up

When a product introduces optional tenant module disablement, its request bootstrap must intersect commercial entitlement with the product-owned organization module state before treating the module as effective. A future Commerce capability is added to `COMMERCE_COMMERCIAL_MODULE_KEYS` only in the same change set that gives that key real runtime entitlement enforcement.
