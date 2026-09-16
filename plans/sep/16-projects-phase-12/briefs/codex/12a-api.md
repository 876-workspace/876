# Brief 12a — Projects API: project custom fields, layouts, layout rules

Repo `/root/projects/876`. Read `plans/sep/16-projects-phase-12/plan.md` — binding.
Rules: `.claude/rules/express-api.md`, `naming.md`, `error-handling.md`, `testing.md`, `deletions.md`, `ai-code-quality.md`.
Hard rules: no commit/branch, no `prisma migrate` (hand-write SQL), no `eslint-disable`/`as any`/`@ts-ignore`, no run logs, one verification command at a time. Index names ≤ 63 chars with `map:`. Touch only `apps/projects-api/**` and `packages/projects/**` (another agent edits `packages/projects-ui/**`).

## Reference
Existing work-item custom field module + value validation (find with `grep -rn "CustomFieldValue" apps/projects-api/src --include=*.ts -l`), phase custom fields (`MilestoneCustomField`), `src/modules/templates/*` (latest module shape), latest migration folder.

## Deliver
1. `prisma/schema/layout.prisma` (+ project custom field models) and migration `prisma/migrations/20260924000000_custom_fields_layouts/migration.sql`. Partial unique index for one default per (tenant, entity, coalesce(work_item_type_id,'')) where deleted_at is null.
2. Extract the shared value validator to `src/modules/custom-fields/field-values.ts`; switch work-item and phase paths to it (behaviour unchanged, their tests stay green); use it for project fields.
3. Project custom fields: `GET/POST /project-custom-fields`, `PATCH/DELETE /project-custom-fields/:id`, values via `PUT /projects/:id/custom-field-values`; include values on project retrieve.
4. Layouts: `GET/POST /layouts`, `GET/PATCH/DELETE /layouts/:id`, `POST /layouts/:id/make-default`, `GET /layouts/resolve?entity&workItemTypeId`. PATCH bumps version. Validate field keys (system list in plan + `cf:` keys that exist for that entity).
5. `packages/projects/src/layout-rules.ts` — pure `evaluateLayoutRules` per plan precedence, exported from the package root and `contracts`; server enforcement of `require` and `disable` on project/phase/work-item create+update uses this same function via the resolved layout (registered errors `projects/layout-required-fields` with `param` listing keys, `projects/layout-field-disabled`).
6. Client resources `layouts.ts`, `project-custom-fields.ts` + types + tests.
7. Test floor **≥ 65 api, ≥ 25 package** (rule evaluator exhaustive: every op, AND, precedence, missing values).

## Verify
pnpm --filter @876/projects-api exec prisma validate
pnpm --filter @876/projects-api exec prisma generate
pnpm --filter @876/projects-api typecheck
pnpm --filter @876/projects-api lint
pnpm --filter @876/projects-api test
pnpm --filter @876/projects typecheck
pnpm --filter @876/projects test

## Report
`plans/sep/16-projects-phase-12/reports/codex/12a-api.md`.
