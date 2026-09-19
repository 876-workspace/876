# Console status consolidation — report

Date: 2026-09-19
Task: Consolidate `app-status`, `org-status`, `user-status` into `lib/status`
Scope: `apps/console` only. No commit, no branch, no PR (per instructions).

## What was done

Created `apps/console/src/lib/status/index.ts` as the single entry point,
concatenating the three deleted modules byte-for-byte (names unchanged,
order: app → org → user):

- From `lib/app-status`: `APP_STATUSES`, `isAppStatus` (type
  `AdminAppStatus` still imported from `@876/platform/compat`).
- From `lib/org-status`: `AdminOrgStatus`, `ORG_STATUSES`, `isOrgStatus`.
- From `lib/user-status`: `AdminUserStatus`, `USER_STATUSES`, `isUserStatus`.

Deleted `apps/console/src/lib/{app-status,org-status,user-status}/`.

Updated 8 import sites (`@/lib/app-status|org-status|user-status` →
`@/lib/status`), no other line touched:

- `app/(app)/apps/_components/apps-toolbar.tsx` (`APP_STATUSES`)
- `app/api/apps/[appId]/route.ts` (`isAppStatus`)
- `app/(app)/orgs/page.tsx` (`isOrgStatus`)
- `app/(app)/orgs/_components/orgs-toolbar.tsx` (`ORG_STATUSES`)
- `app/(app)/orgs/_components/orgs-list-data.tsx` (`isOrgStatus`)
- `app/(app)/users/_components/users-list-data.tsx` (`isUserStatus`)
- `app/(app)/users/_components/users-toolbar.tsx` (`USER_STATUSES`)
- `app/(app)/users/_components/users-section.tsx` (`isUserStatus`)

Repointed the stray test's three relative imports at the new entry point:
`lib/status/index.test.ts` now imports all three groups from `./index`
(previously `../app-status`, `../org-status`, `../user-status`). Test body
unchanged. `format/index.ts` untouched.

## Name-conflict check

No conflict — stopped-or-merged decision: merged. The nine export names are
pairwise distinct (`APP_*` vs `ORG_*` vs `USER_*`; `AdminOrgStatus` /
`AdminUserStatus` distinct; `AdminAppStatus` is imported, not declared, in
both old and new files). No two modules exported the same symbol with
different behaviour, so nothing was silently merged.

## Test case count (before → after)

Method: `vitest run src/lib/status/index.test.ts`. The file (all three
describes) already lived at `lib/status/index.test.ts` before this task;
before = imports pointed at the three old dirs, after = imports point at
`./index`. No case added, removed, or edited.

- Before (git HEAD version, old imports): 38 tests
  (app: 1 contract + 2 accepts + 9 rejects = 12;
   org: 1 + 3 + 9 = 13;
   user: 1 + 3 + 9 = 13; total 38).
- After (`./index` imports): **38 passed** (`Tests 38 passed (38)`),
  verbose run lists all 38 ✓, 0 failed.

`format/index.ts` badge helpers (`statusBadgeVariant`, `statusBadgeClass`,
`membershipStatusBadgeVariant`) intentionally left in place per instructions.

## Final grep (must be 0)

```
grep -rn "@/lib/app-status\|@/lib/org-status\|@/lib/user-status" apps/console/src
→ no matches, exit 1. PASS.
```

`grep -rn "@/lib/status" apps/console/src` returns exactly the 8 updated
call sites above. `git status -- apps/console/src/lib/format/` is empty
(format untouched). `git status` shows only the 8 importer edits + 3
deletions + test import repoint + new `lib/status/index.ts` (untracked) —
plus pre-existing unrelated dirty files elsewhere in the repo that were not
touched.

## Verification output

- `node scripts/check-app-structure.mjs console` → `app-structure: OK (console)`, exit 0. PASS.
- `vitest run src/lib/status/index.test.ts` → 1 file, 38/38 passed. PASS.
- `tsc --noEmit -p apps/console/tsconfig.json` (direct binary, because
  `pnpm --filter @876/console typecheck` cannot run in this environment —
  it fails in the pnpm install phase with
  `ERR_PNPM_OUTDATED_LOCKFILE ... pnpm-lock.yaml is not up to date with
  apps/projects-api/package.json`, a pre-existing repo-wide issue unrelated
  to this change): 2 errors, both in `packages/work-ui/src/{agenda,calendar}.tsx`
  (`reminder.at: number | null` vs `number`), both pre-existing and outside
  `apps/console`. Zero errors mention `lib/status`, `app-status`,
  `org-status`, or `user-status`. Scoped PASS (no new type errors from this change).
- Full `vitest run` for `@876/console` (2045-test suite): started in
  background at time of writing; log at `/tmp/console-test.log`. NOT
  completed before this report — see "Anything unverified".

## Anything unverified

- Full Console suite count (expected 2045 per task brief): the full run was
  launched (`./node_modules/.bin/vitest run` in `apps/console`, log
  `/tmp/console-test.log`) but had not finished when this report was written.
  Re-run `timeout 600 ./node_modules/.bin/vitest run` in `apps/console` and
  confirm the totals match 2045.
- `pnpm --filter @876/console typecheck` / `pnpm --filter @876/console test`
  wrappers: unverified — both go through pnpm's frozen-lockfile install
  check, which fails repo-wide on the stale `projects-api` lockfile entry
  before any test/typecheck runs. Direct `tsc`/`vitest` binaries were used
  instead (results above).
- No commit/branch/PR created, per hard prohibitions.
