# Brief: error-catalog cleanup — review fixes (Codex gpt-5.6-terra, low)

Branch `feature/error-catalog-cleanup`, uncommitted working tree (do NOT commit, branch, or stash).
Read budget: only the files named below.

## Orchestrator review findings (verified)

All typecheck green; tests green for core, commerce, crm, projects, work, widgets, couriers, storage (546 py).
Remaining items:

1. `apps/api/src/http/middleware/envelope.ts` — fallback code changed `error/http` → `error/unknown`.
   Grep `apps/api/src` and `packages/` tests for `'error/http'` assertions or consumers; update any
   consumer that still expects `error/http`. If none, leave as is.
2. `apps/api/src/http/middleware/error-handler.ts` `notFoundHandler` — dropped the
   `Cannot <METHOD> <path>` message. Grep tests under `apps/api/src` for `Cannot ` expectations; fix any.
   Keep the registered message (decision: registry owns public copy).
3. Pre-existing on main, NOT caused by this branch — do not touch:
   `users-batch.test.ts` (>100 user_ids) and billing `full-route-auth-matrix.test.ts` (380 vs 385).
   `documents.service.chaos.test.ts` is flaky under full-suite load only; passes in isolation.
4. Update `plans/2026-09-14-error-catalog-cleanup/plan.md` checklist to the truth:
   Phase 7 storage [x]; Phase 8 core API terminal middleware [x] (whole-service AppHttpError
   migration remains follow-up); Phase 9 billing terminal middleware [x] (same caveat);
   Phases 10–11 not started [ ] — mark deferred; Phase 12 [x] (`scripts/check-error-contract.mjs`
   wired into root `check`). Set handoff to "ready for PR".

## Verification (run one at a time)

pnpm --filter @876/api typecheck
pnpm --filter @876/api test

## Report

Write `plans/2026-09-14-error-catalog-cleanup/reports/codex/2026-09-14-review-fixes.md`: files changed + why,
test counts, what you could not verify. No eslint-disable / as any.
