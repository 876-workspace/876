# Brief 6a — Projects API: calendar, events, reminders, recurrence, my work

- Branch: `feature/projects-phase-6-calendar`
- Status: implemented, all verification commands green
- No commit, no branch, no `prisma migrate`, no `eslint-disable`/`as any`/`@ts-ignore`

## Files

New — `apps/projects-api`:
- `prisma/schema/calendar.prisma` — `ProjectEvent`, `EventAttendee`, `Reminder`
- `prisma/migrations/20260919000000_calendar_reminders/migration.sql`
- `src/modules/calendar/recurrence.ts` — pure occurrence expansion
- `src/modules/calendar/calendar.schemas.ts` — Zod contracts
- `src/modules/calendar/calendar.serializers.ts` — rows to wire shapes
- `src/modules/calendar/calendar.repository.ts` — Prisma access, owned tables only
- `src/modules/calendar/calendar.service.ts` — rules, read models, creator checks
- `src/modules/calendar/calendar.controller.ts`
- `src/modules/calendar/calendar.routes.ts` — internal-key guarded, mounted at `/v1/organizations/:organizationId`
- `src/modules/calendar/index.ts`
- `src/modules/calendar/__tests__/recurrence.test.ts` — 25 pure `it()`
- `src/modules/calendar/__tests__/calendar.test.ts` — 45 route-level `it()`

New — `packages/projects`:
- `src/resources/events.ts`, `src/resources/reminders.ts`, `src/resources/calendar.ts`, `src/resources/my-work.ts`
- `src/resources/events.test.ts` (9), `src/resources/reminders.test.ts` (5), `src/resources/calendar.test.ts` (2), `src/resources/my-work.test.ts` (2)

Edited:
- `apps/projects-api/prisma/schema/{tenant,project,issue,work-structure}.prisma` — back-relation fields only (`projectEvents`, `eventAttendees`, `reminders`; `events` was already taken by issue/milestone events, caught by `prisma validate`)
- `apps/projects-api/src/http/errors.ts` — `event-not-found`, `attendee-not-found`, `attendee-exists`, `reminder-not-found`, `reminder-forbidden`
- `apps/projects-api/src/http/routes.ts` — calendar router mount
- `apps/projects-api/src/platform/ids.ts` — `prjev_`, `prjeva_`, `prjrem_` prefixes
- `packages/projects/src/{types,client,contracts,index}.ts` — schemas, resources, exports
- `packages/projects/src/client.test.ts` — namespace lists extended (2 existing `it()` updated, not counted as new)

## Endpoints

`GET/POST /events`, `GET/PATCH/DELETE /events/:eventId`, `POST /events/:eventId/attendees`, `PATCH|DELETE /events/:eventId/attendees/:userId`, `GET/POST /reminders` (`createdBy` required on list), `PATCH|DELETE /reminders/:reminderId` (`userId` required), `GET /reminders/due?at=&createdBy?`, `GET /calendar?from&to&projectId?&kinds?`, `GET /my-work?userId`.

## Full migration SQL

```sql
-- CreateTable projects_events
CREATE TABLE "projects_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "milestone_id" TEXT,
    "issue_id" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'event',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "starts_at" BIGINT NOT NULL,
    "ends_at" BIGINT,
    "all_day" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "meeting_url" TEXT,
    "created_by" TEXT,
    "recurrence_freq" TEXT,
    "recurrence_interval" INTEGER,
    "recurrence_by_weekday" TEXT,
    "recurrence_until" BIGINT,
    "recurrence_count" INTEGER,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_events_pkey" PRIMARY KEY ("id")
);
```

```sql
-- CreateTable projects_event_attendees
CREATE TABLE "projects_event_attendees" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "response" TEXT NOT NULL DEFAULT 'invited',
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_event_attendees_pkey" PRIMARY KEY ("id")
);

-- CreateTable projects_reminders
CREATE TABLE "projects_reminders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "issue_id" TEXT,
    "milestone_id" TEXT,
    "event_id" TEXT,
    "remind_at" BIGINT,
    "offset_minutes_before_due" INTEGER,
    "recurrence_freq" TEXT,
    "recurrence_interval" INTEGER,
    "recurrence_by_weekday" TEXT,
    "recurrence_until" BIGINT,
    "recurrence_count" INTEGER,
    "channel" TEXT NOT NULL DEFAULT 'in-app',
    "created_by" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "projects_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_events_tenant_starts_idx" ON "projects_events"("tenant_id", "starts_at");
CREATE INDEX "projects_events_tenant_project_idx" ON "projects_events"("tenant_id", "project_id");
CREATE INDEX "projects_events_tenant_creator_idx" ON "projects_events"("tenant_id", "created_by");
CREATE UNIQUE INDEX "projects_event_attendees_unique" ON "projects_event_attendees"("event_id", "user_id");
CREATE INDEX "projects_event_attendees_tenant_idx" ON "projects_event_attendees"("tenant_id", "event_id");
CREATE INDEX "projects_reminders_tenant_creator_idx" ON "projects_reminders"("tenant_id", "created_by");
CREATE INDEX "projects_reminders_tenant_remind_idx" ON "projects_reminders"("tenant_id", "remind_at");

-- AddForeignKey
ALTER TABLE "projects_events" ADD CONSTRAINT "projects_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_events" ADD CONSTRAINT "projects_events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_events" ADD CONSTRAINT "projects_events_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "projects_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects_events" ADD CONSTRAINT "projects_events_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "projects_issues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects_event_attendees" ADD CONSTRAINT "projects_event_attendees_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_event_attendees" ADD CONSTRAINT "projects_event_attendees_event_fkey" FOREIGN KEY ("event_id") REFERENCES "projects_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_reminders" ADD CONSTRAINT "projects_reminders_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "projects_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects_reminders" ADD CONSTRAINT "projects_reminders_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "projects_issues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects_reminders" ADD CONSTRAINT "projects_reminders_milestone_fkey" FOREIGN KEY ("milestone_id") REFERENCES "projects_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects_reminders" ADD CONSTRAINT "projects_reminders_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "projects_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

Longest index/constraint name: `projects_event_attendees_tenant_idx` (35 chars, limit 63).

## Counted tests

- projects-api: **70 new `it()`** (floor 55) — 25 pure recurrence, 45 route-level. Full suite: 21 files, 545 tests, all pass.
- package: **18 new `it()`** (floor 14) — 9 events, 5 reminders, 2 calendar, 2 my-work. Full suite: 121 tests, all pass.
- Coverage of the brief's list: each frequency, interval > 1, weekday sets, until, count, 1000 cap (incl. cap-beats-count), month-end skip (Feb + 30-day), DST-free Unix maths, both window edges, no-recurrence-once, every calendar kind, kind filtering, creator isolation (list scope + 403 edit/delete + no-write on forbidden), due-marks-nothing (asserts zero repository writes), my-work closed/other-user/past exclusions, tenant isolation, unknown-id 404s throughout.

## Recurrence decisions

- `expandOccurrences(rule, windowStart, windowEnd)` takes `startsAt`/`durationSeconds` inside the rule; reads no DB and no clock.
- Month-end: a monthly 31st (or yearly Feb 29th) in a month too short to hold it is **skipped, never clamped** — documented in a comment at the yield site. Skipped cycles do not consume `count`.
- `count` counts actual occurrences from the very first one, window or not; `until` is inclusive on occurrence starts; hard cap 1000 wins over larger counts and bounds work for open-ended rules.
- Weekly weekday sets are sorted within each week so output stays ascending (callers break early on `windowEnd`); pre-start same-week days are filtered, never emitted.
- Window inclusion is overlap-based (`start <= windowEnd && (end ?? start) >= windowStart`), both edges inclusive.
- All maths in Unix seconds / UTC calendar fields — a daily rule steps exactly 86,400 s across DST boundaries.
- `byWeekday` stored as comma `0–6` (Sunday–Saturday, UTC), weekly only; empty means the weekday of the first start.

## Unverified items

- Migration SQL is hand-written and `prisma validate`/`generate` green, but `prisma migrate` was never run (per hard rules) — first deploy must apply `20260919000000_calendar_reminders` against a real database.
- No live-server check (brief forbids run logs; routes verified via supertest-style suites only).
- 6b app UI is out of scope here; no placeholder UI was added.
