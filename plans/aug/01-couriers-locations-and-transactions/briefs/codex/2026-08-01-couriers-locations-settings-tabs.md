# Brief — Couriers: a tabbed Locations settings area, with working Warehouse CRUD

## Why this exists

Couriers has two kinds of physical site and they are managed inconsistently:

- **Branches** — the local offices customers collect packages from. Full CRUD
  exists: service, route handlers, list page, `/new`, `/[id]/edit`.
- **Warehouses** — the overseas (usually US) addresses customers ship their
  purchases to, addressed by mailbox number. The service
  (`src/lib/service/warehouses/`), the route handlers
  (`src/app/api/manage/warehouses/`) and the browser client
  (`src/lib/client/warehouses.ts`) **all exist and work** — but there is **no
  UI to create or edit one**. Today warehouses render as a read-only list
  tacked onto the bottom of the branches settings page. An organization
  literally cannot add a warehouse.

So: give the two a single home — one **Locations** settings area with a tab per
kind, Branches first, Warehouses second — and build the missing warehouse
create/edit pages on the same pattern the branch pages already use.

## Scope — files you may touch

Only under `apps/couriers/src/app/org/[orgSlug]/settings/` plus the small
supporting pieces named below. Specifically:

- NEW `settings/locations/layout.tsx` (or a `locations-tabs.tsx` component —
  your call, see below)
- NEW `settings/locations/page.tsx` — Branches tab (the default tab)
- NEW `settings/locations/new/page.tsx` — create branch
- NEW `settings/locations/[id]/edit/page.tsx` — edit branch
- NEW `settings/locations/warehouses/page.tsx` — Warehouses tab
- NEW `settings/locations/warehouses/new/page.tsx` — create warehouse
- NEW `settings/locations/warehouses/[id]/edit/page.tsx` — edit warehouse
- NEW `settings/locations/warehouse-form.tsx`
- MOVED `settings/locations/branch-form.tsx` (from `settings/branches/`)
- NEW `src/components/settings-tabs.tsx` (only if a reusable component is the
  cleaner shape — see "Tabs" below)
- DELETE the old `settings/branches/` tree, replaced by a redirect (below)
- `src/lib/service/warehouses/retrieve.ts` / `index.ts` — **only** if a
  `retrieve` verb does not already exist and the edit page needs one
- `src/types/warehouse.ts` — only to add a `WarehouseListParams`-adjacent type
  if genuinely required
- test files for anything you add

**Do not** touch `src/lib/service/branches/**`, `src/lib/service/transaction.ts`,
`src/lib/service/report.ts`, `src/lib/errors/**`, `apps/api/`, `packages/`, or
the Prisma schema — another concurrent task owns those and you will collide.
Do not commit.

## Read these first, and follow them

- `.claude/rules/app-layout.md` — **the governing rule for this work.** In
  particular: §2 main body container, §3 list pages, §4 `ResourceToolbar` (the
  Add button is always `primaryVariant="info"` and labelled with the bare verb
  `"Add"`), §7 the `PageBreadcrumb` back-link, §10 bare-verb button labels,
  §11 icon sizes, §12 table cell hierarchy.
- `CLAUDE.md` → "UI Copy": **no explanatory paragraph under a heading**, and
  keep empty states to a short title. The current branches page violates this
  ("No branches yet. Add the location customers collect packages from.") —
  fix it to a bare short title while you are moving it.
- `CLAUDE.md` → "UI Design": **no green buttons**, ever.
- `.claude/rules/code-style.md` for anything landing in `src/lib/`.

## Routing decision, and why

The canonical route becomes `/org/[orgSlug]/settings/locations`. "Locations" is
the honest name for a page that holds two kinds of site; "branches" named only
one of them, which is how the warehouse list ended up as an unlabelled
afterthought at the bottom.

`/org/[orgSlug]/settings/branches` must **permanently redirect** to
`/org/[orgSlug]/settings/locations` — existing bookmarks, and any in-app link,
must not 404. Use a `redirect()` from a thin `settings/branches/page.tsx`, and
grep the whole `apps/couriers/src` tree for `settings/branches` and update every
link you find (the settings landing page and any nav registry almost certainly
reference it).

Tab routing is **URL-based, not local state** — each tab is a real route:

- `/settings/locations` → Branches (default)
- `/settings/locations/warehouses` → Warehouses

A real route per tab means the browser back button works, a tab is linkable,
and each tab's server component fetches only its own data. A client-side
`useState` tab would force both lists to load on every visit and would lose the
selection on refresh. Do not use a query parameter either — `?tab=` here buys
nothing a path segment does not, and the path reads better in the breadcrumb.

## Tabs

Check `packages/ui/src/` for an existing tabs primitive before building
anything. If `@876/ui/tabs` exists, use it. If it does not, build a small
`src/components/settings-tabs.tsx` client component that renders a horizontal
list of `next/link`s with an active-state underline, deriving the active tab
from `usePathname()`. Keep it plain and serializable: it takes
`{ items: { href: string; label: string }[] }` — **no icon components and no
functions crossing the RSC boundary** (same constraint as
`ResourceToolbar`'s `DropdownAction.icon`; see `.claude/rules/app-layout.md`).

Place the tab strip in `settings/locations/layout.tsx` so it renders once and
does not remount between tabs. The `PageBreadcrumb` back to `/settings` belongs
in the layout too, above the tabs. The `ResourceToolbar` stays in each tab's
own `page.tsx`, because its Add button targets a different route per tab.

The create/edit sub-routes (`/new`, `/[id]/edit`, `/warehouses/new`,
`/warehouses/[id]/edit`) sit under the same layout and will therefore inherit
the tab strip. That is acceptable and consistent — but the breadcrumb on a
form page must point back to the _list_ it came from, not to `/settings`. If
the shared layout makes that impossible cleanly, put the tab strip in the two
list pages instead of the layout and keep the layout to the breadcrumb. Choose
whichever produces the simpler tree; state your choice in a code comment.

## Branches tab

Move the existing list from `settings/branches/page.tsx` essentially as-is,
minus the warehouses `<section>` at the bottom (that becomes the second tab).
Keep: the `Default` / `Inactive` / `Region needs review` badges, the formatted
address line, the country code, the per-row Edit button. Keep
`metadata = { title: … }` and update it to read `Locations — Settings` /
`Warehouses — Settings` per tab.

Fix the empty state to a short bare title per the UI Copy rule.

## Warehouses tab

Mirror the branches tab exactly:

- `ResourceToolbar title="Warehouses"`, `primaryLabel="Add"`,
  `primaryHref={.../settings/locations/warehouses/new}`,
  `primaryVariant="info"`, `refresh`
- rows carry the name (tier 1, `font-medium`), a `Primary` badge when
  `isPrimary`, the formatted address line and country code (tier 3, muted), and
  an Edit button
- short empty state

## Warehouse form — `warehouse-form.tsx`

Model it directly on `branch-form.tsx`, which is the established pattern in
this app. Read that file and mirror its structure: `'use client'`,
`useTransition`, `useRouter`, the `AddressFields` component with
`onGeographyUnavailable` gating the submit button, the `876-card` sections,
error rendering, `Add`/`Save` + `Cancel` buttons.

Differences from the branch form:

- fields are **name** and **address** only — a warehouse has no phone and no
  active flag in the model (`prisma/schema/warehouse.prisma`); do not invent
  columns
- the default flag is `isPrimary`, not `isDefault`, and its label is
  **"Set as primary warehouse"**
- the first warehouse for a tenant is forced primary by the service, exactly as
  the first branch is forced default. Pass an `isFirstWarehouse` prop and, when
  it is set, render the same kind of explanatory line the branch form uses
  instead of an unusable checkbox — the control must not offer a choice the
  server will refuse. Likewise, when editing the current primary, say so rather
  than showing a checkbox that cannot be cleared.
- it calls `client.warehouses.create(orgSlug, params)` /
  `client.warehouses.update(orgSlug, id, params)` from `@/lib/client`

Do **not** add a server action. Mutations go through the existing route
handlers via the typed browser client — see `.claude/rules/api-access.md`.

## Warehouse edit page

Check whether `service.warehouses` exposes a `retrieve` verb. If it does not,
add `src/lib/service/warehouses/retrieve.ts` following
`src/lib/service/branches/retrieve.ts` **exactly** — same signature shape, same
tenant scoping (a warehouse must only ever be readable within its own tenant;
a retrieve that ignores `tenantId` is a cross-tenant data leak), same view
mapping through `toWarehouseView`. Register it in
`src/lib/service/warehouses/index.ts`. Name it `retrieve`, never `get`,
`find`, or `findById` — see `.claude/rules/sdk-conventions.md`, the banned-prefix
section.

The edit page is a server component: resolve `getManageContext(orgSlug)`,
guard the tenant, retrieve the warehouse, `notFound()` when absent, render the
form with the warehouse. Match `settings/branches/[id]/edit/page.tsx` line for
line in structure.

## Authorization

Every one of these pages must resolve `getManageContext(orgSlug)` and bail when
there is no tenant, exactly as the current branches page does. The route
handlers already enforce `owner`/`admin` for mutations; the pages must not
render a create/edit form to a member who cannot use it — check the same
`ctx.role !== 'owner' && ctx.role !== 'admin'` condition the route handler uses
(`src/app/api/manage/warehouses/route.ts`) and render the page's
not-permitted state rather than the form. Look at how other manage pages in
this app handle an insufficient role and match it; do not invent a new pattern.

## Tests

Follow `.claude/rules/testing.md`. Read `src/lib/service/warehouses/list.test.ts`
first and match its style.

- If you add `warehouses/retrieve.ts`, add `warehouses/retrieve.test.ts`
  covering: returns the mapped view for a warehouse in the tenant; returns null
  (or whatever the branch equivalent returns — match it) for an id in a
  **different** tenant; returns null for an unknown id. The cross-tenant case is
  the one that matters — assert the exact `where` clause passed to Prisma.
- If you add `settings-tabs.tsx`, add a component test covering: renders one
  link per item with the correct `href`; marks the item matching the current
  pathname active and the others not; a nested route under a tab's href still
  marks that tab active.

## Verification (run these; all must pass)

```
pnpm --filter @876/couriers typecheck
pnpm --filter @876/couriers test
pnpm --filter @876/couriers lint
```

Also `grep -rn "settings/branches" apps/couriers/src` and confirm every
remaining hit is the intentional redirect.

## Constraints

- No server actions.
- No green buttons.
- No descriptive paragraph under any heading; short empty states.
- Nothing outside `src/lib/service/` may import `prisma`.
- Do not run git commands. Do not commit.
