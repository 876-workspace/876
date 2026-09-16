# Brief 8c — `@876/projects-ui`: time tracking presentation components

- Branch: `feature/projects-phase-8-time`
- Scope: `packages/projects-ui/src/**` and `packages/projects-ui/package.json` only. Nothing under `apps/` was opened or edited.
- Phase 8 decision 7 holds throughout: **no rates, no currency, no cost, no money of any kind** in any of these files. Billable is a boolean flag; every figure is minutes.

## Files

### New components (each exported as its own subpath)

- `src/time-entry-list.tsx` — `TimeEntryList`, `TimeEntryListRow`, `TimeEntryListProps`. Table of entries: date · project · work item (link) · note · duration · billable marker · approval badge, plus per-row Edit/Delete.
- `src/timer-bar.tsx` — `TimerBar`, `TimerBarProps`. Running-timer strip: label, ticking elapsed clock, Start/Stop.
- `src/timesheet-summary.tsx` — `TimesheetSummary`, `TimesheetSummaryEntry`, `TimesheetSummaryGroup`, `TimesheetSummaryProps`. Period header, totals row, grouped breakdown.
- `src/timesheet-actions.tsx` — `TimesheetActions`, `TimesheetActionsProps`. Submit / Recall / Approve / Reject driven by `{ status, isOwner, canApprove }`.

### New shared module (internal — **not** exported from `package.json`)

- `src/time-tracking.tsx` — `TimesheetApprovalStatus`, `ApprovalStatusBadge`, `formatDuration(minutes)`, `formatDate(seconds)`.

`formatDuration` and `formatDate` have two and three real call sites respectively, and the approval badge has two; the repo's reuse rule (`.agents/rules/ai-code-quality.md`) forbids the second and third copies, so they live once here. The public surface stays exactly the four subpaths the brief asked for.

### Edited

- `package.json` — four `./time-…` subpath exports, `types` + `default` pair, appended in the order the existing entries were added (diff is +16 lines, nothing else).

### `packages/projects-ui/src` component files were not touched

`issue-comments.tsx` and `project-detail.tsx` have two pre-existing lint errors (see _Verification_); they are unrelated to this brief and were left alone.

## Props the app must map its API resources into

```ts
TimeEntryListRow = {
  id: string; startedAt: number; durationMinutes: number; billable: boolean
  note: string | null; approvalStatus: TimesheetApprovalStatus
  projectName: string; issue: { id: string; title: string } | null
}
TimeEntryListProps = { entries; issuesBaseHref; canEdit; onEdit; onDelete; emptyTitle }
TimerBarProps = { running; startedAt: number | null; label; onStart; onStop; disabled }
TimesheetSummaryProps = {
  periodStart; periodEnd; status; submittedAt: number | null; submittedBy: string | null
  decidedAt: number | null; decidedBy: string | null; entries; groupBy: 'project' | 'day'
}
TimesheetActionsProps = { status; isOwner; canApprove; onSubmit; onApprove; onReject(note); onRecall }
```

## Counted tests

New `it()` in `@876/projects-ui`: **71** (floor 26). Full package suite: **17 files, 234 tests passed** (163 pre-existing + 71 new).

| File                             | `it()` |
| -------------------------------- | ------ |
| `src/time-entry-list.test.tsx`   | 21     |
| `src/timer-bar.test.tsx`         | 14     |
| `src/timesheet-summary.test.tsx` | 15     |
| `src/timesheet-actions.test.tsx` | 21     |

What they prove:

- **time-entry-list (21)** — one row per entry · the entry's date · work item links `${issuesBaseHref}/${encodeURIComponent(id)}` · em dash when there is no work item · durations `0m` / `59m` / `1h` / `24h 5m` and `90 → 1h 30m` (never `1.5h`) · billable vs non-billable marker · a badge per status (draft / submitted / approved / rejected) · **an approved entry renders no edit or delete** while a submitted one still does · `canEdit={false}` renders none · `onEdit` / `onDelete` receive the exact row that was acted on (not the first) · the empty state renders the given title and nothing else (no table, no buttons).
- **timer-bar (14)** — elapsed counted back from `startedAt` with fake timers · advances once a second (65 s → 66 s → 125 s) · rolls into `1:01:01` past an hour · **stops ticking when not running** (stays `00:00` while timers advance) · the accessible label does not move between minutes but does move each new minute · `Elapsed less than a minute` below a minute · `aria-live="off"` and the label is the region's accessible name · the label prop renders while running · Start and Stop each call their handler exactly once (and not the other) · each button is disabled in the state where it does not apply · `disabled` disables both.
- **timesheet-summary (15)** — period range · status badge · who submitted and when · who decided and when · no decision line while undecided · totals add up (`1h 45m`) · the total splits into `2h` billable + `1h 15m` non-billable (`3h 15m`) · by-project and by-day groupings, per-group totals, two same-day entries collapsing into one group, day groups ordered oldest first, column heading follows `groupBy` · an empty period shows `0m` totals and the empty line.
- **timesheet-actions (21)** — the full matrix: **12 cases** of draft / submitted / approved / rejected × owner / approver / neither, plus owner-who-can-approve, plus one call-count test per action, the note field opening instead of rejecting, Reject staying disabled until a non-blank note is typed, whitespace-only counting as empty, the note reaching `onReject` trimmed, and Cancel closing the field without rejecting.

## Decisions

1. **Duration formatting is UTC/locale-pinned and shared.** `formatDuration` renders `0m`, `59m`, `1h`, `24h 5m` — whole hours and minutes, never a decimal. `formatDate` uses `timeZone: 'UTC'` with a fixed `en-US` locale, following `project-gantt.tsx`'s "read in UTC so the server and the browser agree" reasoning rather than the `toLocaleDateString(undefined, …)` the other seven files in this package use: a server render and the browser's hydration of it must produce the same string for a date that a time entry sits on. The trade-off is that an entry logged late in the evening west of UTC is grouped and labelled by its UTC day.
2. **The timer clock is an external store, not state in an effect.** The obvious `useState` + `useEffect(() => { setElapsed(…) }, [running, startedAt])` is rejected by the React Compiler lint rule (`react-hooks/set-state-in-effect`) and the `Date.now()`-during-render alternative by `react-hooks/purity` (both are live errors in this package today). `TimerBar` therefore uses `useSyncExternalStore(subscribe, clockSecond, serverSecond)` with module-level readers — the same pattern `packages/ui`'s `theme-mode-toggler` and `use-mobile` already use. An idle strip subscribes to a no-op so it never opens an interval. The visible clock moves each second; the accessible name moves each minute.
3. **Elapsed time is display-only and never leaves the component.** It is derived from `Date.now()` and the `startedAt` prop and is not lifted, stored, or handed to any callback; the server remains the sole author of `durationMinutes` (plan decision 3).
4. **Approved is the only lock.** A row's controls are hidden when `approvalStatus === 'approved'`, `canEdit` is false, or both. `submitted` stays editable because recall is a real path (plan decision 5). The entry carries the approval status itself, so no extra `locked` prop is needed.
5. **Project is the tier-1 cell** (§12 needs exactly one per row and a project is always present; a work item can be null for project-level time). The work item is a clickable reference — tier 2 by that rule — and the date and project-adjacent metadata are muted tier 3. Duration and every total use `tabular-nums`; durations are right-aligned.
6. **Billable is text, not a badge or a colour.** Status is the badge (`success` approved / `info` submitted / `secondary` draft / `destructive` rejected); "billable" is a marker rendered in tier-2 text with the negative case muted, carrying `data-billable`. No green anywhere, and no `success` button variant — Submit and Approve are the one blue (`info`), Recall and the Reject opener are outline, the reject confirm is destructive, Cancel is ghost.
7. **Reject is a two-step inline form.** Clicking Reject replaces the action row with a note `Input` (labelled "Rejection note"), Cancel, and the destructive Reject, which stays disabled until a non-blank note is typed and passes the **trimmed** note to `onReject`. The form is gated on `rejecting && canDecide`, so a status change while it is open cannot leave it stranded.
8. **Grouping is done in the component, from entries.** Totals and non-billable are derived from the entries rather than accepted as props, so they cannot drift from the rows; day buckets are UTC days (`floor(startedAt / 86400) * 86400`), sorted oldest first, while project groups keep the order the entries arrive in. Group keys are exposed as `data-group` for the app and the tests.
9. **Home for approval vocabulary.** `TimesheetApprovalStatus` and `ApprovalStatusBadge` are declared locally, per the brief's "declare the prop type locally rather than importing it" instruction — the shape the API agent ships may differ, and the app maps into these props.

## Verification

| Command                                                             | Result                                                        |
| ------------------------------------------------------------------- | ------------------------------------------------------------- |
| `pnpm --filter @876/projects-ui typecheck`                          | pass, no output                                               |
| `NODE_ENV=test pnpm --filter @876/projects-ui test`                 | **17 files, 234 tests passed**                                |
| `NODE_ENV=test pnpm exec vitest run <the four new test files>`      | **4 files, 71 tests passed**                                  |
| `pnpm --filter @876/projects-ui lint`                               | **cannot run — the package has no `lint` script** (see below) |
| `pnpm exec eslint` on the nine new files                            | exit 0, no output                                             |
| `pnpm exec prettier --check` on the nine new files + `package.json` | all formatted                                                 |

**`NODE_ENV=production` in this shell.** Every React test in the repo fails here with `React.act is not a function` (react-dom resolves to its production build, which has no `act`) — 234/234 in this package before any change of mine. All test runs above were made with `NODE_ENV=test`. This is environmental, not a code defect; the same note appears in the phase-5 and phase-7 reports.

**The `lint` script does not exist for this package.** `pnpm --filter @876/projects-ui lint` fails with `None of the selected packages has a "lint" script` — before this brief as well as after. I drafted `"lint": "eslint ."` (the sibling convention in 11 other packages) and removed it again, because running eslint over the package produces **two pre-existing errors in files this brief did not touch**:

- `src/issue-comments.tsx:68` — `react-hooks/set-state-in-effect` (`setItems([...comments])` inside an effect keyed on `comments`).
- `src/project-detail.tsx:56` — `react-hooks/purity` (`const now = Math.floor(Date.now() / 1000)` in the render body).

Both are behaviour-touching refactors of components unrelated to time tracking, so fixing them was out of scope; shipping the script without the fix would have turned repo-wide `pnpm lint` red. **Follow-up for the orchestrator:** either add the script and fix those two, or leave the package unlinted. My nine files lint clean either way.

No commit, no branch, no Prisma, no migration, no run logs. No `eslint-disable`, `as any`, or `@ts-ignore`. No data fetching, session, `fetch`, or router import in any of the new files.

## Unverified items

- **No live render against the real API resources.** These components were verified against locally declared row/entry types and fixtures, not against whatever `apps/projects-api` and `packages/projects` ship in 8a. If the client resources carry a work item's `identifier` instead of its `id`, or a resolved project name is not available, the app-side mapping (not these components) has to bridge it.
- **The work item link assumes the same addressing as `project-gantt`.** `TimeEntryList` builds `${issuesBaseHref}/${encodeURIComponent(issue.id)}`, matching `ProjectGantt`; `issue-list.tsx` in the same package links by `identifier` instead. Which one the app passes as `issue.id` is the app's call and was not exercised end to end.
- **No browser or visual pass at 400 px.** Narrow-viewport behaviour is the `overflow-x-auto` of the shared `Table` primitive plus the card wrapper; the note column is capped at `18rem` with a `title` fallback, but truncation and column alignment were not measured in a browser.
- **No hydration test.** The UTC/fixed-locale date choice and the timer's `serverSecond = 0` server snapshot are reasoned about, not proven — nothing here renders through `renderToString` + `hydrateRoot`.
- **The reject note is not focus-managed.** Opening the field does not move focus to it (no `autoFocus`), so a keyboard user must Tab.
- **`TimesheetSummary` was not asserted against a real timesheet.** Its `submittedBy` / `decidedBy` props take display strings resolved by the caller; who resolves the user id to a name is the app's concern and is untested here.
