# Brief CP1 — Console read-only views for Projects phases 1–9

Repo `/root/projects/876`. Write code only: no commit/branch/push, no `eslint-disable`/`as any`/`@ts-ignore`, no run logs, one verification command at a time. Read `plans/sep/16-projects-console-parity/plan.md` — binding.
Rules: `.claude/rules/app-layout.md`, `data-loading.md`, `error-handling.md`, `shared-product-ui.md`, `production-render-errors.md`, `navigation-performance.md`, `app-structure.md`.

Another agent edits `apps/projects-api/**`, `packages/projects/**`, `packages/projects-ui/**` concurrently. **Touch only `apps/console/**`.** If a projects-ui component lacks a prop you need, render with Console-local markup in `features/projects/components/` and list it in the report.

## Existing pattern (read only these first)
- `apps/console/src/features/orgs/app-workspaces.ts` (sections list for `876-projects`, `projectsBase`)
- `apps/console/src/components/shell/nav-config.ts` + `nav-config.test.ts` (platform `/projects` children)
- `apps/console/src/lib/auth/route-permissions.ts`
- `apps/console/src/app/(app)/projects/projects/[projectId]/page.tsx` and `apps/console/src/app/(app)/workspace/[orgSlug]/projects/projects/[projectId]/page.tsx`
- `apps/console/src/features/projects/components/project-detail-data.tsx`
- `apps/console/src/lib/services/projects.ts` (operator client — it already has every resource: `phases`/milestones, `taskLists`, `cycles`, `gantt`, `baselines`, `calendar`, `events`, `timeEntries`, `timesheets`, `projectBilling`, `budgets`, `rates`; check `packages/projects/src/client.ts` for exact names)
- The Projects app equivalents for layout reference only: `apps/projects/src/app/(app)/{phases,cycles,calendar,time}/`, `apps/projects/src/app/(app)/projects/[projectId]/{gantt,time,finance}/`

## Deliver (each route in BOTH trees, sharing one data component)
1. Top-level sections: **Phases** (list + detail), **Cycles** (list + detail), **Task lists** (list), **Calendar** (events for a period), **Time** (entries list with filters + timesheets list/detail with status). Add them to `app-workspaces.ts` sections and to the platform nav children in `nav-config.ts` (keep its binding test green; reuse `projects/dashboard.view` permission unless a stricter existing one fits).
2. Project record tabs under `projects/[projectId]/`: Overview (existing), **Gantt** (with baseline selector, read-only — no drag), **Time**, **Finance** (billing config, summary, budgets, rates), **Attachments** (list with names/sizes; no download proxying — use whatever the API returns). Build the tab strip from `params` only (navigation-performance Rule 2).
3. Work-item detail (`issues/[issueRef]`): show relations, dependencies, attachments, time logged if not already shown.
4. Every page: container `px-4 pt-5 pb-8 sm:px-6 lg:px-8` where the tree uses it, `ResourceToolbar` without `description`, data behind `<Suspense>` with `DataTableSkeleton` using real columns, errors as `AppError` with `showCode`, metadata titles in the `<record> • <subview> - <section>` convention.
5. No functions passed server → client (`pnpm check:rsc-boundaries`).
6. Tests: data components (success, error banner, not-found) and nav/section config. Floor **40 `it()`**.

## Verify (one at a time)
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
node scripts/check-app-structure.mjs console
pnpm check:rsc-boundaries

## Report
`plans/sep/16-projects-console-parity/reports/codex/cp1-console-views.md`: files, counted tests, verification output, projects-ui gaps, unverified items.
