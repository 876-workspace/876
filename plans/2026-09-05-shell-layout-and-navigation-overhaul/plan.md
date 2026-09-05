# Implementation Plan: Shell Layout, Navigation & Permissions Overhaul

- **Run ID:** `2026-09-05-shell-layout-and-navigation-overhaul`
- **Branch:** `feat/shell-layout-navigation-overhaul` (integration branch; phases branch off it)
- **Status:** `IN_PROGRESS`
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
the app role at assignment time.

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

Each phase is its own branch off the integration branch, its own PR, and is
merged as it goes green. Per `.claude/rules/git.md`, merges use merge commits
with a real subject, never squash.

### Phase 1 — Compile the shared product-UI packages (blocking, do first)

**Why first:** every later visual judgement is unreliable until utilities are
actually generated. Fixing this alone will change how several pages look.

- Add `@source` entries for each shared product-UI package to every app that
  transpiles it. Prefer deriving the list from
  `scripts/shared-ui-packages.mjs` (already the single source of truth for
  `transpilePackages`) rather than hand-copying globs into 8 files.
- Add a check to `pnpm check:transpile` (or a sibling `check:tailwind-sources`)
  asserting that every package in the shared list has a matching `@source` in
  every app that lists it. A shared UI package added next month must fail CI
  rather than silently render unstyled.
- Re-audit the pages that consume shared product UI in each app and note any
  layout that changes once the classes exist.

**Verify:** `pnpm --filter @876/projects build`, then confirm
`ProjectDetail`'s tiles render three-across in the Projects app.

### Phase 2 — The shell spacing contract

- Introduce the gutter tokens in `packages/ui/src/876.css` and consume them in
  `AppShell`, `AppShellMain`, `ListDetailShell`, and `Page`.
- Make the sidebar card inset symmetric at both rail and panel width
  (`apps/console/src/components/shell/sidebar.tsx`, and the equivalent in
  Projects/CRM/Billing/Invoice/Couriers).
- Equalise the three-column rhythm: sidebar → list, list → detail, detail →
  right edge. `ListDetailShell` currently uses `gap-x-4` when open and the page
  container adds its own `px-4 sm:px-6 lg:px-8`; reconcile the two so the visible
  gaps match rather than compounding.
- Reference screenshots to satisfy: Console `/settings/users/.../permissions`
  (three-column, uneven), Console `/requests` (list pane visually touching the
  sidebar), Console `/settings/users` (wide sidebar gap, narrow card gap).
- Sidebar item spacing must be identical in the regular rail, the switched
  (drill-down) context, and the expanded panel.

**Verify:** visual check at 1280/1440/1920 in both themes; existing shell tests.

### Phase 3 — Sidebar icons across every app

Replace placeholder icons in `apps/console/src/components/shell/nav-icons.tsx`
and add a real registry for Projects (which currently has none — it inlines
`sidebarIcons` in `apps/projects/src/components/shell/sidebar.tsx:47`).

Known offenders and their replacements:

| Entry | Today | Use instead |
| --- | --- | --- |
| Projects (projects app) | `requests` → clipboard | folder / kanban-ish project glyph |
| Issues (projects app) | `requests` → **same clipboard** | bug / circle-dot issue glyph |
| Board | `categories` → card grid | kanban columns glyph |
| Labels | `categories` → **same card grid** | tag glyph |
| Console `issues` | `ClipboardList` | issue glyph, distinct from audit |
| Console `audit` | `ClipboardList` (**collides with issues**) | history / scroll glyph |
| Console `board` / `modules` | both `LayoutGrid` | distinct glyphs |
| Console `customers` / `teams` / `subscribers` / `users` | all `Users` | distinguish customer vs team vs user |
| Console `organizations` / `banking` / `warehouses` | all `Building2` | distinguish org vs bank vs warehouse |

**Rule to enforce with a test:** within any single rendered rail, no two entries
resolve to the same icon component. Add that assertion to
`nav-icons.test.ts` and the Projects equivalent.

Also sweep Couriers, CRM, Billing, and Invoice rails for the same collisions.

### Phase 4 — 876 Projects app

1. **Collapsible sidebar (D4)** — rail by default, expandable, persisted.
2. **Project detail as its own page** — remove the duplicate back control. The
   page renders `PageBreadcrumb href="/projects"`
   (`apps/projects/src/app/(app)/projects/[projectId]/page.tsx:33`) *and*
   `ProjectDetail` renders its own "Back to projects" button
   (`packages/projects-ui/src/project-detail.tsx:35-45`). **Keep exactly one** —
   drop the button from the shared component, since a host may not want it, and
   keep the breadcrumb the host controls. Update Console's usage accordingly.
3. **Redesign the project detail body.** The three summary tiles must be a real
   three-up card row (fixed by Phase 1, then designed properly), not three
   stacked bars. Give the header, status badges, and the issues table a
   deliberate hierarchy.
4. **Issue detail as its own page, redesigned.** Today it renders the project
   key, the title, and the body as flat text with a thin side card. Give it:
   a proper record header (identifier, title, status/priority), a readable body
   column, and a sidebar of facts using `DetailCardSection`/`DetailCardFacts`
   from `@876/ui/detail-card` rather than ad-hoc rows.
5. **Comment / markdown editor redesign (D6).** It is grey-on-grey with no
   light-mode treatment. Give it real surfaces, borders, focus states, a usable
   toolbar, and correct rendering in both themes. Look at `packages/editor`
   before adding anything new.
6. Leave assignee pickers unbuilt (D7); render the empty state.

### Phase 5 — Console alignment with Projects

- Project and issue detail open as **full pages** (D2), matching Phase 4's
  designs. Reuse `@876/projects-ui` components — do not fork them
  (`.claude/rules/shared-product-ui.md`).
- Fix the requests section's spacing so the list pane does not visually touch
  the sidebar.
- **The sidebar context header currently reads "Console"**
  (`apps/console/src/components/shell/sidebar-context.ts:72`), sitting next to a
  back/collapse control inside Console itself — redundant. Replace the root
  context's title with something that carries information (the current section,
  or the operator's scope) and keep the back-control label for genuine
  drill-down contexts only.
- **Workspace header prints the organization name twice.** Screenshot 1 shows
  `Efesto Technologies, Inc | Efesto Technologies, Inc ⌄ / 876 CRM ⌄`. The
  back-link label and the org switcher render the same string. Show the org once.

### Phase 6 — Console `/workspace` index

`apps/console/src/app/(app)/workspace/` contains only `[orgSlug]/`, so
`/workspace` **404s**. Add a real index page.

- It is a hub route: use `<Page hub>` per `.claude/rules/app-layout.md` §2.
- **No data table and no two-bar layout** — the user was explicit. Render a
  card/tile grid of organizations and, on selection, the apps entitled to that
  org, so the route is a genuine workspace picker.
- Reuse `WorkspaceIcon` and `entitledWorkspaces` from
  `apps/console/src/features/orgs/` rather than inventing a second source.
- Guard it with the same permission the `[orgSlug]` layout uses.

### Phase 7 — Permissions UI, both surfaces

- Change `PermissionGroup` in `apps/console/src/lib/permissions.ts` from a flat
  list with `"<Product> · <Module>"` labels (lines 319-352) to a nested
  product → module → permissions structure.
- Render nested accordions in
  `apps/console/src/app/(app)/settings/users/(team)/[id]/_components/access-panel.tsx`
  (read-only) and
  `apps/console/src/app/(app)/settings/users/roles/_components/permission-group-picker.tsx`
  (editor).
- The user likes the current per-module card treatment (icon tile, granted/total
  count) — **keep it** and apply it at the module level inside a collapsed
  product group. Preserve `MODULE_STYLE` colour identity.
- Show a granted/total roll-up on the product row so a collapsed product still
  says how much is held.
- **Also redesign `/settings/users/roles/<role>`** to match. The user called the
  role page "ugly" and asked for the same card treatment there.
- Console-exclusive operator actions stay visibly separate — do not fold
  "Purge CRM records" into the CRM product group.

### Phase 8 — App assignment role mapping (fixes §2 durably)

- When an app assignment is created for an organization member, resolve the app
  role from the **member's organization role** — `super_admin` → the app's
  `super-admin` role, `admin` → `admin`, otherwise the app's default role.
- Keep the existing `requireSuperAdminForElevation` guard
  (`apps/api/src/modules/app-access/app-access.service.ts:266`) intact: the
  mapping must not let a non-super-admin caller elevate anyone.
- Backfill consideration: existing assignments where the member is an org
  `super_admin` but holds the default role. Propose a one-off script; **do not
  run it against production** in this run.
- Regression tests: an org super_admin provisioned into a fresh app can create a
  comment; a `staff` member cannot.
- Close or rewrite PROJ-10 (§2, "Explicitly NOT the cause").

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

Briefs live in `./briefs/<tool>/`, reports in `./reports/<tool>/`. Scope parallel
tasks to non-overlapping files: Phases 1 and 3 do not overlap and may run
together; Phase 2 must land before 4/5 so the spacing contract exists.

---

## 7. Verification

```bash
pnpm --filter @876/console typecheck && pnpm --filter @876/console lint && pnpm --filter @876/console test
pnpm --filter @876/projects typecheck && pnpm --filter @876/projects lint && pnpm --filter @876/projects test
pnpm --filter @876/ui typecheck && pnpm --filter @876/ui test
pnpm --filter @876/api typecheck && pnpm --filter @876/api test && pnpm --filter @876/api boundaries
node scripts/check-app-structure.mjs
pnpm check:transpile
```

Verification runs in the **foreground** (`.claude/rules/cli.md`). After any
delegated run, before accepting it:

```bash
grep -rn "eslint-disable\|as any" <paths it touched>
```

and confirm the test **count** moved, not merely that the suite is green.

---

## 8. Task checklist

- [x] Diagnose the 876 Projects comment `Forbidden.` against production
- [x] Pull Vercel logs for `876-projects`
- [x] Identify the shared product-UI Tailwind `@source` gap
- [ ] **MANUAL (user):** repoint the Efesto 876-Projects assignment to `super-admin`
- [ ] Phase 1 — Tailwind `@source` for shared product-UI packages
- [ ] Phase 2 — shell spacing contract
- [ ] Phase 3 — sidebar icons
- [ ] Phase 4 — Projects app pages + editor
- [ ] Phase 5 — Console alignment
- [ ] Phase 6 — Console `/workspace` index
- [ ] Phase 7 — permissions UI (both surfaces)
- [ ] Phase 8 — assignment role mapping
- [ ] Close/rewrite PROJ-10

---

## 9. Handoff state

Nothing is committed yet beyond this plan. Phases 1 and 3 briefs are dispatched
first (non-overlapping). The production role fix in §2(a) is **outstanding and
blocked on the user** — the orchestrator's `PATCH` attempt was denied by the
sandbox classifier, so it was never applied and the user is still unable to
comment until they run it.
