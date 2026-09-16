# 11a Report — Projects API: templates, preview, instantiate, clone

## Outcome

Delivered and green. All routes from `plans/sep/16-projects-phase-11/plan.md` are
mounted org-scoped, contracts match (`ProjectTemplate`, `TemplatePreview`), and the
full verification matrix passes (see Verification).

## Files

New — `apps/projects-api`:

- `prisma/schema/template.prisma` — `ProjectTemplate`, `ProjectTemplateVersion`,
  `ProjectTemplateInstantiation` models (`map:`-pinned table/column/index names).
- `prisma/migrations/20260923000000_project_templates/migration.sql` — hand-written
  (no `prisma migrate` run, per hard rule); full SQL below.
- `src/modules/templates/templates.schemas.ts` — v1 definition Zod schema
  (`templateDefinitionSchema`, `DAY_SECONDS`, create/update/preview/instantiate bodies).
- `src/modules/templates/templates.capture.ts` — pure live-project → definition
  (strips user ids, comments, attachments, time entries; drops cross-project links
  and user-scoped budgets; keeps project + milestone budgets).
- `src/modules/templates/templates.materialize.ts` — pure planner (refs → creation
  order with parents before children, relative days → absolute seconds,
  dependency remap + cycle check, missing-key collection).
- `src/modules/templates/templates.repository.ts` — template CRUD, version append,
  soft delete, idempotency lookup, single-transaction `instantiateInTransaction`.
- `src/modules/templates/templates.service.ts` — orchestration incl.
  `cloneProject` (capture + same materializer) and `saveAsTemplate`.
- `src/modules/templates/templates.controller.ts`,
  `src/modules/templates/templates.routes.ts`, `src/modules/templates/templates.serializers.ts`,
  `src/modules/templates/index.ts`.
- `src/modules/templates/__tests__/`: `templates.capture.test.ts`,
  `templates.materialize.test.ts`, `templates.schemas.test.ts`,
  `templates.service.test.ts`, `templates.routes.test.ts`.

Modified — `apps/projects-api` (all inside allowed scope):

- `prisma/schema/project.prisma`, `prisma/schema/tenant.prisma` — relation
  back-references for the new template tables.
- `src/http/errors.ts` — new codes `template-not-found`, `template-key-taken`,
  `invalid-template-key`, `invalid-template-definition`,
  `template-missing-references`, `template-dependency-cycle`; reused
  `project-key-taken`, `invalid-project-key`, `project-not-found`.
- `src/http/routes.ts` — mounts the templates router.
- `src/modules/issues/index.ts`, `src/modules/issues/issue-links.service.ts` —
  added + exported `listDependenciesForIssueIds`.
- `src/modules/work-structure/index.ts` — exported `listTaskLists`.
- `src/modules/projects/projects.service.ts` — added `isValidProjectKey`.
- `src/platform/ids.ts` — template/version id prefixes.

New/modified — `packages/projects`:

- `src/resources/project-templates.ts` (new) — list/create/retrieve/update/delete/
  versions/preview/instantiate.
- `src/resources/projects.ts` — added `clone` and `saveAsTemplate`.
- `src/types.ts`, `src/contracts.ts`, `src/client.ts`, `src/index.ts` — template
  types/schemas, contract exports, `projectTemplates` namespace registration.
- `src/resources/project-templates.test.ts` (new, 12 `it()`).
- `src/client.test.ts` — namespace lists updated with `projectTemplates` (3 spots).

## Full migration SQL

```sql
-- Project templates: immutable, versioned JSON snapshots of project structure.
-- A template row points at its current version; every edit appends a
-- projects_project_template_versions row and bumps current_version.
-- Instantiation records map idempotency keys to the created project so
-- replays return the same project without writing a second copy.
CREATE TABLE "projects_project_templates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "current_version" INTEGER NOT NULL DEFAULT 1,
    "definition" JSONB NOT NULL,
    "source_project_id" TEXT,
    "deleted_at" BIGINT,
    "deleted_by" TEXT,
    "deletion_reason" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_project_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "projects_project_template_versions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "definition" JSONB NOT NULL,
    "created_at" BIGINT NOT NULL,
    CONSTRAINT "projects_project_template_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "projects_project_template_instantiations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "template_version" INTEGER NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "created_at" BIGINT NOT NULL,
    CONSTRAINT "projects_project_template_instantiations_pkey" PRIMARY KEY ("id")
);

-- Version guards so invalid template rows fail at the database.
ALTER TABLE "projects_project_templates" ADD CONSTRAINT "projects_tpl_current_version_chk" CHECK ("current_version" >= 1);
ALTER TABLE "projects_project_template_versions" ADD CONSTRAINT "projects_tpl_versions_version_chk" CHECK ("version" >= 1);
ALTER TABLE "projects_project_template_instantiations" ADD CONSTRAINT "projects_tpl_inst_version_chk" CHECK ("template_version" >= 1);

-- CreateIndex
ALTER TABLE "projects_project_templates" ADD CONSTRAINT "projects_project_templates_tenant_key_uidx" UNIQUE ("tenant_id", "key");
CREATE INDEX "projects_tpl_tenant_updated_idx" ON "projects_project_templates"("tenant_id", "updated_at");
ALTER TABLE "projects_project_template_versions" ADD CONSTRAINT "projects_tpl_versions_tpl_ver_uidx" UNIQUE ("template_id", "version");
ALTER TABLE "projects_project_template_instantiations" ADD CONSTRAINT "projects_tpl_inst_tenant_tpl_key_uidx" UNIQUE ("tenant_id", "template_id", "idempotency_key");

-- AddForeignKey
ALTER TABLE "projects_project_templates" ADD CONSTRAINT "projects_project_templates_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_project_templates" ADD CONSTRAINT "projects_tpl_source_project_fkey" FOREIGN KEY ("source_project_id") REFERENCES "projects_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects_project_template_versions" ADD CONSTRAINT "projects_tpl_versions_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_project_template_versions" ADD CONSTRAINT "projects_tpl_versions_template_fkey" FOREIGN KEY ("template_id") REFERENCES "projects_project_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_project_template_instantiations" ADD CONSTRAINT "projects_tpl_inst_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_project_template_instantiations" ADD CONSTRAINT "projects_tpl_inst_template_fkey" FOREIGN KEY ("template_id") REFERENCES "projects_project_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_project_template_instantiations" ADD CONSTRAINT "projects_tpl_inst_project_fkey" FOREIGN KEY ("project_id") REFERENCES "projects_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

All constraint/index names are ≤ 63 chars and `map:`-pinned in the schema.

## Counted tests

API (`apps/projects-api`, full suite **895 passed / 895, 32 files**):

- `templates.capture.test.ts` — 15
- `templates.materialize.test.ts` — 30
- `templates.routes.test.ts` — 12
- `templates.schemas.test.ts` — 11
- `templates.service.test.ts` — 23
- Templates module total: **91 `it()`** (floor was 60). Coverage hits every
  required case: capture excludes user ids/attachments/time; relative-day maths
  incl. month + leap-day boundaries; parents-before-children ordering; dependency
  ref remap + lag conversion; missing type/state/label keys reported with the
  transaction never called; idempotent replay; key collision; version bump on
  PATCH; soft-deleted unusable; tenant isolation; clone graph-shape parity;
  preview writes nothing.

Package (`packages/projects`, full suite **180 passed / 180, 28 files**):

- `src/resources/project-templates.test.ts` — **12 `it()`** (list, create,
  retrieve, update, delete, versions, preview, preview include-flags,
  instantiate, instantiate idempotency key, projects `clone`,
  projects `saveAsTemplate`).

## Decisions

- Clone = capture (via owning services' public `index.ts` APIs) + the same
  `materializeIntoProject` path as instantiate. No second copy path.
- Atomicity lives in `templates.repository.instantiateInTransaction` (one raw
  Prisma transaction): owning services expose no tx-scoped creates and the
  boundary test forbids importing another module's repository. Validation (key
  uniqueness via `projects.resolveProject`, cycle rejection via pure ref-graph
  check, type/state/label resolution) runs pre-transaction through public
  services; no business rule duplicated.
- Planner returns `ok` (+ best-effort partial plan + `missing`) /
  `dependency-cycle` / `invalid-refs`. Instantiate fails on missing/cycle before
  touching the transaction; preview returns 200 with `missing` filled. The plan
  index map is built from resolvable items only so deps on missing items never
  leak into partial plans.
- Every PATCH appends a version row and bumps `currentVersion`. Soft-deleted
  templates resolve as `template-not-found` on all operations.
- Continuation fixes this session: (a) month-boundary and null-date planner
  fixtures now clear stale `taskLists`/`workItems` refs; (b) clone service test
  uses a realistic `task` parent / `subtask` child hierarchy with both types in
  the mocked catalog; (c) `updateTemplate` test mock takes no unused params
  (lint now 0 warnings); (d) `client.test.ts` namespace lists include
  `projectTemplates`.

## Verification

Each run one at a time, all green:

- `pnpm --filter @876/projects-api exec prisma validate` — schemas valid.
- `pnpm --filter @876/projects-api exec prisma generate` — client generated.
- `pnpm --filter @876/projects-api typecheck` — clean, 0 errors.
- `pnpm --filter @876/projects-api lint` — 0 errors, 0 warnings.
- `pnpm --filter @876/projects-api test` — 895/895 (32 files).
- `pnpm --filter @876/projects typecheck` — EXIT:0.
- `pnpm --filter @876/projects test` — 180/180 (28 files).
- `pnpm --filter @876/projects lint` — EXIT:0.

## Unverified

- The migration was hand-written and validated with `prisma validate` +
  `generate` only; no `prisma migrate` run and no live-DB deploy test (both
  barred by the brief's hard rules). Downstream lanes should run
  `prisma migrate deploy` against a staging database.
- No end-to-end check against a running API + Postgres (instantiate/clone
  exercised via mocked-service tests and the repository transaction path only).
- Pre-existing untracked `packages/projects-ui/src/layouts/` (another lane's
  work) was left untouched.
