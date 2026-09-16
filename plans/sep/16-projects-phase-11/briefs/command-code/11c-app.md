# Brief 11c — Projects app: templates, create-from-template, clone

Repo `/root/projects/876`. Write code only; no commit/branch/push; no `eslint-disable`/`as any`/`@ts-ignore`. Touch only `apps/projects/**` (another agent edits `apps/console/**`). One verification command at a time.

## Read budget
1. `plans/sep/16-projects-phase-11/plan.md`
2. `packages/projects/src/resources/project-templates.ts` and the `clone` method on `packages/projects/src/resources/projects.ts`
3. props at the top of `packages/projects-ui/src/templates/*.tsx`
4. patterns: `apps/projects/src/app/(app)/settings/capacity/` (list/new/edit pages), `apps/projects/src/app/api/capacity/route.ts`, `apps/projects/src/lib/client/reports.ts`, `apps/projects/src/app/(app)/projects/[projectId]/finance/page.tsx`
5. `apps/projects/src/components/shell/nav-config.ts` + test; `apps/projects/src/app/(app)/settings/_lib/settings-nav.ts` + test

## Deliver
- `app/(app)/settings/templates/page.tsx` (list), `[templateId]/page.tsx` (summary, versions, preview for a chosen start date via `?start=`), `[templateId]/edit/page.tsx` (name/description).
- `app/(app)/projects/new/from-template/page.tsx` — pick template, name, key, start date, include options, live preview (server-rendered by `?templateId&start`), submit → redirect to new project. Generate a UUID idempotency key once per form mount.
- Project record: "Save as template" and "Clone" as dedicated routes `projects/[projectId]/save-as-template` and `projects/[projectId]/clone` (forms, not dialogs); surface them in the project toolbar `···` dropdown only if a sibling detail toolbar already has one, else as links on the Overview page.
- Routes: `app/api/project-templates/route.ts`, `[templateId]/route.ts`, `[templateId]/versions/route.ts`, `[templateId]/preview/route.ts`, `[templateId]/instantiate/route.ts`, `app/api/projects/[projectId]/save-as-template/route.ts`, `app/api/projects/[projectId]/clone/route.ts` — `projects.view` reads, `projects.edit` writes, strictObject bodies, one client call.
- `lib/client/templates.ts`, `features/templates/components/**`.
- Settings nav entry "Templates".
- Page rules as before: standard container, `ResourceToolbar` without `description`, `DataTableSkeleton`, `AppError`, no function props server→client, `FormRow` fields, bare verbs.
- Tests floor **40 `it()`**.

## Verify
pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app lint
pnpm --filter @876/projects-app test
node scripts/check-app-structure.mjs projects
pnpm check:rsc-boundaries

## Report
`plans/sep/16-projects-phase-11/reports/command-code/11c-app.md`.
