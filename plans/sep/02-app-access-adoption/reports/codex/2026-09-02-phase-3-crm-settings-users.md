# Phase 3 — CRM settings users

Implemented CRM's persistent `/settings/users` list/detail view and enabled it
in the Settings hub.

## Attribution

- **GPT-5.6 Terra** implemented the initial CRM list/detail surface, overview,
  app-access host adapter, mutation routes/client, settings navigation, and 42
  tests.
- **GPT-5.6 Sol** reviewed the implementation against the Phase 3 brief, branch
  plan, repository rules, and actual runtime behavior. Sol fixed the streaming
  detail layout, preserved data-loading failures instead of converting them to
  empty/not-found states, surfaced per-app role failures, tightened request
  parallelism, added 15 direct regression tests, and fixed the shared
  `DetailCardHeader` close link's Base UI native-button contract.

## Files

| Area                 | Files                                                                                                                                                                                                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Settings navigation  | `settings-nav.ts`, `settings-nav.test.ts`                                                                                                                                                                                                                                                         |
| Split view and list  | `settings/users/layout.tsx`, `(list)/page.tsx`, `_components/users-shell.tsx`, `users-list.tsx`, `users-list-data.tsx`, `users-list-skeleton.tsx`, `users-skeleton-columns.ts`                                                                                                                    |
| Detail and access    | `[membershipId]/layout.tsx`, `[membershipId]/page.tsx`, `[membershipId]/access/page.tsx`, `[membershipId]/_components/member-card.tsx`, `member-header-data.tsx`, `member-overview.tsx`, `member-access-panel.tsx`, `_data.ts`, `_lib/member-utils.ts`, `_lib/access-entries.ts`, `_lib/types.ts` |
| Browser mutations    | `app/api/app-memberships/route.ts`, `app/api/app-memberships/[assignmentId]/route.ts`, `lib/client/app-memberships.ts`, `lib/client/index.ts`                                                                                                                                                     |
| Shared UI correction | `packages/ui/src/components/detail-card.tsx`, `detail-card.test.tsx`                                                                                                                                                                                                                              |
| Dependency           | `apps/crm/package.json` (`@876/access-ui`; the existing Phase 2 lockfile entry already satisfies the frozen lockfile)                                                                                                                                                                             |

## Sol review corrections

1. The original dynamic detail layout suspended the entire `DetailCard`, so the
   tabs did not render until member data resolved. The card, route-derived tabs,
   and body shell now render immediately; only the member header is inside the
   Suspense boundary. `notFound()` remains in that streamed server component.
2. `loadMember` originally collapsed a failed roster request into `null`, which
   incorrectly turned a service failure into a 404. It now preserves the member
   and error independently; missing members and failed reads have distinct UI
   paths.
3. The overview originally converted a failed app-membership request into an
   empty `AppAccessSummary`. It now renders a scoped `AppError`, while keeping
   Profile and Employment mounted.
4. The access page originally discarded every `orgAppRoles` error as an empty
   role array. It now keeps all app panels visible and adds a per-app error
   notice. The membership request and viewer lookup start together, and role
   requests begin as soon as membership data resolves rather than waiting for
   the independent viewer lookup.
5. `DetailCardHeader` rendered a Next `Link` through Base UI's `Button` while
   leaving `nativeButton=true`, producing the reported accessibility/runtime
   console error in Invoice and any other close-link consumer. The shared link
   path now renders a styled native `Link` instead of routing an anchor through
   the button primitive, with a regression assertion that it retains link
   semantics and renders without a console error.

## Test counts

Terra added the original 42 cases. Sol added 15 direct layout/page/access and
failure-state cases, for 57 Phase 3 cases:

| File                                  | `it()` count |
| ------------------------------------- | -----------: |
| `users-list.test.tsx`                 |           10 |
| `member-overview.test.tsx`            |            7 |
| `member-card.test.tsx`                |            5 |
| `[membershipId]/layout.test.tsx`      |            3 |
| `[membershipId]/page.test.tsx`        |            4 |
| `[membershipId]/access/page.test.tsx` |            6 |
| `access-entries.test.ts`              |           12 |
| `app-memberships/route.test.ts`       |           10 |
| **Total**                             |       **57** |

The existing `settings-nav.test.ts` remains at four cases and the shared
`detail-card.test.tsx` gained one regression assertion inside its existing
close-link case.

## Final verification

| Command                                | Result / output tail                                                                    |
| -------------------------------------- | --------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`       | Passed: `Already up to date`, pnpm 11.3.0                                               |
| `pnpm --filter @876/crm-app typecheck` | Passed: `$ tsc --noEmit`                                                                |
| `pnpm --filter @876/crm-app test`      | Passed: `Test Files 36 passed (36)`, `Tests 281 passed (281)`                           |
| `pnpm --filter @876/crm-app lint`      | Passed with 0 errors and 10 pre-existing warnings outside this change                   |
| `pnpm --filter @876/ui typecheck && pnpm --filter @876/ui test` | Passed: 20 files, 143 tests |
| `pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app test` | Passed: 18 files, 155 tests |
| `node scripts/check-app-structure.mjs` | Passed: `app-structure: OK (console, billing, couriers, 876, enterprise, invoice, crm)` |
| `git diff --check`                     | Passed                                                                                  |

Cross-phase verification also passed for `@876/access-ui` (49 tests), Billing
(742 tests), Core (954 tests), and API (2,207 tests). API boundaries remain at
the expected 18 pre-existing cycles after Phase 2b removed one.

## Decisions

- Omitted the Add button. CRM has no invite route in this phase, so a primary
  action would have been a dead link.
- Member list filtering is client-side because the persistent section layout
  cannot receive `searchParams`; it applies status to the one roster response.
- The users layout denies the surface when the existing `members:read` guard
  cannot resolve a permitted viewer; mutation routes independently enforce
  `apps:assign`.
- Department and location display their opaque IDs because no resolved-name
  source is available without another request. Manager is resolved from the
  already-loaded roster.
- Unknown app slugs remain visible with an empty catalog.

## Limits and contradictions

- No functional blocker remains.
- The brief first describes an Add toolbar action, then requires omitting it
  unless an invite route is built. The latter instruction was followed.
- The API boundary command intentionally exits non-zero while the 18 unrelated
  cycles remain; Phase 2b explicitly excludes untangling them.
