# Brief 5a — Projects API: Gantt read model, critical path, baselines

Repo `/root/projects/876`, branch `feature/projects-phase-5-gantt`. Read `plans/2026-09-15-projects-phase-5/plan.md` (binding decisions).
Rules: `.claude/rules/express-api.md`, `.claude/rules/naming.md`, `.claude/rules/error-handling.md`, `.claude/rules/testing.md`.
Hard rules: no commit/branch, no `prisma migrate` (hand-write SQL), no `eslint-disable`/`as any`/`@ts-ignore`, no run logs, one verification command at a time. Keep every new index/constraint name ≤ 63 characters and pin it with `map:` in the Prisma schema.

## Reference (read these only)
`apps/projects-api/src/modules/issues/issue-links.{service,repository,serializers,schemas,controller}.ts` (Phase 4), `apps/projects-api/src/modules/work-structure/task-lists.service.ts` (work-breakdown assembly), migration `prisma/migrations/20260917000000_issue_links/migration.sql`, client `packages/projects/src/resources/issue-dependencies.ts`. New repositories must be mocked in suites that transitively import routes (see `apps/projects-api/src/modules/labels/__tests__/labels.test.ts`).

## Deliver
1. **Schema + migration** `prisma/migrations/20260918000000_project_baselines/migration.sql`:
   - `ProjectBaseline` (`projects_project_baselines`): id, tenantId, projectId, name, capturedBy, capturedAt, note. Index `(tenantId, projectId)`.
   - `ProjectBaselineItem` (`projects_project_baseline_items`): id, tenantId, baselineId, issueId, plannedStartDate, plannedFinishDate, plannedDurationMinutes, status. Unique `(baselineId, issueId)` mapped to a short name.
2. **Module** `gantt.{controller,repository,schemas,serializers,service}.ts` and `baselines.{...}.ts` in `src/modules/projects/`, routes on the projects router (internal-key guarded):
   - `GET /projects/:projectId/gantt?zoom=day|week|month&includeSubItems=bool` → `{ object: 'gantt', rows: [...], edges: [...], criticalIssueIds: [...], range: { start, end } }`. Row: `{ object: 'gantt-row', id, kind, parentRowId, issueId?, name, plannedStart, plannedFinish, actualStart, actualFinish, percentComplete, isCritical }`. Rows are ordered depth-first: phase → its task lists → their work items → sub-items.
   - `GET /projects/:projectId/baselines`, `POST /projects/:projectId/baselines` (captures a snapshot of every work item with planned dates), `GET /baselines/:id`, `DELETE /baselines/:id`, `GET /projects/:projectId/baselines/:id/comparison` → per work item `{ issueId, identifier, baselineStart, baselineFinish, currentStart, currentFinish, startVarianceMinutes, finishVarianceMinutes }`.
   - Critical path: forward pass (earliest start/finish honouring each edge type and lag), backward pass (latest), total float = latest finish − earliest finish; float 0 ⇒ critical. Ignore work items missing planned dates; never mutate stored data. Put the algorithm in a **pure** module `gantt.scheduling.ts` so it is unit-testable without the database.
3. **`@876/projects`**: `resources/gantt.ts`, `resources/baselines.ts` + tests; types in `types.ts`; wired on the client.
4. **Tests, floor ≥ 40 new `it()` in projects-api (at least 15 of them pure `gantt.scheduling.ts` cases) and ≥ 10 in the package**: linear chain critical, parallel branch with slack not critical, lag shifting the critical path, each of the four edge types, a work item with no planned dates excluded, empty project, baseline capture stores a snapshot, comparison variance positive and negative, tenant isolation, unknown project 404.

## Verify
pnpm --filter @876/projects-api exec prisma validate
pnpm --filter @876/projects-api exec prisma generate
pnpm --filter @876/projects-api typecheck
pnpm --filter @876/projects-api lint
pnpm --filter @876/projects-api test
pnpm --filter @876/projects typecheck
pnpm --filter @876/projects test

## Report
`plans/2026-09-15-projects-phase-5/reports/codex/5a-api.md`: files, full migration SQL, counted tests, algorithm notes, unverified items.
