# Brief 15d — Console: Projects custom modules (read-only)

Repo `/root/projects/876`. Write code only; no commit/branch/push; no `eslint-disable`/`as any`/`@ts-ignore`. Touch only `apps/console/**`. Pattern: `apps/console/src/app/(app)/projects/automation/**` and its data component, both trees. Presentation: `@876/projects-ui/custom-modules/*`, `@876/projects-ui/layouts/layout-summary`.

## Deliver (both trees)
`projects/custom-modules` list, `projects/custom-modules/[moduleId]` (fields, statuses, layout summary, access), `projects/custom-modules/[moduleId]/records` + record detail. Tests floor **20 `it()`**; ignore only the 4 known `src/lib/permissions.test.ts` failures.

## Verify
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console exec vitest run src/features/projects src/components/shell src/features/orgs
node scripts/check-app-structure.mjs console
pnpm check:rsc-boundaries

## Report
`plans/sep/16-projects-phase-15/reports/codex/15d-console.md`.
