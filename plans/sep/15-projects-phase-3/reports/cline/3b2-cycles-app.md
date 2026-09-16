# 3b2 — Cycles app

- Model: Muse Spark (muse-spark) via Cline
- Branch: `feature/projects-phase-3-task-lists`
- Binding: `plans/2026-09-15-projects-phase-3/plan.md` decisions:
  Cycle uses derived `upcoming|active|completed` status, additive
  `description`/`goal`, `Issue.cycleId` assignment, derived progress and
  throughput; reads `projects.view`, writes `projects.edit`.

## Files

Nav:

- `apps/projects/src/components/shell/nav-config.ts`
- `apps/projects/src/components/shell/nav-icons.tsx`
- `apps/projects/src/components/shell/nav-config.test.ts`

Route handlers:

- `apps/projects/src/app/api/cycles/route.ts`
- `apps/projects/src/app/api/cycles/[cycleId]/route.ts`
- `apps/projects/src/app/api/cycles/[cycleId]/issues/route.ts`
- `apps/projects/src/app/api/cycles/[cycleId]/issues/[issueId]/route.ts`

Browser client:

- `apps/projects/src/lib/client/cycles.ts`
- `apps/projects/src/lib/client/index.ts`

Server service accessor:

- `apps/projects/src/lib/services/projects.ts`

Pages:

- `apps/projects/src/app/(app)/cycles/page.tsx`
- `apps/projects/src/app/(app)/cycles/new/page.tsx`
- `apps/projects/src/app/(app)/cycles/[cycleId]/page.tsx`
- `apps/projects/src/app/(app)/cycles/[cycleId]/edit/page.tsx`
- `apps/projects/src/app/(app)/cycles/[cycleId]/_components/cycle-detail-data.tsx`

Components/data:

- `apps/projects/src/features/projects/cycle-filters.ts`
- `apps/projects/src/features/projects/components/cycle-skeleton-columns.ts`
- `apps/projects/src/features/projects/components/cycle-list-data.tsx`
- `apps/projects/src/features/projects/components/cycle-form.tsx`
- `apps/projects/src/features/projects/components/new-cycle-data.tsx`
- `apps/projects/src/features/projects/components/edit-cycle-data.tsx`
- `apps/projects/src/features/projects/components/cycle-detail-client.tsx`
- `apps/projects/src/features/projects/components/cycle-header.tsx`
- `apps/projects/src/features/projects/components/cycle-issues.tsx`
- `apps/projects/src/features/projects/components/cycle-issue-picker.tsx`

Tests:

- `apps/projects/src/app/api/cycles/route.test.ts`
- `apps/projects/src/app/api/cycles/[cycleId]/route.test.ts`
- `apps/projects/src/app/api/cycles/[cycleId]/issues/route.test.ts`
- `apps/projects/src/app/api/cycles/[cycleId]/issues/[issueId]/route.test.ts`
- `apps/projects/src/features/projects/cycle-filters.test.ts`
- `apps/projects/src/features/projects/components/cycle-form.test.tsx`

## Counted tests

Targeted run:

- `src/app/api/cycles/route.test.ts`: 5
- `src/app/api/cycles/[cycleId]/route.test.ts`: 6
- `src/app/api/cycles/[cycleId]/issues/route.test.ts`: 3
- `src/app/api/cycles/[cycleId]/issues/[issueId]/route.test.ts`: 2
- `src/components/shell/nav-config.test.ts`: 11
- `src/features/projects/cycle-filters.test.ts`: 3
- `src/features/projects/components/cycle-form.test.tsx`: 2
- Total: 32 passing across 7 files; floor requirement 18 it() met.

## Verification

- `pnpm --filter @876/projects-app typecheck`: pass
- `pnpm --filter @876/projects-app lint`: pass, 0 errors, 4 pre-existing
  warnings in unrelated login/register/shell files
- Targeted vitest files above: 32 passed
- `node scripts/check-app-structure.mjs projects`: `app-structure: OK (projects)`

## Unverified items

- Full `pnpm --filter @876/projects-app test` was not completed: the default
  command exceeded the available 30s verification-command timeout.
- Browser rendering of the Cycles list/detail/new/edit pages was not manually
  exercised.
- Production build was not run.
