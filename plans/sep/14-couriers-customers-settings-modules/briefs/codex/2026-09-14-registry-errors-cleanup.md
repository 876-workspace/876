# Brief G — Couriers: every error comes from a registered error catalog

Read `plans/2026-09-14-couriers-customers-settings-modules/briefs/_shared-preamble.md` first — binding.
Read `.claude/rules/error-handling.md` and `.claude/rules/stripe-api-pattern.md` (error shapes) fully.

## Problem (user report)
Couriers returns hand-written error strings instead of registered errors. Examples:
`apps/couriers/src/app/api/manage/customers/route.ts` →
`apiJson({ error: 'Invalid customer.' }, { status: 422 })`,
`apiJson({ error: 'Unauthorized.' }, { status: 401 })`,
`apiJson({ error: 'You do not have permission to manage customers.' }, { status: 403, code: 'auth/forbidden' })`.
There are ~125 `apiJson({ error: '...' })` call sites under `apps/couriers/src/app/api/**`,
plus manual `appError('<code>', { message, httpStatus })` definitions in `apps/couriers-api/src`
(e.g. `src/http/errors.ts`, `src/platform/jwt.ts` → `auth/identity-unavailable`).

## Canonical owners (search, then use)
- Shared/platform codes: `packages/core/src/lib/errors/*` (`auth.ts`, `generic`, …) via
  `getError`/`isErrorCode` from `@876/core`.
- Couriers app registry: `apps/couriers/src/lib/errors/{index,generic,customer,tenant,role,team,address,portal,storage}.ts`
  (`COURIERS_ERRORS`, `getError`).
- Look at how `apps/crm/src/app/api/**` and `apps/crm-api` return registered errors (the
  reference implementation of the value contract) and how `@876/core/api` `apiJson` accepts
  an error object; copy that shape.

## Do
1. Every route handler under `apps/couriers/src/app/api/**` returns errors built from a
   registered definition: `{ data: null, error: { code, message } }` with `status` from the
   definition's `httpStatus` — no literal message strings, no literal status numbers for
   known errors, no `httpStatus` in client JSON. Add missing definitions to the right
   registry file (couriers-specific → couriers registry; shared auth/validation → reuse
   existing core codes, add to core only if genuinely platform-wide). kebab-case,
   namespaced codes, messages end with a period.
   Validation failures may carry the first issue as `param`/description per the existing
   error shape — do not invent a new shape.
2. `apps/couriers-api`: replace ad-hoc `appError('<code>', { message, httpStatus })` for codes that
   should be registered (at least `auth/identity-unavailable`, `integration-key/*`,
   `request/invalid`) with registered definitions; keep `appError(code)` call sites.
3. If a UI/client reads `json.error` as a string, update the typed client (`@/lib/client`)
   and callers to read `error.message` — preserve behaviour.
4. Registry tests per testing.md "Error Registries" (exists, no duplicates, valid statuses,
   messages 10-200 chars ending with a period) for any registry file you add to.

Do not change route paths, success payloads, or authorization logic.

## File scope
- `apps/couriers/src/app/api/**`, `apps/couriers/src/lib/errors/**`, `apps/couriers/src/lib/client/**`
  and client callers only where the error shape change requires it
- `apps/couriers-api/src/http/errors.ts`, `apps/couriers-api/src/platform/{errors,jwt}.ts` and tests
- `packages/core/src/lib/errors/*` only for genuinely shared codes

## Verify (run, report actual output)
pnpm --filter @876/couriers-app typecheck && pnpm --filter @876/couriers-app lint && pnpm --filter @876/couriers-app test
pnpm --filter @876/couriers-api typecheck lint boundaries test
pnpm --filter @876/core test -- errors
rg -n "apiJson\(\{ error: '" apps/couriers/src/app/api   # must print nothing

## Report
plans/2026-09-14-couriers-customers-settings-modules/reports/codex/2026-09-14-registry-errors-cleanup.md

## Start state (17:00)
All other phases are merged; no other agent is editing Couriers. Already on the registry:
`apps/couriers/src/app/api/manage/finance/**` (use its `_lib/access.ts` pattern as a reference),
the requests routes, and parts of `api/manage/customers/**` (`getAppError`/`getError`), but
`api/manage/customers/route.ts` still has literal strings. Sweep everything else under
`apps/couriers/src/app/api/**`. Memory is tight: one verification command at a time; jsdom
tests need `NODE_ENV=test` because the shell exports `NODE_ENV=production`.
