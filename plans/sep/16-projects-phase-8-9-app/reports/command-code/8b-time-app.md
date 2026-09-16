# 8b — Wire time tracking into the Projects app

App wiring only: no `packages/**`, no `apps/projects-api/**`, no finance paths touched.

## Files

### `apps/projects` — browser client and service tier
- `src/lib/client/time.ts` (+ `time.test.ts`) — typed client over the routes below: `createEntry`, `updateEntry`, `deleteEntry`, `startTimer` (empty payload beyond the project), `stopTimer` (`{}`), `createTimesheet`, `submitTimesheet`, `recallTimesheet`, `approveTimesheet(id, note?)`, `rejectTimesheet(id, note)`. No method accepts a user id — the actor is resolved server-side — and `durationMinutes` is never a parameter.
- `src/lib/services/projects.ts` — added `timeEntries` and `timesheets` getters (passthrough, no logic). `projectBilling`/`budgets`/`rates` in that file belong to brief 9b.

### `apps/projects` — API routes (thin: `requireApiAccess`, zod `strictObject`, one client call, `apiJson`)
- `src/app/api/time-entries/route.ts` — POST create (`projects.edit`); `{projectId, startedAt, endedAt, billable?, note?}`; the service gets `userId`/`createdBy` from `auth.userId`; 201.
- `src/app/api/time-entries/[timeEntryId]/route.ts` — PATCH update and DELETE (`projects.edit`); both pass `auth.userId`; a body naming `userId` is a 422.
- `src/app/api/timer/start/route.ts` — POST `{projectId}` (`projects.edit`); `userId` from the session.
- `src/app/api/timer/stop/route.ts` — POST `z.strictObject({})`; the stop instant stays the service's to decide, so a payload is a 422.
- `src/app/api/timesheets/route.ts` — POST create `{periodStart, periodEnd, note?}` (`projects.edit`); `userId` from the session.
- `src/app/api/timesheets/[timesheetId]/{submit,recall}/route.ts` — POST empty payload; `auth.userId` is the actor.
- `src/app/api/timesheets/[timesheetId]/{approve,reject}/route.ts` — POST (`projects.edit`); `decidedBy` from `auth.userId`, never the body; reject requires a note.
- `src/app/api/_lib/time-error-status.ts` — one code → status map (404/403/409/422, unknown → 400) shared by the nine handlers.
- Tests beside each handler: 401/403 passthrough, 422 shape rejections (including payloads that try to name their own user), success envelope, and the error-code mapping (`time-entry-locked` → 409, `timesheet-self-approval` → 403, `project-not-found` → 404, …).

Read paths are deliberately absent: every list the three pages show is read on the server inside the Suspense boundary (`lib/services/projects.ts`), so a `GET /api/time-entries`-style route would have had no caller. The browser only calls the nine write routes above.

### `apps/projects` — pages
- `src/app/(app)/projects/[projectId]/time/page.tsx` (+ `page.test.tsx`) — sync shell, `px-4 pt-5 pb-8 sm:px-6 lg:px-8`, `PageBreadcrumb` → `/projects`, `ProjectTabs`, `ResourceToolbar` (no `description`) with `Add` / `primaryVariant="info"` → `?entry=new`, data behind `<Suspense>` with `DataTableSkeleton` using the entry table's real columns.
- `src/app/(app)/time/page.tsx` (+ `page.test.tsx`) — My time: same shell; the Add link carries the shown period; `TimePeriodNav` (previous/next/this week) in the chrome; an `Approvals` dropdown action only when the viewer holds `projects.edit`.
- `src/app/(app)/time/approvals/page.tsx` (+ `page.test.tsx`) — guarded with `requireAppAccess({ module: 'projects', permission: 'projects.edit' })`; `PageBreadcrumb` → `/time`; no Add button (nothing to add); timesheet skeleton fallback.
- No `loading.tsx` anywhere: no route in the app has one (`find apps/projects/src -name loading.tsx` → 0).

### `apps/projects` — features (`src/features/time/components/`)
- Pure modules: `time-period.ts` (`resolveTimePeriod`/`defaultTimePeriod`/`shiftTimePeriod`/`formatTimePeriod`, invalid or reversed bounds fall back to the current UTC week), `time-links.ts` (`projectTimeHref`, `timePeriodHref`, `withEntryParam`), `time-entry-input.ts` (`entryDateValue`/`entryTimeValue`/`entryTimestamps`/`todayEntryDate` — date and times read as UTC so an entry reads back exactly as typed), `time-entry-rows.ts` (`toTimeEntryRows`, `toApprovalStatus`, `TIME_ENTRY_SKELETON_COLUMNS`), `time-summary-rows.ts` (`toTimesheetSummaryEntries`, `toEntriesByTimesheet`, `timesheetForPeriod`, `newestTimesheetFirst`, `entriesInPeriod`, `TIMESHEET_SKELETON_COLUMNS`), `timer-state.ts` (`toTimerState`, `timerLabel`, `IDLE_TIMER_LABEL`).
- Client adapters: `timer-panel.tsx` (feeds `TimerBar`; optional project picker; flips from the mutation result, then `router.refresh()`), `time-entry-form.tsx` (the manual entry form: project when not fixed, date, start, end, billable, note; sends only the two instants), `time-entries-panel.tsx` (feeds `TimeEntryList`, opens the form from `?entry=new|<id>`, `AlertDialog` before delete), `timesheet-card.tsx` (feeds `TimesheetSummary` + `TimesheetActions`; used by both the owner and the approver, and adds the `Resubmit` the shared actions do not offer for a rejected sheet), `timesheet-create-button.tsx` (feeds the API's period-based create), `time-period-nav.tsx` (server component; weekly links).
- Server loaders: `project-time-data.tsx` (project entries + issue titles + project name + the viewer's current timer; `notFound()` on `projects/project-not-found`), `my-time-data.tsx` (the viewer's entries, timesheets, projects, issues, members, current timer; period slice for the list, per-sheet grouping for the summaries), `approvals-data.tsx` (submitted sheets + submitted entries grouped by `timesheetId` in one read each — no per-sheet fetch).
- Every loader renders `AppError` banners beside the region that failed and keeps the table, sections and toolbar mounted; mutations keep entered values and report the refusal in place (no error toasts).
- No function crosses a server → client boundary: rows, timer state, options and hrefs are plain serializable props (`pnpm check:rsc-boundaries` is green).

### `apps/projects` — navigation
- `src/components/shell/nav-config.ts` — `Time` → `/time` (`text-lime-500`), after My Work, `requires: { module: 'projects', permission: 'projects.view' }`.
- `src/components/shell/nav-icons.tsx` — added `time: Clock` (the nav test requires every key to resolve to an icon).
- `src/components/shell/nav-config.test.ts` — the exact-href-set expectation now includes `/time`; the binding assertions (permission + module read from the destination route source) cover the new entry unchanged.

## Test cases (`it()` count: 181, floor 30)

Routes (66, across 9 files): time-entries POST 8; time-entries `[timeEntryId]` 10 (PATCH + DELETE); timer start 7; timer stop 6; timesheets POST 7; submit 7; recall 7; approve 7; reject 7.
Pages (11): `/time` 5; `/time/approvals` 2; project time tab 4.
Features (95, across 15 files): `time-period` 9; `time-entry-input` 8; `time-entry-rows` 6; `time-summary-rows` 9; `timer-state` 3; `time-links` 5; `time-entry-form` 8; `timer-panel` 7; `time-entries-panel` 9; `timesheet-card` 8; `timesheet-create-button` 2; `time-period-nav` 2; `project-time-data` 7; `my-time-data` 7; `approvals-data` 5.
Client (`src/lib/client/time.test.ts`, 9): URL/method/body per method, no `userId` in any payload or the delete query, refusals pass through without HTTP metadata.

## Verification output

- `pnpm --filter @876/projects-app typecheck` — pass (`tsc --noEmit`, no output).
- `pnpm --filter @876/projects-app lint` — pass, `0 errors, 4 warnings` (all four pre-existing: `login/_components/embedded-auth.tsx`, `register/_components/registration-auth.tsx`, `components/shell/org-switcher.tsx`, `components/shell/user-menu.tsx`). Note: `Date.now()` in a page/loader is an `react-hooks/purity` error; the clock now goes through `nowUnixSeconds()` from `@876/core/timestamps`, matching Console/Billing.
- `pnpm --filter @876/projects-app test` — `124 files, 931 tests, all pass` (was 105 files / 816 tests before this brief).
- `node scripts/check-app-structure.mjs` — `app-structure: OK (console, billing, couriers, 876, enterprise, invoice, crm, projects, commerce)`.
- `pnpm check:rsc-boundaries` — `RSC boundaries OK (10 apps)`.

All five were run with `NODE_ENV=test` prefixed. This shell exports `NODE_ENV=production`, under which every React Testing Library render in the repo fails with `TypeError: React.act is not a function` (207 failures across 32 files, including untouched files such as `src/features/projects/components/gantt-data.test.tsx`) — pre-existing and environmental, not caused by this change.

## Unverified

- Nothing was exercised against a running `apps/projects-api`: the loaders and panels are verified with mocked service clients, and the browser client with a stubbed `fetch`. Real payloads, real IDs and the period/approval lifecycle end to end are unverified (no seed or staging environment used).
- No production build (`next build`) or `next dev` run: the pages' real streaming behaviour, the Suspense fallback on a client navigation with only `searchParams` changing, and the `?entry=` re-render were not observed in a browser.
- Volume behaviour is unverified. My time reads all of the signed-in user's entries in one call (the API list accepts `from`/`to` but has no pagination), which is what lets every listed sheet show truthful entries without a per-sheet fetch; the approvals page reads all `submitted` entries org-wide in one call and groups them by `timesheetId`. Both are single reads, not N+1s, but neither was tested at scale.
- `TimeEntryList` renders no running-entry row state of its own: a running entry shows `0m` (the service has no duration yet) until the timer stops and the page refreshes.
- The period nav steps by the span of the shown period; only the default (a UTC week) and the bounded `?from&to` cases are covered by tests.

## Gaps in `packages/projects-ui` (reported, not edited)

1. `src/time-tracking.tsx` exports `ApprovalStatusBadge`, `formatDuration` and `formatDate`, but the package has no `./time-tracking` subpath export, so none of them are reachable from the app. I did not copy the badge; the only local formatting is `formatTimePeriod` in `time-period.ts` (same UTC/en-US rules as `formatDate`) for the period nav label.
2. `TimesheetActions` offers Submit only for `status === 'draft'`, so a `rejected` timesheet would have been unresubmittable from the UI even though `projects-api` accepts a submit from `draft` or `rejected` (`time.service.ts` `submitTimesheet`) — with no recall either, a rejection would have been a dead end. `timesheet-card.tsx` renders its own `Resubmit` for that one state (covered by a test) rather than the component being edited.
3. `TimeEntryList` takes `onEdit`/`onDelete` callbacks and has no link mode, so row editing is URL-driven (`?entry=<id>`, read by the loader) and the Edit button is a `router.push` rather than a link — not prefetchable and not openable in a new tab.
4. `TimerBar` carries no project of its own, so My time's project picker is a control I render beside it; the bar's `label` is the only place the running project is named.

## Notes for the coordinator

- `apps/projects/src/lib/client/index.ts` was left alone: brief 9b is editing it concurrently (`finance`), and my imports follow the direct-import pattern already used for `baselines`, `reminders` and `events`. Add `timeClient` to that barrel when the two branches meet.
- `apps/projects/src/features/time/**`, `src/app/api/{time-entries,timer,timesheets}/**`, `src/app/api/_lib/time-error-status.ts`, `src/app/(app)/time/**` and `src/app/(app)/projects/[projectId]/time/**` are the paths this brief created; nothing under the do-not-touch list was modified.
