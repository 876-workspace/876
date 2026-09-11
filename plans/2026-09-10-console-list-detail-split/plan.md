# Implementation Plan: Console List-Detail Split View

Run ID: `2026-09-10-console-list-detail-split`
Branch: `feature/console-list-detail-split` (cut from updated `main`)
Status: **COMPLETED ✅** (PR pending review)

## Overview & Objectives

Copy the billing `ListDetailSection` right-slide split pattern (full-width data
table when closed, condensed list + detail card on the right when a record
opens) into Console, scoped to exactly five routes:

1. `/users` (platform users)
2. `/orgs` (organizations)
3. `/widgets` (widget catalog)
4. `/settings/users` team members
5. `/settings/users/roles`

Agreed scope decisions (user-confirmed): billing-style `DetailCard` with close
button, `new`/`edit` as full-area takeovers, billing `bleed` edge-to-edge sheet
(not Console gutter+cards), settings scope is team + roles only (no
`/apps/[slug]/*`).

## Architectural Scope

- Target: `apps/console` only. No billing changes, no API/service changes, no
  new shared primitives.
- Reuse: `@876/ui/list-detail-section` (`ListDetailSection`, `bleed`),
  `@876/ui/list-detail-shell` (`useListDetailRoute`, `useDetailSegments`),
  `@876/ui/list-pane`, `@876/ui/detail-card`, `DataTableSkeleton`,
  `ResourceToolbar` + `StatusFilterHeading`.
- Invariants: Console guards (`requireSession`/`requireConsolePermission`) stay
  in layouts; data via host modules (`platform`, `workspace`) behind `Suspense`;
  expected service errors stay values (`AppError`), never thrown; no DB/provider
  access in app code; no AI attribution in commits.

## Key Design Decisions

1. **Layout owns the list** (`layout.tsx` renders `*Section` with
   `list={<Suspense><*ListData/></Suspense>}`), `(list)/page.tsx` returns `null`.
   List never remounts/refetches across open/tab/close, and the grid track
   animates instead of two trees swapping.
2. **Layouts never read `searchParams`** (*superseded for /users and /orgs by the `@list` parallel slot, see the review report*) (Next docs
   `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/layout.md#query-params`:
   layouts do not rerender on navigation). Status/type/distribution filters move
   client-side into the `*List` component (billing parity: fetch window once,
   filter in the list). This intentionally drops server cursor pagination
   (`?after/?before`) and server search (`?q`) on `/users` + `/orgs`: the layout
   list fetches one window (limit 50) and `q`/status filter client-side.
3. **Takeover segments** `['new', 'edit']` (`['new']` where no edit route
   exists): create/edit own the whole content area, sidebar prefix preserved.
   Changes current Team/Roles behavior where `new` opened in the card slot.
4. **Condensed open state uses `ListPane`** (not condensed `<Table>`): Team and
   Roles condensed tables are replaced; `CondensedTeamMemberRow` /
   `CondensedRolesTableRow` deleted as dead code.
5. **Detail chrome uses `DetailCard`** (`Header` + `RouteTabs` + `Body` +
   `IdBar`, `closeHref` back to the list preserving `?status`/`?type` query).
   Replaces `DetailHeader` full-page chrome in `users/[username]`,
   `orgs/[slug]`, `widgets/[widgetSlug]`, and the custom
   `TeamMemberCardFrame` / `RoleCardFrame`.
6. **Order**: team + roles first (smallest delta, proves
   bleed+takeover+DetailCard in Console), then widgets (static catalog), then
   users, then orgs.

## Dispatched Briefs

| Delegate | Brief |
| --- | --- |
| Codex `gpt-5.6-terra` (medium) | [review fixes](./briefs/codex/2026-09-11-review-fixes.md) |

## Execution Reports

- [Orchestrator review & verification](./reports/orchestrator/2026-09-11-review-and-verification.md) (the Codex run ended before it wrote its own report)

## Task / Phase Checklist

- [x] Branch cut from updated `main`
- [x] Pre-spike: layout + `searchParams` behavior confirmed via local Next docs
- [x] Team: `TeamShell` -> `ListDetailSection` bleed + `['new']` takeover
- [x] Team: `TeamList` condensed branch -> `ListPane`
- [x] Team: `TeamMemberCardFrame` -> `DetailCard` (close + tabs + id bar)
- [x] Roles: `RolesShell` -> `ListDetailSection` bleed + `['new']` takeover
- [x] Roles: `RolesList` condensed branch -> `ListPane`
- [x] Roles: `RoleCardFrame` -> `DetailCard`
- [x] Widgets: `WidgetsSection` + dual-mode `WidgetsList` + `DetailCard` detail
- [x] Users: `UsersSection` + dual-mode `UsersList` + `DetailCard` detail
- [x] Orgs: `OrgsSection` + dual-mode `OrgsList` + `DetailCard` detail
- [x] Review (orchestrator) + Codex terra/medium fixes — see reports/orchestrator/2026-09-11-review-and-verification.md
- [x] Typecheck + lint + tests (1752) + structure check
- [x] Atomic commits per git rules, no AI attribution

## Verification & Testing Commands

- `pnpm --filter @876/console typecheck`
- `pnpm --filter @876/console test` (vitest; update `team-list.test.tsx`,
  add `*-section` status/takeover tests mirroring billing
  `customers-section.test.tsx`, dual-mode list tests)
- `pnpm --filter @876/console lint`
- `npx prettier --write <changed paths>` (changed files only, never repo-wide)
- Manual per route: closed = full-width edge-to-edge table; open = animated
  grid, pinned toolbar, condensed list with selected row, detail slides in
  right with working close (query preserved); `new`/`edit` = full takeover;
  narrow viewport = detail only + toolbar; refresh on detail URL works.

## Multi-Session Continuity & Handoff State

- Done: branch exists; Team shell/list/card-frame + Roles shell/list/card-frame
  edits applied (uncommitted); `roles-table-row.tsx` syntax break fixed (missing
  newline after import).
- In progress: Team + Roles conversion (files touched, nothing committed yet).
- Next: run typecheck, fix fallout, update/extend tests, then widgets ->
  users -> orgs in that order. Nothing committed — per git rules, commit only
  on explicit user prompt, atomically per file group.
- Follow-up (uncommitted): search bars in `users/layout.tsx` + `orgs/layout.tsx`
  wrapped with `@3xl/list-detail:px-4` so they sit at the toolbar chrome's
  16px inset instead of touching the list-column edges; `UsersTable` wrapper
  gained `overflow-hidden` for parity with `OrgTable`/`WidgetsTable`. Tables
  stay full-bleed per the approved billing pattern; toolbar inset comes from
  the shared shell chrome (untouched, billing parity).

## PR Preparation Summary

Not yet — no commits, no PR. Will record commit SHAs and verification evidence
here when the feature is complete and the user prompts for commits/PR.
