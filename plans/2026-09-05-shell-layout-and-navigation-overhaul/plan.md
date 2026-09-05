# Implementation Plan: Shell Layout, Navigation & Permissions Overhaul

- **Run ID:** `2026-09-05-shell-layout-and-navigation-overhaul`
- **Branch:** `feat/shell-layout-navigation-overhaul` (integration branch)
- **Status:** `CLOSEOUT_BLOCKED_ON_RUNTIME_AND_EXTERNAL_ACCESS` — repository implementation and static hardening are landed; production data repair, executable verification, authenticated browser acceptance, and external tracker cleanup remain. PR #478 was externally closed without merge and is not being silently reopened.
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

The user's framing is the requirement: _"Given that the sidebar item is an issue
perhaps we need to have a standard layout component or app shell."_ The answer is
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

```text
04:18:56.31  876-projects.vercel.app  info   λ POST /api/comments
```

Probing the production identity API (`https://876-api.vercel.app`) with the
internal key:

| Check                                                                | Result                                                                 |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| App `876-projects` = `rap_3b512e264a9a4529a4266bd37d54ed79`          | present                                                                |
| Permission catalog rows                                              | **`comments.create` present** (25 keys total)                          |
| Template roles `super-admin` / `admin`                               | **both include `comments.create`**                                     |
| Org copies for `efesto` (`org_fa2cfb0bce834ae6a6537830159e5f14`)     | `super-admin` (25), `admin` (20) both include it; `staff` (8) does not |
| **The user's app assignment** `asg_90275575846147508476c7e2b16c4335` | **`app_role.key = "staff"`, `is_default: true`**                       |
| `effective_permissions` on that assignment                           | the 8 read-only `*.view` keys — **no `comments.create`**               |

### Root cause

The catalog, the seeds, and the org role copies are all correct. **The user's
876 Projects app assignment carries the app's _default_ role (`staff`,
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
the app role at assignment time. **This code fix is landed on the integration branch.**

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

```text
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
used _only_ inside `@876/projects-ui`, `@876/crm-ui`, `@876/work-ui`,
`@876/billing-ui`, or `@876/access-ui` is never generated for the host app.

Proof from the screenshots: `packages/projects-ui/src/project-detail.tsx` renders
its summary tiles inside `<div className="grid gap-4 sm:grid-cols-3">`. In
**Console** they render as three columns (Console's own source tree happens to
use `sm:grid-cols-3` somewhere, so the class exists). In the **Projects app**
they render as three full-width stacked bars — exactly what the user described —
because `sm:grid-cols-3` was never compiled there.

The user's complaint _"Project Lead, Target dates and members are three long
vertical cards going down"_ is therefore a build defect, not a design choice.

---

## 4. Design decisions (fixed for this run — do not re-litigate)

### D1 — One spacing contract, owned by `@876/ui`

The gutters between shell regions become named tokens in `packages/ui/src/876.css`
and are consumed by `AppShell` / `ListDetailShell`. **The sidebar-to-content gap,
the list-to-detail gap, and the content-to-right-edge gap are all the same
value** at a given breakpoint. No app re-declares them.

The sidebar card's own inset must be **symmetric**: the gap between the window
edge and the card equals the gap between the card and the content, at both rail
and panel width.

### D2 — Records own a page; the split view is for lists only

- **876 Projects**: `/projects/[projectId]` and `/issues/[issueRef]` are
  **full pages**. They do not open in a right-hand detail column.
- **Console**: project and issue detail under the Projects section and the org
  workspace open as **full pages too**, matching the Projects app exactly.
- The `ListDetailShell` split view stays where it already works — Users, Roles,
  Requests, Customers — and is not extended to Projects/Issues.

### D3 — Real icons, not placeholders

Every sidebar entry gets an icon that a person would recognise for that concept.
No two entries in one rail share an icon.

### D4 — Projects sidebar is collapsible, defaulting to icons

Projects gets the same rail/panel behavior Console already has: defaults to the
icon rail, expands to labels via the toggle, and the preference persists.

### D5 — Permissions group by product, then module

`PermissionGroup` is two-level. `876 Billing · Catalog` and
`876 Billing · Sales` become modules inside one `876 Billing` product group.
The same structure is used by the read-only access panel and the role editor.

### D6 — Everything is designed for light **and** dark

Every surface touched in this run must be checked in both themes. The comment /
Markdown editor is specifically part of this requirement.

### D7 — Deferred, deliberately

Assignee pickers and the CRM assignment integration are **out of scope**. Render
those fields as present-but-empty states; do not build the picker.

---

## 5. Phases

The states below describe the **current remote branch**.

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
- **Final browser verification remains open in `todo.md` C5.**

### Phase 3 — Sidebar icons across every app — COMPLETE

- Console and Projects use explicit semantic icon registries.
- Known collisions were separated across Projects, Issues, Board, Labels, Audit,
  Customers, Teams, Banking, Warehouses, and other rail entries.
- Projects gained the default-collapsed, expandable, persisted sidebar rail.
- Collision/regression tests were added.

### Phase 4 — 876 Projects app — COMPLETE IN CODE

Completed:

1. Collapsible persisted Projects sidebar.
2. Project detail is a standalone page with only the host breadcrumb/back affordance.
3. Project detail record/header/summary redesign.
4. Issue detail is a standalone redesigned record page with facts/activity layout.
5. Dedicated Suspense/loading boundaries for record reads.
6. Assignee/due-date/estimate remain intentionally display-only empty states.
7. Shared Markdown editor redesigned with explicit light/dark surfaces,
   focus-within treatment, responsive toolbar, and Write/Preview state.
8. Comment create/edit composition uses the same shared editor and preserves
   drafts/errors in-page.
9. Focused editor/comment regression coverage added.
10. Temporary `ProjectDetail.projectsHref` compatibility residue removed.

**Final typecheck/test/browser acceptance remains open in `todo.md` C4/C5.**

### Phase 5 — Console alignment with Projects — COMPLETE IN CODE

- Console platform and organization-workspace project/issue records use
  independent full-page routes instead of `ListDetailSection` split panes.
- Shared `@876/projects-ui` record components are reused rather than forked.
- Workspace header organization duplication is removed.
- Root Console sidebar context no longer redundantly labels itself `Console`.
- Final browser verification remains part of closeout.

### Phase 6 — Console `/workspace` index — COMPLETE

- `/workspace` now has a guarded hub page instead of 404ing.
- It uses canonical organization/entitlement resolvers and workspace cards.
- `/workspace` is bound to `console:organizations` and has route/layout tests.

### Phase 7 — Permissions UI, both surfaces — COMPLETE

- Permission grouping is product → module → permission.
- The read-only access panel, role editor, permission picker, and related role
  surfaces use the nested contract.
- Product/module grant rollups and shared module styling are covered by tests.

### Phase 8 — App assignment role mapping — DURABLE FIX COMPLETE IN CODE

- Automatic assignment paths use `resolveAppAssignmentRole` from `@876/core/access`.
- Organization `super_admin` / `super-admin` maps to app `super-admin`, `admin`
  maps to app `admin`, and ordinary members fall back to the live default role.
- Existing assignments are not overwritten during provisioning replay.
- Provisioning replay genuinely reactivates revoked assignments by clearing
  revocation/deletion metadata while preserving an administrator-selected
  `appRoleId`; focused regression coverage protects both invariants.
- The dry-run-by-default role backfill now emits organization/user/app context
  for review and applies with compare-and-set semantics rather than overwriting a
  role that changed after discovery.
- Immediately before an apply write, the backfill revalidates that the member
  still has the same active organization role and that the target app role is
  still live for the same organization/application.
- Apply output reports actual successful `changed` writes plus
  `skippedAfterDiscovery` stale/racing candidates.
- API-suite regression coverage asserts default dry-run/no-write behavior,
  compare-and-set apply, and stale-org-role skipping.
- The explicit super-admin elevation guard remains intact for requested roles.
- A dry-run-by-default backfill script exists at
  `apps/api/scripts/backfill-app-assignment-roles.ts`; **it has not been run
  against a production database**.

Still outside the durable code fix:

- The existing Efesto Projects assignment remains a production data repair.
- PROJ-10 still needs to be closed or rewritten in its actual tracker.

---

## 6. Delegation record

| Phase | Delegate                        | Model                             |
| ----- | ------------------------------- | --------------------------------- |
| 1     | `agy`                           | `gemini-3.8-flash-high`           |
| 2     | Codex                           | `gpt-5.6-terra` medium            |
| 3     | `agy`                           | `gemini-3.8-flash-high`           |
| 4     | Codex + closeout implementation | `gpt-5.6-terra` / current session |
| 5     | Codex                           | `gpt-5.6-terra` medium            |
| 6     | Codex                           | `gpt-5.6-terra` medium            |
| 7     | Codex                           | `gpt-5.6-terra` medium            |
| 8     | Codex + closeout hardening      | `gpt-5.6-terra` / current session |

Briefs live in `./briefs/<tool>/`; reports live in `./reports/<tool>/`.
The operational closeout checklist is `./todo.md`.

---

## 7. Final integration verification — STILL REQUIRED

The phase reports contain focused passing checks, but the integration branch as
one unit has not completed one executable final verification run.

While draft PR #478 was open, the repository's existing `pull_request` workflows
triggered across multiple branch heads. Relevant jobs reproducibly failed
**before step 1** with empty step lists and no logs. The result persisted after
retrying GitHub reads after a gap and after fresh commits produced new workflow
run/job ids. This is a stable Actions/runner-account execution block, not a
GitHub connector timeout and not evidence that code failed a test or compile
step.

PR #478 was then closed without merge by the `876-workspace` account at
`2026-09-05T13:18:08Z`, with no GitHub App or close reason attached. Newer branch
heads therefore no longer receive that pull-request workflow path. This session
is not silently reversing the external close.

The local container cannot substitute for CI because it has no repository
checkout or installed pnpm and its shell network path cannot obtain GitHub/npm
content. `todo.md` C4 contains the detailed execution state.

Required matrix once an executable environment is available:

```bash
pnpm --filter @876/console typecheck && pnpm --filter @876/console lint && pnpm --filter @876/console test
pnpm --filter @876/projects-app typecheck && pnpm --filter @876/projects-app lint && pnpm --filter @876/projects-app test
pnpm --filter @876/projects-ui typecheck && pnpm --filter @876/projects-ui test
pnpm --filter @876/ui typecheck && pnpm --filter @876/ui test
pnpm --filter @876/api typecheck && pnpm --filter @876/api lint && pnpm --filter @876/api test
pnpm --filter @876/core typecheck && pnpm --filter @876/core test
pnpm --filter @876/editor typecheck && pnpm --filter @876/editor test
node scripts/check-app-structure.mjs
pnpm check:transpile
```

Known baseline: `pnpm --filter @876/api boundaries` previously reported 18
`no-circular` violations on the base as well. Final verification must prove no
nineteenth violation was introduced.

Final browser acceptance must cover the touched shell/record/permissions/editor
surfaces in light and dark themes at 1280/1440/1920.

---

## 8. Task checklist — summary only

`todo.md` is the operational source of truth; this checklist summarizes the run.

- [x] Diagnose the 876 Projects comment `Forbidden.` against production
- [x] Pull Vercel logs for `876-projects`
- [x] Identify the shared product-UI Tailwind `@source` gap
- [x] Phase 1 — Tailwind `@source` for shared product-UI packages
- [x] Phase 2 — shell spacing contract and corrected Tailwind v4 gutter token
- [x] Phase 3 — distinct sidebar icons + collapsible Projects sidebar
- [x] Phase 4 — Projects app pages + editor implementation
- [x] Phase 5 — Console project/issue full-page alignment and workspace header cleanup
- [x] Phase 6 — Console `/workspace` hub
- [x] Phase 7 — permissions UI grouped by product → module → permission
- [x] Phase 8 — durable assignment-role mapping + API/core regression coverage
- [x] Harden provisioning replay lifecycle without overwriting app role
- [x] Harden backfill apply with compare-and-set and stale-candidate revalidation
- [x] Add API-suite regression coverage for replay and backfill safety
- [x] Complete PR-wide committed-diff security/escape audit
- [x] Save GitHub connector retry semantics and references
- [x] Open historical integration PR #478 as draft CI harness
- [x] Retry/reproduce the Actions pre-step infrastructure failure while PR was open
- [x] Record PR #478 external close without silently reopening it
- [ ] **PRODUCTION DATA:** review dry-run and repair/backfill the existing Efesto 876-Projects assignment to `super-admin`
- [ ] Re-read effective permissions and run production comment create/edit/delete acceptance
- [ ] Run the final integration verification matrix
- [ ] Run API boundary baseline verification
- [ ] Complete local formatter/working-tree/lockfile gate
- [ ] Complete production builds
- [ ] Complete browser visual acceptance in light/dark at required widths
- [ ] Close or rewrite PROJ-10 in its actual tracker
- [ ] Intentionally reopen/update PR #478 when final PR work resumes
- [ ] Mark the PR ready only after all acceptance gates pass

---

## 9. Current handoff state — updated 2026-09-05

### Repository implementation/static hardening is complete

Key integration and closeout commits include:

- `f005294d` — product sidebar insets aligned with shell gutter
- `1d94b272` — distinct navigation icons + collapsible Projects sidebar
- `3592b334` — Projects project/issue full-page record redesign
- `09f5320c` — Console project/issue full-page alignment
- `7edb1131` — `/workspace` hub and organization navigation resolution
- `27e795e3` — role permissions grouped by product and module
- `0ed9cb34` — shared Markdown/comment editor closeout
- `242702ef` — remove obsolete `ProjectDetail.projectsHref`
- `6db88a11` — correct Projects app runtime/build verification filters
- `f9a8af2b` — save GitHub connector retry semantics/references
- `11b70128` — fully reactivate provisioned assignments without overwriting app role
- `55a72c9e` — replay-reactivation regression coverage
- `5b6dfe7e` — compare-and-set app-role backfill writes
- `99122d33` — revalidate backfill membership/target role and enrich candidate context
- `6ca403e3` — assert default dry-run/no-write behavior in API suite
- `83ec7235` — refresh live TODO after final backfill hardening
- `286d3d2f` — reconcile orchestrator report with final static hardening/PR-close state

Earlier commits contain Phase 1 and the initial Phase 8 mapper/backfill implementation.

### Branch state at latest review

Immediately before this plan update, GitHub comparison reported the branch
**48 commits ahead of `main` and 0 behind**, with merge base
`1419aaee85264ed4c278d952af6e4687383df157`.

This plan commit advances the branch again. Re-read exact divergence before
final PR readiness.

### Runtime/external blocks

1. No connected production database/internal API execution path is available in
   this session; Neon was surfaced but remains unconnected.
2. Historical PR Actions runs reproducibly failed before step 1; PR #478 is now
   externally closed, so newer heads do not receive that PR CI path.
3. The local container has no usable repo checkout/pnpm/network path for the
   required command matrix.
4. No authenticated 876 Console/Projects browser session is available for C5.
5. PROJ-10 appears to live in an external tracker; Linear is available but not
   connected.

These blocks are not reasons to infer either success or code failure.

### GitHub retry behavior

GitHub timeouts/temp rate limits are never treated as exhausted access. Required
operations retain exact references and are retried after a short gap. See
`notes/github-tool-retry.md`.

### Production role repair remains outstanding

Safe production order:

```bash
pnpm --filter @876/api app-access:backfill-roles
# review every candidate; dryRun must be true and changed must be 0
pnpm --filter @876/api app-access:backfill-roles --apply
```

Apply revalidates membership/target role and compare-and-sets the discovered
assignment state. If `skippedAfterDiscovery > 0`, rerun dry-run before considering
another apply.

### PROJ-10 remains external

The repository's GitHub Issues search did not contain `PROJ-10`. Resolve it in
the tracker that owns the key; do not create a duplicate GitHub issue merely to
close this run.

### Final PR state

PR #478 is currently **closed and unmerged** after an external/account action.
When final PR work is intentionally resumed, prefer reopening the same PR rather
than creating a duplicate, ensure it points at the then-current branch head,
update it with exact C3/C4/C5 evidence, inspect real CI/reviews, and only then
mark it ready for review.
