# Brief 6b — Projects app: calendar, events, reminders, My Work

- **Run ID:** `2026-09-15-projects-phase-6`
- **Branch:** `feature/projects-phase-6-calendar` (no commits, no branch, no prisma, no server actions)
- **Status:** `DONE`

## What was built

The calendar is a read of what already has dates plus the new owned event record; reminders are
listed as intent with the time they are due and never claim delivery; no external calendar sync
surface exists.

## Files

### New — browser clients

| File | Role |
| ---- | ---- |
| `apps/projects/src/lib/client/events.ts` | create / update / delete / addAttendee / respondAttendee / removeAttendee |
| `apps/projects/src/lib/client/reminders.ts` | create / update / delete (owner never in the body) |

### New — route handlers (`apps/projects/src/app/api/`)

| File | Methods |
| ---- | ------- |
| `_lib/calendar-schemas.ts` | shared strict recurrence schema for both write paths |
| `events/route.ts` | `POST` (201) |
| `events/[eventId]/route.ts` | `PATCH`, `DELETE` |
| `events/[eventId]/attendees/route.ts` | `POST` (201, 409 on duplicate) |
| `events/[eventId]/attendees/[userId]/route.ts` | `PATCH` response, `DELETE` |
| `reminders/route.ts` | `POST` (201) |
| `reminders/[reminderId]/route.ts` | `PATCH`, `DELETE` |

Every handler takes membership + `projects.edit` from `requireApiAccess({ module: 'projects', permission: 'projects.edit' })`,
validates a `z.strictObject` body (unknown keys are rejected, so a browser cannot submit a creator
or an owner), and reads the actor from `auth.userId` only. Error codes map to statuses locally
(`event-not-found`/`attendee-not-found`/`reminder-not-found` → 404, `attendee-exists` → 409,
`reminder-forbidden` → 403), matching the file-local `errorStatus` convention already in the app.

### New — pure modules (`apps/projects/src/features/projects/`)

| File | Role |
| ---- | ---- |
| `calendar-range.ts` | view parsing, window resolution (`from`/`to`), Monday-first grids, nav/view hrefs, labels |
| `calendar-entries.ts` | entry href per kind, kind colours + legend, day spanning, day bucketing |
| `event-input.ts` | event date fields, recurrence draft ⇄ payload, recurrence description |
| `reminder-timing.ts` | "Due 2 hours before the due date" copy, target matching, target payload |

### New — components and route files

| File | Role |
| ---- | ---- |
| `features/projects/components/calendar-data.tsx` | calendar loader, legend, grid skeleton, project filter, month/week/list views |
| `features/projects/components/event-form.tsx` | event/meeting form incl. attendees and recurrence |
| `features/projects/components/event-form-data.tsx` | `NewEventData`, `EditEventData` option loaders |
| `features/projects/components/event-attendees-panel.tsx` | attendee list + accept/decline/tentative |
| `features/projects/components/event-actions.tsx` | edit link + delete |
| `features/projects/components/reminders-data.tsx` | server loader for one record's reminders |
| `features/projects/components/reminders-panel.tsx` | reminder list, add (amount + unit), remove |
| `features/projects/components/my-work-sections.tsx` | the three My Work sections from one shared promise |
| `app/(app)/calendar/page.tsx` | toolbar, period label, prev/next/today, view switch, legend, suspended data |
| `app/(app)/calendar/events/new/page.tsx` | create page |
| `app/(app)/calendar/events/[eventId]/page.tsx` + `_components/event-detail-data.tsx` | event detail |
| `app/(app)/calendar/events/[eventId]/edit/page.tsx` | edit page |
| `app/(app)/my-work/page.tsx` | three sections, three Suspense boundaries |

### Modified

| File | Change |
| ---- | ------ |
| `apps/projects/src/components/shell/nav-config.ts` | `Calendar` and `My Work` after `Cycles`, both `{ module: 'projects', permission: 'projects.view' }` |
| `apps/projects/src/components/shell/nav-icons.tsx` | `calendar` → `CalendarDaysIcon`, `my-work` → `InboxIcon` |
| `apps/projects/src/components/shell/nav-config.test.ts` | exact href set, ordering, gating, icon-key resolution |
| `apps/projects/src/lib/services/projects.ts` | `events`, `reminders`, `calendar`, `myWork` getters |
| `apps/projects/src/lib/client/index.ts` | registers both new clients |
| `apps/projects/src/app/(app)/issues/[issueRef]/_components/issue-detail-data.tsx` | suspended reminders section for the work item |
| `packages/ui/src/icons.ts` | exports `InboxIcon` (heroicons outline; was not exported before) |

## Tests (counted)

137 new `it()` blocks — 134 in 14 new files plus 3 added to `nav-config.test.ts` (11 before).

| File | `it()` |
| ---- | ------ |
| `calendar-range.test.ts` | 22 |
| `event-input.test.ts` | 16 |
| `calendar-entries.test.ts` | 12 |
| `reminder-timing.test.ts` | 12 |
| `api/events/route.test.ts` | 8 |
| `api/events/[eventId]/route.test.ts` | 7 |
| `api/events/[eventId]/attendees/route.test.ts` | 6 |
| `api/events/[eventId]/attendees/[userId]/route.test.ts` | 7 |
| `api/reminders/route.test.ts` | 8 |
| `api/reminders/[reminderId]/route.test.ts` | 8 |
| `event-form.test.tsx` | 8 |
| `reminders-panel.test.tsx` | 7 |
| `event-attendees-panel.test.tsx` | 6 |
| `my-work-sections.test.tsx` | 7 |
| `nav-config.test.ts` (added) | 3 |

Coverage against the brief: every handler has 403, 422, success-envelope and actor/owner-binding
cases; view switching and month/week navigation; entry href per kind; the recurrence form building
the payload it sends; the attendee response action; reminder add and remove each calling the client
once; My Work sections rendering and their empty states; nav-config.

## Decisions

1. **Events open as a page, not an overlay panel.** The brief allows "links to … or opens the event
   panel"; the app has no panel primitive for a foreign record, so an entry links to
   `/calendar/events/<id>`, which is also where the attendee responses and reminders live.
2. **`from`/`to` both carry meaning.** `from` is the period anchor (month start or week start),
   `to` the resolved window end. An explicit `to` from the URL wins so a copied link renders the
   period it was copied from; navigation emits the target's anchor (never the grid's leading day,
   which would step the label back a month) plus its end.
3. **Reminder copy is timing only.** `formatReminderTiming` produces "Due 2 hours before the due
   date" / "Due at the due date" / "Due Sep 20, 2026, 9:00 AM"; a test asserts none of the strings
   match `/notify|notified|email|sent|we will/i`.
4. **Reused the existing owners instead of new helpers**: `listProjectMilestones` for the phase
   options, `loadMemberLabels` for member names, `formatDate`/`formatDateTime` from
   `@876/core/timestamps` for display, `MemberPicker` was not used (single-select) — the attendee
   picker is a `NativeSelect` + add, matching the app's form vocabulary.
5. **`@876/work-ui` was not used.** Its calendar/agenda/recurrence surfaces are typed against the
   Work plane's own contracts (uppercase frequencies, `byDay`, `WorkEvent`) and would need an
   adapter layer; the Projects contracts (lowercase `freq`, numeric `byWeekday`) are the source of
   truth here, so the calendar is rendered in the app.
6. **One My Work request, three boundaries**: the page starts the promise and hands the same one to
   all three sections, so each streams independently without three round trips.
7. **`to`-less `today` link** so the server resolves the current period rather than freezing it
   into a URL.
8. `calendarTodayUtc()` resolves "today" outside the component body — `react-hooks/purity` rejects
   `Date.now()` in render.

## Verification

| Command | Result |
| ------- | ------ |
| `pnpm --filter @876/projects-app typecheck` | pass |
| `pnpm --filter @876/projects-app lint` | pass (0 errors; 4 pre-existing warnings in untouched files) |
| `pnpm --filter @876/projects-app test` | **571 passed / 78 files** |
| `node scripts/check-app-structure.mjs` | `app-structure: OK` |
| `pnpm check:rsc-boundaries` | `RSC boundaries OK (10 apps)` |
| `pnpm --filter @876/ui typecheck` | pass (for the `icons.ts` export) |

**Environment note.** This sandbox exports `NODE_ENV=production`, which makes `react` resolve its
production build where `React.act` is absent; `@testing-library/react` then throws
`React.act is not a function` and 174 tests fail across 29 files — including files this brief never
touched (verified against `cycle-form.test.tsx` before any of my edits). The suite was run as
`NODE_ENV=test pnpm --filter @876/projects-app test`, which is the same command with a sane value;
no test or config was changed to work around it.

## Unverified items

- **No run against a live API or browser.** Everything above is typecheck, lint, unit tests and
  static structure checks; nothing exercised the real `projects-api` endpoints or the rendered pages.
- **Times render in UTC** (`formatDateTime` is UTC-pinned; calendar chips show `HH:MM` from the ISO
  string). Correct and stable, but not the viewer's local time — the app has no time-zone preference
  to read.
- **Absolute reminders are not offered in the UI.** The panel writes `offsetMinutesBeforeDue` only;
  `remindAt` is displayed when present but cannot be authored from these screens.
- **Attendee responses are only actionable for the viewer's own row.** The API may permit responding
  for others; no UI path was built or tested for that.
- **`next build` was not run** (not in the brief's verify list); route/page export contracts and RSC
  boundaries are covered only by `check-rsc-boundaries` and `check-app-structure`.
- **Recurrence is stored, never expanded here.** Occurrences come from the API's read expansion; the
  UI displays the stored rule text only, and no test covers an expanded calendar window.
