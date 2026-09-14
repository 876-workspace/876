# App module runtime convergence review fixes

## Fixes

1. Core commerce catalog typecheck
   - Root cause: the test passed the permission-only `themes` and `domains`
     strings to a `Set` inferred from canonical `COMMERCE_MODULES` keys.
   - Fix: typed that lookup as `Set<string>`, preserving the assertion that both
     keys belong to the permission catalog but not to the canonical module
     registry.
   - Files: `packages/core/src/access/catalogs.commerce.test.ts`.

2. Projects stale test contracts
   - Root cause: tests still mocked legacy `requireAppPermission` or
     `requireApiPermission`, expected feature flags in the app access context,
     or selected an ungated list page before its guarding layout.
   - Fix: updated mocks to `requireAppAccess` and `requireApiAccess`; asserted
     `entitled_modules` and empty features; and made the navigation binding test
     compare each entry's permission and, where required, module with its actual
     destination guard.
   - Files: `apps/projects/src/app/(app)/board/page.test.tsx`,
     `apps/projects/src/app/api/comments/comments.advanced.test.ts`,
     `apps/projects/src/components/shell/nav-config.test.ts`,
     `apps/projects/src/lib/auth/access-context.test.ts`.
   - Test count: before, 237 passed and 6 failed (243 total); after, 243 passed
     and 0 failed (243 total).

3. API circular dependencies
   - Root cause: `app-access-runtime.service.ts` imported app-access, modules,
     and organizations ownership APIs as a new layer, creating two dependency
     cycles.
   - Fix: folded `retrieveMyAppRuntimeMembership` into
     `app-access.service.ts`, updated the controller, removed the runtime
     service, and moved its test alongside the app-access service tests with
     direct dependency mocks.
   - Files: `apps/api/src/modules/app-access/app-access.service.ts`,
     `apps/api/src/modules/app-access/app-access.controller.ts`,
     `apps/api/src/modules/app-access/app-access-runtime.service.ts` (deleted),
     `apps/api/src/modules/app-access/app-access-runtime.service.test.ts`
     (moved),
     `apps/api/src/modules/app-access/__tests__/app-access-runtime.service.test.ts`.
   - Boundary cycle count: 18 `no-circular` errors, matching the accepted
     pre-existing baseline.

4. Rationale comments
   - Root cause: true policy rationale was removed during the registry and seed
     changes.
   - Fix: restored the Invoice/Billing/Requests explanation and added the
     requested Projects and Commerce clarifications; restored the module-grant
     rollback explanation and merged the retained Billing legacy-module rationale
     with the Commerce note.
   - Files: `packages/core/src/modules.ts`, `apps/api/src/seeds/plans.ts`.

5. Architecture decision record collision
   - Root cause: the new module runtime ADR reused existing number 017.
   - Fix: moved it to ADR-026, corrected its heading, and updated both mirrored
     app-access rules documents.
   - Files: `docs/architecture/026-module-runtime-access.md`,
     `.claude/rules/app-access.md`, `.agents/rules/app-access.md`.

6. Formatting
   - Ran Prettier write over the branch-diff TypeScript, TSX, and Markdown files
     plus the new moved test, limited to those files.

## Verification

| Command                                                                                          | Result                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @876/core typecheck`                                                              | Passed.                                                                                                                                                 |
| `pnpm --filter @876/core test`                                                                   | Passed: 44 files, 1,138 tests.                                                                                                                          |
| `pnpm --filter @876/api typecheck`                                                               | Passed (including Prisma client generation).                                                                                                            |
| `pnpm --filter @876/api boundaries 2>&1 \| grep -c "error no-circular"`                          | Passed: `18`.                                                                                                                                           |
| `cd apps/api && npx vitest run src/seeds src/modules/app-access src/services && cd ../..`        | Passed: 36 files, 808 tests.                                                                                                                            |
| `pnpm --filter @876/projects-app typecheck`                                                      | Passed.                                                                                                                                                 |
| `pnpm --filter @876/projects-app test`                                                           | Passed: 30 files, 243 tests. The suite emitted its existing jsdom `Not implemented: navigation to another Document` notice.                             |
| `pnpm --filter @876/commerce-app typecheck`                                                      | Passed.                                                                                                                                                 |
| `pnpm --filter @876/commerce-app test`                                                           | Passed: 5 files, 25 tests.                                                                                                                              |
| `pnpm --filter @876/console typecheck`                                                           | Passed.                                                                                                                                                 |
| `node scripts/check-app-structure.mjs`                                                           | Passed: `app-structure: OK`.                                                                                                                            |
| `npx prettier --check $(git diff --name-only origin/main...HEAD \| grep -E '\\.(ts\|tsx\|md)$')` | Passed. Prettier reported the deleted runtime service/test and renamed ADR-017 paths as unmatched, then confirmed all matched files use Prettier style. |
| `cmp .claude/rules/app-access.md .agents/rules/app-access.md`                                    | Passed (byte-identical; no output).                                                                                                                     |

## Unresolved items

None.
