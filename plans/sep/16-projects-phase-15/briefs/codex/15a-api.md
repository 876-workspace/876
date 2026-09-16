# Brief 15a — Projects API: custom modules, records, statuses, links, widgets

Repo `/root/projects/876`. Read `plans/sep/16-projects-phase-15/plan.md` — binding; also phase 12 (layouts, `src/modules/custom-fields/field-values.ts`) and phase 13 (automation outbox/triggers) plans.
Rules: `.claude/rules/express-api.md`, `naming.md`, `error-handling.md`, `testing.md`, `deletions.md`, `ai-code-quality.md`.
Hard rules: no commit/branch, no `prisma migrate`, no `eslint-disable`/`as any`/`@ts-ignore`, no run logs. Touch only `apps/projects-api/**`, `packages/projects/**`.

## Deliver
1. Migration `prisma/migrations/20260927000000_custom_modules/migration.sql` + schema per plan.
2. Module `src/modules/custom-modules/`: definitions CRUD (key immutable after create), fields (reuse shared validator), statuses (reorder, default open status, cannot delete a status in use), records CRUD with cursor pagination + filters (status, field equals, project, search title), links, per-module `restrictedToRoleKeys` check with caller role keys passed in a header by the app (documented interim), reports (count by status, by select field, created per day in period; CSV via reports serializer), widgets CRUD.
3. Extend layouts entity union to `custom-module:<key>` (resolver + validation of `cf:` keys against module fields); layout rule enforcement on record create/update.
4. Outbox triggers `custom-record.created|updated|status-changed` appended in the same transaction; automation actions `set-field`/`notify`/`call-webhook` accept record subjects.
5. Client resources + types + tests.
6. Test floor **≥ 90 api, ≥ 20 package**.

## Verify
pnpm --filter @876/projects-api exec prisma validate
pnpm --filter @876/projects-api exec prisma generate
pnpm --filter @876/projects-api typecheck
pnpm --filter @876/projects-api lint
pnpm --filter @876/projects-api boundaries
pnpm --filter @876/projects-api test
pnpm --filter @876/projects typecheck
pnpm --filter @876/projects test

## Report
`plans/sep/16-projects-phase-15/reports/codex/15a-api.md`.
