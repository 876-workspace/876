# Brief 15c — Projects app: custom modules

Repo `/root/projects/876`. Write code only; no commit/branch/push; no `eslint-disable`/`as any`/`@ts-ignore`; no run logs. Touch only `apps/projects/**`. Read `plans/sep/16-projects-phase-15/plan.md`.

## Read
Client resources for custom modules in `packages/projects/src/resources/` (grep `custom-module`); props of `packages/projects-ui/src/custom-modules/*.tsx` and `packages/projects-ui/src/layouts/{layout-renderer,layout-editor}.tsx`; patterns `apps/projects/src/app/(app)/settings/layouts/**`, `apps/projects/src/app/(app)/settings/automation/**`, their routes, `apps/projects/src/components/shell/nav-config.ts` + test, dashboard `apps/projects/src/app/(app)/page.tsx`.

## Deliver
- Settings → **Custom modules**: list, new (key, names, scope, icon), detail tabs Fields (reuse existing custom field form patterns), Statuses (`StatusEditor`), Layout (`LayoutEditor` for entity `custom-module:<key>`), Access (restricted role keys).
- Records at `app/(app)/m/[moduleKey]/` list (filters status/search, `RecordList`), `new`, `[recordId]` (`RecordSummary`, links to work items/projects/other records, activity if available), `[recordId]/edit` — forms through `LayoutRenderer`; rule errors beside form. Project-scoped modules also appear as a project tab `projects/[projectId]/m/[moduleKey]`.
- Sidebar: one entry per org-scope module (server-resolved plain data with icon keys; binding test green).
- Dashboard: user/shared widgets with `DashboardWidget`; add/remove/reorder on a `/settings/dashboard` page.
- Reports: module report page with CSV link.
- Thin routes for everything; caller role keys passed to the API from the resolved access context, never from the browser.
- Tests floor **60 `it()`**.

## Verify
pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app lint
pnpm --filter @876/projects-app test
node scripts/check-app-structure.mjs projects
pnpm check:rsc-boundaries

## Report
`plans/sep/16-projects-phase-15/reports/codex/15c-app.md`.
