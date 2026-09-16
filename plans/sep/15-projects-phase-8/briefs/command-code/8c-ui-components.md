# Brief 8c — @876/projects-ui: time tracking presentation components

Repo `/root/projects/876`, branch `feature/projects-phase-8-time`. Read `plans/2026-09-15-projects-phase-8/plan.md` — binding (especially decision 7: **this phase computes no money at all** — no rates, no currency, no cost anywhere in these components).

**You own ONLY `packages/projects-ui/src/**` and `packages/projects-ui/package.json`.** Another agent is working in `apps/projects-api` and `packages/projects` at the same time — do not open, read or edit anything under `apps/`. If you need a type that does not exist yet, declare the prop type locally in your own file rather than importing it.

Hard rules: no commit/branch/prisma. No `eslint-disable`/`as any`/`@ts-ignore`. No data fetching, no session, no `fetch`, no router imports — presentation only. No function props that would cross an RSC boundary: take `issuesBaseHref: string` style props and build hrefs internally. No run logs. One verification command at a time.

## Patterns to copy (read only these)
- `packages/projects-ui/src/project-gantt.tsx` and `project-gantt.test.tsx` (component + test style, theme tokens, 400px behaviour)
- `packages/projects-ui/src/phase-list.tsx` (table/list style, status badges)
- `packages/projects-ui/package.json` (subpath export style — no barrels)

## Deliver
1. `src/time-entry-list.tsx` — a table of time entries: date, project, work item (linked via `issuesBaseHref`), note, duration (formatted `2h 15m`, never a decimal), billable marker, approval status badge. Props: `{ entries, issuesBaseHref, canEdit, onEdit, onDelete, emptyTitle }`. Rows for entries in an approved timesheet render **without** edit/delete controls. Follow the table tier rules in `.claude/rules/app-layout.md` §12 (one tier-1 cell, metadata muted, status as a `<Badge>`, `tabular-nums` on durations).
2. `src/timer-bar.tsx` — the running-timer strip: shows the current entry's project/work item and elapsed time ticking from a `startedAt` prop (compute elapsed in the component from `Date.now()`, but **never** send it anywhere — it is display only), plus start and stop buttons. Props `{ running, startedAt, label, onStart, onStop, disabled }`. Accessible: the elapsed time is in an `aria-live="off"` region with an accessible label updated each minute, not each second.
3. `src/timesheet-summary.tsx` — period header (range, status badge, submitted/decided by and when), totals row (total, billable, non-billable minutes formatted as hours), and a grouped breakdown by project or by day depending on a `groupBy` prop.
4. `src/timesheet-actions.tsx` — submit / approve / reject / recall buttons driven by `{ status, isOwner, canApprove }`: draft shows Submit to the owner; submitted shows Recall to the owner and Approve/Reject to an approver who is not the owner; approved and rejected show no destructive action. Reject opens a small note field and calls `onReject(note)` — an empty note keeps the button disabled. **No green buttons** (status colour belongs on badges only).
5. Export each from `package.json` (`./time-entry-list`, `./timer-bar`, `./timesheet-summary`, `./timesheet-actions`) matching the existing export style exactly.
6. Tests, floor ≥ 26 `it()` across `*.test.tsx` beside each component: duration formatting including 0, 59, 60 and 1445 minutes; approved rows hide edit/delete; badge per status; timer elapsed renders from `startedAt` with fake timers and stops ticking when not running; start/stop call their handler once; totals add up and split billable; each action-button matrix case (owner vs approver vs neither, per status); reject disabled until a note is typed; empty states render the given title only.

## Verify
pnpm --filter @876/projects-ui typecheck
pnpm --filter @876/projects-ui lint
pnpm --filter @876/projects-ui test

## Report
`plans/2026-09-15-projects-phase-8/reports/command-code/8c-ui-components.md`: files, counted tests, decisions, unverified items.
