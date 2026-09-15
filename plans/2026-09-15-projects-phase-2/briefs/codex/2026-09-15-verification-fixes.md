# Brief: fix Projects phase-2 verification failures

Branch `feature/projects-phase-2-phases`. Do not commit, branch, or touch files outside the named ones unless the fix requires it (say so in the report). No `eslint-disable`, `as any`, `@ts-ignore`. Do not weaken production code for tests. Run one verification command at a time. Never write run logs.

## Failures
1. `@876/projects-api` test: 5 suites fail at import with `PROJECTS_DATABASE_URL is not configured` (src/db/index.ts:8) — issues, labels, projects, tenants, work-structure.routes tests. On phase-1 branch they passed, so a phase-2 change made a module these tests import eagerly load `@/db` (likely the new phase list repository / milestone comments/events/custom-field code in `src/modules/work-structure/`). Fix the import chain (repositories only import db; keep lazy access like the pre-existing repositories) or mock correctly as the existing tests do. Compare with `git diff feature/projects-phase-1-foundation...HEAD -- apps/projects-api/src`.
2. `@876/projects-api` typecheck: `src/modules/work-structure/__tests__/work-structure.test.ts(312,43)` fixture is missing the new `ownerUserId` field of `MilestoneRow`.
3. `@876/projects-app` typecheck: `src/features/projects/components/phase-form.tsx(87,35)` `'phase' is possibly 'null'` — narrow properly.
4. `@876/projects-app` lint error: `src/features/projects/components/phase-comments.tsx:42` setState synchronously inside an effect — derive state or move into event handler/key reset (react-hooks rule).
5. `@876/projects-app` tests:
   - `src/features/projects/components/issue-form-edit.test.tsx` "initializes the complete editable issue state" (phase language rename in issue-form likely changed a label) — update the test to the intended production label.
   - `src/app/(app)/settings/_lib/settings-nav.test.ts` "exposes the settings pages that are built today" — phases moved out of settings (commit 9d88b564a) and a phase-fields settings page was added; update the expected href list to match `settings-nav` production data after confirming each href's page exists.

## Verify
pnpm --filter @876/projects-api typecheck
pnpm --filter @876/projects-api test
pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app lint
pnpm --filter @876/projects-app test

## Report
`plans/2026-09-15-projects-phase-2/reports/codex/2026-09-15-verification-fixes.md`: files changed + why, final counts, unresolved items.
