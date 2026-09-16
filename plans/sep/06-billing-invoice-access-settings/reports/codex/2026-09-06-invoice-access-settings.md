# Invoice finance access settings

## Changed files

- `apps/invoice/src/lib/auth/finance-access.ts` adds the request-cached finance permission resolver and API-only role/member mutation guards.
- `apps/invoice/src/lib/services/billing-tenants.ts` resolves the Billing tenant for an Invoice organization through the existing typed Billing server client.
- `apps/invoice/src/app/(app)/settings/roles/**` adds the persistent roles split-view, role data loading, create route, and detail route using the shared Billing access panels.
- `apps/invoice/src/app/api/roles/**` adds explicit create, update, and delete resource routes. Update retrieves the shared role first and preserves grants outside Invoice's surface.
- `apps/invoice/src/app/api/members/[userId]/route.ts` adds the finance member grant write adapter.
- `apps/invoice/src/app/(app)/settings/users/[membershipId]/finance/**` adds the member finance-role tab and shared member table adapter.
- `apps/invoice/src/app/(app)/settings/users/invite/**` and `apps/invoice/src/app/api/invites/**` add the existing organization invitation flow with its finance-role picker.
- `apps/invoice/src/lib/client/{roles,members,invites}.ts` and `index.ts` add same-origin browser mutation clients.
- `apps/invoice/src/app/(app)/settings/_lib/settings-nav.*` and `settings/page.tsx` add the Roles destination and server-side finance-permission navigation filtering; the binding test pins it to `roles:read`.
- Added 48 Invoice test cases: finance role POST/PATCH/DELETE, member PATCH, navigation binding, and system-role UI behavior.

## Decisions

- Invitation uses the pre-existing organization invite capability and passes the selected finance role slug, matching Billing's established access-panel integration.
- Finance member self-management is displayed read-only; Billing independently rejects self-grant changes.

## Verification

- Passed: `pnpm --filter @876/invoice-app typecheck`
- Passed (with pre-existing warnings): `pnpm --filter @876/invoice-app lint`
- Passed: `node scripts/check-app-structure.mjs`
- Full `pnpm --filter @876/invoice-app test` remains blocked by an unrelated existing failure in `src/components/shell/nav-icons.test.ts`: 11 declared top-level keys resolve to 10 distinct icon components. All added tests pass; the suite totals 300 tests with that one unrelated failure.
