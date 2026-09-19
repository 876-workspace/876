# Report — Phase 2: platform filter standard on Issues and Board

Date: 2026-09-19. Branch: `feature/projects-mobile-and-agentic`. No commit made (orchestrator commits).

## Files changed and why

- `apps/projects/src/features/projects/workflow-state-options.ts` (new) — request-memoized `loadWorkflowStateOptions(orgId)` (`React.cache`, primitive `orgId` so `Object.is` hits) returning `{ states, error }`, plus two pure helpers so page logic is unit-testable: `buildIssueStatusOptions` (`All states` first, then one `{value: key, label: name}` per state) and `resolveIssueStatus` (unknown/missing status falls back to `all` with `queryStatus: undefined`).
- `apps/projects/src/features/projects/components/issue-filter-bar.tsx` (rewritten, `'use client'`) — replaces the seven-control `<form>` card + `Apply filters` with: a `Filters` trigger (`Filters · N` count badge) opening a `Popover` on `sm`+ and a bottom `Sheet` on phones (both rendered, CSS-toggled, no JS viewport branch); a search `Input` (`name="q"`, `w-full sm:max-w-xs`) that navigates on submit; removable chips (`Project: …`, `Priority: …`, `Assignee: …`, `Label: …`, `Order: …`, `Group: …`) with human labels plus a `Clear all` ghost link. Every navigation builds on live `URLSearchParams`, preserves unrelated params, and clears `after`/`before` cursors (mirrors `StatusFilterHeading`). Server passes plain data only; all handlers live in this client file. Same option lists as before, verbatim; no Status control; no Apply button. `GROUP_OPTIONS`/`PRIORITY_LABELS`/`ORDER_LABELS` exported for tests.
- `apps/projects/src/features/projects/components/issues-data.tsx` — `IssueFilterBar` removed; now fetches only issues + member labels (grouping) and renders the table. New props `{ query, groupBy }`.
- `apps/projects/src/features/projects/components/board-data.tsx` — `IssueFilterBar` removed; fetches issues + members, and workflow states via `loadWorkflowStateOptions` (shared single flight with the page) for the drag-board columns. `allowUngrouped` behaviour moved to the page's bar. New props `{ query, groupBy }`.
- `apps/projects/src/app/(app)/issues/(list)/page.tsx` — `ResourceToolbar` now takes `titleFilter={<StatusFilterHeading label="Issues" value options>}` with options from `buildIssueStatusOptions`; resolves `status=all`/unknown to no query filter; loads chrome data (states, projects, labels, members) and renders `IssueFilterBar` above `<Suspense>`, with an `AppError` banner preserving the old chrome-error surfacing. `parseIssueFilters` semantics untouched.
- `apps/projects/src/app/(app)/board/page.tsx` — identical treatment (`label="Board"`, `action="/board"`, `allowUngrouped={false}` kept, so no "No grouping").
- `apps/projects/src/app/(app)/board/page.test.tsx` (updated) — new mocks for the chrome fetches; existing toolbar test updated to the `All states` heading; 4 new cases added.

Untouched per constraints: `packages/projects-ui/src/issue-detail.tsx`, `apps/projects/src/app/(app)/issues/[issueRef]/`, `parseIssueFilters`/`IssueSearchParams`, no `eslint-disable`/`ts-ignore`/`as any`, no green buttons, no explanatory `<p>`.

## Tests — 22 new `it()` cases (floor was 12)

- `workflow-state-options.test.ts` — 6: exact options array; known status passes through; unknown → `all`/`undefined`; missing → `all`/`undefined`; loader called twice with one org → underlying client invoked exactly once with `'org_1'`; error passthrough.
- `issue-filter-bar.test.tsx` — 12: trigger count `Filters · 3`; no chips/`Clear all` when empty; all six chips with human labels; remove-link drops only its param; removal clears cursors; `Clear all` href; popover lists all six non-status filters; no Status control and no Apply button; `allowUngrouped={false}` omits "No grouping"; default offers it; select change pushes exact URL with cursors cleared; search submit pushes `q` with cursors cleared.
- `board/page.test.tsx` — 4 new: heading lists all workflow-state options; known status → heading `Done` + `query.status === 'done'`; `status=all` → heading `All states` + `query.status` undefined; unknown `bogus` → `All states` + undefined.

## Commands run (one at a time) with real output

- `pnpm --filter @876/projects-app typecheck` → clean (`tsc --noEmit`, no errors). Note: the brief's `@876/projects` filter does not exist; the app package is `@876/projects-app`.
- Targeted run of the 3 touched test files → `Test Files 3 passed (3)`, `Tests 23 passed (23)` (22 new + 1 pre-existing).
- Full `pnpm vitest run` in `apps/projects` → `Test Files 4 failed | 229 passed (233)`, `Tests 4 failed | 1587 passed (1591)`. The 4 failures are `portal-boundary`, `work-breakdown`, `budget-variance-data`, and `issues/[issueRef]` `issue-detail-data` — none of those files imports any module I changed (verified with `rg`, exit 1 / no matches), and the working tree contains concurrent uncommitted edits by other delegates in exactly those areas (`work-breakdown.tsx`, `mobile-list.tsx`, `project-detail*`, plus the earlier `issue-detail*` modifications). They are pre-existing relative to my change, not regressions from it.

## What I could not verify

- Visual check of the popover/sheet, chip row, and heading dropdown in a running browser (no dev server or screenshots in this environment); Base-UI popup behaviour in tests is covered by jsdom + the repo's pointer-capture stubs.
- Production-build behaviour (React #441): the design keeps all handlers inside `'use client'` files and passes only plain data/URLs across the boundary, but I did not run `next build`.
- The full-suite failures above: I confirmed they are independent of my modules, but I did not fix them — they belong to other delegates' in-flight work.

## Left undone

- Nothing in the brief is left undone. Possible follow-up (not requested): the pages `await` chrome data before rendering the toolbar; a further split (toolbar immediately + bar in its own `<Suspense>`) could render the title faster, but the required violation (chrome hidden behind the issue fetch) is fixed.
