# Codex brief: fix verification failures and finish finance Requests surface

Branch: feat/finance-requests-surface (already checked out). Do NOT commit, branch, push. No eslint-disable, @ts-ignore, `as any`. Do not weaken production code to pass tests. Read CLAUDE.md, .claude/rules/testing.md, access-control.md, plans/2026-09-13-finance-requests-surface/plan.md first.

## 1. Failing tests (introduced by this branch) — fix the root cause
- `pnpm --filter @876/billing-app test`: src/app/api/requests/tasks-and-activity.test.ts, src/app/api/customers/[customerId]/requests/route.test.ts (10 failures).
- `pnpm --filter @876/invoice-app test`: same two files (~12 failures).
  Likely cause: routes now call a feature-aware guard (request-api-access / api-permission) that the tests don't mock. Update test mocks to the new guard contract and ADD negative tests: feature disabled -> denied without CRM call. If the route is wrong, fix the route.
- `pnpm --filter @876/console test src/lib/permissions.test.ts`: pinned counts 77→79, 261→266, 273→279 and "nests each product catalog under one product group". Determine whether this branch caused it (compare `git diff main...HEAD`). If caused by an intended change (e.g. Requests module identity), update pins with justification; if unintended, fix the source. If pre-existing on main, leave it and say so.

## 2. Remaining plan gap (P9)
Gate/hide Work-backed request subresources (Tasks, Activity/events, reminders) in Billing and Invoice global and customer-scoped request routes when the Work capability is unavailable, following how Console/CRM already detect Work availability (search first; reuse, don't duplicate). Core request list/detail/create must stay available. Add tests. If no existing Work-capability signal exists, do NOT invent one — report it.

## 3. Out of scope (pre-existing on main, don't touch)
@876/core lint `any` in test files, @876/api boundaries circular deps, couriers tailwind @source.

## Verify (must all pass before reporting)
pnpm --filter @876/billing-app typecheck lint test
pnpm --filter @876/invoice-app typecheck lint test
pnpm --filter @876/console typecheck test
pnpm --filter @876/crm-ui typecheck test
node scripts/check-app-structure.mjs

## Report
Write plans/2026-09-13-finance-requests-surface/reports/codex/2026-09-14-verification-fixes-and-finish.md: files changed + reason, test counts before/after, decisions, anything not done. Also update plan.md checklist (P7–P10) to reflect real state.
