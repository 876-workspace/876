# Brief 9a — Projects API: budgets, rates, planned-vs-actual, invoice handoff

Repo `/root/projects/876`, branch `feature/projects-phase-8-time`. Read `plans/2026-09-15-projects-phase-9/plan.md` — binding. Also read `.claude/rules/billing-data-plane.md` (money is integer minor units; never a JS float) and `.claude/rules/billing-commercial-platform.md` (Billing owns customers/invoices/ledger; Projects must not duplicate them).

**You own `apps/projects-api/**` and `packages/projects/**` only.** Other agents are editing `apps/projects/src`, `packages/projects-ui` and `docs/` right now — do not open or edit those.

Hard rules: no commit/branch, no `prisma migrate` (hand-write SQL), no `eslint-disable`/`as any`/`@ts-ignore`, no run logs, one verification command at a time. Index/constraint names ≤ 63 chars pinned with `map:`.

## Reference (read only these)
`apps/projects-api/src/modules/time/time.{service,repository,serializers,schemas}.ts` (just landed — the time entries you will price), `src/modules/projects/gantt.scheduling.ts` (pure-module + unit-test pattern), migration `prisma/migrations/20260920000000_time_tracking/migration.sql`, and for the Billing client surface `packages/billing/src/resources/invoices.ts` plus `packages/billing/package.json` exports. New repositories must be mocked in suites that transitively import routes (see `src/modules/labels/__tests__/labels.test.ts`).

## Deliver
1. **Schema + migration** `prisma/migrations/20260921000000_project_finance/migration.sql`: `ProjectBilling`, `Budget`, `Rate` per the plan, plus `billedInvoiceId` and `billedAt` on `TimeEntry` (additive). Amounts are `Int` minor units or `Decimal` where a rate needs precision — **never** `Float`.
2. **Pure module** `src/modules/finance/finance.calculations.ts`: rate resolution in the documented order; cost and revenue from minutes and rates using integer maths; budget consumption (spent vs budget, percent, over-threshold boolean); planned vs actual for hours, cost and revenue. No database, no clock, no rounding except the single documented one. A missing rate returns `null` and the caller must surface "unpriced" rather than substituting zero.
3. **Module** `src/modules/finance/finance.{controller,repository,schemas,serializers,service}.ts` + routes (internal-key guarded):
   - `GET/PUT /projects/:projectId/billing` (config), `GET/POST/PATCH/DELETE /budgets`, `GET/POST/PATCH/DELETE /rates`
   - `GET /projects/:projectId/financial-summary?from&to` → hours planned/actual, cost, revenue, budget consumption per scope, and an explicit `unpricedMinutes` figure
   - `POST /projects/:projectId/invoice-drafts` → collects **approved, unbilled, billable** entries in the period, calls Billing's invoice create through `@876/billing/service` with an idempotency key derived from (tenant, project, period, sorted entry ids), stores `billedInvoiceId`/`billedAt` on those entries in the same transaction as the success, and returns the invoice id. Re-running with the same input returns the same invoice id and bills nothing twice. If Billing returns an error it is propagated as a value and **no** entry is marked billed.
   - Register every new error code in the projects error registry.
4. **`@876/projects`**: `resources/project-billing.ts`, `resources/budgets.ts`, `resources/rates.ts` + tests; types; wired on the client.
5. **Tests, floor ≥ 55 new `it()` in projects-api (≥ 20 pure `finance.calculations.ts`) and ≥ 12 in the package**: each rate-resolution order case, missing rate yields null and shows as unpriced (never 0), minute→hour rounding exactly once and half-up, cost and revenue for a mixed billable/non-billable set, budget by amount and by hours, threshold crossing at exactly the percent, over-budget, invoice draft bills only approved entries, a second identical draft returns the same invoice id and marks nothing again, a Billing error leaves every entry unbilled, tenant isolation, unknown project 404.

## Verify
pnpm --filter @876/projects-api exec prisma validate
pnpm --filter @876/projects-api exec prisma generate
pnpm --filter @876/projects-api typecheck
pnpm --filter @876/projects-api lint
pnpm --filter @876/projects-api test
pnpm --filter @876/projects typecheck
pnpm --filter @876/projects test

## Report
`plans/2026-09-15-projects-phase-9/reports/codex/9a-api.md`: files, full migration SQL, counted tests, the exact rounding rule you implemented, how idempotency is keyed, and unverified items.
