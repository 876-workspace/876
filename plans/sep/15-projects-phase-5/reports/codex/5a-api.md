# Brief 5a — Projects API: Gantt read model, critical path, baselines

- Branch: `feature/projects-phase-5-gantt`
- Date: 2026-09-16

## Files

### Schema + migration
- `apps/projects-api/prisma/schema/project-baseline.prisma` (new): `ProjectBaseline`, `ProjectBaselineItem` with pinned `map:` names
- `apps/projects-api/prisma/schema/tenant.prisma` (edit): back-relations `baselines`, `baselineItems`
- `apps/projects-api/prisma/schema/project.prisma` (edit): back-relation `baselines`
- `apps/projects-api/prisma/schema/issue.prisma` (edit): back-relation `baselineItems`
- `apps/projects-api/prisma/migrations/20260918000000_project_baselines/migration.sql` (new, hand-written)
- `apps/projects-api/src/platform/ids.ts` (edit): `projectBaseline: 'prjbl_'`, `projectBaselineItem: 'prjbli_'`
- `apps/projects-api/src/http/errors.ts` (edit): `projects/baseline-not-found` (404)

### API module (`src/modules/projects/`, internal-key guarded on projects router)
- `gantt.scheduling.ts` (new, pure): `computeCriticalPath`
- `gantt.schemas.ts` (new): `ganttParamsSchema`, `ganttQuerySchema`, `parseGanttQuery`
- `gantt.serializers.ts` (new): row/edge/gantt types, percent/actual helpers, row-id helpers
- `gantt.repository.ts` (new): `listGanttMilestones`, `listGanttTaskLists`, `listGanttIssues`, `listGanttDependencies`
- `gantt.service.ts` (new): `getGantt`
- `gantt.controller.ts` (new): `getGantt`
- `baselines.schemas.ts` (new): project/baseline/comparison params, `createBaselineBodySchema`
- `baselines.serializers.ts` (new): baseline/detail/item/comparison/tombstone types, `varianceMinutes`
- `baselines.repository.ts` (new): list/retrieve/count/create/delete baseline + items
- `baselines.service.ts` (new): `listBaselines`, `createBaseline`, `retrieveBaseline`, `removeBaseline`, `compareBaseline`
- `baselines.controller.ts` (new): list/create/retrieve/remove/compare
- `projects.routes.ts` (edit): `GET /:projectId/gantt`, `GET+POST /:projectId/baselines`, `GET /baselines/:baselineId`, `DELETE /baselines/:baselineId`, `GET /:projectId/baselines/:baselineId/comparison`

### Existing suites patched (new repos mocked)
- `src/modules/issues/__tests__/issue-links.test.ts`
- `src/modules/issues/__tests__/issues.test.ts`
- `src/modules/labels/__tests__/labels.test.ts`
- `src/modules/projects/__tests__/projects.test.ts`
- `src/modules/tenants/__tests__/tenants.test.ts`

### New API tests
- `src/modules/projects/__tests__/gantt.scheduling.test.ts` (22 pure)
- `src/modules/projects/__tests__/gantt.test.ts` (16 service + HTTP)
- `src/modules/projects/__tests__/baselines.test.ts` (17 service + HTTP)

### Package `@876/projects`
- `src/types.ts` (edit): `ganttZoomSchema`, `ganttRowSchema`, `ganttEdgeSchema`, `ganttSchema`, `baselineSchema`, `baselineListSchema`, `baselineItemSchema`, `baselineDetailSchema`, `baselineComparisonItemSchema`, `baselineComparisonSchema`, `GetGanttQuery`, `CreateBaselineInput`
- `src/resources/gantt.ts` (new): `createGanttResource` (`retrieve`)
- `src/resources/baselines.ts` (new): `createBaselinesResource` (`list`, `create`, `retrieve`, `delete`, `comparison`)
- `src/client.ts` (edit): wired `gantt`, `baselines`
- `src/contracts.ts`, `src/index.ts` (edit): re-export new schemas/types
- `src/client.test.ts` (edit): expected keys now include `baselines`, `gantt`
- `src/resources/gantt.test.ts` (new, 6)
- `src/resources/baselines.test.ts` (new, 6)

## Full migration SQL (`20260918000000_project_baselines/migration.sql`)

```sql
-- CreateTable projects_project_baselines
CREATE TABLE "projects_project_baselines" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "captured_by" TEXT,
    "captured_at" BIGINT NOT NULL,
    "note" TEXT,
    CONSTRAINT "projects_project_baselines_pkey" PRIMARY KEY ("id")
);

-- CreateTable projects_project_baseline_items
CREATE TABLE "projects_project_baseline_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "baseline_id" TEXT NOT NULL,
    "issue_id" TEXT NOT NULL,
    "planned_start_date" BIGINT,
    "planned_finish_date" BIGINT,
    "planned_duration_minutes" INTEGER,
    "status" TEXT NOT NULL,
    CONSTRAINT "projects_project_baseline_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_baselines_tenant_project_idx" ON "projects_project_baselines"("tenant_id", "project_id");
CREATE UNIQUE INDEX "projects_baseline_items_unique" ON "projects_project_baseline_items"("baseline_id", "issue_id");
CREATE INDEX "projects_baseline_items_baseline_idx" ON "projects_project_baseline_items"("baseline_id");
CREATE INDEX "projects_baseline_items_issue_idx" ON "projects_project_baseline_items"("issue_id");

-- AddForeignKey
ALTER TABLE "projects_project_baselines" ADD CONSTRAINT "projects_baselines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_project_baselines" ADD CONSTRAINT "projects_baselines_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_project_baseline_items" ADD CONSTRAINT "projects_baseline_items_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_project_baseline_items" ADD CONSTRAINT "projects_baseline_items_baseline_fkey" FOREIGN KEY ("baseline_id") REFERENCES "projects_project_baselines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_project_baseline_items" ADD CONSTRAINT "projects_baseline_items_issue_fkey" FOREIGN KEY ("issue_id") REFERENCES "projects_issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

All index/constraint names are ≤ 63 chars; `@@index`/`@@unique` are pinned with `map:` in `project-baseline.prisma`.

## Counted tests

- projects-api new `it()`: **55** (floor 40 met)
  - `gantt.scheduling.test.ts`: **22** (floor 15 pure met)
  - `gantt.test.ts`: **16**
  - `baselines.test.ts`: **17**
  - Full suite after change: **19 files, 475 tests passed**
- `@876/projects` new `it()`: **12** (floor 10 met)
  - `resources/gantt.test.ts`: **6**
  - `resources/baselines.test.ts`: **6**
  - Full package suite: **16 files, 103 tests passed**

Required scenarios covered: linear chain critical, parallel branch slack not critical, lag shifting critical path, all four edge types (FS/SS/FF/SF + negative lag), undated item excluded but still rowed, empty project, baseline capture snapshot (dated-only, dates/status stored), comparison variance positive and negative (+ null when missing), tenant isolation (no cross-tenant leak), unknown project 404, zoom/includeSubItems parsing, HTTP coverage for gantt + baselines list/create/retrieve/delete/comparison.

## Algorithm notes

- Pure `gantt.scheduling.ts` (`computeCriticalPath`): no DB, no mutation of inputs.
- Schedulable = `plannedStart != null || plannedFinish != null`; duration = `plannedDurationMinutes*60` if present else `finish-start` else 0; anchor on start if present else `finish-duration`.
- Forward pass in Kahn topo order; each edge type converted to a required successor-start: FS `predFinish+lag`, SS `predStart+lag`, FF `predFinish+lag-durationSucc`, SF `predStart+lag-durationSucc`; take max, `finish = start+duration`.
- `projectEnd = max(earliestFinish)`; sinks get `latestFinish = projectEnd` so shorter parallel branches get float > 0.
- Backward pass in reverse topo; each edge converted to a predecessor `latestFinish`: FS `succLateStart-lag`, SS `succLateStart-lag+durationPred`, FF `succLateFinish-lag`, SF `succLateFinish-lag+durationPred`; take min, clamp below by `earliestFinish`.
- `totalFloat = latestFinish - earliestFinish`; `isCritical = float === 0`; `criticalIssueIds` sorted.
- Edges touching unschedulable/unknown issues are ignored; cycles are handled by processing only the DAG topo subset (cycle nodes keep planned earliest, `latest = earliest`) without hanging; unknown edge types fall back to finish-to-start.
- Gantt rows are depth-first: phase → its task lists → their root work items → sub-items (recursive), then unphased lists, then unassigned roots; `includeSubItems=false` hides sub-item rows only (scheduling still sees all dated items); phase/task-list `isCritical` is always false; `percentComplete` is 100 for done/canceled, 50 for in-progress/in-review, else 0; `actualStart = startedAt`, `actualFinish = completedAt ?? canceledAt`; `range` is min start / max finish over rows.
- Baselines are immutable: `POST` snapshots every non-deleted work item with any planned date field; comparison variance is `round((current-baseline)/60)` per side, null when either side is null.

## Unverified items

- `prisma migrate` was not run per hard rules (SQL hand-written; `prisma validate` + `prisma generate` pass).
- No live Postgres deploy verified; FK/index names checked statically (all ≤ 63).
- UI brief 5b (`@876/projects-ui` Gantt component) is out of scope and not implemented here.
- `zoom` is validated (`day|week|month`, default `week`) but is advisory only and does not re-bucket rows; `includeSubItems` defaults to true.
