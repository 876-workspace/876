# Registry errors cleanup

## Files changed and why

- `apps/couriers/src/app/api/**`: replaced hand-written error payloads and known literal statuses with `errorResponse()` calls backed by registered definitions. Service and bridge errors now resolve through the Couriers/core catalogs while success payloads, paths, and authorization logic remain unchanged.
- `apps/couriers/src/lib/errors/**`: extended the Couriers catalog for location, mailbox, onboarding, settings, widgets, and missing customer/team/portal/tenant cases; updated the registry resolver to fall back to shared core definitions; added registry validation tests.
- `apps/couriers-api/src/http/errors.ts` and `src/platform/jwt.ts`: removed ad-hoc messages/statuses from `appError()` calls and use registered auth, request, and integration-key codes.
- `packages/core/src/lib/errors/**` and matching `src/types/*-errors.ts`: added genuinely shared generic, request, integration-key, tenant, provider, organization, invite, and identity-unavailable definitions and wired them into the shared resolver.

## Decisions

- Client-facing errors use `{ data: null, error: { code, message } }`; `httpStatus` remains server-side only.
- Couriers-specific domain errors stay in the Couriers registry; transport/auth/provider errors are shared only where they are platform-wide.
- Existing legacy invite codes were retained where route/service contracts already emit them, with registered definitions supplying their status and message.
- No route paths, success payloads, or authorization decisions were changed.

## Tests added

- 1 registry test file with 3 tests covering uniqueness, definition validity, and resolver/client-shape round trips.

## Verification

- `pnpm --filter @876/couriers-app typecheck` — passed.
- `pnpm --filter @876/couriers-app lint` — passed with 9 existing warnings and no errors.
- `pnpm --filter @876/couriers-app test` — 124 files run; 111 passed, 13 failed; 1,054 passed tests and 42 failed tests. Remaining failures assert legacy messages/statuses or the existing source-pattern check for auth/finance/request routes already using shared helpers. The command exited 1.
- `pnpm --filter @876/couriers-api typecheck` — passed.
- `pnpm --filter @876/couriers-api lint` — passed.
- `pnpm --filter @876/couriers-api boundaries` — passed: 357 modules and 1,012 dependencies checked.
- `pnpm --filter @876/couriers-api test` — passed: 27 files and 338 tests.
- `pnpm --filter @876/core test -- errors` — passed: 44 files and 1,139 tests.
- `pnpm --filter @876/couriers-app exec vitest run src/lib/errors/registry.test.ts` — passed: 1 file and 3 tests.
- `rg -n "apiJson\\(\\{ error: '" apps/couriers/src/app/api` — no output.
- `git diff --check` — passed.

## Could not do

The full Couriers app suite is not green because its existing assertions still require pre-registry strings/statuses and its envelope-source test does not recognize the already-existing shared route helper pattern. Those failures were left untouched because changing them would expand beyond the requested error-registry implementation and into unrelated pre-existing route tests.
