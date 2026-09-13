# Commerce onboarding and realm handling

## Files changed

- `apps/commerce/src/lib/auth/{session,account-validity,roles,context,guards}.ts`
  and `guards.test.ts`: live membership routing, stale-account validation,
  consumer-realm detection, entitlement status handling, and role normalization.
- `apps/commerce/src/app/(app)/layout.tsx`, onboarding page/form, and
  `api/onboarding/organization/route.ts`: organization creation and idempotent
  Commerce activation through the platform client.
- `apps/commerce/src/app/wrong-account/**`, login page/auth component, and
  `src/lib/client/**` / `src/types/api.ts`: explicit local sign-out and a
  server-validated login redirect.
- `apps/commerce/src/app/api/onboarding/organization/route.test.ts` and
  `src/app/login/page.test.tsx`: onboarding and stale-cookie regression tests.
- `scripts/check-app-structure.mjs`: registered `commerce` in the default app
  list and prefix configuration.

## Reference followed

The onboarding route and form follow **876 Projects**: live routing-membership
lookup, session-sourced `creatorUserId`, organization bootstrap, then an
idempotent `platform.subscriptions.create` activation. The layout deliberately
uses the newer Invoice rule that it redirects every non-entitled organization to
onboarding; onboarding alone decides admin, staff, and blocked outcomes. This
is the binding rule's required split.

## Tests

Added 13 `it()` cases (21 Commerce app tests total): the guard matrix covers
signed-out, consumer realm, no org, admin/staff without entitlement, blocked,
active, and trialing states; onboarding transport covers authentication,
session-owned creator identity, consumer denial, staff denial, existing-org
activation, idempotence, and platform errors as response values; login covers a
stale cookie rendering the form.

## Verification

- `pnpm --filter @876/commerce-app typecheck` — passed
- `pnpm --filter @876/commerce-app lint` — passed
- `pnpm --filter @876/commerce-app test` — passed (4 files, 21 tests)
- `pnpm --filter @876/commerce test` — passed (1 file, 4 tests)
- `pnpm --filter @876/commerce-api test` — passed (2 files, 6 tests)
- `node scripts/check-app-structure.mjs` — passed, including Commerce

## Follow-up

`normalizeOrgRole` now intentionally duplicates CRM's documented aliases
because `packages/core` has no existing organization-role normalizer. Promote
that helper to `@876/core` in a dedicated cross-app follow-up; it was not moved
in this scoped run.

## Not done

None.
