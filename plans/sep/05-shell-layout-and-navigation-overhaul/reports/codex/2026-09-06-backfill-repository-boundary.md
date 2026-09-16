# App-assignment role backfill repository boundary

## Change

The CLI is now limited to argument parsing, calling the app-access backfill
service, printing its JSON report, and disconnecting. `src/db/lifecycle.ts`
exports the existing `disconnectDb` lifecycle function so the CLI can close the
pool without importing the Prisma client directly. No dependency-cruiser
exception or database schema/configuration changed.

The app-access service retains the backfill's orchestration and imports the
active-membership lookup through the organizations module public `index.ts`.

## Repository operations

No existing repository operation had the backfill's exact ordering, predicate,
selection, or compare-and-set semantics, so no repository function was reused.
Added operations:

- `app-access.repository.listDefaultRoleAssignmentsForRoleBackfill()` owns the
  candidate `appAssignment.findMany` read.
- `app-access.repository.listLiveOrganizationAppRolesForRoleBackfill()` owns
  both ordered live `appRole.findMany` reads. The existing role list operation
  does not preserve the backfill's default-first ordering and narrow selection.
- `app-access.repository.compareAndSetAssignmentRoleForRoleBackfill()` owns the
  guarded `appAssignment.updateMany` write and returns its count.
- `organizations.repository.findActiveMembershipWithRoleForRoleBackfill()` owns
  the active, non-deleted role-matching `membership.findFirst` revalidation;
  the existing membership lookup does not constrain role, status, and deletion
  state together.

The five original Prisma calls therefore moved as follows:

| Original query | New owner |
| --- | --- |
| `membership.findFirst` | organizations repository membership revalidation |
| first `appRole.findMany` | app-access repository live-role lookup |
| `appAssignment.findMany` | app-access repository candidate lookup |
| second `appRole.findMany` | app-access repository live-role lookup |
| `appAssignment.updateMany` | app-access repository compare-and-set |

Dry run still does not enter the apply loop. Apply still rechecks membership
and live role resolution immediately before the compare-and-set write, and the
report fields and candidate context are unchanged.

## Tests

The script test changed only its disconnect mock from `@/db/client` to
`@/db/lifecycle`; its Prisma mock and all four behavioral assertions remain,
so the dry-run, apply, stale-membership, and stale-target-resolution coverage
continues to exercise the repository-backed path.

- Before: 113 files / 2245 tests passing (verified branch state).
- After: 113 files / 2245 tests passing.

## Verification

| Command | Result |
| --- | --- |
| `pnpm --filter @876/api typecheck` | Passed. |
| `pnpm --filter @876/api lint` | Passed with 28 existing unrelated warnings and no errors. |
| `pnpm --filter @876/api test` | Passed: 113 files, 2245 tests. |
| `pnpm --filter @876/api boundaries` | Reported 18 existing `no-circular` violations (expected baseline; command exits 18). |

Boundaries moved from 19 to 18: the removed violation is
`prisma-only-in-repositories: scripts/backfill-app-assignment-roles.ts → src/db/client.ts`.

No backfill was run against a database, as required.
