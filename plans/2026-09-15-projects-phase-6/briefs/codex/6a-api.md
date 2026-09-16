# Brief 6a — Projects API: calendar, events, reminders, recurrence, my work

Repo `/root/projects/876`, branch `feature/projects-phase-6-calendar`. Read `plans/2026-09-15-projects-phase-6/plan.md` — binding.
Rules: `.claude/rules/express-api.md`, `.claude/rules/naming.md`, `.claude/rules/error-handling.md`, `.claude/rules/testing.md`.
Hard rules: no commit/branch, no `prisma migrate` (hand-write SQL), no `eslint-disable`/`as any`/`@ts-ignore`, no run logs, one verification command at a time. Every new index/constraint name ≤ 63 chars, pinned with `map:`.

## Reference (read only these)
`apps/projects-api/src/modules/projects/gantt.{service,serializers,repository}.ts` and `gantt.scheduling.ts` (pure-module pattern), `baselines.*` (Phase 5), migration `prisma/migrations/20260918000000_project_baselines/migration.sql`, client `packages/projects/src/resources/gantt.ts`. New repositories must be mocked in suites that transitively import routes (see `src/modules/labels/__tests__/labels.test.ts`).

## Deliver
1. **Schema + migration** `prisma/migrations/20260919000000_calendar_reminders/migration.sql`: `ProjectEvent` (`projects_events`), `EventAttendee` (`projects_event_attendees`, unique `(eventId, userId)` short-mapped), `Reminder` (`projects_reminders`), all fields per the plan, tenant-scoped with cascade FKs and indexes on `(tenantId, startsAt)`, `(tenantId, projectId)`, `(tenantId, createdBy)`.
2. **Pure module** `src/modules/calendar/recurrence.ts`: `expandOccurrences(rule, windowStart, windowEnd)` for daily/weekly/monthly/yearly with interval, weekday set, until/count, a hard cap of 1000, and correct month-end handling (31st in a 30-day month is skipped, not clamped — document the choice in a comment). No database, no clock reads (take `now` as an argument where needed).
3. **Module** `src/modules/calendar/calendar.{controller,repository,schemas,serializers,service}.ts` + routes (internal-key guarded):
   - `GET/POST /events`, `GET/PATCH/DELETE /events/:id`, `POST /events/:id/attendees`, `PATCH /events/:id/attendees/:userId` (response), `DELETE /events/:id/attendees/:userId`
   - `GET/POST /reminders`, `PATCH/DELETE /reminders/:id`, `GET /reminders/due?at=` (computed, nothing marked sent)
   - `GET /calendar?from&to&projectId?&kinds?` → `{ object: 'calendar', entries: [...] }` merging project, phase, work-item (due and planned), event and recurring-event occurrences inside the window, each `{ object: 'calendar-entry', kind, id, occurrenceStart, occurrenceEnd, allDay, title, projectId, issueIdentifier?, href-safe ids }`, sorted by start.
   - `GET /my-work?userId` → `{ assignedIssues, upcomingEvents, dueReminders }` for that user in the tenant.
   - A reminder is visible/editable only to its creator; enforce in the service, not the route.
4. **`@876/projects`**: `resources/events.ts`, `resources/reminders.ts`, `resources/calendar.ts`, `resources/my-work.ts` + tests; types; wired on the client.
5. **Tests, floor ≥ 55 new `it()` in projects-api (≥ 20 of them pure recurrence cases) and ≥ 14 in the package**: each frequency, interval > 1, weekday sets, until and count limits, the 1000 cap, month-end skip, DST-free Unix-second maths, window filtering at both edges, an event with no recurrence appearing once, calendar merging every kind, kind filtering, reminder creator isolation (another user cannot read or edit), `reminders/due` marks nothing, my-work excludes closed items and other users' rows, tenant isolation, unknown ids 404.

## Verify
pnpm --filter @876/projects-api exec prisma validate
pnpm --filter @876/projects-api exec prisma generate
pnpm --filter @876/projects-api typecheck
pnpm --filter @876/projects-api lint
pnpm --filter @876/projects-api test
pnpm --filter @876/projects typecheck
pnpm --filter @876/projects test

## Report
`plans/2026-09-15-projects-phase-6/reports/codex/6a-api.md`: files, full migration SQL, counted tests, recurrence decisions, unverified items.
