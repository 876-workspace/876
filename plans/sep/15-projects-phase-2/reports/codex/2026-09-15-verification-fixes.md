# Projects phase-2 verification fixes

Branch `feature/projects-phase-2-phases`. No commits, no production weakening, no `eslint-disable` / `as any` / `@ts-ignore`.

## Files changed + why

- `apps/projects-api/src/modules/work-structure/__tests__/work-structure.test.ts` — added missing `ownerUserId: null` to the `milestone` fixture and to the expected `serializeMilestone` output. `MilestoneRow` gained `ownerUserId` in phase-2, so the old fixture no longer satisfied the type.
- `apps/projects-api/src/modules/issues/__tests__/issues.test.ts` — mocked `milestone-details.repository.js` and `milestone-list.repository.js`. Phase-2 `work-structure.routes.ts` pulls milestone controllers through services to the new repositories, which import `@/db` and throw `PROJECTS_DATABASE_URL is not configured` at import. Same pattern as the existing repository mocks in this file.
- `apps/projects-api/src/modules/labels/__tests__/labels.test.ts` — same two repository mocks, same reason via `labels.service` to `tenants/index` to `work-structure.service` to `work-structure/index` to routes.
- `apps/projects-api/src/modules/projects/__tests__/projects.test.ts` — same two repository mocks, same reason via `projects.service`.
- `apps/projects-api/src/modules/tenants/__tests__/tenants.test.ts` — same two repository mocks, same reason via `tenants.service` to `work-structure.service`.
- `apps/projects-api/src/modules/work-structure/__tests__/work-structure.routes.test.ts` — same two repository mocks. This file imports `work-structure.routes.js` directly, which now imports the milestone controllers.
- `apps/projects/src/features/projects/components/phase-form.tsx` — narrowed `phase.id` access via `props.mode === 'edit'` instead of the boolean `editing`. `phase` is `MilestoneDetail | null`, and `editing` does not narrow it.
- `apps/projects/src/features/projects/components/phase-comments.tsx` — removed `useEffect(() => setItems([...comments]), [comments])`. Replaced with render-phase derived state (`prevComments` comparison). Removes the `react-hooks/set-state-in-effect` error while keeping local comment mutations.
- `apps/projects/src/features/projects/components/issue-form-edit.test.tsx` — updated `getByLabelText('Milestone')` to `getByLabelText('Phase')` to match the phase-language rename in `issue-form.tsx` (`FormRow label="Phase"`).
- `apps/projects/src/app/(app)/settings/_lib/settings-nav.test.ts` — replaced expected `/settings/milestones` with `/settings/phase-fields`, matching `settings-nav.ts` production order after commit `9d88b564a` (phases moved out of settings) plus `c98617243` (phase-fields page added).

No files outside the named failure set were touched. Production `settings-nav.ts` was already correct and was not edited.

## Verification

Run one command at a time, in order:

- `pnpm --filter @876/projects-api typecheck` — pass, 0 errors.
- `pnpm --filter @876/projects-api test` — 14 files passed, 285 tests passed (was 5 failed suites / 183 passed before).
- `pnpm --filter @876/projects-app typecheck` — pass, 0 errors.
- `pnpm --filter @876/projects-app lint` — 0 errors, 4 warnings (pre-existing `@next/next/no-location-assign-relative-destination` in `embedded-auth.tsx`, `registration-auth.tsx`, `org-switcher.tsx`, `user-menu.tsx`).
- `pnpm --filter @876/projects-app test` — all passing. Full-suite single invocation exceeds the 10s tool window, so verified in batches plus the two originally-failing files:
  - `issue-form-edit.test.tsx` + `settings-nav.test.ts` — 2 files passed, 6 tests passed.
  - Batch 1 (board, settings-nav, member-card, member-overview, access/page, layout, page, permissions/page, users-list) — 9 passed, 48 tests.
  - Batch 2 (app-memberships, comments `[commentId]`, comments advanced, comments route, issues `[issueRef]`, phases `[phaseId]/clone`, phases route, projects route, work-structure-routes) — 9 passed, 93 tests.
  - Batch 3 (callback, mobile-nav advanced, nav-config, sidebar, member-picker, issue-comments-data, issue-comments-loader, board duplicate) — 8 passed, 60 tests.
  - Batch 4 (issue-form-edit, new-issue-form, work-structure-settings, issue-filters, access-context, app-access, roles, comments client, work-structure client, catalog) — 10 passed, 60 tests.
  - Unique total: 35 files, 260 tests, 0 failures (board `page.test.tsx` counted twice across batches, 1 test).

## Page-existence check for settings-nav

- Exists: `/settings/work-item-types`, `/settings/workflow-states`, `/settings/custom-fields`, `/settings/phase-fields`, `/settings/users`, plus `/settings/milestones` as a redirect to `/phases`.
- `/settings/teams`, `/settings/categories`, `/settings/priorities` have no `page.tsx` under `apps/projects/src/app/(app)/settings/`; they are pre-existing `available` entries carried over from the initial Projects settings hub and remain in both production data and the updated expectation. No change made to them.

## Unresolved items

- None. All 6 named failures are fixed and all 5 verification commands pass (app tests via batches for tool-timeout reasons).
