# Unified Couriers customer creation

## Changed

- Replaced the add-customer tabs with one registry-backed form. Search is a bounded, authorized same-origin read; selected registry identity is locked, and clearing it returns the form to new-party entry.
- Reworked `POST /api/manage/customers` around a discriminated `party` / `registry` contract, with the create kill switch and registered customer error codes.
- Removed the manage-app enrollment handler/form and the Couriers API enrollment route. The SDK now sends both paths to the single create endpoint and always expects a profile resource. This fixes the previously reported invalid Couriers-service response.
- Consolidated the Couriers API operation: a new party is created in Billing with the existing stable Couriers idempotency/source reference before the profile is written; an existing party is retrieved only. Existing profile creation returns `customer/already-exists` (409), including a race.
- Registry search marks only the returned bounded registry set with matching Couriers profiles, rather than paging either registry in full.
- Added mailbox preference handling for `mailbox-auto-assign` and `mailbox-number-length` in the profile allocation transaction.
- Added explicit feature-detail evaluation for `couriers-customers-create`: an absent decision remains available, while an explicit disabled decision pauses creation.

## Decisions

The cross-service operation stays in `couriers-api`, which already owns the profile/mailbox transaction and Billing integration call. This provides one owning-service create operation and avoids a second orchestration implementation in the Next.js app.

## Tests

Added 20 `it()` cases across create route, registry search, feature evaluation, managed-customer delegation, and Couriers API customer creation. Existing legacy enrollment endpoint tests are skipped because that endpoint was intentionally removed; portal enrollment continues to use the internal service operation.

## Verification

- `pnpm --filter @876/couriers-app exec vitest run "src/app/[orgSlug]/customers" src/app/api/manage/customers src/lib/manage src/lib/features.test.ts` — passed: 16 files, 206 tests.
- `pnpm --filter @876/couriers-app typecheck` — blocked by stale `.next` types referencing the deleted enrollment route and unrelated concurrent `requests`/settings/shell errors.
- `pnpm --filter @876/couriers-app lint` — scoped files clean; command remains blocked by two pre-existing errors in `settings/modules/page.test.tsx` plus unrelated warnings.
- `pnpm --filter @876/couriers-api typecheck` — passed.
- `pnpm --filter @876/couriers-api lint` — passed.
- `pnpm --filter @876/couriers-api boundaries` — passed (no dependency violations).
- `pnpm --filter @876/couriers-api exec vitest run src/modules/customers/__tests__/customers.test.ts` — passed: 14 passed, 8 skipped legacy-route cases.
- `pnpm --filter @876/couriers-api test` — 337 passed, 8 skipped; the only failure is the OpenAPI snapshot in `src/modules/tenants`, outside this file scope, reflecting the intentional customer contract/route change.
- `node scripts/check-app-structure.mjs` — passed.
- `grep -rn "eslint-disable\\|as any" <touched files>` — no matches.

## Remaining

The OpenAPI snapshot needs regeneration by the owner of the tenants snapshot (outside this brief's scope). Next generated route types also need regeneration after the removed Next route; the source typecheck was clean before concurrent generated-type drift.
