# Brief 11a — Projects API: templates, preview, instantiate, clone

Repo `/root/projects/876`. Read `plans/sep/16-projects-phase-11/plan.md` — binding, including contracts and routes.
Rules: `.claude/rules/express-api.md`, `naming.md`, `error-handling.md`, `testing.md`, `deletions.md`.
Hard rules: no commit/branch, no `prisma migrate` (hand-write SQL), no `eslint-disable`/`as any`/`@ts-ignore`, no run logs, one verification command at a time. Index names ≤ 63 chars pinned with `map:`. Touch only `apps/projects-api/**` and `packages/projects/**`.

## Reference (read only these)
`src/modules/projects/baselines.*` (snapshot pattern), `src/modules/work-structure/*` (phases, task lists, clone phase), `src/modules/issues/*` dependency creation, `src/modules/reports/*` (latest module shape), migration `prisma/migrations/20260922000000_member_capacity/migration.sql`, client `packages/projects/src/resources/reports.ts`.

## Deliver
1. `prisma/schema/template.prisma` + `prisma/migrations/20260923000000_project_templates/migration.sql`.
2. Module `src/modules/templates/`: schemas (definition Zod schema v1), `templates.capture.ts` (live project → definition), `templates.materialize.ts` (pure plan: refs → creation order, relative days → absolute seconds; then one transaction), service, repository, controller, routes, serializers. Reuse existing repositories/services for phase/task-list/issue/dependency creation where they expose transactional create; otherwise add repository methods — do not duplicate business rules (key uniqueness, dependency cycle rejection).
3. Clone endpoint = capture + materialize.
4. `@876/projects`: `resources/project-templates.ts` (+ `clone` on projects resource), types, contracts export, tests.
5. Test floor **≥ 60 api `it()`, ≥ 12 package**: capture excludes user ids/attachments/time; relative date maths incl. month boundaries; ref resolution order (parents before children); dependency refs remapped; missing type/state/label keys reported (no partial writes — assert transaction not called); idempotent instantiate replay; key collision → error; version increments on PATCH; soft-deleted template unusable; tenant isolation; clone of a project with dependencies yields same graph shape; preview writes nothing.

## Verify
pnpm --filter @876/projects-api exec prisma validate
pnpm --filter @876/projects-api exec prisma generate
pnpm --filter @876/projects-api typecheck
pnpm --filter @876/projects-api lint
pnpm --filter @876/projects-api test
pnpm --filter @876/projects typecheck
pnpm --filter @876/projects test

## Report
`plans/sep/16-projects-phase-11/reports/codex/11a-api.md`: files, full migration SQL, counted tests, decisions, unverified.
