# Brief 4a Report — Projects API: relationships, dependencies, planned schedule

- Branch: `feature/projects-phase-4-dependencies` (no commit, no new branch, per hard rules)
- Plan binding decisions honored: two models, additive planned fields, fail-closed validation,
  cross-project links allowed, advisory-only scheduling, derived `blocked`, hard delete for links.

## Files

New (API):

- `apps/projects-api/src/modules/issues/issue-links.schemas.ts`
- `apps/projects-api/src/modules/issues/issue-links.serializers.ts`
- `apps/projects-api/src/modules/issues/issue-links.repository.ts`
- `apps/projects-api/src/modules/issues/issue-links.service.ts`
- `apps/projects-api/src/modules/issues/issue-links.controller.ts`
- `apps/projects-api/src/modules/issues/__tests__/issue-links.test.ts`
- `apps/projects-api/prisma/migrations/20260917000000_issue_links/migration.sql`

New (package):

- `packages/projects/src/resources/issue-relations.ts`
- `packages/projects/src/resources/issue-relations.test.ts`
- `packages/projects/src/resources/issue-dependencies.ts`
- `packages/projects/src/resources/issue-dependencies.test.ts`

Modified (API): `prisma/schema/issue.prisma`, `prisma/schema/tenant.prisma` (back-refs),
`src/http/errors.ts` (6 codes), `src/platform/ids.ts` (`isr_`, `isd_`),
`src/modules/issues/index.ts`, `issues.routes.ts`, `issues.schemas.ts`,
`issues.serializers.ts`, `issues.repository.ts`, `issues.service.ts`,
`__tests__/issues.test.ts` (new-repo mock + 6 new serialized keys in one
full-shape assertion), `labels`/`projects`/`tenants` suites (new-repo mock only).

Modified (package): `src/types.ts`, `src/client.ts`, `src/contracts.ts`,
`src/index.ts`, `src/client.test.ts` (namespace list), `src/resources/issues.test.ts`
and `src/types.test.ts` (fixtures gain the 6 new issue keys).

## Full migration SQL (`20260917000000_issue_links`)

```sql
-- AlterTable projects_issues (additive only)
ALTER TABLE "projects_issues" ADD COLUMN "planned_start_date" BIGINT;
ALTER TABLE "projects_issues" ADD COLUMN "planned_finish_date" BIGINT;
ALTER TABLE "projects_issues" ADD COLUMN "planned_duration_minutes" INTEGER;

-- CreateTable projects_issue_relations
CREATE TABLE "projects_issue_relations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "source_issue_id" TEXT NOT NULL,
    "target_issue_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" BIGINT NOT NULL,
    CONSTRAINT "projects_issue_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable projects_issue_dependencies
CREATE TABLE "projects_issue_dependencies" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "predecessor_issue_id" TEXT NOT NULL,
    "successor_issue_id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'finish-to-start',
    "lag_minutes" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT,
    "created_at" BIGINT NOT NULL,
    CONSTRAINT "projects_issue_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_issue_relations_tenant_id_source_issue_id_target_issue_id_type_key" ON "projects_issue_relations"("tenant_id", "source_issue_id", "target_issue_id", "type");
CREATE INDEX "projects_issue_relations_source_issue_id_idx" ON "projects_issue_relations"("source_issue_id");
CREATE INDEX "projects_issue_relations_target_issue_id_idx" ON "projects_issue_relations"("target_issue_id");
CREATE UNIQUE INDEX "projects_issue_dependencies_tenant_id_predecessor_issue_id_successor_issue_id_key" ON "projects_issue_dependencies"("tenant_id", "predecessor_issue_id", "successor_issue_id");
CREATE INDEX "projects_issue_dependencies_predecessor_issue_id_idx" ON "projects_issue_dependencies"("predecessor_issue_id");
CREATE INDEX "projects_issue_dependencies_successor_issue_id_idx" ON "projects_issue_dependencies"("successor_issue_id");

-- AddForeignKey
ALTER TABLE "projects_issue_relations" ADD CONSTRAINT "projects_issue_relations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_issue_relations" ADD CONSTRAINT "projects_issue_relations_source_issue_id_fkey" FOREIGN KEY ("source_issue_id") REFERENCES "projects_issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_issue_relations" ADD CONSTRAINT "projects_issue_relations_target_issue_id_fkey" FOREIGN KEY ("target_issue_id") REFERENCES "projects_issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_issue_dependencies" ADD CONSTRAINT "projects_issue_dependencies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_issue_dependencies" ADD CONSTRAINT "projects_issue_dependencies_predecessor_issue_id_fkey" FOREIGN KEY ("predecessor_issue_id") REFERENCES "projects_issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_issue_dependencies" ADD CONSTRAINT "projects_issue_dependencies_successor_issue_id_fkey" FOREIGN KEY ("successor_issue_id") REFERENCES "projects_issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

Hand-written only; no `prisma migrate` was run.

## Counted tests

- projects-api: **75 new `it()`** in `issue-links.test.ts` (floor 45). Full suite:
  16 files / 420 tests pass. Covers self-link, unknown anchor/target/predecessor/
  successor, duplicate exact + reverse, cross-project relations and dependencies,
  FS/SS/FF/SF creation, negative lag, direct A→B→A and indirect A→B→C→A cycles,
  acyclic diamond, revisit-stop traversal, all four suggestion maths incl. negative
  lag, max-wins + tied `constrainedBy`, missing-date and no-dependency fallbacks,
  unknown-duration start-only/finish-only branches, writes-nothing assertion,
  blocked true/false via `blocks` (todo/in-progress vs done/canceled/custom
  completed-category) and via predecessors, per-issue list enrichment, relation/
  dependency counts both sides, delete-only-named-link, tenant scoping, 401/400/404
  HTTP paths.
- `@876/projects`: **15 new `it()`** (7 relations + 8 dependencies; floor 12).
  Full suite: 14 files / 91 tests pass.

## Verification (each run singly, all green)

- `pnpm --filter @876/projects-api exec prisma validate`
- `pnpm --filter @876/projects-api exec prisma generate`
- `pnpm --filter @876/projects-api typecheck`
- `pnpm --filter @876/projects-api lint`
- `pnpm --filter @876/projects-api test`
- `pnpm --filter @876/projects typecheck`
- `pnpm --filter @876/projects test`
- (`pnpm --filter @876/projects lint` also clean.)

## Decisions

- `relates-to`/`duplicates` are stored canonically (lesser id first) with an
  either-direction duplicate check; `blocks` keeps the requested direction and only
  conflicts on the exact ordered triple. DB unique stays directional per the brief.
- `POST /issues/:ref/dependencies` takes both endpoint ids; the anchor must equal
  one of them, else `projects/invalid-request`.
- `GET /issues/:ref/dependencies` returns `{ predecessors, successors }` (no list
  envelope); suggestion returns exactly `{ earliestStart, earliestFinish,
  constrainedBy: [{ issueId, identifier, type, lagMinutes }] }`.
- Suggestion maths: FS/SS bound the start; FF/SF bound the finish and convert via
  `start = finishBound − duration` when the duration is known; unusable (missing)
  predecessor dates are skipped; with no bounds the successor's own planned dates
  are the fallback and `constrainedBy` is empty. Writes nothing (single read query).
- `blocked` = any `blocks` source targeting the issue, or any dependency
  predecessor, whose status is not terminal. Terminal = key `done`/`canceled` or a
  workflow state in category `completed`/`canceled` (memoized per call, literal
  fast path). Soft-deleted linked issues are excluded from the status lookup, so
  deleted work never blocks.
- Cycle check runs on create and on type/lag update: DFS from the successor over
  outgoing edges, depth cap 1000, visited set stops revisits. The updated edge
  itself can never false-positive (it is incoming to the traversal root).
- Link deletion returns `{ object, id, deleted: true }` tombstones; no issue events
  are written (brief lists no event contract; the plan mentions events only to
  justify hard delete).
- New error codes: `projects/issue-relation-not-found` (404),
  `projects/issue-relation-exists` (409), `projects/issue-dependency-not-found`
  (404), `projects/issue-dependency-exists` (409), `projects/issue-dependency-cycle`
  (422), `projects/issue-self-link` (400).
- `issues/index.ts` exports the link service/schemas/serializers but not the
  repository (module-boundary test forbids repository re-export).

## Unverified items

- Migration applies cleanly to a live database (no DB available here; SQL follows
  the repo's hand-written convention and `prisma validate` + `generate` pass).
- 4b app UI consumption is out of scope for this brief.
