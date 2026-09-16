# Brief 4b Report — Projects app: relationships, dependencies, planned schedule

- Branch: `feature/projects-phase-4-dependencies` (no commit, no new branch, no prisma per hard rules)
- Plan binding decisions honored: two link models kept separate, planned fields additive,
  advisory-only scheduling, `blocked` read from the API rather than recomputed app-side,
  cross-project links allowed, actors taken from auth only.

## Files

New (app):

- `apps/projects/src/app/api/issues/[issueRef]/relations/route.ts` (POST)
- `apps/projects/src/app/api/issues/[issueRef]/relations/[relationId]/route.ts` (DELETE)
- `apps/projects/src/app/api/issues/[issueRef]/dependencies/route.ts` (POST)
- `apps/projects/src/app/api/issues/[issueRef]/dependencies/[dependencyId]/route.ts` (PATCH, DELETE)
- `apps/projects/src/app/api/issues/[issueRef]/dependencies/schedule-suggestion/route.ts` (POST)
- `apps/projects/src/lib/client/issue-links.ts`
- `apps/projects/src/features/projects/components/issue-links-panel.tsx` (client)
- `apps/projects/src/features/projects/components/issue-links-data.tsx` (async server)

New (tests):

- `apps/projects/src/app/api/issues/[issueRef]/relations/route.test.ts` — 8
- `apps/projects/src/app/api/issues/[issueRef]/relations/[relationId]/route.test.ts` — 5
- `apps/projects/src/app/api/issues/[issueRef]/dependencies/route.test.ts` — 9
- `apps/projects/src/app/api/issues/[issueRef]/dependencies/[dependencyId]/route.test.ts` — 10
- `apps/projects/src/app/api/issues/[issueRef]/dependencies/schedule-suggestion/route.test.ts` — 5
- `apps/projects/src/features/projects/components/issue-links-panel.test.tsx` — 15
- `apps/projects/src/features/projects/components/issue-links-data.test.tsx` — 7
- `apps/projects/src/app/(app)/issues/[issueRef]/_components/issue-detail-data.test.tsx` — 4

Modified (app):

- `apps/projects/src/lib/services/projects.ts` — `issueRelations` / `issueDependencies` getters
  (the verbs already existed on the service client; the app's façade had not exposed them)
- `apps/projects/src/app/api/issues/route.ts` — create schema accepts the three planned fields
- `apps/projects/src/app/api/issues/[issueRef]/route.ts` — update schema accepts the three planned fields
- `apps/projects/src/features/projects/components/issue-form.tsx` — planned start / finish /
  duration (minutes) inputs, seeded and submitted through the existing create and update routes
- `apps/projects/src/features/projects/components/issue-form-edit.test.tsx` — payload expectation
  extended, 2 new `it()` for the planned fields
- `apps/projects/src/app/(app)/issues/[issueRef]/_components/issue-detail-data.tsx` — mounts
  `IssueLinksData` in its own `<Suspense>` below the existing content

Modified (package, one line):

- `packages/projects-ui/src/issue-detail.tsx` — `{issue.blocked ? <Badge variant="destructive">Blocked</Badge> : null}`
  in the header badge cluster

## Counted tests

- 63 new `it()` in the eight new test files above (floor 22), plus 2 added to the existing
  `issue-form-edit.test.tsx` (that file is 4 total, 2 pre-existing).
- Coverage required by the brief: every route handler has 403-unauthenticated, 422-invalid-body
  (where a body exists), success-envelope and actor-binding/mapping cases; the panel renders both
  sections; remove calls the client exactly once with the right id (relations and dependencies);
  the suggestion fills the planned inputs and asserts `issuesClient.update` was **not** called;
  the blocked badge is asserted present and absent.
- Full app suite: **58 files / 400 tests pass**.

## Verification (each run singly)

- `pnpm --filter @876/projects-app typecheck` — clean
- `pnpm --filter @876/projects-app lint` — 0 errors (4 pre-existing
  `no-location-assign-relative-destination` warnings in files this brief did not touch)
- `NODE_ENV=test pnpm --filter @876/projects-app test` — 58 files / 400 tests pass
- `node scripts/check-app-structure.mjs` — OK for all nine apps
- `NODE_ENV=test pnpm --filter @876/projects-ui test` — 12 files / 139 tests pass (because of the
  one-line header edit), plus `pnpm --filter @876/projects-ui typecheck`

### Environment note (not a code issue)

This shell exports `NODE_ENV=production`, which makes `react-dom/test-utils` resolve to its
production build and breaks `@testing-library/react`'s `act`. Under that environment the app suite
reports 124 failures **including pre-existing render tests** (`task-list-form.test.tsx`,
`member-picker.test.tsx`, `sidebar.test.tsx`, …); a single unrelated pre-existing file fails the
same way on its own. Running the exact brief command with `NODE_ENV=test` is green, and no test
file in the repo was changed to accommodate the environment.

## Decisions

- **Dependency endpoints are issue ids, not the identifier in the route path.** The service
  rejects a create whose anchor does not equal one of the two endpoints, so the panel is given
  `issueId` alongside `issueRef` and puts the id on whichever end is "this work item". Using the
  identifier would have produced `projects/invalid-request` at runtime.
- **`schedule-suggestion` requires `issues.view`, not `issues.edit`.** It is a read that writes
  nothing (the 4a report confirms the single read query); applying a suggestion still needs
  `issues.edit` because it goes through the ordinary issue update route.
- **Blocked badge lives in the shared header.** The work-item detail header is rendered by
  `@876/projects-ui/issue-detail`, and the repo's direction is that product surfaces live in the
  `*-ui` packages rather than being duplicated in an app. The change is one conditional badge
  reusing the already-imported `Badge`; it is covered from the app suite by
  `issue-detail-data.test.tsx`, which renders the real `IssueDetail` through `IssueDetailData`.
- **The picker uses the existing issues list verb, server-side.** No search route was added: the
  loader reads a 200-item candidate window through `projects.issues.list` and the panel filters it
  by identifier or title as the user types, which is the `CycleIssuePicker` shape already in this
  app. Linked ends are read back individually by id so cross-project links (which may sit outside
  the window) still render.
- **Link reads/writes fail closed, link enrichment does not.** A failure of the issue, relations,
  dependencies or candidate read renders the `AppError` banner instead of an empty panel. A
  failure to read one linked end keeps the row and labels it "Work item unavailable" — a stale
  link is real even when its other end is soft-deleted.
- **Suggestion never saves and never clears.** It fills only the bounds the API returned
  (`earliestStart`/`earliestFinish` non-null), shows the `constrainedBy` identifiers, and the user
  still presses "Save planned schedule", which is the only path that calls `issuesClient.update`.
- **Planned fields on the order form.** Update always sends all three (null clears them, matching
  the existing `dueDate` handling); create sends only the ones the user filled in, matching the
  existing `...(x ? { x } : {})` style in that handler.
- **Error mapping**: `issue-relation-exists`/`issue-dependency-exists` → 409,
  `issue-dependency-cycle` → 422, `issue-not-found`/link-not-found → 404, everything else → 400.
  Self-links and invalid anchors arrive as 400 from the service.
- **Static route precedence**: `dependencies/schedule-suggestion` sits beside
  `dependencies/[dependencyId]`; Next resolves the literal segment first, and the route tests pin
  both behaviours.

## Unverified items

- No live API or database was exercised: the migration from 4a is unapplied here, so the panel has
  never rendered against real link rows and the schedule suggestion maths is only exercised
  through the service (4a) and the app route tests.
- No browser/end-to-end run (`pnpm --filter @876/projects-app dev` was not started); the panel's
  visual layout, the picker at 200 candidates, and `router.refresh()` re-render behaviour on a
  real navigation are unverified.
- The candidate window is capped at 200 work items and is not project-scoped, so a work item
  beyond that window cannot be added as a link from this panel (it still renders if linked).
- `/api/issues` create/update accept the planned fields, but the planned-fields payload was only
  asserted in the form test; no route test was added for the extended issue schema because those
  two route files were outside this brief's test list.
