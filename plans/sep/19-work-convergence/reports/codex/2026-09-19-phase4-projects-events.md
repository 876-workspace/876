# Phase 4b — Projects events on Work

## Result

Projects events and attendees now live in Work. Projects retains only the
`projects_event_links` ownership/link table, so project deletion still cascades
locally while Work owns event fields, recurrence, and participants.

## Tests

- 30 Work-event cases changed or added in
  `apps/projects-api/src/modules/calendar/__tests__/calendar.test.ts`: 18
  existing calendar event/attendee cases were converted to assert Work calls,
  and 12 new cases cover all four status mappings in both directions plus four
  timed/all-day and meeting-URL creation variants.
- `pnpm --filter @876/projects-api typecheck` — passed.
- `pnpm --filter @876/projects-api test` — passed (100 files, 1,871 tests).
- `pnpm --filter @876/projects typecheck` — passed.
- `pnpm --filter @876/projects test` — passed (45 files, 324 tests).
- `grep -rn "prisma.projectEvent\|prisma.eventAttendee" apps/projects-api/src | grep -v generated` — no output.

## Files changed

- `apps/projects-api/prisma/schema/calendar.prisma`: replaces `ProjectEvent`
  and `EventAttendee` with `ProjectEventLink`.
- `apps/projects-api/prisma/schema/{tenant,project,issue,work-structure}.prisma`:
  replaces old event relations with link relations and preserves the former
  cascade/set-null behaviour.
- `apps/projects-api/prisma/migrations/20260919160000_move_events_to_work/migration.sql`:
  unapplied link-table/create-and-old-table-drop migration.
- `apps/projects-api/src/providers/work.ts`: adds Projects project context,
  per-organization Projects calendar resolution/cache, and Event/participant
  error mappings.
- `apps/projects-api/src/modules/calendar/calendar.repository.ts`: owns only
  `projects_event_links` persistence; the event-start resolver now validates a
  local link and the service reads Work for the start time.
- `apps/projects-api/src/modules/calendar/calendar.service.ts`: calls Work for
  events, recurrence, and participants; maintains Projects serialization,
  calendar aggregation, reminder event targets, and My Work.
- `apps/projects-api/src/modules/calendar/calendar.serializers.ts`: serializes
  Work events/participants into the unchanged Projects wire resource.
- `apps/projects-api/src/modules/calendar/__tests__/calendar.test.ts`: converts
  the calendar fixture boundary to Work and adds mapping regressions.

## Calendar resolution

`resolveProjectsCalendarId()` is in `providers/work.ts`. It memoizes a Promise
by organization id, lists Work calendars for an existing `Projects — <org id>`
calendar, otherwise creates it with UTC and the creating actor, and evicts a
failed lookup/create from the cache. Work exposes `calendars.create`, so no
new Work capability was invented. The service actor is `system` only when the
legacy nullable Projects `createdBy` input is absent.

## Compatibility notes

- Projects permits `createdBy: null`; Work requires a non-null creator. Null
  is written as the stable Work actor `system` and converted back to null when
  serializing the legacy Projects event. This is the only non-clean field map.
- Work all-day events require exclusive `startDate`/`endDate`; a legacy all-day
  create with no `endsAt` uses the following UTC date. Serialized values remain
  Unix seconds, now representing the Work date boundaries.
- `DELEGATED` has no Projects attendee-response equivalent and is read as
  `invited`. Projects never writes that Work-only state.

## Work errors collapsed to `projects/internal-error`

The existing adapter preserves tenant, invalid-request, event-not-found,
event-participant-not-found, and reminder-not-found mappings. Every other Work
code intentionally falls through to the pre-existing `projects/internal-error`;
notably this includes `work/calendar-not-found`, `work/invalid-response`,
`work/not-configured`, authorization/configuration failures, and recurrence
rule failures. No Projects registry entries were added.

## Migration SQL (unapplied)

```sql
-- Move events to Work: retain only Projects-local links to Work event ids.
-- Work runs on a separate database, so existing Projects event and attendee
-- rows cannot be backfilled in SQL; rows still present here are dropped with
-- their former tables.

CREATE TABLE "projects_event_links" (
    "tenant_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "milestone_id" TEXT,
    "issue_id" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'event',
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_event_links_pkey" PRIMARY KEY ("event_id")
);

CREATE INDEX "projects_event_links_tenant_id_project_id_idx"
ON "projects_event_links"("tenant_id", "project_id");

ALTER TABLE "projects_event_links" ADD CONSTRAINT "projects_event_links_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_event_links" ADD CONSTRAINT "projects_event_links_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_event_links" ADD CONSTRAINT "projects_event_links_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "projects_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects_event_links" ADD CONSTRAINT "projects_event_links_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "projects_issues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects_event_attendees" DROP CONSTRAINT "projects_event_attendees_tenant_fkey";
ALTER TABLE "projects_event_attendees" DROP CONSTRAINT "projects_event_attendees_event_fkey";
ALTER TABLE "projects_events" DROP CONSTRAINT "projects_events_tenant_id_fkey";
ALTER TABLE "projects_events" DROP CONSTRAINT "projects_events_project_id_fkey";
ALTER TABLE "projects_events" DROP CONSTRAINT "projects_events_milestone_id_fkey";
ALTER TABLE "projects_events" DROP CONSTRAINT "projects_events_issue_id_fkey";
DROP TABLE "projects_event_attendees";
DROP TABLE "projects_events";
```

No database command or migration application was run. No Work service or
`@876/work` package file was changed.
