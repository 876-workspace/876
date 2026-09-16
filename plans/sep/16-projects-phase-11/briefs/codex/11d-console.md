# Brief 11d — Console: Projects templates (read-only)

Repo `/root/projects/876`. Write code only; no commit/branch/push; no `eslint-disable`/`as any`/`@ts-ignore`. Touch only `apps/console/**` (another agent edits `apps/projects/**`). Read `plans/sep/16-projects-console-parity/plan.md` and `plans/sep/16-projects-phase-11/plan.md`.

## Pattern
Copy the shape CP1 used: `apps/console/src/app/(app)/projects/cycles/` and `apps/console/src/app/(app)/workspace/[orgSlug]/projects/cycles/`, `apps/console/src/features/projects/components/cycles-data.tsx` (+test), `apps/console/src/features/orgs/app-workspaces.ts`, `apps/console/src/components/shell/nav-config.ts` + `nav-config.projects.test.ts`.
Presentation: import `@876/projects-ui/templates/template-list`, `template-summary`, `template-preview-table` (read their props). Do not re-create them.

## Deliver (both trees)
- `projects/templates` list and `projects/templates/[templateId]` detail with versions and a preview for `?start=` (default today UTC midnight).
- Add "Templates" to the Projects sections and platform nav.
- Tests floor **15 `it()`**; `pnpm --filter @876/console test` has 4 known pre-existing failures in `src/lib/permissions.test.ts` — ignore only those.

## Verify
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console exec vitest run src/features/projects src/components/shell src/features/orgs
node scripts/check-app-structure.mjs console
pnpm check:rsc-boundaries

## Report
`plans/sep/16-projects-phase-11/reports/codex/11d-console.md`.
