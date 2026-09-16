# Brief G2 — repair 42 Couriers tests after the error-registry migration

Repo `/root/projects/876`. The tree is shared: do NOT run git checkout/stash/reset/clean/commit/add.
Do not write run logs. Run ONE test command at a time.

## Context (do not re-derive)
Route handlers under `apps/couriers/src/app/api/**` were just migrated so every error is built from a
registered definition: body `{ data: null, error: { code, message } }`, HTTP status = the definition's
`httpStatus`. Definitions live in `apps/couriers/src/lib/errors/*.ts` (Couriers registry, `getError(code)`)
and `packages/core/src/lib/errors/*.ts` (shared). Many tests still assert the OLD literal bodies such as
`{ error: 'Unauthorized.' }`.

## Failing test files (the ONLY files you may edit, plus the one source file named in step 3)
- apps/couriers/src/app/api/manage/customers/[id]/route.test.ts (1 failing)
- apps/couriers/src/app/api/manage/customers/route.test.ts (1)
- apps/couriers/src/app/api/manage/onboarding/organization/route.test.ts (9)
- apps/couriers/src/app/api/manage/roles/[id]/route.test.ts (1)
- apps/couriers/src/app/api/manage/roles/route.test.ts (3)
- apps/couriers/src/app/api/manage/settings/orglogo/complete/route.test.ts (2)
- apps/couriers/src/app/api/manage/settings/orglogo/route.test.ts (2)
- apps/couriers/src/app/api/manage/settings/orgprofile/route.test.ts (2)
- apps/couriers/src/app/api/manage/team/[id]/route.test.ts (1)
- apps/couriers/src/app/api/manage/team/invites/[inviteId]/route.test.ts (2)
- apps/couriers/src/app/api/manage/team/invites/route.test.ts (3)
- apps/couriers/src/app/api/portal/packages/route.test.ts (4)
- apps/couriers/src/lib/api-envelope-routes.test.ts (11)

## Steps
1. Run each failing file on its own:
   `cd apps/couriers && NODE_ENV=test npx vitest run <file>` (NODE_ENV=test is required).
2. For each failing assertion, read the route handler it tests (the sibling `route.ts`) and the
   registered definition it now returns. Update the expectation to the exact new body and status,
   importing the definition's message via `getError('<code>')` from `@/lib/errors` rather than
   pasting a string. Keep assertions exact (`toEqual` on the whole body, exact status, exact mock
   call counts). Never delete a test, never `.skip`, never loosen to `toBeDefined`/`toMatchObject`.
3. `src/lib/api-envelope-routes.test.ts` is a source-pattern guard. If it fails only because routes now
   return errors through a shared helper (`errorResponse(...)`, `resultResponse(...)`, finance
   `_lib/access.ts`), teach the guard to recognise those helpers as envelope-compliant. Do not weaken
   what it forbids (literal `apiJson({ error: '...' })`).
4. If an assertion reveals a real behaviour regression — the same situation now returns a DIFFERENT HTTP
   status than before (e.g. validation was 422 and is now 400, or 401 became 403) — do not change the test.
   List it in the report with the file, the old and new status, and the code involved.
5. When all 13 files pass, run the whole suite once: `cd apps/couriers && NODE_ENV=test npx vitest run`.

## Report
Write `plans/2026-09-14-couriers-customers-settings-modules/reports/command-code/2026-09-14-registry-errors-test-repair.md`:
files changed, number of assertions updated per file, every status regression found (step 4), and the
final full-suite result line copied verbatim.
