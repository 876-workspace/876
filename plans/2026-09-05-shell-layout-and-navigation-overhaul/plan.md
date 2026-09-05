# Implementation Plan: Shell Layout, Navigation & Permissions Overhaul

- **Run ID:** `2026-09-05-shell-layout-and-navigation-overhaul`
- **Branch:** `feat/shell-layout-navigation-overhaul` (integration branch)
- **Status:** `CLOSEOUT_IN_PROGRESS` — implementation is substantially landed; editor, production data repair, issue cleanup, integration verification, and final PR remain.
- **Owner:** orchestrating Claude session
- **Delegates:** Codex (`gpt-5.6-terra`, medium) for the bulk of the code; `agy`
  (`gemini-3.8-flash-high`, falling back to `gemini-3.1-pro-high` if that model
  id is not in `agy models`) for the high-volume mechanical passes.

---

## 1. Why this run exists

The user reviewed Console and 876 Projects in production and reported one
compound problem: **the app shell does not read as one system.** Concretely:

- The three-column layout (sidebar → collapsed list → detail card) has uneven
  gutters. The sidebar-to-list gap is wide; the list-to-card gap is narrow.
- The floating sidebar card is not equally inset from the window edge and from
  the content.
- Sidebar icons are generic placeholders — two different clipboard icons for
  "Projects" and "Issues", card icons for "Board" and "Labels".
- Detail records open as a right-hand card where they should own a page
  (Projects → project detail, Projects → issue detail, Console → both).
- The Projects project page has **two** "Back to projects" controls and renders
  its three summary cards as full-width stacked bars.
- Console's `/workspace` index 404s; the workspace header prints the
  organization name twice.
- The permission surfaces list `876 Billing · Catalog` and `876 Billing · Sales`
  as sibling top-level accordions instead of nesting under one product.
- Adding a comment in 876 Projects fails with **`Forbidden.`**

The user's framing is the requirement: *"Given that the sidebar item is an issue
perhaps we need to have a standard layout component or app shell."* The answer is
yes — the shared shell exists but its spacing is not a contract, and the shared
product-UI packages are not even compiled correctly (see §3).

---

## 2. Verified diagnosis — 876 Projects "Comment not added / Forbidden."

**This was fully diagnosed against production on 2026-09-05. Do not re-derive it.**

### The path

`POST /api/comments` → `apps/projects/src/app/api/comments/route.ts:21` calls
`requireApiPermission('comments.create')` →
`apps/projects/src/lib/auth/api-permission.ts:40` returns
`apiJson({ error: 'Forbidden.' }, { status: 403 })` when `canAccess` is false.
The literal string `Forbidden.` in the UI is that branch, so the request reached
the handler and was denied by the permission check — not a transport or CORS
failure.

### Evidence gathered

Vercel runtime logs for `876-projects` show the request landing with no error
output (a 403 is a normal response, so nothing is logged):

```
04:18:56.31  876-projects.vercel.app  info   λ POST /api/comments
```

Probing the production identity API (`https://876-api.vercel.app`) with the
internal key:

| Check | Result |
| --- | --- |
| App `876-projects` = `rap_3b512e264a9a4529a4266bd37d54ed79` | present |
| Permission catalog rows | **`comments.create` present** (25 keys total) |
| Template roles `super-admin` / `admin` | **both include `comments.create`** |
| Org copies for `efesto` (`org_fa2cfb0bce834ae6a6537830159e5f14`) | `super-admin` (25), `admin` (20) both include it; `staff` (8) does not |
| **The user's app assignment** `asg_90275575846147508476c7e2b16c4335` | **`app_role.key = "staff"`, `is_default: true`** |
| `effective_permissions` on that assignment | the 8 read-only `*.view` keys — **no `comments.create`** |

### Root cause

The catalog, the seeds, and the org role copies are all correct. **The user's
876 Projects app assignment carries the app's *default* role (`staff`,
read-only).** Auto-provisioning assigns the app's `is_default` role regardless of
the member's organization role, so an organization `super_admin` lands in a
product app with view-only permissions and cannot write anything — comment,
issue, or project — until an operator hand-edits the assignment.

This is a **platform defect, not a data accident**: every newly provisioned app
does this to every member, including the org owner.

### Two fixes, both required

**(a) Immediate data fix — MANUAL, still outstanding.**
The orchestrator attempted the production `PATCH` and it was **blocked by the
sandbox permission classifier**, so it was not applied. The user must do it,
either in Console (Orgs → Efesto → Apps → 876 Projects → app memberships → set
role to `super-admin`) or with:

```bash
curl -X PATCH "https://876-api.vercel.app/organizations/org_fa2cfb0bce834ae6a6537830159e5f14/app-memberships/asg_90275575846147508476c7e2b16c4335" \
  -H "x-internal-key: $API_INTERNAL_KEY" \
  -H "X-876-API-Key: $PROJECTS_API_876_KEY" \
  -H 'content-type: application/json' \
  -d '{"app_role_id":"role_64a6a57a085452df374cacc463e6291c"}'
```

**(b) Durable code fix — Phase 8 below.** Map the organization membership role to
the app role at assignment time. **This code fix is now landed on the integration branch.**

### Explicitly NOT the cause

`comments.*` is already in `projectsPermissionCatalog`
(`packages/core/src/access/catalogs.ts:210`) and already granted by the seeded
`admin`/`super-admin` roles (`apps/api/src/seeds/app-access.ts:125`). **Issue
PROJ-10 ("Wire comment permissions to the app permission catalog") is therefore
based on a false premise and should be closed or rewritten** to describe the
assignment-role mapping instead.

---

## 3. Verified diagnosis — shared product UI renders with missing utilities

**This is the single highest-impact finding in this run and explains much of the
"layout looks off" reporting across several apps.**

Every app's `globals.css` declares its Tailwind content sources. Audited
2026-09-05:

```
apps/876/src/app/globals.css        @source '../';
apps/billing/.../globals.css        @source '../';  + packages/widgets
apps/console/.../globals.css        @source '../';  + packages/widgets
apps/couriers/.../globals.css       @source '../';  + packages/widgets
apps/crm/.../globals.css            @source '../';
apps/enterprise/.../globals.css     @source '../';
apps/invoice/.../globals.css        @source '../';  + packages/widgets
apps/projects/.../globals.css       @source '../';
```

`packages/ui/src/styles.css` sources only `./components` and `./auth`.

**No app sources any `packages/<product>-ui` package.** So every utility class
used *only* inside `@876/projects-ui`, `@876/crm-ui`, `@876/work-ui`,
`@876/billing-ui`, or `@876/access-ui` is never generated for the host app.

Proof from the screenshots: `packages/projects-ui/src/project-detail.tsx` renders
its summary tiles inside `<div className="grid gap-4 sm:grid-cols-3">`. In
**Console** they render as three columns (Console's own source tree happens to
use `sm:grid-cols-3` somewhere, so the class exists). In the **Projects app**
they render as three full-width stacked bars — exactly what the user described —
because `sm:grid-cols-3` was never compiled there.

The user's complaint *"Project Lead, Target dates and members are three long
vertical cards going down"* is therefore a build defect, not a design choice.

---

## 4. Design decisions (fixed for this run — do not re-litigate)

### D1 — One spacing contract, owned by `@876/ui`

The gutters between shell regions become named tokens in `packages/ui/src/876.css`
and are consumed by `AppShell` / `ListDetailShell`. **The sidebar-to-content gap,
the list-to-detail gap, and the content-to-right-edge gap are all the same
value** at a given breakpoint. No app re-declares them.

The sidebar card's own inset must be **symmetric**: the gap between the window
edge and the card equals the gap between the card and the content, at both rail
and panel width. Today `RAIL_INSET = 'pr-1 pl-3'` and `PANEL_INSET = 'pr-2 pl-5'`
(`apps/console/src/components/shell/sidebar.tsx:63-64`) are deliberately
asymmetric — that is the visible defect and it is replaced.

### D2 — Records own a page; the split view is for lists only

- **876 Projects**: `/projects/[projectId]` and `/issues/[issueRef]` are
  **full pages**. They do not open in a right-hand detail column.
- **Console**: project and issue detail under the Projects section and the org
  workspace open as **full pages too**, matching the Projects app exactly. The
  user was explicit: *"a project detail in console should open just as it is in
  the project application itself."*
- The `ListDetailShell` split view stays where it already works — Users, Roles,
  Requests, Customers — and is not extended to Projects/Issues.

### D3 — Real icons, not placeholders

Every sidebar entry gets an icon that a person would recognise for that concept.
No two entries in one rail share an icon. The mapping is centralised so Console
and Projects cannot drift. See §5 Phase 3 for the full table.

### D4 — Projects sidebar is collapsible, defaulting to icons

Projects gets the same rail/panel behaviour Console already has: **defaults to
the icon rail, expands to labels via the toggle, and the preference persists.**

### D5 — Permissions group by product, then module

`PermissionGroup` becomes two-level. `876 Billing · Catalog` and
`876 Billing · Sales` stop being sibling top-level accordions and become
**modules inside one `876 Billing` product group**. The same structure is used by
the read-only access panel and the role editor, so the two cannot drift.

### D6 — Everything is designed for light **and** dark

Every surface touched in this run must be checked in both themes. The comment /
markdown editor is called out specifically: today it is grey-on-grey in dark mode
with no light-mode treatment.

### D7 — Deferred, deliberately

Assignee pickers and the CRM assignment integration are **out of scope**. The
user said to leave assignee and similar fields off for now. Render them as
present-but-empty states; do not build the picker.

---

## 5. Phases

The integration branch now carries the landed phase work directly. The states
below describe the **current remote branch**, not the earlier live working-tree
snapshot.

### Phase 1 — Compile the shared product-UI packages — COMPLETE

- Added shared-product `@source` coverage and an automated source check.
- Independently verified before the later shell work landed.

### Phase 2 — The shell spacing contract — COMPLETE IN CODE

- `@876/ui` owns `--876-shell-gutter` and resolves it from Tailwind v4's real
  `--spacing` token with `calc(var(--spacing) * 4/6/8)`.
- `AppShell`, `Page`, `ListDetailShell`, shared floating `Sidebar`, and product
  sidebars consume the common horizontal rhythm.
- Console/Projects/CRM in-flow sidebars and Billing/Invoice/Couriers floating
  sidebars no longer compound asymmetric insets.
- Focused spacing/sidebar coverage was added and passed in the phase report.
- **Still required for final acceptance:** browser-level visual verification of
  the named routes at the target widths/themes as part of the integration pass.

### Phase 3 — Sidebar icons across every app — COMPLETE

- Console and Projects now use explicit semantic icon registries.
- Projects, Issues, Board, Labels, Audit, Customers, Teams, Banking, Warehouses,
  and other known collisions were separated.
- Projects gained the default-collapsed, expandable, persisted sidebar rail.
- Collision/regression tests were added; Couriers and CRM related mappings were
  updated as part of the same phase.

### Phase 4 — 876 Projects app — PARTIAL

Completed:

1. Collapsible persisted Projects sidebar.
2. Project detail is a standalone page with only the host breadcrumb/back affordance.
3. Project detail record/header/summary redesign.
4. Issue detail is a standalone redesigned record page with facts/activity layout.
5. Dedicated Suspense/loading boundaries for the record reads.
6. Assignee/due-date/estimate remain intentionally display-only empty states.

Outstanding:

- **Comment / Markdown editor redesign (D6).** The phase report explicitly says
  no editor implementation or editor tests were added. This is the only missing
  Phase 4 implementation item and remains required before the run is complete.

### Phase 5 — Console alignment with Projects — COMPLETE IN CODE

- Console platform and organization-workspace project/issue records now use
  independent full-page routes instead of `ListDetailSection` split panes.
- Shared `@876/projects-ui` record components are reused rather than forked.
- Workspace header organization duplication is removed.
- Root Console sidebar context no longer redundantly labels itself `Console`.
- Shared shell spacing work supplies the common gutter contract; final browser
  verification of the requests/list-detail surfaces remains part of closeout.

### Phase 6 — Console `/workspace` index — COMPLETE

- `/workspace` now has a guarded hub page instead of 404ing.
- It uses organization/app workspace cards and the canonical entitlement/
  organization resolvers rather than a second registry.
- `/workspace` is bound to `console:organizations` and has route/layout tests.

### Phase 7 — Permissions UI, both surfaces — COMPLETE

- Permission grouping is product → module → permission rather than flat
  `<Product> · <Module>` siblings.
- The read-only access panel, role editor, permission picker, and related role
  surfaces use the nested contract.
- Product/module grant rollups and shared module styling are covered by tests.

### Phase 8 — App assignment role mapping — DURABLE FIX COMPLETE

- All automatic assignment paths now use `resolveAppAssignmentRole` from
  `@876/core/access`.
- Organization `super_admin` / `super-admin` maps to app `super-admin`, `admin`
  maps to app `admin`, and ordinary members fall back to the live default role.
- Existing assignments are not overwritten during provisioning replay.
- The explicit super-admin elevation guard remains intact for requested roles.
- Core and API regression coverage now exercises provisioning, app membership
  creation, invite routing, fail-closed behavior, and non-super-admin elevation.
- A dry-run-by-default backfill script exists at
  `apps/api/scripts/backfill-app-assignment-roles.ts`; **it has not been run
  against a database**.

Still outside the durable code fix:

- The existing Efesto Projects assignment remains a production data repair.
- PROJ-10 still needs to be closed or rewritten to reflect the actual cause.

---

## 6. Delegation

| Phase | Delegate | Model |
| --- | --- | --- |
| 1 | `agy` | `gemini-3.8-flash-high` — mechanical, 8 files + a check script |
| 2 | Codex | `gpt-5.6-terra` medium — cross-cutting, needs judgement |
| 3 | `agy` | `gemini-3.8-flash-high` — table-driven icon swap + tests |
| 4 | Codex | `gpt-5.6-terra` medium |
| 5 | Codex | `gpt-5.6-terra` medium |
| 6 | Codex | `gpt-5.6-terra` medium |
| 7 | Codex | `gpt-5.6-terra` medium |
| 8 | Codex | `gpt-5.6-terra` medium — auth-adjacent, tests required |

Briefs live in `./briefs/<tool>/`, reports in `./reports/<tool>/`.

---

## 7. Final integration verification

The phase reports contain focused passing checks, but the **integration branch as
one merged unit has not yet been accepted by one final verification pass**.
GitHub currently has no commit-status checks attached to the integration head,
so do not treat the absence of failures as a green CI signal.

Run the final foreground matrix after the editor work is complete:

```bash
pnpm --filter @876/console typecheck && pnpm --filter @876/console lint && pnpm --filter @876/console test
pnpm --filter @876/projects typecheck && pnpm --filter @876/projects lint && pnpm --filter @876/projects test
pnpm --filter @876/projects-ui typecheck && pnpm --filter @876/projects-ui test
pnpm --filter @876/ui typecheck && pnpm --filter @876/ui test
pnpm --filter @876/api typecheck && pnpm --filter @876/api lint && pnpm --filter @876/api test
pnpm --filter @876/core typecheck && pnpm --filter @876/core test
node scripts/check-app-structure.mjs
pnpm check:transpile
```

Known baseline: `pnpm --filter @876/api boundaries` reports 18 existing
`no-circular` violations on the base as well; the Phase 8 work did not add a
nineteenth. Record that baseline rather than expanding this run to fix unrelated
cycles.

Final browser acceptance must cover the touched shell/record/permissions
surfaces in light and dark themes, including the 1280/1440/1920 desktop widths
called out in Phase 2.

---

## 8. Task checklist — current source of truth

- [x] Diagnose the 876 Projects comment `Forbidden.` against production
- [x] Pull Vercel logs for `876-projects`
- [x] Identify the shared product-UI Tailwind `@source` gap
- [x] Phase 1 — Tailwind `@source` for shared product-UI packages
- [x] Phase 2 — shell spacing contract and corrected Tailwind v4 gutter token
- [x] Phase 3 — distinct sidebar icons + collapsible Projects sidebar
- [ ] Phase 4 — Projects app pages + editor
  - [x] Projects project/issue full-page record redesign
  - [x] Projects record Suspense/loading boundaries
  - [x] Remove duplicate shared back control
  - [ ] Redesign the comment / Markdown editor for light and dark themes
- [x] Phase 5 — Console project/issue full-page alignment and workspace header cleanup
- [x] Phase 6 — Console `/workspace` hub
- [x] Phase 7 — permissions UI grouped by product → module → permission
- [x] Phase 8 — durable assignment-role mapping + API/core regression coverage
- [x] Add dry-run-by-default assignment-role backfill script
- [ ] **PRODUCTION DATA:** repoint/backfill the existing Efesto 876-Projects assignment to `super-admin`
- [ ] Close or rewrite PROJ-10 to describe assignment-role mapping rather than missing comment permissions
- [ ] Run the final integration verification matrix on the completed branch
- [ ] Complete browser visual acceptance in light/dark at the required widths
- [ ] Open the single final PR from `feat/shell-layout-navigation-overhaul` → `main`

---

## 9. Current handoff state — updated 2026-09-05

### Remote branch

`feat/shell-layout-navigation-overhaul` is pushed and contains the formerly
uncommitted shell/navigation/Projects/Console/permissions work. The atomic
closeout commits include:

- `f005294d` — product sidebar insets aligned with the shell gutter
- `1d94b272` — distinct navigation icons + collapsible Projects sidebar
- `3592b334` — Projects project/issue full-page record redesign
- `09f5320c` — Console project/issue full-page alignment
- `7edb1131` — `/workspace` hub and organization navigation resolution
- `27e795e3` — role permissions grouped by product and module
- `a99b5672` — phase briefs/reports recorded

Earlier commits on the same integration branch contain Phase 1 and the durable
Phase 8 role-mapping/backfill implementation.

### What is actually left

1. **Finish Phase 4:** redesign the comment/Markdown editor and add its tests.
2. **Repair existing production data:** change the Efesto 876 Projects
   assignment from the default `staff` role to the mapped `super-admin` role, or
   validate and run the backfill deliberately.
3. **Resolve PROJ-10:** close it as based on a false premise or rewrite it around
   assignment-role mapping.
4. **Run one final integration verification pass** across Console, Projects,
   Projects UI, shared UI, API, Core, structure checks, and Tailwind source checks.
5. **Perform browser visual acceptance** for the touched shell, record, editor,
   workspace, and permission surfaces in light/dark at the target desktop widths.
6. **Open the final integration PR to `main`** only after those items are done.

### Production role repair remains outstanding

The durable code fix only changes future/automatic assignment behavior; it does
not retroactively mutate existing rows. The affected Efesto assignment is still
tracked as a manual production repair. The backfill command is dry-run by
default:

```bash
pnpm --filter @876/api app-access:backfill-roles
pnpm --filter @876/api app-access:backfill-roles --apply
```

Do not use `--apply` until the dry-run candidate list has been reviewed.

### Final PR

Do **not** open the `main` PR yet. Per `.claude/rules/git.md`, the integration
branch is allowed to carry incomplete multi-phase work; `main` should receive the
whole feature. Once the checklist above is green, open one PR from
`feat/shell-layout-navigation-overhaul` to `main`, with the Tailwind shared-UI
source defect and the app-assignment role defect called out as the two root
platform fixes.
