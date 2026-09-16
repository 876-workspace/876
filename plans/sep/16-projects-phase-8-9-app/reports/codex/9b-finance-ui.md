# 9b — Project finance UI (budgets, rates, billing, invoice handoff)

## Files

### `packages/projects-ui/src/finance/` (presentation-only, serializable props, no fetching, hrefs passed in as strings)
- `format-money.ts` — integer minor units (number|string) → display via `Intl.NumberFormat` with string maths only, no float; `formatMoneyOrUnpriced` renders `null` as "Unpriced"; `formatMinutes`, `formatDay` helpers.
- `financial-summary-panel.tsx` — planned vs actual hours/cost/revenue with variances, unpriced-minutes notice, budget consumption bars with over-threshold/over-budget flags.
- `budget-list.tsx` — money/hour budgets, scope/period/threshold columns, mobile + table layouts, `newHref`/`editBaseHref` links, `canEdit` gating.
- `rate-list.tsx` — scope labels (project/user/project-user), bill/cost per hour, effective range, same link/gating pattern.
- `billing-config-summary.tsx` — method/currency/customer/fixed-fee (fixed fee only for `fixed-fee`, null fee renders "Unpriced"); `BILLING_METHOD_LABELS`, `isBillableMethod` exported for reuse.
- Tests beside each file. Subpath exports added to `packages/projects-ui/package.json` (`./finance/*`).

### `apps/projects` — pages
- `src/app/(app)/projects/[projectId]/finance/page.tsx` — overview shell (`px-4 pt-5 pb-8 sm:px-6 lg:px-8`, `PageBreadcrumb`, `ProjectTabs`, `ResourceToolbar` with no `description`, data in `<Suspense>`); resolves `?from&to`, defaults to current UTC month.
- `finance/billing/edit/page.tsx`, `finance/budgets/new/page.tsx`, `finance/budgets/[budgetId]/edit/page.tsx`, `finance/rates/new/page.tsx`, `finance/rates/[rateId]/edit/page.tsx` — dedicated routes (no dialogs), same shell pattern.

### `apps/projects` — API routes (thin: `requireApiAccess`, zod `strictObject`, one client call, `apiJson`)
- `src/app/api/projects/[projectId]/billing/route.ts` — GET (view) + PUT (edit).
- `src/app/api/projects/[projectId]/financial-summary/route.ts` — GET with required `?from&to` (`to > from`, else 422).
- `src/app/api/projects/[projectId]/budgets/route.ts` — GET + POST; `budgets/[budgetId]/route.ts` — GET + PATCH + DELETE.
- `src/app/api/projects/[projectId]/rates/route.ts` — GET + POST; `rates/[rateId]/route.ts` — GET + PATCH + DELETE.
- `src/app/api/projects/[projectId]/invoice-drafts/route.ts` — POST `{from,to}`; idempotency and approved-only rules stay in the API.
- Amount/rate fields are `z.number().int().min(0)` — fractional money is rejected at 422.

### `apps/projects` — client + features
- `src/lib/client/finance.ts` (+ export in `lib/client/index.ts`) — billing, summary, budgets, rates, invoice-drafts against the routes above.
- `src/lib/services/projects.ts` — added `projectBilling`/`budgets`/`rates` getters (service tier passthrough, no logic).
- `src/features/finance/money-input.ts` — `parseDecimalToMinor`/`formatMinorForInput` (string maths, truncation never float rounding), `parseWholeHours`, `parseThresholdPercent`, `fractionDigitsForCurrency`.
- `src/features/finance/period.ts` — `resolvePeriod` (`?from&to` or current UTC month, invalid input falls back).
- `src/features/finance/components/` — `finance-data.tsx` (server loader: billing + summary + budgets + rates; invoice enabled only when method is billable AND a billing customer is set), `invoice-draft-action.tsx`, `billing-form.tsx`, `budget-form.tsx`, `rate-form.tsx`, `billing-data.tsx`, `new-budget-data.tsx`, `edit-budget-data.tsx`, `new-rate-data.tsx`, `edit-rate-data.tsx`. No functions cross the server→client boundary (serializable props only); errors render as `AppError` beside forms and forms keep their values.

## Test cases (`it()` count: 107, floor 40)

UI (35): `format-money` 15, `financial-summary-panel` 6, `budget-list` 5, `rate-list` 4, `billing-config-summary` 5.
App (72): route tests — billing 7, financial-summary 4, budgets 6, budget-by-id 7, rates 6, rate-by-id 7, invoice-drafts 5; `money-input` 17, `period` 7, `finance` client 6.

## Verification output
- `pnpm --filter @876/projects-ui typecheck` — pass.
- `pnpm --filter @876/projects-ui test` — 22 files, 269 tests, all pass.
- `pnpm --filter @876/projects-app typecheck` — FAIL on one pre-existing/other-agent error only: `src/app/api/timer/start/route.ts(31,5)` (`createdBy` not in `StartTimerInput`; time paths owned by brief 8b, do-not-touch for this brief). No errors in any finance file.
- `pnpm --filter @876/projects-app lint` — pass, 0 errors (4 warnings in untouched auth/shell files).
- `pnpm --filter @876/projects-app test` — 105 files, 816 tests, all pass.
- `node scripts/check-app-structure.mjs projects` — OK.
- `pnpm check:rsc-boundaries` — OK (10 apps).

## Unverified items
- App typecheck/lint/test ran while brief 8b (time wiring) was editing the same app concurrently; results are a snapshot and the timer-route type error belongs to that brief.
- No contract gaps hit: `packages/projects` index already exports all finance types used (`ProjectBilling`, `Budget`, `Rate`, `FinancialSummary`, `InvoiceDraft`, inputs); UI imports them type-only so the client `server-only` module is never loaded at runtime. Nothing in `packages/projects` or `apps/projects-api` was changed.
- End-to-end invoice handoff against Billing not exercised (no seed/staging env); route and client layers verified with mocks only.
