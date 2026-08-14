# Codex brief — tests for the deletion/auth lifecycle (Phase 1c/1d coverage)

Model: gpt-5.6-sol, medium. Branch: `feat/ecosystem-sync-consistency` (already checked out).
Design: `docs/architecture/012-ecosystem-sync-and-deletion-lifecycle.md` (D1/D2/D4).
Follow `.claude/rules/testing.md` — mutation-resistant, exact assertions, one act per test,
assert both call presence AND absence.

The implementation already landed (do NOT change it). Add the missing tests for it. Read each
target test file first to mirror its exact mock/harness style (supertest app + mocked repositories,
`vi.mock`, `vi.hoisted`). Then add cases.

## 1. Org Delete vs Purge — `apps/api/src/modules/organizations/__tests__/organizations.test.ts`

Behavior under test lives in `apps/api/src/modules/organizations/organizations.service.ts`
(`deleteOrganization`, `purgeOrganization`) and its route in `organizations.routes.ts` /
`organizations.controller.ts` (find the exact DELETE and purge routes).

- **Delete** (`deleteOrganization`):
  - calls `repository.softDeleteMembershipsForOrg(organizationId)` exactly once,
  - calls `repository.deleteOrganization(...)`,
  - does **NOT** call `deleteProviderOrganization` (assert `.not.toHaveBeenCalled()`),
  - responds with the tombstone `{ object: 'organization', id, deleted: true }`,
  - no longer 409s when the org has members (the old `organization/has-members` guard is gone).
- **Purge** (`purgeOrganization`):
  - calls `repository.purgeOrganization(...)`,
  - **does** call `deleteProviderOrganization` when the org has a `workosOrganizationId`.
- Both: mock `@/services/billing-customer-sync` so `enqueueCustomerArchiveForOrganization` is a
  spy; assert it is invoked (archive is best-effort/try-catch — assert the call, and add one case
  where it rejects and the delete/purge still succeeds).

## 2. User Delete vs Purge — new file `apps/api/src/modules/users/__tests__/users-delete.test.ts`

Behavior in `apps/api/src/modules/users/users.controller.ts` (`deleteUser`, `purgeUser`). Mirror
the harness used by `users-batch.test.ts` in the same folder.

- **Delete** (`deleteUser`): calls `repo.softDeleteUser`, calls `repo.deleteAllSessionsForUser`,
  does **NOT** call `deleteProviderUser`, mocks `@/services/billing-customer-sync` and asserts
  `enqueueCustomerArchiveForUser` invoked, returns `{ object: 'user', id, deleted: true }`.
- **Purge** (`purgeUser`): calls `repo.purgeUser`, calls `repo.deleteAllSessionsForUser`, **does**
  call `deleteProviderUser`, asserts `enqueueCustomerArchiveForUser` invoked before purge.

## 3. `ensureFromWorkos` disabled-account rejection — new file
`apps/api/src/modules/auth/__tests__/ensure-from-workos.test.ts`

Behavior in `apps/api/src/modules/auth/auth.repository.ts` (`ensureFromWorkos` +
`assertAccountUsable`). Use the Prisma dynamic-ref mock pattern from `.claude/rules/testing.md`
(§ Mock Discipline Rule 8) to mock `@/db/client` / the prisma singleton this repo imports (read
the file to see the exact import path).

- Throws `auth/account-deleted` (403) when a user with the workosId is tombstoned (`deletedAt`
  set) — and separately when matched by email.
- Throws `auth/account-suspended` (403) when the existing (non-deleted) user has `banned: true`.
- Throws `auth/account-suspended` (403) when the existing user has `status: 'suspended'`.
- Does **NOT** throw for `status: 'inactive'` (returns the updated user) — inactive is the
  pre-verification state of a new sign-up.
- Assert the exact `code` and `httpStatus` on each thrown `AppHttpError` (Rule 2: full error).

## Verification (run all; report exact results)

- `cd /root/projects/876 && pnpm --filter @876/api test` (all files should pass; ignore the
  pre-existing Prisma-Accelerate `fetch failed: bad port` unhandled rejections from
  openapi/auth/auth-telemetry tests — they are environmental, not yours).
- `pnpm --filter @876/api typecheck`
- `pnpm --filter @876/api lint` (your new files must add 0 errors).

## Do NOT

- Do not modify any non-test source file. Tests only.
- Do not touch `apps/*/src/lib/auth/**` or anything outside `apps/api`.
- Do not commit. The orchestrator stages and commits.
