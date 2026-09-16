# Implementation Plan: 876 Projects Phase 6 — Calendar, Events, Reminders, My Work

- **Run ID:** `2026-09-15-projects-phase-6`
- **Branch:** `feature/projects-phase-6-calendar`
- **Status:** `IN_PROGRESS`

## Binding decisions

1. **The calendar is a read model over things that already have dates** plus one new owned record. `GET /calendar?from&to&projectId?` returns entries of kind `project | phase | work-item | event | meeting`, derived from project start/end, phase start/target, work-item due and planned dates, and the new event rows. No date is duplicated into a calendar table.
2. **One `ProjectEvent` model** (`projects_events`) covers events and meetings: `kind` ∈ `event | meeting`, scope (`projectId` required, optional `milestoneId`, optional `issueId`), title, description, `startsAt`, `endsAt`, `allDay`, `location`, `meetingUrl`, `createdBy`. Attendees are opaque user ids in `projects_event_attendees` with a response (`invited|accepted|declined|tentative`). A meeting is an event with a `meetingUrl`/attendees, not a second table.
3. **Recurrence is a stored rule, never expanded rows.** `recurrenceFreq` ∈ `daily|weekly|monthly|yearly`, `recurrenceInterval`, `recurrenceByWeekday`, `recurrenceUntil`, `recurrenceCount` on the event and on the reminder. Occurrences are expanded **on read** inside the requested window by a pure module `recurrence.ts`, capped (1000 occurrences) and never persisted.
4. **Reminders are stored intent, and delivery is explicitly out of scope.** `projects_reminders`: target (`issueId | milestoneId | eventId`), `remindAt` or `offsetMinutesBeforeDue`, optional recurrence, `channel` fixed to `in-app` for now, `createdBy`, `active`. There is **no scheduler or notification worker in this phase**, so the API must not claim delivery: reminders are listed and a `GET /reminders/due?at=` returns what *would* be due. Do not add a fake "sent" flag.
5. **My Work is a query, not a table:** `GET /my-work?userId` returns the caller's assigned open work items, upcoming events they attend, and reminders due, each already scoped by tenant. Projects-aware only; no cross-app aggregation.
6. **External calendar sync is not implemented** and no placeholder UI claims it.
7. Permissions: `projects.view` / `projects.edit`; a reminder is readable and writable only by the user who created it. Additive migration, all index names ≤ 63 chars pinned with `map:`.

## Briefs
| Brief | Delegate | Scope |
| ----- | -------- | ----- |
| briefs/codex/6a-api.md | Codex `-p muse` | events, attendees, reminders, recurrence, calendar + my-work read models, client resources |
| briefs/command-code/6b-app.md | Command Code | calendar page, event/meeting forms, reminder UI, My Work page |

## Checklist
- [ ] 6a API + client
- [ ] 6b App UI
- [ ] Verification, PR, merge
