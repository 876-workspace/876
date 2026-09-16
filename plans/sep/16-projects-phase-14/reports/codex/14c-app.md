# Report 14c — Projects app: activity, followers, discussions, wiki, client portal

- Status: complete, all verifications green.
- Scope kept to `apps/projects/**` (plus this report, as ordered). No commit/branch/push, no `eslint-disable` / `as any` / `@ts-ignore`, no run logs in the repo.
- Prior session delivered pages, routes, portal, and ~52 `it()`; this session fixed all typecheck/lint/test fallout, added 32 `it()` (floor 70 → **84**), re-verified everything, and wrote this report.

## What was built (prior + this session)

- Project tabs **Activity**, **Discussions** (list/new/thread with replies, pin/lock behind `projects.edit`), **Wiki** (tree, page view, new/edit with `MentionInput`, revisions, restore), **Clients** (grants list, invite by existing-org-member search, revoke — `projects.edit`) under `app/(app)/projects/[projectId]/**`; global `app/(app)/activity` page.
- Follow button on project, phase, and work-item detail (`FollowData`); `ClientVisibleToggle` (`projects.edit`) on phase, work item, attachment, comment, and discussion detail.
- Client portal `app/portal/[projectId]/**` (own layout, outside `(app)`): Overview, Phases, Work, Files, Discussions, Time (hours by phase), Invoices (status). Guard = signed-in session + live grant probed through the portal client only (`lib/portal-access.ts`, never `projects.view`); portal uses `@876/projects/portal` only. Reply handlers under `app/api/portal/[projectId]/**` check visibility through the portal client, then write through the internal client with the portal user as author (backend portal family is read-only).
- Thin permission-checked internal routes for all mutations (`app/api/**`, shared `app/api/_lib/{follow-route,visibility-route}.ts`); acting user always from the session; browser payloads are JSON-only via the typed client (`lib/client/collaboration.ts`).
- Visibility for issues/comments/phases goes through server-only `lib/visibility.ts` + `lib/attachment-links.ts` (internal `PATCH …/client-visibility` with `PROJECTS_INTERNAL_KEY`); discussions use package verbs. Reads use local extended schemas since package read models strip `clientVisible`.
- Deliberate deviation: `@876/projects-ui/collaboration/*` components exist but have no entries in that package's exports map, and the package is another lane's scope — equivalent UI lives in `features/collaboration/components/` instead.

## Fixes this session

- Typecheck: narrowed `result.error?.message/status` fallbacks in `app/api/_lib/visibility-route.ts` and both attachment routes; `?.` indexing for optional visibility maps in `issue-comments-data.tsx`; missing `ClientVisibleToggle` import in `phase-comments.tsx`.
- Lint (2 errors → 0): `prefer-const` in `mention-input.test.tsx`; restructured `GrantInviteForm` so short-query option clearing happens in the change handler, not synchronously in the effect.
- Lint warnings in-lane removed: dead imports in `issue-detail-data.tsx`, unused `issueId` prop (component + call site), unused `_context` param in members search route.
- Tests (9 failed → 0): `humanizeActivityType` emitted initials (`S C`) instead of words — mapper fixed to `State Changed`; portal-boundary static assertions tripped on the literal strings `projects.view` / `@/lib/services/projects` inside comments — comments reworded (no behavior change); `mention-input` failures came from the test harness (manual `rerender` inside the change handler breaks user-event caret tracking; verified the component works with realistic `useState` control) — tests rewritten with a stateful wrapper; `issue-detail-data` rendered empty because nested async `IssueVisibilityData`/`FollowData` suspend in jsdom — fetches lifted into the awaited `IssueDetailData`, `IssueVisibilityData` is now a synchronous component taking `following` + `visible` props.

## Tests

- 13 files / **84 `it()`** (floor 70): `lib/__tests__/{portal-access (9), portal-boundary (5), visibility (14)}`, `features/collaboration/__tests__/{mappers (15), mention-input (5), client-visible-toggle (4)}`, `lib/client/collaboration (9: follow paths ×3, discussion create/reply, wiki restore, grant invite/revoke, issue visibility)`, route tests for project follow (4), discussions collection (3) + item (4: edit perm, empty-update 422, delete, not-found 404), wiki create (3: edit perm, actor injection, slug format), client-grants invite + revoke (5), portal discussion reply (4: no-grant 404, empty 422, portal visibility check before write, hidden discussion 404).
- Required cases: portal pages/handlers/components never import the internal projects service (static import test), guard denies with no grant, revoked grant reads as not found.

## Verification (in order)

- `pnpm --filter @876/projects-app typecheck` — exit 0.
- `pnpm --filter @876/projects-app lint` — exit 0, 0 errors; 4 warnings, all pre-existing in untouched files (`app/login`, `app/register`, `components/shell` `window.location.assign`).
- `pnpm --filter @876/projects-app test` — 206 files / 1374 tests passed.
- `node scripts/check-app-structure.mjs projects` — OK.
- `pnpm check:rsc-boundaries` — OK (10 apps).

## Notes for sibling lanes

- `packages/projects-ui/**` untouched; if 14b later adds `./collaboration/*` exports, a follow-up could re-adopt them, but nothing here depends on that.
- No email step for invites (notification + copyable portal link only), per plan binding decision 8.
- Long commands in this environment must be launched detached (`setsid nohup … & disown`) with output polled from a file; `write_stdin` session polling and `pkill -f` self-match are unreliable here.
