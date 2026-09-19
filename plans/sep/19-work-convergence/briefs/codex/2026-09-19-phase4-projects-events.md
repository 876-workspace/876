# Phase 4b — move Projects events onto the Work service

Branch `refactor/work-convergence`. Do **not** commit, branch, or open a PR.
Do **not** run any database command except `prisma generate` (via typecheck).
Migration SQL is written to a file and left unapplied.

## What is already done (read this first, do not redo it)

Phase 2 converged Projects **reminders** onto Work and is committed. The
adapter it built is your template and you extend it, you do not recreate it:

- `apps/projects-api/src/providers/work.ts` — `workClient()`, the three context
  builders `projectsIssueWorkContext` / `projectsMilestoneWorkContext` /
  `projectsEventWorkContext`, and `workErrorToProjects()`.
- `apps/projects-api/src/modules/calendar/calendar.service.ts` already calls
  `workClient().reminders.*`. Read how it maps recurrence onto
  `WorkRecurrenceRule` (`reminders.recurrence.set/clear/retrieve`, freq
  lower→UPPER, weekday 0–6 → `SU..SA`, `until`→`untilAt`) and reuse that
  mapping verbatim for events — do not invent a second one.
- `apps/crm-api/src/providers/work.ts` is the 61-line reference adapter.

Phase 4a is also done: `WorkEvent` now has `meetingUrl` (contract in
`packages/work/src/types.ts`, serializer in
`apps/work-api/src/modules/events/events.service.ts`). You do **not** change
`apps/work-api` or `packages/work` at all. If you believe you need to, stop
and say so in the report instead.

## Scope: `apps/projects-api` only

Delete `model ProjectEvent` and `model EventAttendee` and move both onto Work.
`Issue`, `Milestone`, `Project`, `TaskList`, `Notification`, `TimeEntry`,
`Budget` stay exactly where they are — do not touch them.

## The field mapping — decided, not open

| Projects                                                            | Work                                                                                                                                              |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `projectId` (required)                                              | the context triple: `{ service: 'projects', resource: 'project', id: projectId }`                                                                 |
| `milestoneId`, `issueId`, `kind`                                    | a **new Projects-local** table `projects_event_links` keyed by the Work event id                                                                  |
| `title`, `description`, `location`                                  | same names on `WorkEvent`                                                                                                                         |
| `meetingUrl`                                                        | `meetingUrl` on `WorkEvent`                                                                                                                       |
| `startsAt` / `endsAt` (BigInt unix)                                 | `startAt` / `endAt` (unix seconds in the client contract)                                                                                         |
| `allDay: true`                                                      | Work's all-day branch: `startDate` / `endDate`, no `startAt`/`timeZone`. `allDay` is **derived**, not stored.                                     |
| 5 recurrence columns                                                | `WorkRecurrenceRule` via `events.recurrence.set/clear/retrieve`                                                                                   |
| `createdBy`                                                         | `createdBy`                                                                                                                                       |
| `EventAttendee.userId`                                              | `WorkEventParticipant` `kind: USER`, `participantId: userId`                                                                                      |
| `EventAttendee.response` (`invited\|accepted\|declined\|tentative`) | `WorkParticipantStatus`: `invited`→`NEEDS_ACTION`, `accepted`→`ACCEPTED`, `declined`→`DECLINED`, `tentative`→`TENTATIVE`, and the inverse on read |

**Why the project and not the issue is in the triple:** the only list query is
`listEvents(tenantId, projectId?)`, and Work's event list filter takes one
exact context triple. Putting the narrowest target there would force a project
list to resolve every issue and milestone of the project and filter by a _set_
of context ids, which the list API cannot express. Do not change this.

### `projects_event_links`

```prisma
model ProjectEventLink {
  tenantId    String  @map("tenant_id")
  eventId     String  @id @map("event_id")   // the Work event id
  projectId   String  @map("project_id")
  milestoneId String? @map("milestone_id")
  issueId     String? @map("issue_id")
  kind        String  @default("event")
  createdAt   BigInt  @map("created_at")
  updatedAt   BigInt  @map("updated_at")
  ...relations to Tenant/Project/Milestone/Issue, onDelete as ProjectEvent had
  @@index([tenantId, projectId])
  @@map("projects_event_links")
}
```

`projectId` is duplicated here deliberately: it is the FK that makes
`onDelete: Cascade` from `Project` still work, and it lets a list resolve links
without a Work round trip. Write a row for **every** event, not only ones with
a milestone/issue — the delete cascade depends on it.

### Which calendar Work event goes on

Work requires a `calendarId`. Projects has no calendar concept. Resolve or
create **one calendar per Projects tenant**, named for the organization,
through `workClient().calendars`, and cache the id the way the codebase
already caches tenant lookups. Put that resolution in `providers/work.ts`
beside the existing helpers, not in the repository. Say in the report exactly
what you did — if `calendars` has no create/ensure verb, stop and report it
rather than inventing one.

## Rules

- `calendar.repository.ts` must end with **zero** `prisma.projectEvent` and
  `prisma.eventAttendee` calls. It keeps `projects_event_links` queries and the
  existing `retrieveIssueDueDate` / `retrieveMilestoneTargetDate` /
  `retrieveEventStart` host-side resolvers (adjust the last one to read Work).
- **No repository calls `workClient()`.** The service does, exactly as the
  reminders work does today.
- Work errors are **returned as values** through `workErrorToProjects`, never
  thrown. If a Work error has no fitting Projects registry code, map it to
  `projects/internal-error` and **list it in the report** — do not invent
  registry entries.
- The Projects wire contract does not change: the same routes, the same
  `object` discriminators, the same field names and nullability that
  `calendar.serializers.ts` emits today. The `calendar entries` aggregation
  (events + issues + milestones + reminders, with its `kinds` filter) must keep
  working identically.
- No `eslint-disable`, `@ts-ignore`, `as any`. `as unknown as T` only for a
  real external mismatch, and justify it in the report.
- Read `.claude/rules/express-api.md`, `.claude/rules/error-handling.md`,
  `.claude/rules/ai-code-quality.md`, `.claude/rules/testing.md`,
  `docs/architecture/019-work-service-and-productivity-plane.md`.

## Migration

Write, do not run:
`apps/projects-api/prisma/migrations/20260919160000_move_events_to_work/migration.sql`

It creates `projects_event_links` and drops `projects_event_attendees` and
`projects_events` (drop the FK constraints first, as the phase 2 migration
did). Work is a separate database, so existing rows cannot be backfilled in
SQL — say so in a comment at the top of the file, as phase 2's migration does.

## Tests — at least 30 new `it()` cases in `apps/projects-api`

Cover, with exact arguments and full result shapes:
create (timed and all-day, with and without a milestone/issue, with and without
a meeting url); recurrence set on create and cleared on update; list by project
(exact context filter) and unfiltered; a Work event whose context belongs to
another service is not returned; retrieve/update/delete of an unknown event →
`projects/reminder-not-found`'s event equivalent, with no Work write; attendee
add/list/update/remove including every one of the four response mappings in
both directions; a Work list failure surfacing as a value, not a throw; the
`calendar entries` aggregation still emitting all four entry kinds.

## Verify, one command at a time, in the foreground

```
pnpm --filter @876/projects-api typecheck
pnpm --filter @876/projects-api test
pnpm --filter @876/projects typecheck
pnpm --filter @876/projects test
grep -rn "prisma.projectEvent\|prisma.eventAttendee" apps/projects-api/src | grep -v generated   # expect 0
```

## Report

`plans/sep/19-work-convergence/reports/codex/2026-09-19-phase4-projects-events.md`

Per phase, with counted `it()` numbers; every file changed and why; the
migration SQL in full; the calendar-resolution decision; every Work error that
collapsed to `projects/internal-error`; anything you could not verify; and any
field you could not map cleanly — name it rather than dropping it silently.
