# Report 14d — Console: Projects activity, discussions, wiki, client grants (read-only)

- Status: complete, all verifications green.
- Scope kept to `apps/console/**` (plus this report, as ordered). No commit/branch/push, no `eslint-disable` / `as any` / `@ts-ignore`, no run logs in the repo.
- Untracked files outside `apps/console/**` visible in `git status` (e.g. `apps/projects-api/**`, `union-alpha-evaluation.md`) belong to concurrent lanes and were left untouched.

## What was built

- Shared read-only data layer, one component per resource for both hosts (platform `/projects` + workspace `/workspace/[orgSlug]/projects`), following `automation-data.tsx`:
  - `features/projects/collaboration-mappers.ts` — `toUiActivityItem` (unknown subjectType falls back to `project`, `subjectLabel`/`actorLabel` are raw ids, `State Changed`-style summaries), `toUiDiscussion` (`lastPostAt: null`, service has no such field), `toUiDiscussionPost` (`editedAt` from `editCount`, `Unknown` author), `toUiWikiPage` (`parentId`/`currentRevision` from `parentPageId`/`revisionCount`), `toUiWikiRevision` (newest-first numbering `total - index`, clamped at 1), `toUiClientGrant` (raw `userId` label).
  - `features/projects/components/activity-data.tsx` — `ProjectActivityData` (project retrieve + `activity.listProjectActivity` limit 25, cursor `?cursor=` next link) and `ActivityData` (global aggregation: list 20 projects, 10 items each, merge newest-first capped at 50, partial-failure banner). Renders shared `ActivityFeed`.
  - `features/projects/components/discussions-data.tsx` — `ProjectDiscussionsData` (pinned-first sort, `DiscussionList`) and `DiscussionThreadData` (retrieve + `listPosts`, local `ReadOnlyDiscussionThread`).
  - `features/projects/components/wiki-data.tsx` — `ProjectWikiData` (`WikiTree`), `WikiPageData` (tree + `WikiPageView` + `ReadOnlyWikiRevisionList` with a "View all revisions" link), `WikiRevisionsData` (dedicated revisions record).
  - `features/projects/components/clients-data.tsx` — `ProjectClientsData` (`clientGrants.list` with `includeRevoked: true`, local `ReadOnlyClientGrantList`).
  - Console-local read-only presentation (no forms, no buttons): `read-only-discussion-thread.tsx`, `read-only-wiki-revisions.tsx`, `read-only-client-grants.tsx`.
- Presentation reuses `@876/projects-ui/collaboration/*` directly where read-only: `activity-feed`, `discussion-list`, `wiki-tree`, `wiki-page-view` (+ `client-visible-badge`, `finance/format-money`).
- Project record tabs extended to nine: Overview, Activity, Discussions, Wiki, Clients, Gantt, Time, Finance, Attachments (`features/projects/components/project-tabs.tsx`, params-only so tab switches never wait on record data).
- Routes, both trees (16 pages):
  - Global: `projects/activity` (platform uses `getPlatformOrganization` + unavailable state; workspace uses `resolveOrg` + `notFound`).
  - Record: `projects/projects/[projectId]/{activity,discussions,discussions/[discussionId],wiki,wiki/[pageRef],wiki/[pageRef]/revisions,clients}` and workspace equivalents. Record pages keep `ProjectTabs`; `generateMetadata` resolves the project/discussion/page title with a plain fallback.
- `features/projects/test-fixtures.ts` extended with `makeActivityItem`, `makeDiscussion`, `makeDiscussionPost`, `makeWikiPage`, `makeWikiRevision`, `makeClientGrant`.

## Deliberate deviation (as the brief anticipates)

- Shared `DiscussionThread` requires `replyAction`, `WikiRevisionList` requires `restoreActionBase`, `ClientGrantList` requires `revokeActionBase` — all render mutation `<form>`s. Console is read-only, so these three are **not** used; the Console-local `ReadOnly*` variants above render the same header/row markup without forms. Reported here per the brief's "else Console-local and report it".
- Global `projects/activity` is a route in both trees but was intentionally **not** added to the platform nav (`components/shell/nav-config.ts`) or the workspace registry (`features/orgs/app-workspaces.ts`): adding it would require a new `WorkspaceIconKey`/nav icon plus exact-list test updates, and the brief orders routes + tabs, not rail changes. Follow-up can promote it to the rail.

## Tests

- 6 files / **39 `it()`** (floor 20): `collaboration-mappers.test.ts` (13: subject fallback, summaries, null actors, thread mapping, edit-count logic, wiki numbering/clamp, grant timestamps), `activity-data.test.tsx` (6: per-project fetch + limit, cursor forward + load-more href, error banner, notFound, global aggregation + limits, project-list error), `discussions-data.test.tsx` (6: list href, pinned-first sort, error banner, thread without reply form, posts-error banner, unknown-discussion notFound), `wiki-data.test.tsx` (7: tree href, pages error, page body + no forms/buttons, revisions link, unknown-page notFound, revisions list without forms, revisions error), `clients-data.test.tsx` (4: grants fetch with `includeRevoked`, revoked badge without forms, empty state, error banner), `project-tabs.test.tsx` (3, updated: nine tabs, collaboration hrefs, workspace base encoding).
- Fallout fixed: `wiki-data.test.tsx` asserted `getByText('Revision 3')` but the page badge and the first revision row both render that string — switched to `getAllByText` length assertion (no production change).

## Verification (in order)

- `pnpm --filter @876/console typecheck` — exit 0 (one fallout fixed: narrowed `pagesResult.error ?? revisionsResult.error` into a `wikiError` const before passing to `AppError`).
- `pnpm --filter @876/console lint` — exit 0, 0 errors; 22 warnings, all pre-existing in untouched files (none in lane files).
- `pnpm --filter @876/console exec vitest run src/features/projects src/components/shell src/features/orgs` — 57 files / 446 passed.
- `node scripts/check-app-structure.mjs console` — OK.
- `pnpm check:rsc-boundaries` — OK (10 apps).
