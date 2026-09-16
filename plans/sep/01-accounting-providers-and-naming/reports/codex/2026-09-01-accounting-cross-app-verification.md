# Cross-app verification: accounting providers / naming migration

Run from `/root/projects/876` on 2026-09-01. I did not modify Git state or any
Billing-owned workspace. `node scripts/check-app-structure.mjs` passed both
before and after the fixes.

## Verification results

`Test` includes the counted number of failing tests observed before and after
this sweep. `N/A` means the workspace has no script of that name.

| Workspace | Typecheck | Lint | Test (failures before -> after) | Boundaries |
| --- | --- | --- | --- | --- |
| @876/api | PASS | PASS | PASS (23 -> 0) | FAIL (25 -> 25 violations) |
| @876/console | PASS | PASS | PASS (0 -> 0) | N/A |
| @876/couriers-app | PASS | PASS | PASS (0 -> 0) | PASS |
| @876/couriers-api | PASS | PASS | PASS (1 -> 0) | PASS |
| @876/crm-app | PASS | PASS | PASS (0 -> 0) | N/A |
| @876/crm-api | PASS | PASS | PASS (0 -> 0) | N/A |
| @876/invoice-app | PASS | PASS | PASS (0 -> 0) | N/A |
| @876/enterprise | PASS | PASS | PASS (1 -> 0) | N/A |
| @876/app | PASS | PASS | PASS (0 -> 0) | N/A |
| @876/widgets-api | PASS | PASS | PASS (0 -> 0) | N/A |
| @876/account | PASS | FAIL (pre-existing) | PASS (0 -> 0) | N/A |
| @876/admin | PASS | N/A | PASS (0 -> 0; no tests) | N/A |
| @876/analytics | PASS | N/A | N/A | N/A |
| @876/client | PASS | PASS | PASS (0 -> 0) | N/A |
| @876/core | PASS | FAIL (pre-existing) | FAIL (1 -> 1; pre-existing) | N/A |
| @876/couriers | PASS | PASS | PASS (0 -> 0) | N/A |
| @876/crm | PASS | FAIL (pre-existing) | PASS (0 -> 0) | N/A |
| @876/crm-ui | PASS | N/A | PASS (0 -> 0) | N/A |
| @876/device | PASS | N/A | PASS (0 -> 0) | N/A |
| @876/editor | PASS | N/A | PASS (0 -> 0) | N/A |
| @876/platform | PASS | N/A | PASS (0 -> 0) | N/A |
| @876/sdk | PASS | PASS | PASS (0 -> 0; no tests) | N/A |
| @876/server | PASS | N/A | PASS (0 -> 0) | N/A |
| @876/settings | PASS | N/A | PASS (0 -> 0) | N/A |
| @876/storage | PASS | PASS | PASS (0 -> 0) | N/A |
| @876/types | PASS | N/A | N/A | N/A |
| @876/ui | PASS | N/A | PASS (0 -> 0) | N/A |
| @876/widgets | PASS | N/A | PASS (0 -> 0) | N/A |
| @876/work | PASS | PASS | PASS (0 -> 0) | N/A |
| @876/work-ui | PASS | N/A | N/A | N/A |
| @876/workspace | PASS | PASS | PASS (0 -> 0; no tests) | N/A |

Lint commands that passed can still emit warnings; none emitted lint errors in
those workspaces.

## Fixes made

- `apps/api/src/services/auth.ts` — requests the canonical `super-admin` app-role during signup/retry assignment rather than the non-existent `super_admin` seed key.
- `apps/api/src/services/provisioning.ts` — aligns the app-role input union with the canonical seeded role key.
- `apps/api/src/services/billing-customer-sync.ts` — chooses the canonical organization super-admin as the fallback billing contact.
- `apps/api/src/modules/organizations/organizations.service.ts` — applies the canonical super-admin constant to the profile-management role guard.
- `apps/api/src/platform/__tests__/permissions.test.ts` — asserts the canonical organization-role spelling.
- `apps/api/src/seeds/app-access.test.ts` — keeps the anti-drift seed test strict while asserting canonical kebab-case app-role keys.
- `apps/api/src/services/__tests__/auth.test.ts` — updates the created-membership expectation to the canonical role.
- `apps/api/src/services/__tests__/billing-customer-sync.test.ts` — updates the contact-selection fixture and names to the canonical role contract.
- `apps/api/src/services/__tests__/identity-sync.test.ts` — tests canonical super-admin -> WorkOS admin projection.
- `apps/api/src/services/__tests__/organization-bootstrap.test.ts` — updates role-map fixtures and membership expectations to canonical keys.
- `apps/api/src/services/__tests__/provisioning-advanced.test.ts` — updates seeded-role lookup fixtures and map access.
- `apps/api/src/services/__tests__/provisioning.test.ts` — updates the existing-role fixture and lookup expectation.
- `apps/couriers-api/src/modules/tenants/__tests__/__snapshots__/tenants.test.ts.snap` — regenerated the published OpenAPI snapshot after the intentional `creator_user_id` migration changed sorted generated-property order.
- `apps/crm/src/app/auth/complete/route.ts` — fixes the onboarding authorization comparison to `super-admin`.
- `apps/crm/src/app/onboarding/page.tsx` — fixes the onboarding authorization comparison to `super-admin`.
- `apps/enterprise/src/app/[slug]/members/_components/members-table.tsx` — protects canonical super-admin role transitions in the UI.
- `apps/enterprise/src/app/[slug]/members/new/page.tsx` — filters assignable roles using canonical role values.
- `apps/enterprise/src/app/[slug]/members/page.tsx` — supplies the canonical super-admin check to the members table.
- `apps/enterprise/src/app/api/orgs/[slug]/invites/route.ts` — preserves super-admin invitation protection with the canonical value.
- `apps/enterprise/src/app/api/orgs/[slug]/members/[membershipId]/route.ts` — preserves super-admin mutation/removal protection with the canonical value.
- `apps/enterprise/src/components/shell/shell.test.tsx` — updates a routing-membership fixture to canonical role data.
- `apps/enterprise/src/lib/auth/guards-advanced.test.ts` — updates the role fixture and strict Sentry tag assertion to canonical kebab-case.
- `packages/account/src/resources/orgs.ts` — documents canonical organization role values.
- `packages/account/src/types/orgs.test.ts` — makes the captured organization-member contract use `super-admin`.
- `apps/876/src/lib/auth/guards.ts` — emits the canonical `feature-flags` observability category.
- `apps/console/src/app/(app)/settings/users/(team)/new/_components/promote-user-form.tsx` — emits canonical super-admin for Console team grants.
- `apps/console/src/app/(app)/orgs/[slug]/members/_components/members-table.tsx` — renders the canonical super-admin member role distinctly.
- `apps/console/src/app/(app)/orgs/[slug]/members/_components/member-format.ts` — formats the canonical super-admin role distinctly.
- `apps/console/src/app/(app)/orgs/[slug]/members/_components/add-member-dialog.tsx` — selects and explains the canonical super-admin role.
- `apps/console/src/lib/features.ts` — emits canonical `feature-flags` observability categories.
- `apps/couriers/src/lib/features.ts` — emits the canonical `feature-flags` observability category.
- `apps/crm/src/app/api/onboarding/organization/route.ts` — authorizes organization creation for canonical super-admins.
- `apps/crm/src/lib/features.ts` — emits the canonical `feature-flags` observability category.
- `apps/crm/src/lib/features.test.ts` — keeps the feature observability assertion strict against the canonical category.
- `.claude/reports/codex/2026-09-01-accounting-cross-app-verification.md` — records this verification evidence, outcomes, and unresolved gates.

`packages/core` was not changed.

## Remaining failures and pre-existing evidence

### Not fixed: `@876/api boundaries`

`pnpm --filter @876/api boundaries` reports 25 circular dependency violations
before and after this sweep. They span `provisioning`, `workspace`,
`app-access`, `memberships`, and `organizations`; the smallest cycle is
`app-role-provisioning-catalog -> provisioning-catalog ->
app-role-provisioning-catalog`, while the larger ones route through the
workspace/provisioning ownership boundary. A correct fix requires moving shared
provisioning contracts and separating orchestration ownership, not suppressing
the dependency rule or cutting a runtime behavior path. That structural
refactor is still required.

### Pre-existing on `origin/main`

- `@876/core test`: `src/lib/phone.test.ts > includes flag and name for every country` still expects 32 values and receives 41. `git diff --quiet origin/main -- packages/core/src/lib/phone.test.ts` returned success: the test inputs are byte-identical to main. This is the known baseline and remains 1 failing test.
- `@876/account lint`: errors in `src/resources.test.ts` are in a file with no diff against main. The only nearby branch change in `src/types/orgs.test.ts` is the role fixture at line 18; its lint error locations begin at line 31 and are unchanged. No lint failure was attributable to this branch change.
- `@876/crm lint`: the sole error (`prefer-const` in `src/client.advanced.test.ts:24`) is in a file with no diff against main.
- `@876/core lint`: error locations in `access/context.weird.test.ts` and `access/navigation.weird.test.ts` have no diff against main. The branch edits to `catalog.weird.test.ts`, `fuzz.advanced.test.ts`, and `access/index.ts` are naming-only; the reported `as any`, `@ts-ignore`, and `module`-binding errors are unchanged lines from main. I did not alter shared Core for these baseline failures.

## Suppressions and contract integrity

I added no `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, or `as any`.
The tempting alternatives were to suppress Core's existing lint rules, relax
the catalog-role assertions, or change the Core dial-code expectation. Instead,
I kept anti-drift tests strict, regenerated the intentional OpenAPI contract
snapshot, and recorded the verified main-baseline failures. A final scoped scan
found no `<Button asChild>` use, and `git diff --check` passed.
