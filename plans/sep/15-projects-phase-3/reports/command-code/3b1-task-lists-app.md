# 3b1 — Task lists, work breakdown and issue placement (Projects app)

- Harness: Command Code CLI. Model id is not exposed to the session (`MODEL` /
  `COMMAND_CODE_MODEL` are unset) — recorded as **unknown**.
- Branch: `feature/projects-phase-3-task-lists`
- Binding: `plans/2026-09-15-projects-phase-3/plan.md` decisions 1–4 and 6:
  Task List is project-owned with optional phase, `Issue.taskListId` nullable,
  archive = `archivedAt` with opt-in include, WBS as a read model
  (phases → task lists → root work items, plus unphased lists and unlisted
  items), derived progress, reads `projects.view` / writes `projects.edit`.
- Rules applied: `.claude/rules/app-layout.md` §2–5 (standard container,
  `ResourceToolbar`, bare-verb labels, no green buttons, no explanatory `<p>`
  under headings), `.claude/rules/data-loading.md` (charts render immediately,
  only live regions suspend; form shell never suspended for one live select),
  `.claude/rules/app-api-routing.md` Pattern A (authorize → one owning verb →
  `apiJson`, no server actions).

## Files

Route handlers (new):

- `apps/projects/src/app/api/task-lists/route.ts` — POST create
- `apps/projects/src/app/api/task-lists/[taskListId]/route.ts` — PATCH, DELETE
- `apps/projects/src/app/api/task-lists/[taskListId]/archive/route.ts` — POST
- `apps/projects/src/app/api/task-lists/[taskListId]/restore/route.ts` — POST
- `apps/projects/src/app/api/task-lists/[taskListId]/issues/route.ts` — POST move
- `apps/projects/src/app/api/projects/[projectId]/task-lists/order/route.ts` — PUT

Route handlers (edited):

- `apps/projects/src/app/api/issues/route.ts` — accepts `taskListId`, `cycleId`
- `apps/projects/src/app/api/issues/[issueRef]/route.ts` — same

Browser client:

- `apps/projects/src/lib/client/task-lists.ts` (new)
- `apps/projects/src/lib/client/index.ts` — `taskListsClient` export
- `apps/projects/src/lib/client/projects.ts` — issue params accept `cycleId`

Server service accessor:

- `apps/projects/src/lib/services/projects.ts` — `taskLists` getter

Pages (new):

- `apps/projects/src/app/(app)/task-lists/new/page.tsx` (`?project=`)
- `apps/projects/src/app/(app)/task-lists/[taskListId]/edit/page.tsx`

Components (new):

- `apps/projects/src/features/projects/components/task-list-form.tsx`
- `apps/projects/src/features/projects/components/new-task-list-data.tsx`
- `apps/projects/src/features/projects/components/edit-task-list-data.tsx`
- `apps/projects/src/features/projects/components/work-breakdown.tsx`
- `apps/projects/src/features/projects/components/work-breakdown-data.tsx`

Components (edited):

- `apps/projects/src/features/projects/components/issue-form.tsx` — Task list
  and Cycle selects
- `apps/projects/src/features/projects/components/new-issue-data.tsx`
- `apps/projects/src/features/projects/components/edit-issue-data.tsx`
- `apps/projects/src/lib/work-structure-data.ts` — `listProjectTaskLists`
- `apps/projects/src/app/(app)/projects/[projectId]/_components/project-detail-data.tsx`
  — own `<Suspense>` + skeleton below the existing content

Tests:

- `apps/projects/src/app/api/task-lists/route.test.ts`
- `apps/projects/src/app/api/task-lists/[taskListId]/route.test.ts`
- `apps/projects/src/app/api/task-lists/[taskListId]/archive/route.test.ts`
- `apps/projects/src/app/api/task-lists/[taskListId]/restore/route.test.ts`
- `apps/projects/src/app/api/task-lists/[taskListId]/issues/route.test.ts`
- `apps/projects/src/app/api/projects/[projectId]/task-lists/order/route.test.ts`
- `apps/projects/src/app/api/issues/route.test.ts` (new file)
- `apps/projects/src/app/api/issues/[issueRef]/route.test.ts` (extended)
- `apps/projects/src/features/projects/components/task-list-form.test.tsx`
- `apps/projects/src/features/projects/components/work-breakdown.test.tsx`

## Counted tests

| File | it() |
| ---- | ---- |
| `src/app/api/task-lists/route.test.ts` | 7 |
| `src/app/api/task-lists/[taskListId]/route.test.ts` | 7 |
| `src/app/api/task-lists/[taskListId]/archive/route.test.ts` | 4 |
| `src/app/api/task-lists/[taskListId]/restore/route.test.ts` | 3 |
| `src/app/api/task-lists/[taskListId]/issues/route.test.ts` | 5 |
| `src/app/api/projects/[projectId]/task-lists/order/route.test.ts` | 4 |
| `src/app/api/issues/route.test.ts` | 7 |
| `src/app/api/issues/[issueRef]/route.test.ts` | 4 added (file total 9) |
| `src/features/projects/components/task-list-form.test.tsx` | 6 |
| `src/features/projects/components/work-breakdown.test.tsx` | 8 |

New `it()` total: **55** (floor 20). Route tests cover auth 403 passthrough,
422 validation (empty body, blank name, empty `issueIds`/`orderedIds`, unknown
fields including a browser-supplied `actorUserId`/`creatorUserId`), actor
binding from the session, success envelopes, 404 mapping, and the cycle
assign/unassign/no-op branches. Component tests cover the form fields, bare-verb
`Add` label, per-project phase filtering, create/update payloads, failure
banner, WBS groups (phase / No phase / Unlisted), owner + derived progress,
archive/restore/reorder through the client, and hidden actions without
`projects.edit`.

## Verification

- `pnpm --filter @876/projects-app typecheck`: pass
- `pnpm --filter @876/projects-app lint`: pass, 0 errors, 4 pre-existing
  warnings in unrelated `login`, `register`, `shell/org-switcher`,
  `shell/user-menu` files
- `pnpm --filter @876/projects-app test`: 50 files / 336 tests passing — but
  **only** when run as `NODE_ENV=test pnpm --filter @876/projects-app test`.
  This shell inherits `NODE_ENV=production`, which makes React resolve its
  production build and every jsdom component test (including untouched files
  such as `member-picker.test.tsx`, `users-list.test.tsx`,
  `mobile-nav.advanced.test.tsx`) fail with `React.act is not a function`.
  That failure mode reproduces on files this brief never touched, so it is
  environmental, not a regression.
- `node scripts/check-app-structure.mjs`: `app-structure: OK (console, billing,
  couriers, 876, enterprise, invoice, crm, projects, commerce)`

## Unverified items

- **`cycleId` on issue write is not a service field.** `apps/projects-api`'s
  `createIssueBodySchema` / `updateIssueBodySchema` are `strictObject`s with
  `taskListId` but no `cycleId`, so sending it through
  `projects.issues.create/update` would 400 at the service. The app route
  therefore strips `cycleId` and applies it through the owning cycle verbs
  (`projects.cycles.assignIssues`, `projects.cycles.unassignIssue`) after the
  issue write, then re-reads the issue so the response is not stale. This is
  two service calls in one handler; if the API grows `cycleId` on the issue
  body, the app route should collapse back to a single call.
- The `cycleId` branches are covered only by mocked route tests — no live
  service run, so the assignment ordering and the re-read were not exercised
  against a real database.
- `workBreakdown` is assumed to include archived task lists (the API calls
  `listTaskLists(tenantId, projectId, true)`), which is what makes the
  Restore action reachable from the project page. Not verified against a
  running service.
- No browser was opened: page layout, the Suspense skeleton, reorder behaviour
  in the DOM and the mobile rendering of the work-breakdown rows were not
  visually checked.
- No production build was run (`pnpm --filter @876/projects-app build`).
- `apps/projects-api` tests, `@876/projects` package tests and the whole-repo
  `pnpm check` were not run — this brief scopes verification to the Projects
  app plus the structure check.
- Task lists have no standalone list page (none was specified); they are
  reached from the project detail work breakdown and from the issue form.
