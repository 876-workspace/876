# Report — Phase 3b: phone treatment for the remaining Projects lists

Date: 2026-09-19. Branch: `feature/projects-mobile-and-agentic`. No commit made (the orchestrator commits).

## Files changed and why

- `packages/projects-ui/src/phase-list.tsx` — the list now renders `MobileList` / `MobileListCell` rows before the desktop card: avatar = `phase.key` first two chars, title = phase name, subtitle = project name plus the existing `statusBadge(phase.status)`, meta = `formatDate(phase.targetDate)` when set (omitted when null), href = the same `${phasesHref}/${encodeURIComponent(phase.id)}` the table uses. The empty branch renders `MobileListEmpty` plus the original empty card, now `hidden … sm:block`. The desktop card is `876-card hidden overflow-hidden sm:block`; the `<table>`, its columns, order and classes are untouched (only indentation moved).
- `packages/projects-ui/src/time-entry-list.tsx` — phone rows: avatar = issue id (else project name) first two, title = issue title → note → project name, subtitle = `<project name> · <start date>` (the row type carries no user label), meta = `formatDuration(entry.durationMinutes)`, href = the work-item link when the entry has one, otherwise an unlinked row. Empty branch mirrors the phase list; the desktop card is `876-card hidden overflow-hidden sm:block` with the `Table` markup unchanged.
- `packages/projects-ui/src/timesheet-summary.tsx` — the grouped breakdown gains phone rows: avatar and title = the group label (project name, or the day when `groupBy === 'day'`), subtitle = the period (`formatDate(periodStart) – formatDate(periodEnd)`, same pair as the header), meta = `formatDuration(group.totalMinutes)`. Inserted between the totals `dl` and the desktop table, which is now wrapped in `hidden sm:block`; the header and totals remain visible at every width. Empty period renders `MobileListEmpty` with the existing message.
- `packages/projects-ui/src/automation/notification-list.tsx` — phone rows: avatar = `notification.subjectType` first two, title = notification title, subtitle = body (the cell truncates it), meta = `formatDay(notification.createdAt)`, href built by the existing `subjectHref` helper. The existing card list is now `hidden flex-col gap-2 sm:flex`; its `<li>` markup is unchanged. The empty message is untouched and serves both widths.
- `apps/projects/src/features/projects/components/phase-filter-bar.tsx` — `'use client'` added (one-line directive, the parent `PhaseListData` passes only plain data); both `NativeSelect`s call `submitOnChange` → `event.currentTarget.form?.requestSubmit()`, and the `Apply` button and its `Button` import are gone. `Clear` stays.

All five files reuse their existing prop names, formatters, badge helpers and href construction. No function props cross an RSC boundary; `packages/projects-ui` gained no fetching, session or client-only imports.

## Tests — 25 new `it()` cases (floor was 8)

- `packages/projects-ui/src/phase-list.test.tsx` (new file) — **8**: a phone row per phase with the name as title; project · status subtitle; target date as meta; no meta when the target date is null; the phone href; the empty state in both branches; the desktop table still renders every row (row count, both keys, owner label, Unassigned, Completed badge, 2 project names, the target date); the desktop phase link.
- `packages/projects-ui/src/time-entry-list.test.tsx` — **5 new**: a phone row per entry with `formatDuration` as meta (two different durations); project · start-date subtitle; phone href to the work item; note as title with no link when there is no work item; project name as title when there is neither work item nor note. Also adjusted the existing “empty title and nothing else” case, which asserted `container.textContent` exactly and now has to account for the phone empty row.
- `packages/projects-ui/src/timesheet-summary.test.tsx` — **3 new**: a phone row per breakdown group with the group total as meta; the period as every row's subtitle; the empty period in the phone list. Adjusted two existing cases whose text now appears twice (`renders the period the timesheet covers` now asserts the `[data-period-range]` node exactly; the empty-period case asserts both messages).
- `packages/projects-ui/src/automation/notification-list.test.tsx` — **2 new**: the phone href through `hrefFor`; the created date as the row meta. Adjusted **6** existing cases that now match two representations (title, no-base-href text, body present, body absent, created date, one row per notification) by scoping them to the phone list or to `[data-slot="notification-list"]`.
- `packages/projects-ui/src/mobile-list.test.tsx` — **2 new**: `avatarTone('ALP')` returns the identical class (`bg-indigo-500`) twice, and a seed resolves inside the avatar palette.
- `apps/projects/src/features/projects/components/phase-filter-bar.test.tsx` (new file, app) — **5**: current filters shown with no Apply button; the project select submits its own form; the status select submits its own form; the form posts to `/phases` with the project options; `Clear` only while a filter is applied.

That is 25 new `it()` cases in total: 20 beside the four `projects-ui` components and 5 for the filter bar.

## Verification — one command at a time, real output

```text
$ pnpm --filter @876/projects-ui typecheck
$ tsc --noEmit
```

```text
$ NODE_ENV=test pnpm --filter @876/projects-ui test
 Test Files  71 passed (71)
      Tests  798 passed (798)
```

```text
$ pnpm --filter @876/projects typecheck
$ tsc --noEmit
```

```text
$ pnpm --filter @876/projects-app typecheck
$ tsc --noEmit
```

```text
$ NODE_ENV=test pnpm --filter @876/projects-app exec vitest run src/features/projects/components/phase-filter-bar.test.tsx
Not implemented: HTMLFormElement's requestSubmit() method   (jsdom notice, twice)
 Test Files  1 passed (1)
      Tests  5 passed (5)
```

`git diff --check` is clean, and `eslint` on the ten changed files reports no findings (only the repo-wide “Pages directory cannot be found” notice).

Two environment notes for whoever runs this next:

- The harness shell exports `NODE_ENV=production`, which makes React resolve its production build and every Testing Library render fail with `TypeError: React.act is not a function` — pre-existing tests fail identically without the change. The suite must run as `NODE_ENV=test pnpm --filter @876/projects-ui test`; that is the output above.
- The brief's third command, `pnpm --filter @876/projects typecheck`, resolves to the **contracts** package, not the app. I ran it anyway (clean) and added `@876/projects-app typecheck`, which is what actually compiles `phase-filter-bar.tsx`.
- One intermediate full-suite run failed 2 cases in `src/issue-agent-actions.test.tsx`, an untracked file another delegate was writing at that moment; the same suite passed clean once they finished. Nothing in this change touches it.

## What I could not verify

- No browser or device pass: I did not run the app or look at a 390px viewport, so the visual result of the phone rows, the `sm` breakpoints and the timesheet wrapper is unverified. The desktop guarantee is markup-level only — `git diff -w` shows no change to any table's columns, order or classes.
- The desktop/phone branch split cannot be exercised in jsdom (no CSS breakpoints), so both branches exist in the DOM during tests; assertions are scoped accordingly.
- `requestSubmit()` in jsdom does not navigate, so the filter bar test proves the handler fires on the form but not that navigation lands on the filtered `/phases` URL in a browser.

## Left undone, and deviations from the brief

- **The Phases filter form was already a wrapping row.** The brief describes it as stacked; the file on disk already had `flex flex-wrap items-end gap-3`, so I left the layout alone and made only the change-submit change. Converting to `'use client'` was a single directive, not a restructure, so I proceeded rather than stopping.
- **Timesheet phone list has a `px-4` wrapper.** `MobileList` is `-mx-4 sm:hidden`; the summary is a card, so without a padding wrapper the rows would sit flush against the card border. The wrapper matches how `issue-detail.tsx` pairs `px-4` with a nested `MobileList`.
- **Notification “relative time” is `formatDay`.** `projects-ui` has no relative-time helper; `formatDay` is the formatter this file already used for `createdAt`.
- **Phone rows drop what the cell has no slot for**, deliberately, following the brief's column mapping: the notification unread emphasis and `Unread` badge, the time entry's approval badge, billable marker and Edit/Delete actions, and the phase Owner value (which is the column that was being cut off on device) are desktop-only.
- **Prettier reformatted two pre-existing expressions** in `phase-list.tsx` (parenthesised the `??` inside the owner ternary, wrapped the `Map` construction) and one `Link` in `phase-filter-bar.tsx`. Semantics and markup are identical; the working tree needed the current Prettier 3.9.6 pass.
- **`packages/projects-ui/src/mobile-list.test.tsx` is not in my diff**: the orchestrator committed it, including my two `avatarTone` cases, in `5a1177efe` while this task was running.
