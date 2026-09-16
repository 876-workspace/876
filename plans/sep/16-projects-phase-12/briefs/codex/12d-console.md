# Brief 12d — Console: Projects layouts and project custom fields (read-only)

Repo `/root/projects/876`. Write code only; no commit/branch/push; no `eslint-disable`/`as any`/`@ts-ignore`. Touch only `apps/console/**`. Pattern: the templates views you can find at `apps/console/src/app/(app)/projects/templates/` and `apps/console/src/features/projects/components/templates-data.tsx` (both trees, shared data component). Presentation: `@876/projects-ui/layouts/layout-summary`.

## Deliver (both trees)
- `projects/layouts` list (entity, type, default, version) and `projects/layouts/[layoutId]` detail with `LayoutSummary`.
- `projects/project-fields` list.
- Project record Overview: show custom field values.
- Sections/nav entries. Tests floor **15 `it()`**. `src/lib/permissions.test.ts` has 4 known pre-existing failures — ignore only those.

## Verify
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console exec vitest run src/features/projects src/components/shell src/features/orgs
node scripts/check-app-structure.mjs console
pnpm check:rsc-boundaries

## Report
`plans/sep/16-projects-phase-12/reports/codex/12d-console.md`.
