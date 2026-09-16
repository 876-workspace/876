# Brief 10c — Projects app: reports, dashboard, capacity

Repo `/root/projects/876`. Write code only; do NOT commit/branch/push. Another agent edits `apps/console/**` concurrently — touch only `apps/projects/**`. No `eslint-disable`/`as any`/`@ts-ignore`. One verification command at a time.

## Read budget
1. `plans/sep/16-projects-phase-10/plan.md` (contracts)
2. `packages/projects/src/resources/reports.ts`, `capacity.ts` (method names)
3. `packages/projects-ui/package.json` exports for `./reports/*`, and props at the top of each `packages/projects-ui/src/reports/*.tsx`
4. Patterns: `apps/projects/src/app/(app)/projects/[projectId]/finance/page.tsx`, `apps/projects/src/features/finance/components/finance-data.tsx`, `apps/projects/src/features/finance/period.ts`, `apps/projects/src/app/api/projects/[projectId]/budgets/route.ts`, `apps/projects/src/lib/client/finance.ts`
5. `apps/projects/src/components/shell/nav-config.ts` + test

## Deliver
- `app/(app)/reports/page.tsx` — dashboard: health table + work report panel for the period (`?from&to`, reuse `features/finance/period.ts` — do not copy it; if it must be shared, move it to `features/reports/period.ts` only if nothing else breaks, else import it).
- `app/(app)/reports/{work,time,budget-variance,workload}/page.tsx` — each with `ReportPeriodNav`, a CSV export link, independent `<Suspense>` per region. Time has `?groupBy=project|user|issue`.
- `app/api/reports/[report]/route.ts` **is forbidden** (generic gateway). Instead one explicit route per report under `app/api/reports/{work,health,time,budget-variance,workload}/route.ts`, GET only, `projects.view`, passing `format=csv` through and returning `text/csv` with `content-disposition: attachment`.
- `app/(app)/settings/capacity/page.tsx` + `new` + `[capacityId]/edit` pages; routes `app/api/capacity/route.ts`, `app/api/capacity/[capacityId]/route.ts` (`projects.edit` for writes); minutes-per-week entered as hours (string → integer minutes, no float).
- `features/reports/components/**` data loaders; `lib/client/reports.ts` for capacity mutations.
- Nav: "Reports" → `/reports` in `nav-config.ts` (keep binding test green).
- Page rules: container `px-4 pt-5 pb-8 sm:px-6 lg:px-8`, `ResourceToolbar` without `description`, `DataTableSkeleton` fallbacks, `AppError` banners, no function props server→client.
- Tests: every route (401, 422, success, csv headers, error status) and data loaders. Floor **40 `it()`**.

## Verify
pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app lint
pnpm --filter @876/projects-app test
node scripts/check-app-structure.mjs projects
pnpm check:rsc-boundaries

## Report
`plans/sep/16-projects-phase-10/reports/command-code/10c-app.md`: files, counted tests, verification output, unverified items.
