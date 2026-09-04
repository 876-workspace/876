# Console workspaces

A workspace is the operator view of an organization's operational data inside a
specific 876 product. Console operators use workspaces to inspect and manage
organization resources across products without leaving the administration
surface.

## Where a workspace lives

An organization's product workspace is at `/workspace/<orgSlug>/<appKey>` — a
top-level Console context. It used to be `/orgs/<slug>/workspace/<app>`, a tab
inside the organization record. Old URLs redirect temporarily (307) via
`redirects()` in `apps/console/next.config.ts`. `/workspace/<orgSlug>` on its own
is the **launcher index**, listing the products that organization is entitled
to.

| Path                              | Purpose                                                             |
| --------------------------------- | ------------------------------------------------------------------- |
| `/workspace/<orgSlug>`            | Launcher index listing entitled products for the organization       |
| `/workspace/<orgSlug>/<appKey>`   | Top-level product workspace for an organization                     |
| `/orgs/:orgSlug/workspace`        | Legacy path, 307 temporary redirect to `/workspace/:orgSlug`        |
| `/orgs/:orgSlug/workspace/:path*` | Legacy path, 307 temporary redirect to `/workspace/:orgSlug/:path*` |

## The workspace registry

`apps/console/src/features/orgs/app-workspaces.ts` declares `APP_WORKSPACES` —
one entry per product with `appSlug`, `key`, `label`, `summary`, `iconKey` and
its `sections`.

| Field              | Type                            | Purpose                                                   |
| ------------------ | ------------------------------- | --------------------------------------------------------- |
| `appSlug`          | `string`                        | Platform app slug gating the workspace                    |
| `key`              | `string`                        | URL segment under `/workspace/[orgSlug]`                  |
| `label`            | `string`                        | Product display name                                      |
| `summary`          | `string`                        | Non-marketing summary of workspace contents               |
| `iconKey`          | `WorkspaceIconKey`              | Icon key resolved in the navigation icon registry         |
| `sections`         | `readonly WorkspaceSection[]`   | Navigable sections inside the workspace                   |
| `navigationGroups` | `readonly NavGroupDefinition[]` | Optional product permission-catalog navigation definition |

| Product        | `appSlug`      | `key`      | `iconKey`  | Summary                                                                   |
| -------------- | -------------- | ---------- | ---------- | ------------------------------------------------------------------------- |
| `876 CRM`      | `876-crm`      | `crm`      | `requests` | Requests, customers, and the teams this organization routes to.           |
| `876 Projects` | `876-projects` | `projects` | `requests` | Projects, issues, and the board this organization plans on.               |
| `876 Billing`  | `876-billing`  | `billing`  | `billing`  | Customers, catalog items, invoices, payments, subscriptions, and banking. |
| `876 Invoice`  | `876-invoice`  | `invoice`  | `billing`  | Invoices, line items, drafts, and customer billing schedules.             |
| `876 Couriers` | `876-couriers` | `couriers` | `packages` | Dispatch, deliveries, couriers, and live logistics.                       |

| Helper                  | Signature                                   | Purpose                                                        |
| ----------------------- | ------------------------------------------- | -------------------------------------------------------------- |
| `workspaceIndex`        | `workspaceIndex(orgSlug)`                   | Returns `/workspace/<orgSlug>` launcher index URL              |
| `workspaceBase`         | `workspaceBase(orgSlug, workspaceKey)`      | Returns `/workspace/<orgSlug>/<workspaceKey>` base URL         |
| `findAppWorkspace`      | `findAppWorkspace(key)`                     | Looks up a workspace definition by its URL segment key         |
| `entitledWorkspaces`    | `entitledWorkspaces(slugs)`                 | Filters `APP_WORKSPACES` to products the org is entitled to    |
| `workspaceSectionLinks` | `workspaceSectionLinks(orgSlug, workspace)` | Generates absolute navigation links for all workspace sections |

**Never hand-build a workspace URL — always use `workspaceBase`.**

## Entitlement is not access

`entitledWorkspaces` decides what the launcher lists and what the app switcher
offers. It does **not** decide what an operator may read: a direct visit to a
workspace whose entitlement lapsed still resolves, with a notice, because the
data outlives the subscription and an operator is usually there precisely
because something lapsed.

When an organization lacks the corresponding entitlement, the layout renders a
notice above the page content. The notice streams within a `<Suspense>` boundary
so page content does not block on the entitlement lookup. Console operator
access is authenticated and audited via Console session permissions on 876's
own authority, not granted by organization subscription status.

## Navigation

Entering a workspace swaps Console's whole sidebar to that product's navigation.
There is no second rail inside the page.

The contexts come from two parallel route slots — `@sidebar` and `@mobilenav` —
which share one resolver per segment so the desktop rail and the mobile sheet
cannot disagree.

| Slot         | Path                                                                              | Purpose                            |
| ------------ | --------------------------------------------------------------------------------- | ---------------------------------- |
| `@sidebar`   | `apps/console/src/app/(app)/@sidebar/workspace/[orgSlug]/[...section]/page.tsx`   | Desktop contextual rail            |
| `@mobilenav` | `apps/console/src/app/(app)/@mobilenav/workspace/[orgSlug]/[...section]/page.tsx` | Mobile contextual navigation sheet |

Both slots call the shared resolver `resolveWorkspaceContexts` in
`apps/console/src/features/orgs/workspace-contexts.ts`.

The slots use a required catch-all (`[...section]`), never an optional catch-all
(`[[...section]]`). Next.js disallows a concrete route and an optional
catch-all sharing the same specificity. The launcher index at
`/workspace/[orgSlug]` belongs to no one product and retains the platform
navigation rail through `default.tsx`.

The workspace sidebar context sets `subtitle` to the organization's name to
indicate both the product and the organization. Section icons resolve through
`NAV_ICONS`.

Full detail lives in
[`apps/console/src/components/shell/README.md`](../apps/console/src/components/shell/README.md).

## The workspace header

Every workspace page carries a return link, an organization switcher and an app
switcher.

| Control               | Behavior                                           | Target URL                                       |
| --------------------- | -------------------------------------------------- | ------------------------------------------------ |
| Return link           | Returns to previous entry point                    | Validated same-origin path, or `/orgs/<orgSlug>` |
| Organization switcher | Keeps the operator in the same product across orgs | `workspaceBase(otherOrgSlug, workspaceKey)`      |
| App switcher          | Moves between products for the same organization   | `workspaceBase(orgSlug, otherWorkspaceKey)`      |

The organization switcher lists active organizations and retains the current
product key. The app switcher lists the products that organization is entitled
to, with an "All workspaces" option pointing to `workspaceIndex(orgSlug)`.

The return link reads `?from=`, which the organization record appends to its app
tabs; the resolver rejects any destination that leaves the origin and derives
the link's label rather than accepting one.

The resolver `resolveWorkspaceReturn` in
`apps/console/src/features/orgs/workspace-return.ts` rejects protocol-relative
URLs (`//`), backslashes, and control characters:

| Destination in `?from=`          | Derived label     | Destination path       |
| -------------------------------- | ----------------- | ---------------------- |
| `/workspace/<orgSlug>`           | `All workspaces`  | `/workspace/<orgSlug>` |
| `/orgs/<orgSlug>` or subpath     | Organization name | `/orgs/<orgSlug>...`   |
| Other safe same-origin path      | `Back`            | Sanitized target path  |
| Missing or unsafe `?from=` value | Organization name | `/orgs/<orgSlug>`      |

## Adding a product

1. Add an entry to `APP_WORKSPACES` in
   `apps/console/src/features/orgs/app-workspaces.ts` with `appSlug`, `key`,
   `label`, `summary`, `iconKey`, and `sections`.
2. Add its sections with `iconKey` values that exist in `NAV_ICONS`. A section's
   `iconKey` must be declared in
   `apps/console/src/components/shell/nav-icons.tsx` and mapped to an accent
   color in `apps/console/src/features/orgs/components/workspace-icon.tsx`. If an
   icon key is not declared, it silently falls back to a generic square
   (`RectangleGroup`) — there is a test in
   `apps/console/src/features/orgs/components/workspace-icon.test.tsx` that
   catches this.
3. Create the routes under
   `apps/console/src/app/(app)/workspace/[orgSlug]/<key>/`.
4. Use `createWorkspaceLayout('<key>')` for the layout in
   `apps/console/src/app/(app)/workspace/[orgSlug]/<key>/layout.tsx`:

```ts
import { createWorkspaceLayout } from '../_components/app-workspace-layout'

export default createWorkspaceLayout('<key>')
```

5. Implement the index route (`page.tsx`) and subroutes matching the declared
   `sections` segments.

## Related

| Document                                                                                                                                  | Purpose                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [`apps/console/src/components/shell/README.md`](../apps/console/src/components/shell/README.md)                                           | Contextual sidebar architecture, slots, and navigation resolvers     |
| [`apps/console/src/features/orgs/app-workspaces.ts`](../apps/console/src/features/orgs/app-workspaces.ts)                                 | Workspace registry definitions and URL helpers                       |
| [`docs/architecture/017-console-app-data-management.md`](architecture/017-console-app-data-management.md)                                 | Architectural decision record on Console application data management |
| [`docs/architecture/018-product-entitlements-and-service-workspaces.md`](architecture/018-product-entitlements-and-service-workspaces.md) | Product entitlements versus service workspaces                       |
| [`docs/service-workspace-integration-guide.md`](service-workspace-integration-guide.md)                                                   | Service workspace integration contract                               |
