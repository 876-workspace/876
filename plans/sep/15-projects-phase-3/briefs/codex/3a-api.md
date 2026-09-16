# Brief 3a — Projects API: Task Lists, Work Breakdown, Cycles

Repo `/root/projects/876`, branch `feature/projects-phase-3-task-lists`. Read `plans/2026-09-15-projects-phase-3/plan.md` (binding decisions) first.
Rules to read: `.claude/rules/express-api.md`, `.claude/rules/naming.md`, `.claude/rules/testing.md`, `.claude/rules/error-handling.md`.

Hard rules: do not commit/branch. No `eslint-disable`, `as any`, `@ts-ignore`. No `prisma migrate` — hand-write SQL. Never write run logs. One verification command at a time.

## Reference implementation to copy
Phase 2 milestone code: `apps/projects-api/src/modules/work-structure/milestone-details.{controller,repository,schemas,serializers,service}.ts`, `milestone-list.*`, routes in `work-structure.routes.ts`, migration `apps/projects-api/prisma/migrations/20260915000000_phase_details/migration.sql`, client `packages/projects/src/resources/milestones.ts` + test, `packages/projects/src/milestone-details.ts`. New repositories must be mocked in any test suite that transitively imports routes (see how Phase 2 fixed `issues.test.ts` etc.).

## Deliver
1. Prisma: `TaskList` model in `prisma/schema/work-structure.prisma`; `Issue.taskListId` + relation + index; `Cycle` gains `description String?`, `goal String?`, `deletedAt BigInt?`; relations on Project/Milestone/Tenant. Migration `prisma/migrations/20260916000000_task_lists_cycles/migration.sql`.
2. Module files `task-lists.{controller,repository,schemas,serializers,service}.ts` and `cycles.{...}.ts` in work-structure; wire routes (internal-key guarded, like milestones):
   - `GET/POST /projects/:projectId/task-lists`, `GET/PATCH/DELETE /task-lists/:id`, `POST /task-lists/:id/archive`, `POST /task-lists/:id/restore`, `PUT /projects/:projectId/task-lists/order` (ordered ids), `POST /task-lists/:id/issues` (move issue ids in; applies phase rule), `GET /projects/:projectId/work-breakdown`.
   - `GET/POST /cycles` (filter `projectId`, `status=upcoming|active|completed`), `GET/PATCH/DELETE /cycles/:id`, `POST /cycles/:id/issues` and `DELETE /cycles/:id/issues/:issueId`, progress+throughput included on retrieve.
   - Match the tenant/org resolution the milestone routes use exactly. Issue create/update schemas accept `taskListId` (validate same project). Issue events record task-list/cycle changes like milestone changes.
   - Serializers: `object: 'task-list'`, `object: 'cycle'`, camelCase, Unix seconds, derived `progress {total, completed}`.
3. `@876/projects`: `resources/task-lists.ts`, `resources/cycles.ts` + tests; types in `types.ts`/contracts; expose on client like milestones; issue types gain `taskListId`.
4. Tests (floor): API ≥ 40 new `it()` covering validation, tenant isolation, archive filtering, ordering, move-with-phase rule, cycle status derivation, throughput, 404s; client ≥ 12.

## Verify
pnpm --filter @876/projects-api exec prisma validate
pnpm --filter @876/projects-api exec prisma generate
pnpm --filter @876/projects-api typecheck
pnpm --filter @876/projects-api lint
pnpm --filter @876/projects-api test
pnpm --filter @876/projects typecheck
pnpm --filter @876/projects test

## Report
`plans/2026-09-15-projects-phase-3/reports/codex/3a-api.md`: files, migration SQL, counted tests, decisions, unverified items.
