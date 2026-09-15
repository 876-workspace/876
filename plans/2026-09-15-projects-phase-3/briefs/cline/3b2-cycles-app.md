# Brief 3b2 — Projects app: Cycles

Repo /root/projects/876, branch feature/projects-phase-3-task-lists. Do NOT commit, branch, or run prisma. No eslint-disable, as any, @ts-ignore. Never write run logs. One verification command at a time. Read budget: at most the files named here plus the ones you edit; then start writing. Write the pages first, tests after.

Binding: read `plans/2026-09-15-projects-phase-3/plan.md` (decisions). Rules (skim only): `.claude/rules/app-layout.md` §2–5, `.claude/rules/data-loading.md` (invariant section), `.claude/rules/app-api-routing.md` (Pattern A). No server actions. Route handlers authorize then call one `projects.<resource>.<verb>()` from `@/lib/services/projects` and return `apiJson`. Reads use `projects.view`, writes use `projects.edit` via `requireApiAccess({ module: "projects", permission })` / `requireAppAccess`. Bare verb button labels ("Add", "Edit"). No green buttons. No explanatory <p> under headings.

Reference implementation to copy (Phase 2 phases), read these only:
- apps/projects/src/app/(app)/phases/page.tsx, new/page.tsx, [phaseId]/page.tsx, [phaseId]/edit/page.tsx
- apps/projects/src/app/api/phases/route.ts, [phaseId]/route.ts, route.test.ts
- apps/projects/src/features/projects/components/phase-list-data.tsx, phase-form.tsx, new-phase-data.tsx, edit-phase-data.tsx
- apps/projects/src/lib/client/projects.ts (phasesClient section, lines 55-135)

Server client API (already implemented, @876/projects): see packages/projects/src/resources/task-lists.ts and cycles.ts signatures and packages/projects/src/types.ts (TaskList, Cycle types).

## Deliver (you own ONLY these files — do NOT edit issue-form.tsx or api/issues/*, another agent owns them)
1. Nav: add `{ key: 'cycles', title: 'Cycles', href: '/cycles', icon: 'cycles', requires: { module: 'projects', permission: 'projects.view' } }` after Phases in `apps/projects/src/components/shell/nav-config.ts`; add a `cycles` icon (ArrowPathIcon from the same icon import) in `components/shell/nav-icons.tsx`; update `nav-config.test.ts` expected hrefs.
2. Route handlers: `app/api/cycles/route.ts` (POST), `api/cycles/[cycleId]/route.ts` (PATCH, DELETE), `api/cycles/[cycleId]/issues/route.ts` (POST issueIds), `api/cycles/[cycleId]/issues/[issueId]/route.ts` (DELETE).
3. Browser client `apps/projects/src/lib/client/cycles.ts`.
4. Pages: `app/(app)/cycles/page.tsx` (ResourceToolbar "Cycles" + StatusFilterHeading from `@876/ui/status-filter-heading` with options All/Active/Upcoming/Completed, param `status`, threaded into `projects.cycles.list`), `cycles/new/page.tsx`, `cycles/[cycleId]/page.tsx` (detail: name, goal, dates, status badge, progress completed/total + estimate points, throughput, assigned work items list with remove action and an "Add work items" picker of unassigned project issues), `cycles/[cycleId]/edit/page.tsx`. Components under `features/projects/components/cycle-*.tsx`. Data in async components behind <Suspense> with `DataTableSkeleton`.
5. Tests (floor ≥ 18 it()): route handlers (403/422/success/actor binding), status filter parsing, cycle form, nav-config.

## Verify
pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app lint
pnpm --filter @876/projects-app test
node scripts/check-app-structure.mjs

## Report
`plans/2026-09-15-projects-phase-3/reports/cline/3b2-cycles-app.md`: files, counted tests, model used, unverified items.
