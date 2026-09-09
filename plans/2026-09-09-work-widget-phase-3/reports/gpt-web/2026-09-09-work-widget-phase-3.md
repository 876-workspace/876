# 876 Work Widget — Phase 3 GPT Web Closeout

Date: 2026-09-09
Branch: `feat/work-widget-phase-3`
Phase 2 base on `main`: `6cb754935e76455cd48db3f17f82f21770c8448c` (`Merge pull request #521 ... feat(work): add Invoice widget vertical slice`)
Closeout source head reviewed before this report: `26f5ae37d05556282b4de1796f2e6e179e8606cd`

## Executive summary

Phase 3 source work is complete for the compact Invoice-hosted 876 Work widget: Today, Tasks, Calendar, and unified Create are implemented over canonical Work data and session-tier authorization. The Phase 3 closeout directive was followed without recreating or overwriting the local reviewer fixes for contextual event fixtures, stale task pagination, truthful error actions, or calendar-range reuse.

The final GPT Web closeout added three browser/component regression tests only. No production behavior was changed after the local review handoff. The final static pass found no concrete permission leak, browser-exposed Work credential/topology, non-canonical transformed host payload, swallowed primary failure, or renewed monolithic view orchestration that requires a source fix.

The branch is not ready to call fully verified solely from this run because the three newly added browser tests have not been executed here. The local orchestrator should rerun the current Widgets typecheck/browser suite and reconcile the branch with current `main`, because the GitHub comparison still reports the branch one commit behind `main`.

No pull request was opened or merged.

## Closeout directive and preserved local work

The closeout directive is recorded at `plans/2026-09-09-work-widget-phase-3/directive.md`.

The local-review changes explicitly preserved during this closeout include:

- `f8da50ea828fa8c29d5de1e31d82e53cbc1ed6b8` — calendar range reuse behavior that avoids re-fetching an already-loaded `[from,to)` range after date selection.
- `7c6814ca0a9ba0e13cd356933401ff54b8c3a357` — truthful task error actions.
- `aeb85f273b5b1954bbba9d7dd23d322a918a7828` — truthful calendar error actions.
- `ddaa5d4cc3c9cd064c42ae7c312d56092d4362b3` — local stabilization: contextual `WorkMyWork` event fixtures plus generation-based protection against stale task pagination after a list switch.
- `3c223ffb6a3aebba6ade97afb27227e5071f7012` — browser assertion disambiguation for the Work create control.
- `fb9646f79f757e76fe3ca76c547b3711236b01c0` — checked-in Phase 3 closeout directive.

GPT Web closeout commits added after that local handoff:

- `f8378958243403807916c344fffd9e54bc520264` — Today stale-data/refresh-error/retry regression.
- `8ea51a48b0bcf37f76f622f973c906fb0b51916a` — task-list pagination race regression.
- `26f5ae37d05556282b4de1796f2e6e179e8606cd` — calendar month/week range-reuse and explicit retry regression.

## Phase 3A — Today / agenda

The Today surface remains a controlled Work presentation backed by the Invoice-owned `/api/my-work` path. It preserves the Phase 2 exclusive local-day range semantics and renders tasks, reminders, events, and overdue tasks through the shared Work agenda components.

The closeout regression `packages/widgets/src/react/work-widget-today.browser.test.tsx` now proves the resilience requirement directly:

1. initial Today data loads successfully;
2. a task completion succeeds;
3. the follow-up Today refresh fails;
4. previously successful Today data remains mounted while the error banner is shown;
5. the banner retry performs another My Work request;
6. successful retry replaces the stale data and clears the error.

This test exercises the real `browserWork` same-origin transport by stubbing `fetch`, rather than replacing the orchestration contract with a test-only client.

## Phase 3B — Tasks / todos

The Tasks surface keeps canonical WorkTask persistence while using todo-style UX where useful. It supports task-list navigation, assigned-task reads, item-ID cursor pagination, create/edit/complete/cancel mutations, capability-aware controls, and non-fatal task-list enrichment.

The local reviewer already hardened pagination by capturing the active generation when load-more begins. `loadTasks()` increments that generation and clears pending load-more state when the user switches lists. The closeout regression `packages/widgets/src/react/work-widget-tasks.browser.test.tsx` now proves the race behavior:

1. List A loads with `has_more=true`;
2. load-more starts and remains unresolved;
3. the user switches to List B;
4. List B loads successfully;
5. the old List A page resolves afterward;
6. the stale page is discarded and is never appended to List B.

Task deletion remains deliberately unexposed in Phase 3. The capability vocabulary can represent destructive permissions, but there is no delete route/control in this phase.

## Phase 3C — Calendar

The Calendar surface remains compact-first for the 520px widget width. Day, stacked Week, and compact Month + selected-day agenda use local-calendar arithmetic, exclusive range ends, all-day `[startDate,endDate)` behavior, and event-only calendar filtering. Tasks and reminders remain visible regardless of selected calendar.

The closeout regression `packages/widgets/src/react/work-widget-calendar.browser.test.tsx` covers orchestration behavior around the local reviewer range-reuse fix:

1. the initial Month range loads;
2. selecting another date inside the same Month range does not fetch again;
3. switching to Week loads the Week range;
4. selecting another date inside that already-loaded Week range does not fetch again;
5. navigating to the next range triggers a request that is forced to fail;
6. the explicit `Try again` action retries that failed range and clears the error after success.

A separate large/pop-out mini-calendar/sidebar layout remains intentionally deferred. Phase 3 does not invent a second large Work surface.

## Phase 3D — Unified create

Unified Create remains capability-aware and transport-free inside `@876/work-ui`. The browser/network orchestration lives in the Widgets host layer, and Invoice owns the same-origin mutation routes.

Current create paths are:

- Task -> `/api/tasks`
- Event -> `/api/events`
- Reminder -> `/api/reminders`

Invoice injects acting-user identity server-side. The transformed payload is then parsed with the canonical Work schema before the Work session client is called:

- task create -> `createWorkTaskInputSchema`
- task update/complete/cancel -> `updateWorkTaskInputSchema`
- event create -> `createWorkEventResourceInputSchema`
- reminder create -> `createWorkReminderInputSchema`

The browser never sends `createdBy`, `completedBy`, or reminder `userId`, and it never receives a Work app/internal credential.

## Authorization and capability review

The final static permission pass found no Phase 3 authorization bypass.

- Invoice derives `WorkWidgetCapabilities` from the already-resolved effective Invoice permission set.
- Capability booleans only control whether UI callbacks/controls are present; they are not treated as authorization.
- Every host route calls `requireWorkWidgetPermission(...)` before constructing the Work session client.
- Feature rollout remains an additional gate through the enabled Work widget feature.
- The Work API remains the final session-tier authorization/data boundary.
- Staff can receive read-only Work UI without mutation controls.
- Admin can receive non-destructive create/edit controls according to effective permissions.
- Destructive permissions are modeled but are not exposed as Phase 3 task/event/reminder delete controls.

## Contract and topology review

The final static contract pass found no browser-exposed Work service topology or credential.

`@876/work/browser` uses only Invoice vocabulary and same-origin paths:

- `/api/my-work`
- `/api/tasks`
- `/api/task-lists`
- `/api/calendars`
- `/api/events`
- `/api/reminders`

There is no browser `/v1` Work service path, `WORK_API_URL`, app key, or `WORK_INTERNAL_KEY` dependency in this adapter.

`@876/work-ui` remains controlled/presentation-only. It imports Work data/contracts but performs no fetches and constructs no service client.

## Loading and failure isolation review

Primary and enrichment data remain separated:

- Today keeps previously successful My Work data mounted during refresh errors.
- Tasks keep previously successful task data mounted on later request failures.
- Task-list lookup is secondary enrichment and can fail without destroying task data.
- Calendar list lookup is secondary enrichment and can fail without destroying successful My Work calendar data.
- Rapid task/create/load-more mutation paths use ref-backed request guards that take effect before rerender.
- Stale task pages are rejected after a list-generation change.
- Calendar date selection reuses the existing matching range instead of duplicating requests.

Expected browser-visible failures continue to be `{ data, error }` values and are rendered inside the Work widget rather than taking down the Invoice shell.

## Maintainability review

The retained prework originally concentrated Today, Tasks, Calendar, loading pipelines, mutations, and navigation in one large `WorkWidgetPanel`. That monolith has been split into focused orchestrators:

- `work-widget-today.tsx`
- `work-widget-tasks.tsx`
- `work-widget-calendar.tsx`
- `work-widget-create.tsx`
- shared feedback/time helpers

The top-level `work-widget.tsx` now mainly owns view navigation and delegates orchestration.

No closeout change grows those orchestrators further.

One non-blocking cleanup remains visible in `@876/work-ui/create`: Task create currently re-reads optional `listId` and uses a non-null assertion in the conditional object spread. It is presentation-only, does not cross an authority boundary, and passed the prior local typecheck. It was intentionally not changed in this closeout because doing so through the GitHub contents connector would require a whole-file rewrite of the already locally-reviewed ~500-line controlled form for no behavior or security benefit.

## Test delta

The local directive recorded the pre-closeout literal test delta against Phase 2 `main` as:

- 67 added
- 3 removed
- net +64

This closeout adds exactly three new literal `it()` cases, one in each new browser regression file. The current source delta is therefore:

- 70 added
- 3 removed
- net +67

## Verification evidence

The local tracker recorded the following passing evidence before the three GPT Web closeout browser tests were added:

- `@876/work` typecheck + 220 tests
- `@876/work-ui` typecheck
- `@876/invoice-app` typecheck + 455 tests
- `@876/invoice-app` build
- `@876/widgets` typecheck + 149 unit tests
- `@876/widgets` browser tests: 3 tests
- focused format checks
- `pnpm check:transpile`
- `pnpm check:service-bundle`

Those results are preserved as local-review evidence. They are not re-claimed as execution by GPT Web.

Because the closeout added three new browser test files after that evidence, the current branch still needs these focused reruns:

```bash
pnpm --filter @876/widgets typecheck
pnpm --filter @876/widgets test:browser
```

The normal Widgets unit suite did not gain or lose a unit test or production-source change during this closeout; the prior local 149-test result therefore still describes the production source reviewed here. A local orchestrator may rerun it as part of the normal final gate.

`@876/core` was not modified by the Phase 3 diff. The tracker leaves the optional Core check open rather than claiming an unobserved run.

## Branch state and remaining risks

At the final static comparison performed during this closeout, GitHub reported `feat/work-widget-phase-3` as:

- ahead of current `main` by 95 commits;
- behind current `main` by 1 commit;
- diverged from `main`.

The local orchestrator should reconcile that one-commit difference before merge and rerun the focused current Widgets checks after reconciliation. GPT Web did not force-update, rebase, merge, or rewrite the branch.

Remaining intentional/deferred items:

- no task delete UX in Phase 3;
- no large/pop-out calendar layout in Phase 3;
- no Phase 4 host-context behavior;
- no Phase 5 advanced recurrence/assignment/participant management;
- no Phase 6 external calendar synchronization;
- the three newly added closeout browser tests are source-complete but unexecuted by GPT Web.

## Final source assessment

Phase 3 is source-complete for the intended compact Work product surface. The final static review found no source blocker requiring a production-code fix after the local reviewer handoff. The remaining gate is local execution/reconciliation: rerun the current Widgets typecheck/browser suite, reconcile the branch with the one newer `main` commit, and then apply the repository's normal merge/CI review process.

No PR was opened or merged by GPT Web.
