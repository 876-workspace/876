# Brief B — Couriers settings context sidebar + Users & roles split view

Read `plans/2026-09-14-couriers-customers-settings-modules/briefs/_shared-preamble.md` first — it is binding.

## Goal
In 876 Couriers (`apps/couriers`), clicking **Settings** swaps the whole sidebar to a
settings navigation, exactly like Console swaps its sidebar when you open Projects or
Requests. Settings are condensed: each sidebar item is ONE page. Also rebuild
Settings → Users & roles as a full-width table that opens a record card on the right.

## Reference implementations (read them)
- Console context sidebar: `apps/console/src/components/shell/sidebar-context.ts`,
  `nav-contexts.ts`, `sidebar.tsx`, `sidebar-slots.ts` and the shared primitive
  `packages/ui/src/**/sidebar-context*` (import `@876/ui/sidebar-context`). Reuse the
  shared primitive; do not write a second context resolver.
- Couriers shell today: `apps/couriers/src/components/shell/{nav-config.ts,sidebar.tsx,shell.tsx,nav-link.tsx,nav-dropdown.tsx,nav-path.ts}`.
- Console users/roles split view: `apps/console/src/app/(app)/settings/users/(team)/`
  and `.../settings/users/roles`. Shared pieces: `@876/ui/list-detail-section`,
  `@876/ui/list-detail-shell`, `@876/ui/list-pane`, `@876/ui/detail-card`
  (see `.claude/rules/app-layout.md` §5a — height rules matter: Couriers is an
  AppShell host, so `h-full min-h-0`).
- Couriers users/roles today: `apps/couriers/src/app/[orgSlug]/settings/users/**`.

## Settings sidebar content (condensed; one page per item)
Route base `/[orgSlug]/settings`. Keep existing URL segments where a page already exists.

| Group | Item label | href segment | Page content for now |
| --- | --- | --- | --- |
| Organization | Organization profile | `orgprofile` | existing page |
| Organization | Branding | `branding` | existing page |
| Organization | Branches & locations | `locations` | existing locations list page (leave branches/warehouses routes alone) |
| Organization | Users & roles | `users` | new split view (below) |
| Organization | Subscription | `subscription` | existing page |
| Product | Modules | `modules` | create `settings/modules/page.tsx` listing the catalog modules as links to `modules/[moduleKey]` (reuse existing module data helpers; look at invoice `settings/modules/page.tsx`) |
| Product | Customer portal | `portal` | existing page |
| Product | Finance | `finance` | DO NOT create this route — another agent owns `settings/finance/**`. Only link to it. |
| Product | Customization | `customization` | create `settings/customization/page.tsx` placeholder |
| Product | Notifications | `notifications` | existing page |
| Developer | Integrations | `integrations` | existing page |
| Developer | Automation | `automation` | create `settings/automation/page.tsx` placeholder |

Placeholder page = standard container + `PageBreadcrumb`-free heading only (the settings
sidebar is the way back) + `<div className="876-empty-dashed max-w-2xl">Coming soon.</div>`.
No description paragraphs.

- The settings sidebar has a top "back" affordance returning to the app sidebar
  (Console's back context pattern), then the groups above.
- `/[orgSlug]/settings` (hub) should redirect to `/[orgSlug]/settings/orgprofile`.
- Do NOT delete the old deep routes (rates/*, customization/*, communication/*, developer/*,
  branches, warehouses, general, domain, billing); they are swapped in a later pass.
- Active-item highlighting must work for nested paths (e.g. `users/roles/new` highlights Users & roles).
- Also add a main-app nav item **Requests** (href `/requests`, place it after Customers,
  pick an existing icon export from `@876/ui/icons`). Another agent builds the page.
- Mobile nav (if couriers has one) must follow the same context switch.
- Navigation data stays RSC-serializable (icon keys, not components) if you move it
  across a server/client boundary.

## Users & roles
- `settings/users` becomes a ListDetailSection rendered from `settings/users/layout.tsx`:
  full-width members table when closed; clicking a member opens a `DetailCard` on the right
  at `settings/users/[memberId]`. Roles: same treatment at `settings/users/roles` →
  `settings/users/roles/[roleId]` (keep `roles/new` working in the detail column).
- A `StatusFilterHeading` toolbar filter (members: status; roles: `?type=system|custom`),
  Add button `variant="info"` label `Add`.
- Use the data sources the current couriers users/roles pages already use; do not add
  new API calls unless a member detail read is genuinely missing (then reuse the existing
  couriers client / workspace client the list already uses).
- Loading: toolbar and table header render immediately; `DataTableSkeleton` with real columns.

## File scope (only these)
- `apps/couriers/src/components/shell/**`
- `apps/couriers/src/app/[orgSlug]/settings/page.tsx`, `settings/layout.tsx` (if needed)
- `apps/couriers/src/app/[orgSlug]/settings/users/**`
- `apps/couriers/src/app/[orgSlug]/settings/{modules/page.tsx,customization/page.tsx,automation/page.tsx}`
- `apps/couriers/src/app/[orgSlug]/layout.tsx` only if the shell needs the pathname/context wiring
- matching tests beside those files

Forbidden: `settings/finance/**`, `customers/**`, `requests/**`, `apps/couriers/src/app/api/manage/customers/**`, any package outside apps/couriers.

## Tests (minimum)
- sidebar context: app nav vs settings nav chosen by pathname (≥4 cases incl. nested paths, org slug variants)
- settings nav: exact visible hrefs/labels list; Finance links to `/settings/finance`
- active item resolution for `users/roles/new`
- users section: closed = table full width; open = card; roles type filter parsing
- hub redirect

## Verify (run, report actual output)
pnpm --filter @876/couriers-app typecheck
pnpm --filter @876/couriers-app lint
pnpm --filter @876/couriers-app exec vitest run src/components/shell "src/app/[orgSlug]/settings"
node scripts/check-app-structure.mjs

## Report
plans/2026-09-14-couriers-customers-settings-modules/reports/opencode/2026-09-14-settings-sidebar.md
