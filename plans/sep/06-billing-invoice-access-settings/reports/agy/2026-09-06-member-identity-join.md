# Member Identity Join onto Workspace Grants

## Overview

Joined workspace grants onto organization identities across Billing and Invoice settings call sites, replacing runtime-missing identity fields and placeholder account IDs with names, emails, and avatars resolved through `toFinanceMemberSummaries`.

## Changes

### 1. `apps/billing/src/app/(app)/settings/roles/[roleId]/page.tsx`
- Added `loadUsers(context.orgId)` from `../../users/_data` to the existing `Promise.all` alongside `loadRole` and `loadBillingMembers`.
- Replaced the inline projection reading `member.firstName`, `member.email`, and `member.avatar` (which do not exist on the finance member projection at runtime) with `toFinanceMemberSummaries(...)`.
- Mapped grants from `roster.members.filter((m) => m.roleId === role.id)` to `{ userId, roleId, roleName, status }`.
- Mapped identities from `users.members` to `{ userId, firstName, lastName, email, avatarUrl }`.

### 2. `apps/billing/src/app/(app)/settings/users/_components/users-list-data.tsx`
- Replaced the inline `.map` for the `<BillingMembersTablePanel members={...}>` prop with `toFinanceMemberSummaries(...)`.
- Joined `billing.members` (grants) and `result.members` (organization roster identities) using the same grant and identity mappings.

### 3. `apps/invoice/src/app/(app)/settings/roles/[roleId]/page.tsx`
- Loaded the organization roster with `loadUsers(context.context.orgId)` from `../../users/_data` and added it to the existing `Promise.all` alongside `loadRole` and `loadFinanceMembers`.
- Replaced the placeholder mapping (`name: member.userId`, `email: ''`) with `toFinanceMemberSummaries(...)`.
- Passed the grant's role name via `member.role.name` and status via `member.status`.

## Tests Added

Created `packages/billing-ui/src/panels/access/member-identity.test.ts` containing **12** `it()` cases (exceeding the required minimum of 10):

1. `a grant whose identity is present renders "First Last"`
2. `an identity with no first/last name falls back to its email`
3. `a grant with no matching identity is still returned, labelled with the account id, and is not dropped`
4. `the email is '' and the avatar null when no identity matches`
5. `joinedAt defaults to null when the grant omits it`
6. `the returned array has exactly one entry per grant, in grant order`
7. `neither input array is mutated`
8. `a duplicate identity for the same userId does not duplicate the row`
9. `renders only first name when last name is null`
10. `renders only last name when first name is null`
11. `falls back to account id when identity has empty name and null email`
12. `returns an empty array when grants is empty even if identities exist`

All tests use realistic domain data and assert complete objects using `toEqual`. No `as any`, `@ts-ignore`, or `eslint-disable` were used.

## Verification

All four required verification commands passed:

- `pnpm --filter @876/billing-ui typecheck`: PASSED
- `pnpm --filter @876/billing-ui test`: PASSED (25 test files, 281 tests passed)
- `pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app test`: PASSED (78 test files, 817 tests passed)
- `pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app test`: PASSED (37 test files, 300 tests passed)
