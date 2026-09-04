# 017 — Managing an organization's app data from Console

**Status:** accepted, updated 2026-09-04.
**Builds on:** ADR-016, ADR-018, `.claude/rules/access-tiers.md`, and
`.claude/rules/platform-services.md`.

## The problem

876 runs multiple product apps and shared services. Console must let authorized
876 staff inspect and operate customer data without reimplementing each product
or giving Console customer-owned integration credentials.

## The rule

> **One capability, implemented once by the owning service, routed at as many
> tiers as it has legitimate callers. Console is always the operator tier.**

Adding an owning service to Console is a registration/composition exercise, not
a second implementation.

## The pathway

Every product/service capability reaches Console through the same joints:

```text
1. capability      owning service function                     write once
2. operator route  /v1/organizations/:organizationId/resource  route again
3. tier client     owning package's operator/admin client
4. domain module   compose onto owning module in src/lib/services/
5. surface         Console route over that capability
```

A second route may use another guard, but it points at the same controller and
service function.

## Access tier

Console authenticates as the **operator**, never as an integration.

Integration means an application is acting for one organization under a grant
that organization can revoke. Console acts as 876 across organizations and must
not depend on customer consent for platform administration/support.

Operator access still requires Console permission checks and auditability.

## Product entitlement versus service access

ADR-018 separates standalone product entitlement from service workspace access.
That changes an important distinction in Console:

- A **standalone product workspace surface** for an organization may be shown
  only when that organization is entitled to the product.
- A **service capability embedded in another legitimate Console workflow** does
  not imply or grant that standalone product entitlement.

For example, the existence of an organization's CRM tenant is not proof that the
organization can launch 876 CRM. Product launch remains controlled by the Core
`876-crm` entitlement.

Do not hide a legitimate operator capability merely because the customer lacks
the standalone product if that capability exists for another authorized service
relationship. Do not use service-workspace existence to manufacture a product
tab either.

## Console's own requests

Console's top-level `/requests` surface is the operator view over **876's own CRM
service workspace**.

There is no Console-local request database and no special internal CRM. The
route calls the same CRM request capability that other tiers use, with 876's
organization id bound as the target.

This is intentionally different from:

```text
/orgs/[slug]/support
```

which asks what that customer organization has raised **with 876**, and from:

```text
/workspace/[orgSlug]/crm/...
```

which opens records in that organization's **own CRM workspace**.

The tenant direction must remain explicit because all three can call a request
resource and still return plausible-looking data if wired to the wrong org.

## Future first-party product integrations

When another product later embeds CRM or another shared service, that product
uses the **integration tier**, not Console's operator credential. The first-party
product must prove the same published integration boundary a third party would
use.

See `docs/service-workspace-integration-guide.md`.

## Registering a new service capability in Console

1. Confirm the capability exists in its owning service.
2. Add/verify an operator route pointing at that same service function.
3. Add the typed operator method to the owning package.
4. Add or update the matching domain module under Console's
   `src/lib/services/` (`platform`, `workspace`, `billing`, `crm`, …) — never a
   `$876` aggregator; see `.claude/rules/sdk-conventions.md` and
   `.claude/rules/workspace-control-plane.md`. Call that root directly from the
   surface that needs it.
5. Add the Console route/surface using Console resource vocabulary.
6. Authorize client mutations in a thin same-origin route handler before calling
   the domain module.
7. Add audit and tenant-direction regression coverage.

If this requires duplicating business logic in Console, the capability is in the
wrong layer.

## Cross-organization operator lists

In addition to organization-scoped operations (`/v1/organizations/:organizationId/...`),
Console operators need cross-tenant operational views that span all organizations
(for example, all open requests across every customer, uncollected packages, or open
issues across all workspaces).

### Shape of the capability

A cross-organization operator list follows the standard operator pathway with four
essential rules:

1. **Unscoped route path:** The product's owning service adds an ADMIN/internal-tier
   route with **no organization scoping in the path** (for example, `GET /v1/requests`
   rather than `GET /v1/organizations/:organizationId/requests`).
2. **Attribution and workspace deep-linking on every row:** The query returns rows
   across every tenant, with each row carrying its owning `organizationId` (typically
   selected via a tenant join). Console surfaces require this id so operator tables
   can attribute records and point at `/workspace/[orgSlug]/<product>` for that row's
   organization.
3. **Shared query and safety logic:** The repository layer must reuse the same
   soft-delete-safe filter builder and query constraints as the organization-scoped
   list (e.g. `deletedAt: null`). Cross-organization queries are not a parallel,
   less-safe query path. They must enforce bounded cursor pagination (`limit`,
   `starting_after`).
4. **Existing operator auth:** The route is protected by the **same**
   `requireInternal`/admin guard Console already uses elsewhere in that service — not a
   new auth mechanism or parallel auth tier.

### Reference implementation: CRM requests

The canonical reference implementation is `GET /v1/requests` in `apps/crm-api`:

- `apps/crm-api/src/modules/requests/requests.repository.ts` — implements
  `listAcrossOrganizations()` using the shared `buildListWhere()` filter helper to
  guarantee `deletedAt: null` filtering, enforces bounded cursor pagination (`take:
  filters.limit + 1`, `startingAfter` cursor), and selects the owning `organizationId`
  on each row via `tenant: { select: { organizationId: true } }`.
- `apps/crm-api/src/modules/requests/requests.routes.ts` and
  `apps/crm-api/src/modules/requests/requests.controller.ts` — defines
  `createOperatorRequestsRouter()` mounting `GET /v1/requests` protected by the
  existing `requireInternal` middleware, returning the standard `sendCrmList`
  envelope.
- `packages/crm/src/operator.ts` and
  `packages/crm/src/resources/operator-requests.ts` — exposes the operator-only typed
  client method `requests.listAcrossOrganizations()` on `create876CrmOperatorClient`.
- `apps/console/src/lib/services/crm.ts` — provides the Console-side
  `listRequestsAcrossOrganizations()` wrapper delegating directly to the CRM
  domain module.
- `apps/console/src/app/(app)/requests/all/page.tsx` and
  `apps/console/src/app/(app)/requests/all/_components/all-requests-table-data.tsx` —
  implements the Console page at `/requests/all`. Following
  `.claude/rules/data-loading.md`, page chrome renders synchronously while the table
  streams behind a `Suspense` boundary with `DataTableSkeleton`. Following
  `.claude/rules/app-layout.md` §5, status filtering uses `StatusFilterHeading` and
  reuses the existing `isRequestStatus`/`REQUEST_STATUS_OPTIONS` helpers from
  `apps/console/src/features/crm/request-status.ts` as-is. Each row's `organizationId`
  is rendered so operator actions can point at `/workspace/[orgSlug]/crm` for that
  row's organization.

## Registering a product's workspace surface

Every product Console can open as an organization's workspace
(`/workspace/[orgSlug]/[appSlug]`) is declared once, as plain data, in
`apps/console/src/features/orgs/app-workspaces.ts`'s `APP_WORKSPACES`. This is
the concrete Console-side registration point the sections above describe in the
general case; adding a product's workspace is editing this one array plus its
route folder, not touching the shell, the layout factory, or the sidebar/mobile
navigation resolvers.

One `AppWorkspace` entry declares:

- `appSlug` — the platform app slug that gates entitlement.
- `key` — the URL segment under `/workspace/[orgSlug]`.
- `label`, `summary`, `iconKey` — how the product presents itself in the
  launcher and the app/org switchers.
- `sections` — the workspace's own screens, each with a segment, label, and
  icon, and an optional `entryKey` binding it to a permission-catalog entry.
- `navigationGroups` (optional) — the product's own `NavGroupDefinition[]`,
  imported from that product's contract package (`@876/billing/navigation`
  today), when one exists. `resolveWorkspaceNavigation` uses it to filter
  `sections` by the organization's actual entitlement/feature state, exactly as
  that product's own members see it. A workspace without one falls back to
  `sections` unfiltered — this is the state CRM, Projects, and Couriers are in
  today, because their navigation registries have not moved into a shared
  contract package yet.

Registering a new workspace:

1. Add the `AppWorkspace` entry to `APP_WORKSPACES`.
2. Add the route folder under `app/(app)/workspace/[orgSlug]/<key>/`, with
   `layout.tsx` exporting `createWorkspaceLayout('<key>')`.
3. Implement each section's `page.tsx`. Reuse a shared page factory
   (`finance-workspace-pages.tsx` for the Billing/Invoice finance plane,
   `couriers-workspace-pages.tsx` for Couriers) when the screen is generic
   CRUD-over-a-list; write the page directly when it renders shared product UI
   (`@876/<product>-ui`), as CRM and Projects do.
4. If the product's navigation has moved into a shared contract package, wire
   `navigationGroups` so the rail reflects the organization's real
   entitlement/feature state rather than the static section list.

Nothing else needs to change: the sidebar (`@sidebar/workspace/...`), the
mobile sheet (`@mobilenav/workspace/...`), the org/app switchers, and the
workspace header all resolve from this one registry.

## Do not

- Do not give Console an integration credential or customer app connection.
- Do not implement a capability twice because Console needs it.
- Do not add operator-only powers to an integration route.
- Do not put product/service business logic in a Console route handler.
- Do not infer standalone product entitlement from a service workspace row.
- Do not infer service-workspace existence from a product tab.
- Do not collapse `/requests`, `/orgs/[slug]/support`, and an org CRM workspace
  into one tenant direction.
- Do not build a cross-org list endpoint that skips the soft-delete filter or
  omits the owning organization id from each row.
