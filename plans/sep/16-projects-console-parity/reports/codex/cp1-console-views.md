# CP1 — Console read-only views for Projects phases 1–9

Two-agent session. The first agent built all routes/components/tests (typecheck green);
this session fixed the remaining lint errors, diagnosed the test failures, fixed every
failure owned by CP1, and ran the full verification chain. No commit/branch/push.
Only `apps/console/**` touched by CP1; `apps/projects/**` changes in the tree belong
to the concurrent agent.

## Files

**Config (modified)**
- `apps/console/src/features/orgs/app-workspaces.ts` — 5 sections for `876-projects`
  (`phases`, `cycles`, `task-lists`, `calendar`, `time`); `WorkspaceIconKey` extended
- `apps/console/src/features/orgs/app-workspaces.projects.test.ts` — updated (10 sections)
- `apps/console/src/components/shell/nav-config.ts` — 5 platform `/projects` children,
  all `projects/dashboard.view`
- `apps/console/src/components/shell/nav-icons.tsx` — `phases|cycles|task-lists|calendar|time` icons
- `apps/console/src/features/orgs/components/workspace-icon.tsx` — card colors
- `apps/console/src/components/shell/sidebar.test.tsx` — pinned `/projects` context list
  extended with the 5 new items

**Shared data components (new, `apps/console/src/features/projects/`)**
- `components/project-tabs.tsx` (params-only `base` + `projectId`), `components/phases-data.tsx`,
  `components/phase-detail-data.tsx`, `components/cycles-data.tsx`, `components/cycle-detail-data.tsx`,
  `components/task-lists-data.tsx`, `components/calendar-data.tsx`, `components/time-entries-data.tsx`,
  `components/timesheets-data.tsx`, `components/timesheet-detail-data.tsx`,
  `components/project-gantt-data.tsx`, `components/project-time-data.tsx`,
  `components/project-finance-data.tsx`, `components/attachments-data.tsx`,
  `components/read-only-gantt-view.tsx`, `components/read-only-time-entries.tsx` (client wrappers;
  all callbacks stay inside client modules), `components/operator-format.ts`,
  `components/operator-skeleton-columns.ts`, `phase-status.ts`, `cycle-status.ts`,
  `time-status.ts`, `test-fixtures.ts`
- `components/issue-detail-data.tsx` (modified) — relations, blocked-by/blocking,
  time logged, attachments; new `actorUserId` prop

**Routes (new pages, both trees sharing one data component each)**
- Platform `(app)/projects/`: `phases/`, `phases/[phaseId]/`, `cycles/`, `cycles/[cycleId]/`,
  `task-lists/`, `calendar/`, `time/`, `time/timesheets/`, `time/timesheets/[timesheetId]/`,
  `projects/[projectId]/{gantt,time,finance,attachments}/`
- Workspace `(app)/workspace/[orgSlug]/projects/`: same set
- Modified: both `projects/[projectId]/page.tsx` (tab strip), both `issues/[issueRef]/page.tsx`
  (`actorUserId` via `getAuthSession`/`isSignedSession`)

**Tests (new)** — 15 component test files + `components/shell/nav-config.projects.test.ts`

## Test count

- **49 new `it()`** (floor 40): 46 across the 15 data-component/tab test files
  (calendar 3, cycles 3, cycle-detail 3, phases 3, phase-detail 4, task-lists 3,
  time-entries 3, timesheets 3, timesheet-detail 3, project-time 3, project-gantt 3,
  project-finance 3, project-attachments 3, project-tabs 2, issue-detail 4)
  + 3 in `nav-config.projects.test.ts`.
- Updated, not counted as new: `app-workspaces.projects.test.ts`,
  `sidebar.test.tsx` (36), board `page.test.tsx` (3), workspace issue `page.test.tsx` (2).

## Verification output

- `pnpm --filter @876/console typecheck` → **exit=0**
- `pnpm --filter @876/console lint` → **0 errors**, 22 warnings (all pre-existing
  `no-unused-vars`/location-assign in untouched files)
- `pnpm --filter @876/console test` → **223/224 files, 1888/1892 tests pass**.
  The only 4 failures are pre-existing `src/lib/permissions.test.ts` pins broken by
  upstream `@876/core` commerce-catalog commits (`3ee6cc83a`, `b929ffc29` — new
  "876 commerce" group; staff 103 vs 79, admin 341 vs 266, super-admin 354 vs 279).
  Fail at HEAD; out of CP1 scope, left untouched.
- `node scripts/check-app-structure.mjs console` → `app-structure: OK (console)`
- `pnpm check:rsc-boundaries` → `RSC boundaries OK (10 apps).`

## Fixes applied this session

- Lint (6 errors → 0): `@/features/projects/*` cross-imports → relative
  (`../phase-status`, `../cycle-status`); `Date.now()` in 4 page renders →
  existing `nowUnixSeconds()` from `@876/core/timestamps` (reuse-first).
- Tests: nested async `<AttachmentsData/>` can't render under jsdom `render()`,
  so `issue-detail-data.test.tsx` + workspace issue `page.test.tsx` stub it via
  `vi.mock` (repo pattern per `projects/layout.test.tsx`); real attachment coverage
  stays in `project-attachments-data.test.tsx`.
- Corrected wrong-first-draft assertions: finance `Budgets`/`Rates` → `Alert at`/
  `Bill rate` (the projects-ui lists render no section headings); timesheets
  `getByText('Submitted')` → `getAllByText` length 2 (column header + status badge).
- Two pre-existing failures in files CP1 already touched, fixed test-side only
  (verified failing at HEAD via scoped stash): board column/card labels duplicated
  by projects-ui mobile markup → `getByRole('heading')` + `getAllByText`;
  `status_changed` → `Status Changed` (projects-ui `formatEventType` title-cases).

## projects-ui gaps (Console-local markup used)

- `@876/projects-ui` has no `./time-tracking` export, no cycle / task-list / calendar /
  timesheet-list presentation, and no phase/cycle/timesheet filter-option vocab
  (CP1 defines `phase-status.ts`, `cycle-status.ts`, `time-status.ts` + local tables,
  badges, duration/date/bytes formatting in `operator-format.ts`).
- Baseline comparison table, attachments list, `BudgetList`/`RateList` section
  headings are Console-local. `TimesheetSummary` takes `submittedBy`, fed with
  `timesheet.userId` (no dedicated submitter field); entries map needs
  `durationMinutes ?? 0`.
- Heads-up for projects-ui owners: `IssueBoard` renders mobile + desktop duplicates
  of every group label/card (breaks `getByText` consumers under jsdom) and
  `IssueDetail` title-cases event types via `formatEventType`.

## Unverified items

- No browser/manual pass (no dev server started; jsdom + typecheck + lint + structure +
  RSC-boundary checks only).
- Full-suite green depends on another team updating `permissions.test.ts` pins for the
  commerce catalog; CP1 did not touch it.
