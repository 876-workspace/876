# 876 Registered Error Catalog Cleanup — Run Plan

Date: 2026-09-14 · Integration branch: `feature/error-catalog-cleanup` (from `main`)
Rule inputs: `.agents/rules/ai-code-quality.md`, `git.md`, `error-handling.md`, `stripe-api-pattern.md`, `api-backend.md`.

## Decisions (orchestrator-locked)

1. `error/internal` NOT added. `error/unknown` (500, `generic.ts:26`) is already the canonical generic 500, referenced by `core/api.ts`, couriers lib, console lib. Adding a duplicate violates reuse-first.
2. BFF/Next routes and SDK string-error handling are in scope (Phases 10–11), not just backend APIs.
3. Message normalization keeps byte-identical public messages; only construction is deduped (CRM `Unauthorized.`, Projects credentials message, commerce dynamic 404).
4. Storage envelope `{error:{...}}` → `{data:null,error:{...}}` is breaking; migration keeps backward-compat read path and is flagged in final report.
5. OAuth RFC6749, Twilio/WorkOS webhooks, provider bridges, health/readiness stay non-canonical (documented exceptions).

## Phase checklist

- [x] Phase 0 — Core registry readiness (barrel, fallback, shared tests, testing helper)
- [x] Phase 1 — Commerce registry (`apps/commerce-api/src/http/errors.ts`, handler swap, client-only split)
- [x] Phase 2 — CRM residual (`crm/unauthorized` + 3 middleware swaps)
- [x] Phase 3 — Projects residual (1 middleware swap)
- [x] Phase 4 — Couriers middleware (registered-only swap; unregistered catalog follow-up)
- [x] Phase 5 — Work throw→value (13 sites, 2 files, `WorkHttpError` deleted)
- [x] Phase 6 — Widgets migration (registry + ServiceErr + serviceResponse + auth + routes)
- [x] Phase 7 — Storage migration (Python registry + ~30 raises + handlers + envelope)
- [x] Phase 8 — Core API terminal middleware (whole-service `AppHttpError` migration remains follow-up)
- [x] Phase 9 — Billing API terminal middleware (whole-service `AppHttpError` migration remains follow-up)
- [ ] Phase 10 — BFF routes (billing/invoice/crm/console/couriers regression/widgets) — deferred
- [ ] Phase 11 — Typed client compat (`error.message` object form) — deferred
- [x] Phase 12 — Enforcement (`scripts/check-error-contract.mjs` wired into root `check`)

## Verification commands (per affected workspace)

```bash
pnpm --filter @876/core typecheck
pnpm --filter @876/core test
pnpm --filter @876/commerce-api typecheck
pnpm --filter @876/commerce-api lint
pnpm --filter @876/commerce-api test
pnpm --filter @876/crm-api typecheck
pnpm --filter @876/crm-api lint
pnpm --filter @876/crm-api test
pnpm --filter @876/projects-api typecheck
pnpm --filter @876/projects-api lint
pnpm --filter @876/projects-api test
pnpm --filter @876/couriers-api typecheck
pnpm --filter @876/couriers-api lint
pnpm --filter @876/couriers-api boundaries
pnpm --filter @876/couriers-api test
pnpm --filter @876/widgets-api typecheck
pnpm --filter @876/widgets-api lint
pnpm --filter @876/widgets-api test
```

Sweep commands are recorded per phase in `reports/orchestrator/final-report.md`.

## Handoff state

Ready for PR.
