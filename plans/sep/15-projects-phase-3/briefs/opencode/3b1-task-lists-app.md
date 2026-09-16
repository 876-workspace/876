# Brief 3b1 — Projects app: Task Lists & Work Breakdown

Repo /root/projects/876, branch feature/projects-phase-3-task-lists. Do NOT commit, branch, or run prisma. No eslint-disable, as any, @ts-ignore. Never write run logs. One verification command at a time. Read budget: at most the files named here plus the ones you edit; then start writing. Write the pages first, tests after.

Binding: read `plans/2026-09-15-projects-phase-3/plan.md` (decisions). Rules (skim only): `.claude/rules/app-layout.md` §2–5, `.claude/rules/data-loading.md` (invariant section), `.claude/rules/app-api-routing.md` (Pattern A). No server actions. Route handlers authorize then call one `projects.<resource>.<verb>()` from `@/lib/services/projects` and return `apiJson`. Reads use `projects.view`, writes use `projects.edit` via `requireApiAccess({ module: "projects", permission })` / `requireAppAccess`. Bare verb button labels ("Add", "Edit"). No green buttons. No explanatory <p> under headings.

Reference implementation to copy (Phase 2 phases), read these only:
- apps/projects/src/app/(app)/phases/page.tsx, new/page.tsx, [phaseId]/page.tsx, [phaseId]/edit/page.tsx
- apps/projects/src/app/api/phases/route.ts, [phaseId]/route.ts, route.test.ts
- apps/projects/src/features/projects/components/phase-list-data.tsx, phase-form.tsx, new-phase-data.tsx, edit-phase-data.tsx
- apps/projects/src/lib/client/projects.ts (phasesClient section, lines 55-135)

Server client API (already implemented, @876/projects): see packages/projects/src/resources/task-lists.ts and cycles.ts signatures and packages/projects/src/types.ts (TaskList, Cycle types).

## Deliver (you own ONLY these files)
1. Route handlers: `apps/projects/src/app/api/task-lists/route.ts` (POST create), `api/task-lists/[taskListId]/route.ts` (PATCH, DELETE), `api/task-lists/[taskListId]/archive/route.ts` (POST), `.../restore/route.ts` (POST), `.../issues/route.ts` (POST move issueIds), `api/projects/[projectId]/task-lists/order/route.ts` (PUT ordered ids). Strict zod bodies; actorUserId from auth, never body.
2. Browser client `apps/projects/src/lib/client/task-lists.ts` (copy phasesClient style).
3. Pages: `app/(app)/task-lists/new/page.tsx` (?project=), `app/(app)/task-lists/[taskListId]/edit/page.tsx`; components in `features/projects/components/task-list-form.tsx`, `new-task-list-data.tsx`, `edit-task-list-data.tsx` (fields: project, phase (optional select of that project's milestones), name, description, owner (member select like phase-form), start/target date).
4. Work breakdown on project detail: `features/projects/components/work-breakdown-data.tsx` (async, calls `projects.taskLists.workBreakdown`) + `work-breakdown.tsx` client component rendering Phase → Task List (name, owner, dates, progress completed/total, archive/restore/edit actions, up/down reorder) → root work items with links to `/issues/<identifier>`; separate groups "No phase" task lists and "Unlisted" items. Mount it in `app/(app)/projects/[projectId]/_components/project-detail-data.tsx` inside its own <Suspense> with a skeleton — do not block existing content.
5. Issue form: in `features/projects/components/issue-form.tsx` add optional "Task List" select (task lists of the selected project, loaded via the same server-started pattern the form uses for phases) and send `taskListId`; extend `apps/projects/src/app/api/issues/route.ts` and `api/issues/[issueRef]/route.ts` zod schemas to accept `taskListId`. Also accept `cycleId` in those two schemas and add an optional "Cycle" select (list `projects.cycles.list`, status active+upcoming).
6. Tests (floor ≥ 20 it()): route handler tests (auth 403, 422 validation, success envelope, actor binding) and task-list-form / work-breakdown render tests. Check `apps/projects/vitest.config.*` environment; add `/** @vitest-environment jsdom */` for component tests like existing ones.

## Verify
pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app lint
pnpm --filter @876/projects-app test
node scripts/check-app-structure.mjs

## Report
`plans/2026-09-15-projects-phase-3/reports/opencode/3b1-task-lists-app.md`: files, counted tests, model used, unverified items.
