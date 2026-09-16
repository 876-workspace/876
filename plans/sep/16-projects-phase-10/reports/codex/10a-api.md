# Brief 10a — Projects API: reports, workload, capacity, CSV

- **Run ID:** `2026-09-16-projects-phase-10`
- **Branch:** `feature/projects-phase-10-reports`
- **Status:** done (all 7 verification commands pass, no commit per hard rules)

## Files

New:

- `apps/projects-api/prisma/schema/capacity.prisma` — `MemberCapacity` model, table `projects_member_capacity`, index `(tenantId, userId, effectiveFrom)` pinned as `projects_member_capacity_tenant_user_from_idx` (45 chars).
- `apps/projects-api/prisma/migrations/20260922000000_member_capacity/migration.sql` — hand-written (no `prisma migrate` run).
- `apps/projects-api/src/modules/reports/reports.schemas.ts` — Zod queries/bodies, `ReportPeriod`, `toReportPeriod` (`to <= from` is invalid, enforced in service as 422).
- `apps/projects-api/src/modules/reports/reports.serializers.ts` — plan contracts verbatim, capacity serializer, health classifier, utilisation/capacity maths, RFC 4180 CSV + injection guard.
- `apps/projects-api/src/modules/reports/reports.repository.ts` — capacity CRUD plus tenant-scoped, soft-delete-excluding reads over projects/issues/time-entries/budgets/rates/billing (same read pattern as `finance.repository.ts`, which already reads `timeEntry`/`issue`).
- `apps/projects-api/src/modules/reports/reports.service.ts` — orchestration; reuses `priceEntries`, `budgetConsumption`, `plannedVsActual` from `finance.calculations.ts` via `finance/index.ts`; no duplicated cost maths.
- `apps/projects-api/src/modules/reports/reports.controller.ts` — JSON envelope default, `?format=csv` sends `text/csv`.
- `apps/projects-api/src/modules/reports/reports.routes.ts` — internal-key guarded; mounted in `src/http/routes.ts` under `/v1/organizations/:organizationId`.
- `apps/projects-api/src/modules/reports/index.ts`
- `apps/projects-api/src/modules/reports/__tests__/reports.test.ts` (56 `it()`), `reports-routes.test.ts` (11), `reports-serializers.test.ts` (29).
- `packages/projects/src/resources/reports.ts`, `packages/projects/src/resources/capacity.ts`
- `packages/projects/src/resources/reports.test.ts` (9), `packages/projects/src/resources/capacity.test.ts` (6)

Modified:

- `apps/projects-api/prisma/schema/tenant.prisma` — `memberCapacities MemberCapacity[]`.
- `apps/projects-api/src/http/errors.ts` — `projects/capacity-not-found` (404), `projects/capacity-overlap` (409), `projects/invalid-period` (422).
- `apps/projects-api/src/http/routes.ts` — mount reports router (no path collisions; verified).
- `apps/projects-api/src/platform/ids.ts` — `memberCapacity: 'cap_'`.
- `packages/projects/src/types.ts` — report/capacity zod contracts + query/input types matching the plan exactly.
- `packages/projects/src/client.ts` — `reports`, `capacity` namespaces; `contracts.ts` + `index.ts` export the new schemas/types.
- `packages/projects/src/client.test.ts` — namespace key list extended.

Untouched per brief: `packages/projects-ui/**`, `apps/projects/**`.

## Full migration SQL

```sql
-- Member capacity: weekly available minutes per user with an effective range.
-- Missing capacity means unknown utilisation (null), never 0% or 100%.
-- Overlapping effective ranges for one user are rejected in application code
-- with projects/capacity-overlap; the index below keeps those lookups scoped.
CREATE TABLE "projects_member_capacity" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "minutes_per_week" INTEGER NOT NULL,
    "effective_from" BIGINT NOT NULL,
    "effective_to" BIGINT,
    "deleted_at" BIGINT,
    "deleted_by" TEXT,
    "deletion_reason" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_member_capacity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_member_capacity_tenant_user_from_idx" ON "projects_member_capacity"("tenant_id", "user_id", "effective_from");

-- Range and value guards so invalid capacity rows fail at the database.
ALTER TABLE "projects_member_capacity" ADD CONSTRAINT "projects_member_capacity_minutes_chk" CHECK ("minutes_per_week" > 0);
ALTER TABLE "projects_member_capacity" ADD CONSTRAINT "projects_member_capacity_effective_chk" CHECK ("effective_to" IS NULL OR "effective_to" > "effective_from");

-- AddForeignKey
ALTER TABLE "projects_member_capacity" ADD CONSTRAINT "projects_member_capacity_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

## Counted tests

- projects-api: **96 new `it()`** (floor 55) — 56 service/route-mocked service tests, 29 pure serializer tests, 11 HTTP route tests. Full suite: 27 files / 804 tests pass.
- `@876/projects`: **15 new `it()`** (floor 12) — 9 reports resource/contract, 6 capacity resource/contract. Full suite: 27 files / 168 tests pass.
- Floor checklist: grouping+totals per report; overdue boundary (`dueDate == now` is not overdue, `< now` is); all four health states incl. exact-20% boundary (at-risk, not off-track); null utilisation without capacity; rounding (33/67, half-up 2.5→3); variance sign (`actual - budget`, money as strings); CSV commas/quotes/newlines + `= + - @` guard (plain `-500` exempt); overlap refusal on create+update (409); tenant isolation; soft-deleted exclusion (service-side filter, mirroring `liveEntries`); invalid period → 422 over HTTP and service.

## Decisions

1. **Work/health are point-in-time snapshots.** The period is validated and echoed but does not filter issues; time/budget/workload filter entries by `startedAt` in `[from, to)` (`to` exclusive per plan, unlike the inclusive sibling filters — pinned by tests).
2. **Overdue is strict**: open (`status` not `done`/`canceled`) and `dueDate < now`.
3. **Health**: `unknown` iff no open items and no project-scope budget percent; `off-track` iff `overdue/open > 0.2` (strict) or any project-scope budget over budget; `at-risk` iff any overdue or any budget at/over its own `thresholdPercent`. Only `scope='project'` budgets count; percent is the max across them via `budgetConsumption`. Progress is `floor(closed*100/total)`, `null` with no issues. Archived projects excluded.
4. **Budget variance**: project-scope budgets only; `budgetMinor` = Σ `amountMinor` as string (null if none), `budgetMinutes` = Σ `hours*60` (null if none); actuals via `priceEntries` over period entries; `varianceMinor = actual - budget` via `plannedVsActual`; currency from project billing config, else null.
5. **Workload planned minutes = Σ `issue.estimate ?? 0`** over open assigned issues in scope — the issue model has `estimate` (0–100 points scale), so per the brief it is used as-is; see unverified item 1. Users = assignees ∪ period entry users. Capacity = row effective at period start, prorated `round(minutesPerWeek * seconds / 604800)`; utilisation `round(logged*100/capacity)`, null without/zero capacity.
6. **CSV**: CRLF, header row always, nulls as empty cells, quote on `, " \n \r` with `""` doubling, `'` guard on leading `= + - @` except plain numbers. Reports only (capacity stays JSON). Client `format: 'csv'` overloads return `Result<string>` via raw fetch.
7. **Capacity**: `effectiveTo: null` is open-ended; touching ranges allowed, any overlap (incl. open-ended) → 409; merged-range check on PATCH → 400 `invalid-request`; DELETE is soft with tombstone. Reads hide soft-deleted rows in both SQL and service.

## Unverified items

1. **Workload `plannedMinutes` units**: `estimate` is a 0–100 points-scale field, summed here as minutes per the brief's prescription. Product (10b/10c) should confirm whether points-as-minutes is intended or `plannedDurationMinutes` was meant.
2. **Migration not applied to a live database** (`prisma migrate` forbidden by brief); only `validate` + `generate` were run. `migrate deploy` is still needed wherever this branch lands.
3. **No performance check** on the health/variance fan-out (one reads-all per table, grouped in memory); fine for Phase 10 scope but revisit with large tenants.
