# Brief 12c — Projects app: custom fields, layouts, layout-driven forms

Repo `/root/projects/876`, branch `feature/projects-phase-12-layouts`. Write code only; no commit/branch/push; no `eslint-disable`/`as any`/`@ts-ignore`; no run logs; one verification command at a time. Touch only `apps/projects/**` (another agent edits `apps/console/**`). Read `plans/sep/16-projects-phase-12/plan.md`.

## Read
`packages/projects/src/resources/layouts.ts`, `project-custom-fields.ts`, `packages/projects/src/layout-rules.ts`; props of `packages/projects-ui/src/layouts/{layout-renderer,layout-editor}.tsx`; patterns `apps/projects/src/app/(app)/settings/templates/**`, `apps/projects/src/app/api/project-templates/route.ts`, existing work-item custom fields settings pages (grep `custom-fields` under `apps/projects/src/app`), and the existing project / phase / work-item create+edit forms.

## Deliver
- Settings → **Project fields** (list/new/edit, mirroring the existing work-item custom field settings) and **Layouts** (list by entity + work-item type, new, edit with `LayoutEditor`, make default). Settings nav entries.
- Routes: `app/api/project-custom-fields/**`, `app/api/projects/[projectId]/custom-field-values/route.ts`, `app/api/layouts/**` (incl. `make-default`, `resolve`) — thin, `projects.view` reads / `projects.edit` writes.
- Project, phase and work-item **create and edit** forms render fields through `LayoutRenderer` using the resolved layout (server-resolved, passed as data); submit maps named inputs to the existing API bodies + custom field values. Server rule errors (`projects/layout-required-fields`, `projects/layout-field-disabled`) render as `AppError` beside the form with the field list, keeping entered values.
- Project detail Overview shows project custom field values.
- Keep every existing form test green; update fixtures rather than weakening assertions.
- Tests floor **50 `it()`**.

## Verify
pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app lint
pnpm --filter @876/projects-app test
node scripts/check-app-structure.mjs projects
pnpm check:rsc-boundaries

## Report
`plans/sep/16-projects-phase-12/reports/codex/12c-app.md`.
