# Brief 10a — Projects API: reports, workload, capacity, CSV

Repo `/root/projects/876`, branch `feature/projects-phase-10-reports`. Read `plans/sep/16-projects-phase-10/plan.md` — **binding, including the exact contracts**.
Rules: `.claude/rules/express-api.md`, `naming.md`, `error-handling.md`, `testing.md`, `deletions.md`.
Hard rules: no commit/branch, no `prisma migrate` (hand-write SQL), no `eslint-disable`/`as any`/`@ts-ignore`, no run logs, one verification command at a time. Index names ≤ 63 chars pinned with `map:`.

## Reference (read only these)
`apps/projects-api/src/modules/time/*` (module shape + summary grouping), `src/modules/finance/finance.calculations.ts` + `finance.service.ts` (reuse for cost/budget — do not duplicate), migration `prisma/migrations/20260921000000_project_finance/migration.sql`, client `packages/projects/src/resources/time-entries.ts`. Mock new repositories in suites that import routes (see `src/modules/labels/__tests__/labels.test.ts`).

## Deliver
1. `prisma/schema/capacity.prisma` + `prisma/migrations/20260922000000_member_capacity/migration.sql` (`MemberCapacity` per plan; index `(tenantId, userId, effectiveFrom)`).
2. Module `src/modules/reports/` (controller, repository, schemas, serializers, service, routes), internal-key guarded like siblings:
   - `GET /reports/work?projectId&from&to`
   - `GET /reports/health`
   - `GET /reports/time?groupBy=project|user|issue&from&to&projectId`
   - `GET /reports/budget-variance?from&to`
   - `GET /reports/workload?from&to&projectId`
   - each accepts `format=csv` → `text/csv` body with a header row, formula-injection guard.
   - `GET/POST /capacity`, `PATCH/DELETE /capacity/:id` (user capacity; overlapping effective ranges for one user rejected with a registered error).
   - Planned minutes for workload = sum over open assigned items of their estimate if the issue model has one; if it does not, use 0 and say so in the report — do not invent a field.
3. `@876/projects`: `resources/reports.ts`, `resources/capacity.ts`, types/schemas matching the plan contracts exactly, wired on the client + `contracts` export, tests.
4. Test floor: **≥ 55 new `it()` in projects-api, ≥ 12 in the package**: each report's grouping and totals, overdue boundary (due exactly now), health thresholds for all four states, null utilisation without capacity, utilisation rounding, budget variance sign with money as strings, CSV quoting of commas/quotes/newlines and injection guard, capacity overlap refusal, tenant isolation, soft-deleted exclusion, invalid period (to ≤ from) → 422.

## Verify
pnpm --filter @876/projects-api exec prisma validate
pnpm --filter @876/projects-api exec prisma generate
pnpm --filter @876/projects-api typecheck
pnpm --filter @876/projects-api lint
pnpm --filter @876/projects-api test
pnpm --filter @876/projects typecheck
pnpm --filter @876/projects test

## Do not touch
`packages/projects-ui/**`, `apps/projects/**`.

## Report
`plans/sep/16-projects-phase-10/reports/codex/10a-api.md`: files, full migration SQL, counted tests, decisions, unverified items.
