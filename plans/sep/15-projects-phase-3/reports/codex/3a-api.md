# Brief 3a — Projects API: Task Lists, Work Breakdown, Cycles

- Branch: `feature/projects-phase-3-task-lists`
- Date: 2026-09-15

## Files

### Prisma
- `apps/projects-api/prisma/schema/work-structure.prisma` — `TaskList` model (`projects_task_lists`), `Cycle` gains `description`, `goal`, `deletedAt`, `Cycle.project` relation, `Milestone.taskLists` back-relation.
- `apps/projects-api/prisma/schema/issue.prisma` — `Issue.taskListId` + `taskList` relation (SetNull) + indexes `[tenantId, taskListId]`, `[projectId, taskListId]`.
- `apps/projects-api/prisma/schema/project.prisma` — `Project.taskLists`, `Project.cycles`.
- `apps/projects-api/prisma/schema/tenant.prisma` — `Tenant.taskLists`.
- `apps/projects-api/prisma/migrations/20260916000000_task_lists_cycles/migration.sql` — additive only (see SQL below).
- `apps/projects-api/src/platform/ids.ts` — `taskList: 'tl_'` prefix.

### API modules (`apps/projects-api/src/modules/work-structure/`)
- `task-lists.repository.ts` — list/retrieve/create/update/soft-delete, `taskListProgress` (completed = workflow category `completed` or legacy `done`), `countProjectTaskLists`, `listProjectIssuesForBreakdown`, `assignIssuesToTaskList` (same-project check, phase rule: if list has `milestoneId` set issue `milestoneId` to it, else leave unchanged; emits `task-list-changed` and `milestone-changed` issue events).
- `task-lists.schemas.ts` — project/detail params, `includeArchived` (`true`/`false`), create/update (name 1–100, nullable description/milestone/owner/dates, position), `orderedIds`, `issueIds` (1–100), archive body.
- `task-lists.serializers.ts` — `object: 'task-list'`, camelCase, Unix seconds, `progress { total, completed }`.
- `task-lists.service.ts` — tenant/org resolution via `tenants.resolveTenant` (same as milestones), project via `projects.resolveProject`, milestone same-project validation, archive/restore, reorder (duplicate + cross-project 404), move, `workBreakdown` (phases → task lists → root issues + `subIssueCount`, unphased lists, unlisted roots).
- `task-lists.controller.ts` — validated input → one service call → `sendProjectsResult`/`sendProjectsList`.
- `cycles.repository.ts` — list (project filter, `deletedAt` null), retrieve/by-number/max-number, create/update/soft-delete, `cycleProgress` (total/completed/estimatePoints/completedEstimatePoints), `cycleThroughput` (completedAt in window), `assignIssuesToCycle` (same-project if cycle scoped, emits `cycle-changed`), `unassignIssueFromCycle`.
- `cycles.schemas.ts` — list query `projectId`, `status=upcoming|active|completed`; create (`name`, `startsAt`, `endsAt`, optional `projectId`/`number`/`description`/`goal`), update partial, assign `issueIds`.
- `cycles.serializers.ts` — `object: 'cycle'`, camelCase, Unix seconds, `status` derived (`completedAt` set → completed; else now<starts → upcoming; now<=ends → active; else completed), `progress`, `throughput { completedInWindow, windowStart, windowEnd }`.
- `cycles.service.ts` — same tenant resolution, project scoping, `endsAt>startsAt` validation, auto-number (`max+1`), status filtering in-memory from derived status.
- `cycles.controller.ts` — same pattern.
- `work-structure.routes.ts` — internal-key guarded, mounted at `/v1/organizations/:organizationId` (same as milestones):
  - `GET/POST /projects/:projectId/task-lists`, `PUT /projects/:projectId/task-lists/order`, `GET /projects/:projectId/work-breakdown`
  - `GET/PATCH/DELETE /task-lists/:id`, `POST /task-lists/:id/archive`, `POST /task-lists/:id/restore`, `POST /task-lists/:id/issues`
  - `GET/POST /cycles`, `GET/PATCH/DELETE /cycles/:id`, `POST /cycles/:id/issues`, `DELETE /cycles/:id/issues/:issueId`
- `work-structure.service.ts` — adds `resolveTaskListById`, `resolveCycleById` (static imports), updates `listCycles`/`retrieveCycle` to filter `deletedAt`.
- `work-structure.repository.ts` — `listCycles`/`retrieveCycle` filter `deletedAt`.
- `index.ts` — exports new schemas/serializers (services not re-exported to avoid `ServiceResult` conflict).
- `src/http/errors.ts` — `projects/task-list-not-found` (404), `projects/cycle-not-found` (404), `projects/cycle-number-taken` (409).

### Issues integration
- `apps/projects-api/src/modules/issues/issues.schemas.ts` — create/update accept `taskListId` (nullable).
- `apps/projects-api/src/modules/issues/issues.repository.ts` — `CreateIssueParams`/`UpdateIssueParams` gain `taskListId`.
- `apps/projects-api/src/modules/issues/issues.serializers.ts` — `IssueRow` gains optional `taskListId`/`cycleId`; `SerializedIssue` gains `taskListId: string|null`, `cycleId: string|null`.
- `apps/projects-api/src/modules/issues/issues.service.ts` — create validates `taskListId` same project (`task-list-not-found` else); update validates same, emits `task-list-changed` and `milestone-changed` events like `project-changed`.

### Client (`packages/projects/`)
- `src/types.ts` — `taskListSchema` (`task-list`), `cycleSchema` (`cycle`), `taskListProgressSchema`, `cycleProgressSchema`, `cycleThroughputSchema`, `workBreakdown*` schemas, `taskListListSchema`, `cycleListSchema`; `issueSchema` gains `taskListId`/`cycleId`; inputs `CreateTaskListInput`, `UpdateTaskListInput`, `ReorderTaskListsInput`, `MoveTaskListIssuesInput`, `ListCyclesQuery`, `CreateCycleInput`, `UpdateCycleInput`, `AssignCycleIssuesInput`.
- `src/resources/task-lists.ts`, `src/resources/cycles.ts` — list/create/retrieve/update/delete + archive/restore/reorder/move/workBreakdown and assign/unassign.
- `src/client.ts` — exposes `taskLists`, `cycles` like `milestones`.
- `src/contracts.ts` — re-exports new schemas/types.
- `src/client.test.ts` — updated namespace expectations; `src/types.test.ts`, `src/resources/issues.test.ts` fixtures gain `taskListId`/`cycleId`.
- `src/resources/task-lists.test.ts` (7 `it`), `src/resources/cycles.test.ts` (7 `it`).

### Tests updated for new repos (Phase-2 pattern)
- `apps/projects-api/src/modules/work-structure/__tests__/work-structure.routes.test.ts`
- `apps/projects-api/src/modules/issues/__tests__/issues.test.ts`
- `apps/projects-api/src/modules/projects/__tests__/projects.test.ts`
- `apps/projects-api/src/modules/labels/__tests__/labels.test.ts`
- `apps/projects-api/src/modules/tenants/__tests__/tenants.test.ts`
- `apps/projects-api/src/modules/work-structure/__tests__/work-structure.service.test.ts`
- `apps/projects-api/src/modules/work-structure/__tests__/work-structure.test.ts`
- `apps/projects-api/src/modules/work-structure/__tests__/work-structure.issue-policy.test.ts`
- Each mocks `task-lists.repository.js` + `cycles.repository.js`; `issues/index.js` mocked in new suite to avoid `comments.repository` DB import.

### New tests
- `apps/projects-api/src/modules/work-structure/__tests__/task-lists-cycles.routes.test.ts` — **48 `it()`**.
- `packages/projects/src/resources/task-lists.test.ts` — 7 `it()`.
- `packages/projects/src/resources/cycles.test.ts` — 7 `it()`.

## Migration SQL

`apps/projects-api/prisma/migrations/20260916000000_task_lists_cycles/migration.sql` (hand-written, additive only):

```sql
CREATE TABLE "projects_task_lists" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "milestone_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "owner_user_id" TEXT,
    "start_date" BIGINT,
    "target_date" BIGINT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "archived_at" BIGINT,
    "deleted_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_task_lists_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "projects_cycles" ADD COLUMN "description" TEXT;
ALTER TABLE "projects_cycles" ADD COLUMN "goal" TEXT;
ALTER TABLE "projects_cycles" ADD COLUMN "deleted_at" BIGINT;
ALTER TABLE "projects_issues" ADD COLUMN "task_list_id" TEXT;
CREATE INDEX "projects_task_lists_tenant_id_project_id_idx" ON "projects_task_lists"("tenant_id", "project_id");
CREATE INDEX "projects_task_lists_project_id_position_idx" ON "projects_task_lists"("project_id", "position");
CREATE INDEX "projects_task_lists_milestone_id_idx" ON "projects_task_lists"("milestone_id");
CREATE INDEX "projects_issues_tenant_id_task_list_id_idx" ON "projects_issues"("tenant_id", "task_list_id");
CREATE INDEX "projects_issues_project_id_task_list_id_idx" ON "projects_issues"("project_id", "task_list_id");
CREATE INDEX "projects_cycles_project_id_idx" ON "projects_cycles"("project_id");
ALTER TABLE "projects_task_lists" ADD CONSTRAINT "projects_task_lists_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_task_lists" ADD CONSTRAINT "projects_task_lists_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_task_lists" ADD CONSTRAINT "projects_task_lists_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "projects_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects_issues" ADD CONSTRAINT "projects_issues_task_list_id_fkey" FOREIGN KEY ("task_list_id") REFERENCES "projects_task_lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects_cycles" ADD CONSTRAINT "projects_cycles_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

## Counted tests

- API: **48 new `it()`** in `task-lists-cycles.routes.test.ts` (26 task-list/WBS + 22 cycle), covering validation (empty name, bad dates, duplicate order, empty update), tenant isolation (tenant-not-found on list/create/retrieve), archive filtering (`includeArchived`), ordering (positions, duplicate 400, unknown 404), move-with-phase (assign called with phased list, `milestoneId` preserved, unknown 404), cycle status derivation (upcoming/active/completed + filter), throughput (`completedInWindow` on retrieve), 404s for all unknown ids.
  - Full API suite: **15 files, 333 tests passed**.
- Client: **14 new `it()`** (7 task-lists + 7 cycles) covering list query encoding, CRUD paths, archive/restore, reorder, move, work-breakdown, cycle filters, assign/unassign.
  - Full client suite: **12 files, 76 tests passed**.

## Decisions

- `object` uses brief-literal `'task-list'`, `'cycle'`, `'work-breakdown'` (not `projects.*`-prefixed) per brief; milestone precedent (`projects.milestone`) left untouched.
- Task-list `position` defaults to current count; reorder rewrites positions sequentially and returns full ordered list (archived included).
- Archive = `archivedAt` set; default list hides archived, `?includeArchived=true` opts in; delete stays soft (`deletedAt`).
- Phase rule lives in `task-lists.repository.assignIssuesToTaskList`: move to phased list sets `milestoneId`; move to unphased leaves `milestoneId` unchanged; emits `task-list-changed` + `milestone-changed` (when phase applied).
- Issue update also emits `milestone-changed` (previously missing) alongside `task-list-changed`, matching `project-changed` pattern; brief's "like milestone changes" interpreted as same event shape.
- Cycle `number` auto-allocates `max+1` when omitted; explicit duplicate → `cycle-number-taken` 409.
- Cycle `status` derived, never stored; list `status` filter applied post-fetch to keep derivation single-sourced (`deriveCycleStatus`).
- Cycle progress = `{ total, completed, estimatePoints, completedEstimatePoints }`; throughput = `{ completedInWindow, windowStart, windowEnd }` where window is `[startsAt, endsAt]`.
- `Cycle.projectId` FK added as `SetNull` (previously unenforced string); existing orphan rows would block migrate — acceptable for additive dev migration, no prod data in scope.
- New services not re-exported from `work-structure/index.ts` to avoid `ServiceResult` conflicts; schemas/serializers are exported.

## Unverified items

- Real Postgres migrate/deploy not run (per hard rule: no `prisma migrate`); only `prisma validate` + `prisma generate` verified.
- Throughput/progress against live data not exercised (mocked counts); window logic (`completedAt BETWEEN startsAt AND endsAt`) reasoned, not DB-verified.
- 3b app UI integration pending (brief 3b).
