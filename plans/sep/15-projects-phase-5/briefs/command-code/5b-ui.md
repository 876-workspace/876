# Brief 5b — Gantt UI in @876/projects-ui + Projects app page

Repo `/root/projects/876`, branch `feature/projects-phase-5-gantt`. Read `plans/2026-09-15-projects-phase-5/plan.md` (binding).
Hard rules: no commit/branch/prisma. No `eslint-disable`/`as any`/`@ts-ignore`. No server actions. No run logs. One verification command at a time. Read budget: only the files named here.

## Contracts (read these two, they are the source of truth)
- `packages/projects/src/resources/gantt.ts` and `resources/baselines.ts` — verb signatures.
- `packages/projects/src/types.ts` — `Gantt`, `GanttRow`, `GanttEdge`, `ProjectBaseline`, baseline comparison types.

## Patterns to copy (read these only)
- shared UI component + test: `packages/projects-ui/src/issue-board.tsx`, `issue-board.advanced.test.tsx`
- package export style: `packages/projects-ui/package.json` (subpath exports; no barrels)
- app page + Suspense: `apps/projects/src/app/(app)/board/page.tsx`
- data loader: `apps/projects/src/features/projects/components/board-data.tsx`
- route handler: `apps/projects/src/app/api/task-lists/route.ts`

## Deliver
1. `packages/projects-ui/src/project-gantt.tsx` — presentation only, no data fetching, no session, no hrefs hard-coded (take `issueHref: (identifier: string) => string`... **no**: take `issuesBaseHref: string` and build `${issuesBaseHref}/${identifier}` internally, because a function prop cannot cross the RSC boundary).
   - Left column: the row hierarchy with collapse/expand per phase and task list (collapsing hides descendants).
   - Right: a time grid with one bar per row, positioned from `plannedStart`/`plannedFinish`; a lighter overlay bar for `actualStart`/`actualFinish`; critical rows visibly marked (border/colour token, never green for a button).
   - Zoom control: day / week / month changes the column width and header labels.
   - Dependency connectors drawn between bars as SVG lines with an arrow head.
   - Drag a bar to move it and drag its right edge to resize; on release call `onReschedule({ issueId, plannedStart, plannedFinish })`. Dragging is pointer-events based and must be keyboard-accessible too (focus a bar, arrow keys move by one grid unit, shift+arrow resizes; announce via `aria-label`).
   - Props: `{ gantt, issuesBaseHref, zoom, onZoomChange, onReschedule, canEdit }`. When `canEdit` is false, no drag handles.
   - Filters/grouping: accept `filter` props already resolved by the host (assignee id, status) — filtering is the host's job; the component only renders what it is given.
   - Theme-aware, works at 400px (horizontal scroll on the grid only), `overflow-x: auto` on the grid container. Do not use `overscroll-contain`.
2. `packages/projects-ui/src/project-gantt.test.tsx` — floor ≥ 14 `it()`: rows render in order, collapse hides descendants, critical rows marked, connector count matches edges, zoom changes labels, drag calls `onReschedule` once with the new dates, keyboard move/resize, `canEdit=false` renders no handles, empty gantt renders an empty state.
3. Export it from `packages/projects-ui/package.json` as `./project-gantt` (match the existing export style exactly).
4. App: `apps/projects/src/app/(app)/projects/[projectId]/gantt/page.tsx` (chrome + `<Suspense>`), `features/projects/components/gantt-data.tsx` (async loader calling `projects.gantt.retrieve`), and a client wrapper that owns zoom state and calls the existing issue update route to persist a reschedule. Add a "Gantt" tab/link on the project detail page beside the existing content.
5. Baselines: `app/api/projects/[projectId]/baselines/route.ts` (POST capture) and `.../baselines/[baselineId]/route.ts` (DELETE); a small baselines section on the gantt page listing baselines with a capture action and a comparison table (variance in days, negative = earlier). Reads go through the server client in the data loader, not the browser.
6. App tests, floor ≥ 12 `it()`: route handlers (403/422/success/actor), gantt data loader error surface, baseline capture calls the client once, comparison table renders variances.

## Verify
pnpm --filter @876/projects-ui typecheck
pnpm --filter @876/projects-ui test
pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app lint
pnpm --filter @876/projects-app test
node scripts/check-app-structure.mjs
pnpm check:rsc-boundaries

## Report
`plans/2026-09-15-projects-phase-5/reports/command-code/5b-ui.md`: files, counted tests, decisions, unverified items.
