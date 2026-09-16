# App assignment role mapping

## Assignment paths

- Provisioning and membership creation: `services/provisioning.ts:assignMemberApps`.
- Invite acceptance: `modules/organizations/organizations.service.ts` calls the same provisioning path; source-app invite access uses `ensureAppMembershipForProvisioning`.
- Canonical operator membership create: `modules/app-access/app-access.service.ts:createAppMembership`.
- Legacy operator organization-access create: `modules/organizations/access.service.ts:createAppAssignment`.

All automatic paths now use `resolveAppAssignmentRole` from `@876/core/access`.
Its fallback order is: a live explicitly validated requested role (manual/invite selection only), subject organization role mapping (`super_admin`/`super-admin` to `super-admin`, `admin` to `admin`), live default role, then `null`. Missing or malformed data therefore never widens access.

`requireSuperAdminForElevation` remains unchanged and still runs for an explicitly requested super-admin role. Automatic provisioning deliberately omits `requestedRoleId`; it derives only from the target subject membership's organization role. Provisioning replays also no longer overwrite an existing app role.

## Backfill

The proposed, unexecuted script is `apps/api/scripts/backfill-app-assignment-roles.ts`:

```bash
pnpm --filter @876/api app-access:backfill-roles
pnpm --filter @876/api app-access:backfill-roles --apply
```

It is dry-run by default; only `--apply` writes. Its JSON output is `{ object: "app_assignment_role_backfill", dryRun, examined, changed, candidates }`, where candidates contain assignment ID, old/new role IDs, and organization role. It was not run against a database.

## Tests and verification

Added 20 explicit `it()` cases in `packages/core/src/access/app-assignment-role.test.ts`, covering mapping, default/no-role fallback, deleted roles, requested roles, and no-widening resolution behavior.

Completed:

- `pnpm --filter @876/api typecheck` — passed.
- `pnpm --filter @876/core test` — passed: 38 files, 982 tests.

Not completed before handoff: the requested API lint/boundaries/full test and Projects checks. A targeted API test invocation did not produce a completion result in the available session. The requested app-level integration tests (including dry-run script behavior) still need to be added.

## Follow-up

Added **9 `it()` cases in `apps/api`**: four provisioning assignment tests,
four canonical app-membership creation tests, and one invite-acceptance routing
test. The existing provisioning-advanced harness was also updated for the new
role-list repository query; no cases were added there.

Covered call sites:

- `services/provisioning.ts:assignMemberApps` reads the subject's active
  membership role and persists `rol_super` for a `super_admin` creator,
  `rol_admin` for an `admin`, `rol_default` for an ordinary member, and the
  default rather than `admin` when a super-admin role is absent.
- `modules/app-access/app-access.service.ts:createAppMembership` persists the
  automatic mapped/default role and returns a full app-membership shape. The
  ordinary-member case has exactly `['comments.view']` effective permissions,
  so it does not hold `comments.create`.
- `modules/app-access/invite-app-access.service.ts:applyInviteAppAccess`
  forwards an unselected accepted invite to
  `ensureAppMembershipForProvisioning` with `appRoleId: null`, which reaches
  the same canonical resolver rather than a second automatic selection path.
- Existing API coverage in `app-access.service.test.ts` continues to assert
  full fail-closed resolutions with `permissions: []` for revoked and inactive
  assignments.

Elevation coverage is now explicit:

- A non-super-admin caller explicitly requesting `rol_super` rejects with the
  complete `app-membership/super-admin-required` error (message and HTTP 403),
  and no assignment is persisted.
- An internal automatic provisioning call for a `super_admin` subject persists
  `appRoleId: 'rol_super'`; it supplies no requested role, demonstrating that
  this is subject-role mapping rather than caller-request elevation.

`ORG_ROLE_TO_APP_ROLE` replaces blanket underscore substitution with a reviewed
durable mapping. `toLowerCase()` remains so established casing variants resolve
without altering any stored value; lookup is read-only and the map explicitly
limits the accepted values. The existing canonical `super-admin` spelling is
listed explicitly too.

Verification:

- `pnpm --filter @876/api typecheck` — passed.
- `pnpm --filter @876/api lint` — passed (emitted the existing Next pages-directory configuration warning).
- `pnpm --filter @876/api test` — passed after updating the stale
  provisioning-advanced test harness; targeted confirmation: 3 files / 51
  tests passed, and `provisioning-advanced.test.ts`: 79 tests passed.
- `pnpm --filter @876/core typecheck` — passed.
- `pnpm --filter @876/core test` — passed after adding the explicit canonical
  `super-admin` map entry (38 files / 982 tests).
- `pnpm --filter @876/api boundaries` — 18 `no-circular` errors before and
  after; no nineteenth violation was introduced.

The database backfill script was not run. No permission, role, table, or column
was renamed.
