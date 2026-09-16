# Phase 6 report — Console operator workspace for 876 Projects

**Agent:** Antigravity (agy)
**Date:** 2026-09-03
**Branch:** feat/876-projects
**Status:** COMPLETE

## 1. Summary of changes

### Shared UI package (`packages/projects-ui/`)
- `packages/projects-ui/package.json`: Package manifest declaring `@876/projects-ui` with presentation exports.
- `packages/projects-ui/tsconfig.json`: TypeScript configuration for React 19 JSX and bundler resolution.
- `packages/projects-ui/vitest.config.ts`: Vitest configuration with jsdom test environment.
- `packages/projects-ui/src/status-badges.tsx`: `IssueStatusBadge`, `ProjectStatusBadge`, and `ProjectHealthBadge` presentation components.
- `packages/projects-ui/src/priority-badges.tsx`: `IssuePriorityBadge` presentation component for low/medium/high/urgent priorities.
- `packages/projects-ui/src/project-list.tsx`: `ProjectsTable` and `ProjectTableRow` with row links and empty states.
- `packages/projects-ui/src/project-list.test.tsx`: Unit tests for `ProjectsTable` rendering, columns, row links, and empty states.
- `packages/projects-ui/src/project-detail.tsx`: `ProjectDetail` presentation card with overview stats, lead, target date, and associated issues table.
- `packages/projects-ui/src/issue-list.tsx`: `IssuesTable` and `IssueTableRow` with row links and empty states.
- `packages/projects-ui/src/issue-list.test.tsx`: Unit tests for `IssuesTable` rendering, columns, identifier links, and empty states.
- `packages/projects-ui/src/issue-detail.tsx`: `IssueDetail` presentation component displaying issue header, description, activity timeline, and comments.
- `packages/projects-ui/src/issue-board.tsx`: `IssueBoard`, `IssueBoardColumn`, and `IssueBoardCard` grouping issues into 6 Kanban columns.
- `packages/projects-ui/src/issue-board.test.tsx`: Unit tests for `IssueBoard` column rendering and issue categorization.
- `packages/projects-ui/src/labels-list.tsx`: `LabelsTable` presentation component displaying color swatches and descriptions.

### Console Service & Workspace Registry
- `scripts/shared-ui-packages.mjs`: Added `@876/projects-ui` to canonical `SHARED_UI_PACKAGES` list.
- `apps/console/.env.example`: Added `PROJECTS_API_URL` and `PROJECTS_INTERNAL_KEY` service credentials.
- `apps/console/package.json`: Added `@876/projects` and `@876/projects-ui` dependencies.
- `apps/console/src/lib/services/projects.ts`: Created operator client module using `create876ProjectsOperatorClient` from `@876/projects/operator`.
- `apps/console/src/features/orgs/app-workspaces.ts`: Registered `876-projects` workspace entry with 5 sections in exact order (`Overview`, `Projects`, `Issues`, `Board`, `Labels`).
- `apps/console/src/features/orgs/app-workspaces.projects.test.ts`: Test suite verifying registry entry, section ordering, icon keys, structural cloneability, and on-disk route existence.

### Console Feature Components & Skeletons
- `apps/console/src/features/projects/project-status.ts`: Status filter options, `isProjectStatus`, and `ProjectFilterStatus` helpers.
- `apps/console/src/features/projects/issue-status.ts`: Status filter options, `isIssueStatus`, and `IssueFilterStatus` helpers.
- `apps/console/src/features/projects/components/projects-skeleton-columns.ts`: Real columns for `ProjectsTable` `DataTableSkeleton`.
- `apps/console/src/features/projects/components/issues-skeleton-columns.ts`: Real columns for `IssuesTable` `DataTableSkeleton`.
- `apps/console/src/features/projects/components/labels-skeleton-columns.ts`: Real columns for `LabelsTable` `DataTableSkeleton`.
- `apps/console/src/features/projects/components/overview-data.tsx`: Async server component fetching counts and recent issues for overview.
- `apps/console/src/features/projects/components/projects-data.tsx`: Async server component fetching and rendering status-filtered project list.
- `apps/console/src/features/projects/components/project-detail-data.tsx`: Async server component fetching and rendering project detail.
- `apps/console/src/features/projects/components/issues-data.tsx`: Async server component fetching and rendering status-filtered issue list.
- `apps/console/src/features/projects/components/issue-detail-data.tsx`: Async server component fetching and rendering issue detail with comments and events.
- `apps/console/src/features/projects/components/board-data.tsx`: Async server component fetching issues for the Kanban board.
- `apps/console/src/features/projects/components/labels-data.tsx`: Async server component fetching and rendering labels list.

### Console Workspace Routes
- `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/layout.tsx`: Uses `createWorkspaceLayout('projects')` shell.
- `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/page.tsx`: Overview page with stat tiles and recent issues.
- `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/page.test.tsx`: Tests for Overview page and error handling.
- `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/projects/(list)/page.tsx`: Projects list page with `ResourceToolbar`, `StatusFilterHeading`, and `DataTableSkeleton`.
- `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/projects/(list)/page.test.tsx`: Tests for Projects list page toolbar, pending skeleton, filter threading, unknown status, and error handling.
- `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/projects/[projectId]/page.tsx`: Project detail page.
- `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/projects/[projectId]/page.test.tsx`: Tests for Project detail page and error handling.
- `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/projects/new/page.tsx`: New project creation placeholder preventing 404s on Add action.
- `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/issues/(list)/page.tsx`: Issues list page with `ResourceToolbar`, `StatusFilterHeading`, and `DataTableSkeleton`.
- `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/issues/(list)/page.test.tsx`: Tests for Issues list page toolbar, pending skeleton, filter threading, unknown status, and error handling.
- `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/issues/[issueRef]/page.tsx`: Issue detail page keyed by identifier or id.
- `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/issues/[issueRef]/page.test.tsx`: Tests for Issue detail page and error handling.
- `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/issues/new/page.tsx`: New issue creation placeholder preventing 404s on Add action.
- `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/board/page.tsx`: Kanban board page grouping issues into 6 columns.
- `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/board/page.test.tsx`: Tests for Board page toolbar, column rendering, and error handling.
- `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/labels/page.tsx`: Labels list page with `ResourceToolbar` and `DataTableSkeleton`.
- `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/labels/page.test.tsx`: Tests for Labels page toolbar, table rendering, and error handling.

### Console API Route Handlers (Operator Tier & Audit Events)
- `apps/console/src/app/api/organizations/[id]/projects/route.ts`: GET and POST handlers with `requireConsolePermission('projects.view' | 'projects.create')` and audit logging.
- `apps/console/src/app/api/organizations/[id]/projects/route.test.ts`: Tests for permission denial (operator client uncalled), filtered listing, and creation with audit event.
- `apps/console/src/app/api/organizations/[id]/projects/[projectId]/route.ts`: GET, PATCH, and DELETE handlers with `projects.view`, `projects.edit`, and `projects.archive` permission checks and audit logging.
- `apps/console/src/app/api/organizations/[id]/issues/route.ts`: GET and POST handlers with `requireConsolePermission('issues.view' | 'issues.create')` and audit logging.
- `apps/console/src/app/api/organizations/[id]/issues/route.test.ts`: Tests for permission denial (operator client uncalled), filtered listing, and creation with audit event.
- `apps/console/src/app/api/organizations/[id]/issues/[issueRef]/route.ts`: GET, PATCH, and DELETE handlers with `issues.view`, `issues.edit`, and `issues.delete` permission checks and audit logging.
- `apps/console/src/app/api/organizations/[id]/labels/route.ts`: GET and POST handlers with `requireConsolePermission('labels.view' | 'labels.create')` and audit logging.

---

## 2. Routes implemented

| Route | Page component | Tests |
| --- | --- | --- |
| `/orgs/[slug]/workspace/projects` | `ProjectsWorkspaceOverviewPage` | `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/page.test.tsx` |
| `/orgs/[slug]/workspace/projects/projects` | `OrganizationProjectsPage` | `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/projects/(list)/page.test.tsx` |
| `/orgs/[slug]/workspace/projects/projects/[projectId]` | `OrganizationProjectDetailPage` | `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/projects/[projectId]/page.test.tsx` |
| `/orgs/[slug]/workspace/projects/projects/new` | `NewProjectPage` | Verified route exists; prevents 404 from toolbar "Add" |
| `/orgs/[slug]/workspace/projects/issues` | `OrganizationIssuesPage` | `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/issues/(list)/page.test.tsx` |
| `/orgs/[slug]/workspace/projects/issues/[issueRef]` | `OrganizationIssueDetailPage` | `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/issues/[issueRef]/page.test.tsx` |
| `/orgs/[slug]/workspace/projects/issues/new` | `NewIssuePage` | Verified route exists; prevents 404 from toolbar "Add" |
| `/orgs/[slug]/workspace/projects/board` | `OrganizationIssueBoardPage` | `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/board/page.test.tsx` |
| `/orgs/[slug]/workspace/projects/labels` | `OrganizationLabelsPage` | `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/labels/page.test.tsx` |

---

## 3. Verification output

### `pnpm --filter @876/console typecheck`
```
$ tsc --noEmit
```
Exited with code 0.

### `pnpm --filter @876/console lint`
```
$ eslint
✖ 21 problems (0 errors, 21 warnings)
```
Exited with code 0 (all 21 warnings are pre-existing across other apps/lib files; 0 errors/warnings in Phase 6 files).

### `pnpm --filter @876/console test`
```
$ vitest run

 RUN  v4.1.11 /root/projects/876/apps/console

 Test Files  150 passed (150)
      Tests  1428 passed (1428)
   Start at  02:40:01
   Duration  95.94s (transform 7.81s, setup 28.38s, import 36.26s, tests 30.60s, environment 156.55s)
```
Exited with code 0.

### `node scripts/check-app-structure.mjs`
```
app-structure: OK (console, billing, couriers, 876, enterprise, invoice, crm, projects)
```
Exited with code 0.

### `pnpm check:transpile`
```
$ node scripts/check-shared-ui-transpile.mjs
shared-ui-transpile: OK
```
Exited with code 0.

---

## 4. Test coverage breakdown

Total tests added for Phase 6: **39 tests** (34 in Console, 5 in `packages/projects-ui`).

### Mapping to the 9 required cases in §9:

1. **Registry entry exists with `appSlug: '876-projects'` and its five sections in order:**
   - File: `apps/console/src/features/orgs/app-workspaces.projects.test.ts`
   - Test 1: `registers the 876-projects workspace with correct metadata`
   - Test 2: `declares five sections in the exact expected order`

2. **Every section's `iconKey` is a declared `WorkspaceIconKey`:**
   - File: `apps/console/src/features/orgs/app-workspaces.projects.test.ts`
   - Test: `ensures every section iconKey is a declared WorkspaceIconKey`

3. **The registry stays structurally cloneable (no functions or components):**
   - File: `apps/console/src/features/orgs/app-workspaces.projects.test.ts`
   - Test: `keeps the registry structurally cloneable with no functions or components`

4. **Every section segment has a matching route file on disk (asserted via path walk):**
   - File: `apps/console/src/features/orgs/app-workspaces.projects.test.ts`
   - Test: `ensures every section segment has a matching route file on disk`
   - Note: Also validated by the workspace-wide test `apps/console/src/features/orgs/app-workspaces.test.ts` (`each app workspace section segment resolves to a page.tsx on disk`).

5. **Each list page renders its toolbar and column headers while data is pending:**
   - Projects list:
     - File: `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/projects/(list)/page.test.tsx`
     - Test: `renders toolbar and column headers while data is pending`
   - Issues list:
     - File: `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/issues/(list)/page.test.tsx`
     - Test: `renders toolbar and column headers while data is pending`
   - Labels list:
     - File: `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/labels/page.test.tsx`
     - Test: `renders labels toolbar and column headers while data is pending`

6. **The status filter is threaded into the client call (`toHaveBeenCalledWith` including the status):**
   - Projects list:
     - File: `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/projects/(list)/page.test.tsx`
     - Test: `threads the status filter into the client call` (asserts `mocks.listProjects.toHaveBeenCalledWith('org_123', { status: 'active' })`)
   - Issues list:
     - File: `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/issues/(list)/page.test.tsx`
     - Test: `threads the status filter into the client call` (asserts `mocks.listIssues.toHaveBeenCalledWith('org_123', { status: 'in-progress' })`)

7. **An unknown status resolves to `all`:**
   - Projects list:
     - File: `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/projects/(list)/page.test.tsx`
     - Test: `resolves an unknown status to "all" and fetches without status filter` (asserts `mocks.listProjects.toHaveBeenCalledWith('org_123', { status: undefined })`)
   - Issues list:
     - File: `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/issues/(list)/page.test.tsx`
     - Test: `resolves an unknown status to "all" and fetches without status filter` (asserts `mocks.listIssues.toHaveBeenCalledWith('org_123', { status: undefined })`)

8. **A failed list keeps the toolbar mounted and renders an `AppError` notice:**
   - Projects list:
     - File: `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/projects/(list)/page.test.tsx`
     - Test: `keeps toolbar mounted and renders an AppError notice when listing fails`
   - Issues list:
     - File: `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/issues/(list)/page.test.tsx`
     - Test: `keeps toolbar mounted and renders an AppError notice when listing fails`
   - Labels list:
     - File: `apps/console/src/app/(app)/orgs/[slug]/workspace/projects/labels/page.test.tsx`
     - Test: `renders AppError notice when labels fail to load`

9. **A route denies without the Console permission and the operator client is `not.toHaveBeenCalled()`:**
   - Projects route:
     - File: `apps/console/src/app/api/organizations/[id]/projects/route.test.ts`
     - Test: `denies without the Console permission and the operator client is not.toHaveBeenCalled()` (asserts `mocks.requirePermission.toHaveBeenCalledWith('projects.view')`, `mocks.createClient.not.toHaveBeenCalled()`, `mocks.list.not.toHaveBeenCalled()`)
     - Test: `denies project creation when lacking projects.create permission` (asserts `mocks.requirePermission.toHaveBeenCalledWith('projects.create')`, `mocks.create.not.toHaveBeenCalled()`)
   - Issues route:
     - File: `apps/console/src/app/api/organizations/[id]/issues/route.test.ts`
     - Test: `denies without the Console permission and the operator client is not.toHaveBeenCalled()` (asserts `mocks.requirePermission.toHaveBeenCalledWith('issues.view')`, `mocks.createClient.not.toHaveBeenCalled()`, `mocks.list.not.toHaveBeenCalled()`)
     - Test: `denies issue creation when lacking issues.create permission` (asserts `mocks.requirePermission.toHaveBeenCalledWith('issues.create')`, `mocks.create.not.toHaveBeenCalled()`)

---

## 5. Known gaps or next-agent notes
- No known gaps. All requirements, routes, packages, tests, and verifications are complete and passing cleanly.
- Reminder for orchestrator: run `pnpm install` if you want the lockfile updated with `@876/projects-ui` in the lockfile root. Symlinks `node_modules/@876/projects-ui` and `apps/console/node_modules/@876/projects-ui` were created in workspace for immediate resolution without touching the lockfile.
- All strict prohibitions honored: No branch switching or creation, no git commits made, no lockfile modifications, no edits to `apps/projects-api/` or `packages/projects/`, no server actions, no `eslint-disable` / `as any` / `@ts-ignore` added, and no missing detail routes.
