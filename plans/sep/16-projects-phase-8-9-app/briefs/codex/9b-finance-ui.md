# Brief 9b — Project finance UI (budgets, rates, billing, invoice handoff)

Repo: /root/projects/876. You write code; you do NOT commit, branch, or push. Another agent is working at the same time in the directories listed under "Do not touch".

## Context
Phase 9 shipped the API and client only: `packages/projects/src/resources/project-billing.ts` (retrieve/put billing config, `financialSummary`, `createInvoiceDraft`), `budgets.ts`, `rates.ts`; schemas in `packages/projects/src/types.ts` around lines 1440–1600. Binding decisions: `plans/sep/15-projects-phase-9/plan.md` (read it). There is no UI.

## Deliverables (you own exactly these paths)
1. `packages/projects-ui/src/finance/` — presentation-only components (no fetching, no hrefs hard-coded, no session): `financial-summary-panel.tsx` (planned vs actual cost/revenue/hours, budget consumption with threshold), `budget-list.tsx`, `rate-list.tsx`, `billing-config-summary.tsx`, plus `format-money.ts` (minor units → display using `Intl.NumberFormat`; amounts arrive as integers/strings, **never do float arithmetic on money**; a `null` price renders "Unpriced", never 0). Add subpath exports to `packages/projects-ui/package.json`. Tests beside each (check the package's vitest environment first).
2. `apps/projects/src/app/(app)/projects/[projectId]/finance/page.tsx` — overview: billing config, summary for a period (`?from&to`, default current month), budgets, rates, and a "Create invoice" action (enabled only when billing method is billable and a Billing customer is set).
3. Create/edit as dedicated routes (not dialogs): `finance/billing/edit`, `finance/budgets/new`, `finance/budgets/[budgetId]/edit`, `finance/rates/new`, `finance/rates/[rateId]/edit`.
4. `apps/projects/src/app/api/projects/[projectId]/{billing,financial-summary,budgets,rates,invoice-drafts}/**` — thin route handlers following `apps/projects/src/app/api/projects/[projectId]/baselines/route.ts`: `requireApiAccess` (`projects.view` for reads, `projects.edit` for writes), zod strictObject, one client call, `apiJson`. No business logic; idempotency and "approved-only" rules live in the API.
5. `apps/projects/src/lib/client/finance.ts` (pattern: `lib/client/baselines.ts`) and `apps/projects/src/features/finance/components/**` (data loaders + client form adapters).
6. Test floor: **40 `it()` cases** across ui + app.

## Rules (binding)
- Pages: synchronous shell, `px-4 pt-5 pb-8 sm:px-6 lg:px-8`, `PageBreadcrumb`, `ProjectTabs` (already has a Finance tab), `ResourceToolbar` with **no `description`**, data in `<Suspense>`; forms use `FormRow` from `@876/ui/form-row`, bare-verb buttons, no green buttons.
- Money: integer minor units in every request body; parse user input with string maths to minor units. No JS float for amounts or rates.
- Never pass functions server → client component. Errors rendered as `AppError` values beside the form; form keeps its values.
- No `as any`, `eslint-disable`, `@ts-ignore`. Do not change `packages/projects` or `apps/projects-api`; if a contract is missing, report it.

## Do not touch
`apps/projects-api/**`, `packages/projects/**`, `apps/projects/src/app/(app)/time/**`, `apps/projects/src/app/(app)/projects/[projectId]/time/**`, `apps/projects/src/app/api/{time-entries,timesheets,timer}/**`, `apps/projects/src/lib/client/time.ts`, `apps/projects/src/features/time/**`, `apps/projects/src/components/shell/**`, `project-tabs.tsx`, existing `packages/projects-ui/src/*` files except `package.json` exports.

## Verify (one at a time)
```
pnpm --filter @876/projects-ui typecheck && pnpm --filter @876/projects-ui test
pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app lint
pnpm --filter @876/projects-app test
node scripts/check-app-structure.mjs
pnpm check:rsc-boundaries
```

## Report
`plans/sep/16-projects-phase-8-9-app/reports/codex/9b-finance-ui.md`: files, counted `it()` cases, verification output, unverified items.
