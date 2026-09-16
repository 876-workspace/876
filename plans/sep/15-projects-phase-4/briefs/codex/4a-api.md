# Brief 4a — Projects API: relationships, dependencies, planned schedule

Repo `/root/projects/876`, branch `feature/projects-phase-4-dependencies`. Read `plans/2026-09-15-projects-phase-4/plan.md` first — its decisions are binding.
Rules: `.claude/rules/express-api.md`, `.claude/rules/naming.md`, `.claude/rules/error-handling.md`, `.claude/rules/testing.md`.

Hard rules: no commit/branch, no `prisma migrate` (hand-write SQL), no `eslint-disable`/`as any`/`@ts-ignore`, no run logs, one verification command at a time.

## Copy this reference (Phase 3, same module)
`apps/projects-api/src/modules/work-structure/task-lists.{controller,repository,schemas,serializers,service}.ts`, its routes in `work-structure.routes.ts`, migration `prisma/migrations/20260916000000_task_lists_cycles/migration.sql`, client `packages/projects/src/resources/task-lists.ts` + test. Any new repository must be mocked in suites that transitively import routes (see `apps/projects-api/src/modules/labels/__tests__/labels.test.ts` for the pattern).

## Deliver
1. **Schema** (`prisma/schema/issue.prisma`) + migration `prisma/migrations/20260917000000_issue_links/migration.sql`:
   - `IssueRelation`: id, tenantId, sourceIssueId, targetIssueId, type, createdBy, createdAt. Unique `(tenantId, sourceIssueId, targetIssueId, type)`; indexes on both issue ids. FKs cascade on issue delete.
   - `IssueDependency`: id, tenantId, predecessorIssueId, successorIssueId, type, lagMinutes, createdBy, createdAt. Unique `(tenantId, predecessorIssueId, successorIssueId)`; indexes both sides.
   - `Issue`: `plannedStartDate BigInt? @map("planned_start_date")`, `plannedFinishDate BigInt? @map("planned_finish_date")`, `plannedDurationMinutes Int? @map("planned_duration_minutes")`.
2. **Module** `issue-links.{controller,repository,schemas,serializers,service}.ts` inside `src/modules/issues/`, routes registered in the issues router (internal-key guarded like the rest):
   - `GET /issues/:issueRef/relations`, `POST /issues/:issueRef/relations`, `DELETE /issues/:issueRef/relations/:id`
   - `GET /issues/:issueRef/dependencies` (returns predecessors and successors), `POST`, `PATCH /:id` (type/lag), `DELETE /:id`
   - `POST /issues/:issueRef/dependencies/schedule-suggestion` → `{ earliestStart, earliestFinish, constrainedBy: [...] }`, writes nothing.
   - Cycle detection before every dependency insert/update; reject with a registered error. Depth limit 1000, and stop on revisit.
   - Issue serializer gains `plannedStartDate`, `plannedFinishDate`, `plannedDurationMinutes`, `blocked: boolean` (true when any `blocks` relation source or any dependency predecessor is not completed/canceled), and relation/dependency counts. Issue create/update body schemas accept the three planned fields.
   - Serializers: `object: 'issue-relation'`, `object: 'issue-dependency'`; camelCase; Unix seconds.
   - Register every new error code in the projects error registry (`src/http/errors.ts` style already used).
3. **`@876/projects`**: `resources/issue-relations.ts`, `resources/issue-dependencies.ts` + tests, types in `types.ts`, wired on the client like task lists.
4. **Tests, floor ≥ 45 new `it()` in projects-api and ≥ 12 in the package**: self-link rejected, unknown issue, duplicate link, cross-project allowed, each of the four dependency types in the suggestion maths (including negative lag), direct cycle A→B→A rejected, indirect cycle A→B→C→A rejected, blocked derivation true/false, tenant isolation, delete removes only the named link, schedule-suggestion writes nothing.

## Verify
pnpm --filter @876/projects-api exec prisma validate
pnpm --filter @876/projects-api exec prisma generate
pnpm --filter @876/projects-api typecheck
pnpm --filter @876/projects-api lint
pnpm --filter @876/projects-api test
pnpm --filter @876/projects typecheck
pnpm --filter @876/projects test

## Report
`plans/2026-09-15-projects-phase-4/reports/codex/4a-api.md`: files, full migration SQL, counted tests, decisions, unverified items.
