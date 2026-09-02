# Phase 3 — CRM `/settings/users`: the member list/detail split view

**Model:** `gpt-5.6-terra`, `model_reasoning_effort=high`
**Repo:** `/root/projects/876`. **Branch:** `feature/app-access-adoption` — already checked out. Do not create, switch, merge, rebase, or delete any branch. **Do not commit.**

**Depends on Phase 1 (`@876/ui/settings-hub`) and Phase 2 (`@876/access-ui`), both already merged into this branch. Read what they actually export before using them — do not assume from this brief.**

## Why

CRM has no member management at all: `apps/crm/src/lib/auth/roles.ts` knows only a
normalized organization role, and the settings hub lists **Members** as `planned`.
This phase makes it real, using the exact list/detail shape Console's
`/settings/users` established, so an operator moving between 876 surfaces meets one
pattern rather than three.

## Read first (binding)

- `.claude/rules/app-layout.md` **§5a in full** — the list/detail split, and especially the height rule. Getting the height wrong is the most common way this layout ships broken.
- `.claude/rules/app-structure.md` — route-local `_components/` / `_lib/` / `_data.ts`; no barrels; no app-name prefixes.
- `.claude/rules/data-loading.md` — chrome renders before I/O; suspend only what waits.
- `.claude/rules/app-api-routing.md` and `.claude/rules/api-access.md` — thin route handlers, no server actions.
- `.claude/rules/error-handling.md` — expected failures are values; an error never owns the page.
- `.claude/rules/access-control.md` — the three enforcement layers; navigation hiding is never security.
- `CLAUDE.md` → "Loading States & Suspense Placement", "UI Copy", "UI Design".

## Reference implementation — read it, do not copy blindly

`apps/console/src/app/(app)/settings/users/` — specifically `(team)/layout.tsx`,
`(team)/_components/team-shell.tsx`, `_components/team-list.tsx`,
`_components/team-member-row.tsx`, `[id]/layout.tsx`, `[id]/_data.ts`, `[id]/page.tsx`.
**Do not modify anything under `apps/console/`.** Console is already built and works.

## Verified contracts — build on these

Get the CRM workspace client with `await getWorkspace()` from
`@/lib/services/workspace` (request-scoped, session authority).

**One call returns the whole roster, already carrying identity and position:**

```ts
const { data, error } = await workspace.members.list(orgId)
// data.data: Array<{
//   object: 'organization_member'
//   id: string            // the MEMBERSHIP id — this is the route param
//   user_id: string
//   role: string
//   role_id: string | null
//   position: string | null      // the ERM job position, already joined
//   status: string
//   first_name: string | null
//   last_name: string | null
//   email: string | null
//   avatar: string | null
//   created_at: number
// }>
```

**Do not fetch identities one per row.** Everything the list renders is in that
response. A `Promise.all(rows.map(retrieve))` is still an N+1 and is a defect here.

**One call returns a member's access across every entitled app:**

```ts
const { data } = await workspace.appMemberships.listForMember(
  orgId,
  membershipId
)
// one AdminAppMembership-shaped row per entitled app
```

**Assignable roles for one app:**

```ts
const { data } = await workspace.orgAppRoles.list(orgId, appId)
```

**The catalog** for an app slug is `appPermissionCatalogs[slug]` from
`@876/core/access/catalogs`.

**The guard already exists — use it, do not write another:**
`apps/crm/src/lib/auth/app-access.ts` exports `resolveCrmAccessViewer(orgId)`
(memoized, returns `{ membershipId, userId, permissions, canReadMembers,
canManageAppAccess }` or `null`) and `requireAppAccessManager(orgId)` (returns
`{ viewer, response }`; return `response` as-is from a route handler when non-null).

`requireCrmContext()` from `@/lib/auth/require-crm-context` gives
`{ userId, orgId, orgName, orgSlug, role, organizations, accessStatus }`.

## Scope

### 1. Routes — `apps/crm/src/app/(app)/settings/users/`

```
layout.tsx                       shell: toolbar + list, persistent
(list)/page.tsx                  returns null — the list lives in the layout
[membershipId]/layout.tsx        DetailCard chrome + route tabs
[membershipId]/page.tsx          Overview
[membershipId]/access/page.tsx   App access
[membershipId]/_data.ts          memoized member + app-membership reads
_components/…                    the client components below
_lib/…                           pure helpers, no JSX
```

**The shell is rendered from `layout.tsx`, never from a page** — that is what keeps
the toolbar and list mounted across open/close and lets the grid track animate.

Use `ListDetailShell` + `useListDetailRoute` from `@876/ui/list-detail-shell`,
`ResourceToolbar` from `@876/ui/resource-toolbar`, `StatusFilterHeading` from
`@876/ui/status-filter-heading`, `ListPane*` from `@876/ui/list-pane`, and
`DetailCard*` from `@876/ui/detail-card`. **Do not copy any of them into the app.**

**Height (§5a):** CRM renders on `AppShell`, so the shell's container is
`<Page className="h-full min-h-0">`. The list data component is
`flex h-full min-h-0 flex-col gap-3`, and its Suspense fallback uses the **same**
wrapper. The detail route returns the card as the column's only child — no wrapper
div, no breadcrumb. Do not add `overscroll-contain` to any pane.

**Toolbar:** title `Users`, `titleFilter` a `StatusFilterHeading` over member status
(`all` / `active` / `suspended`), `primaryLabel="Add"`, `primaryVariant="info"`,
`refresh`. The toolbar never unmounts when a member opens. `?status=` absent or
`all` means no filter — pass `undefined`, never the literal `"all"`.

A layout receives no `searchParams`, so read the status with `useSearchParams()` in
the **client** shell component and filter in the **client** list component, exactly
as `apps/billing/src/app/(app)/customers/_components/customers-list.tsx` documents.
Carry that comment across.

**`primaryHref`:** CRM cannot create a user — organization membership comes from an
invite. Point `Add` at `/settings/users/invite` only if you also build that route;
otherwise **omit the primary button entirely** rather than shipping a dead link.
State which you chose in the report.

### 2. The list

One component renders **both** forms — the full table when closed and the condensed
`ListPane` when a member is open — reading `useDetailSegments()` for the selection.
Do not swap components; that would remount on every open and let the two drift.

Full table columns, following `app-layout.md` §12:

| Column                                               | Tier                                |
| ---------------------------------------------------- | ----------------------------------- |
| Member (avatar + name, email or `@username` beneath) | 1 — `font-medium`, the row link     |
| Email                                                | 3 — muted                           |
| Position                                             | 3 — muted, em dash when null        |
| Organization role                                    | badge                               |
| Status                                               | `<Badge>`, never bare coloured text |

The condensed row keeps everything the full row encodes: name, position (or role as
fallback), and a status badge when status is not `active`.

Add `_components/users-skeleton-columns.ts` with the real column set and use
`DataTableSkeleton` for the fallback, per `CLAUDE.md`.

### 3. Detail

`[membershipId]/layout.tsx` awaits `params` and **nothing else** (see
`.claude/rules/navigation-performance.md` Rule 2). Build the tab strip from
`params` and render it immediately; stream the member identity inside a `<Suspense>`
and call `notFound()` there when the membership does not exist.

Tabs: **Overview**, **App access**.

`page.tsx` (Overview), in two sections:

**Profile** — name, email, organization role, status, member since, membership id,
using `DetailCardSection` / `DetailCardFacts` / `DetailCardFact` from
`@876/ui/detail-card`. Do **not** nest an `876-card` inside the card body.

**Employment** — the ERM half. Resolve it with **one** call:

```ts
const { data, error } = await workspace.employees.list(orgId)
// data.data: AdminEmployeeProfile[] — one per membership that has a profile
```

Index that list by `membership_id` and pick this member's. Render, omitting any
field that is null rather than printing a row of em dashes: employee number, job
title, department, location, manager, employment type, employment status, start
date. `department_id`, `location_id`, and `manager_membership_id` are opaque ids —
resolve the manager's name from the roster you already have, and render department
and location by id only if you cannot resolve a name without another round trip.

Rules for this section:

- **Do not fetch one profile per member.** `workspace.employees.list(orgId)`
  returns the whole organization; a per-row retrieve is the N+1 this brief exists
  to prevent.
- A member with **no** employee profile is normal, not an error. Render the
  Profile section alone and omit Employment entirely — do not render an empty
  card, and do not invent placeholder values.
- If the employees call **fails**, keep the Profile section and show a compact
  `AppError` notice in place of Employment, per `.claude/rules/error-handling.md`.
  A failed enrichment must never blank the page or be mistaken for "no profile".
- Fetch the employee list and the app memberships in parallel with `Promise.all`;
  neither depends on the other.

Below both sections, render `AppAccessSummary` from `@876/access-ui`.

`access/page.tsx`: render `AppAccessPanel` from `@876/access-ui`, fed by a server
component that resolves, in parallel with `Promise.all`:

- `workspace.appMemberships.listForMember(orgId, membershipId)`
- `workspace.orgAppRoles.list(orgId, appId)` for each entitled app returned above

Map those plus `appPermissionCatalogs[appSlug]` into `AccessAppEntry[]`. An app with
no catalog entry renders with an empty catalog — do not throw, and do not drop the app.

Pass `readOnly={!viewer.canManageAppAccess}`.

### 4. Mutations

`apps/crm/src/app/api/app-memberships/route.ts` (`POST`) and
`apps/crm/src/app/api/app-memberships/[assignmentId]/route.ts` (`PATCH`, `DELETE`).

Each handler, in this order: `requireCrmContext`-equivalent context via
`getCrmApiContext()`; `requireAppAccessManager(context.orgId)` and return its
`response` when non-null; parse the body; call **one** `workspace.appMemberships.*`
operation; return the `{ data, error }` envelope. **No business logic.** Follow the
shape of `apps/crm/src/app/api/teams/route.ts`.

Add `apps/crm/src/lib/client/app-memberships.ts` (`'use client'`) with
`create`/`update`/`remove` over `request` from `./request`, and register it in
`apps/crm/src/lib/client/index.ts` alongside the existing resources.

### 5. Settings hub

In `apps/crm/src/app/(app)/settings/_lib/settings-nav.ts`, flip the **Members** item
to `availability: 'available'` with `href: '/settings/users'`. Rename its label to
`Users` so it matches the page it opens. Update `settings-nav.test.ts` accordingly.

## Tests — at least 32 `it()` cases

- **List** (≥8): both forms render; the condensed row keeps position and status; the selected row is marked; an empty roster renders an empty state; the status filter narrows rows; `all` shows every row; a member with no position renders an em dash; a member with no email renders without throwing.
- **Employment section** (≥6): renders every present field; omits a null field rather than printing an em dash; a member with no profile renders Profile alone and no Employment card; a failed employees call renders an error notice **and keeps Profile mounted**; the manager is resolved to a name from the roster; the employees endpoint is called **once** for the page, never once per member.
- **Detail layout** (≥4): tabs render before the member resolves; `notFound()` on a missing membership; tab hrefs carry the membership id; the card is the column's only child.
- **Access page mapping** (≥6): entries are built from memberships + roles + catalog; an app with no catalog entry still renders; `readOnly` is true without `apps:assign`; the role list comes from `orgAppRoles`; a failed `listForMember` renders an error notice **and keeps the page chrome**; a failed `orgAppRoles` degrades that app's picker without hiding the others.
- **Route handlers** (≥8): unauthenticated → 401 and the workspace client is **not** called; authenticated without `apps:assign` → 403 and the workspace client is **not** called; valid create → 201 and `create` called with exact args; valid update → 200 and exact args; delete → 200; invalid JSON body → 400; a workspace error is returned as a value with a non-2xx status; unknown body fields do not reach the client.

Assert exact arguments with `toHaveBeenCalledWith`, exact call counts with
`toHaveBeenCalledTimes`, and both sides of every `{ data, error }`.

## Hard constraints

- **No `eslint-disable`, no `@ts-ignore`, no `as any`.**
- No server actions. No `proxy.ts` / `middleware.ts`.
- No raw `fetch` to the identity API from a page or component.
- No green interactive controls.
- No description paragraph under any heading; no `EmptyDescription` restating the obvious.
- Do not read `useSearchParams()` inside a `loading.tsx`.
- Do not put a `loading.tsx` at a segment that contains a route group with its own.
- Do not weaken a production signature to make a test easier.
- Do not modify `apps/console/`, `apps/billing/`, `apps/invoice/`, `apps/api/`, `packages/`, or `apps/crm/src/lib/auth/app-access.ts` (the guard is written and tested — use it).
- Do not run `git commit`, `git push`, or any branch operation.

## Verification you must run and report

```bash
pnpm --filter @876/crm-app typecheck
pnpm --filter @876/crm-app test
pnpm --filter @876/crm-app lint
node scripts/check-app-structure.mjs
```

Report the **counted** number of `it()` cases per file and each command's output tail.

## Report

Write `plans/2026-09-02-app-access-adoption/reports/codex/2026-09-02-phase-3-crm-settings-users.md`
with the file table, per-file `it()` counts, verification output, the `Add`-button
decision, every judgement call the brief left open, anything you could not do and
why, and anything you found that contradicts this brief.
